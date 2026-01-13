from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.db.models import Sum, F
from .models import ItemMovimentacao, OrdemServico, Notificacao, MovimentacaoEstoque

@receiver(post_save, sender=ItemMovimentacao)
@receiver(post_delete, sender=ItemMovimentacao)
def atualizar_total_orcamento(sender, instance, **kwargs):
    """
    Sempre que um item é adicionado, alterado ou removido,
    recalcula o valor total do orçamento pai.
    """
    orcamento = instance.orcamento
    if orcamento:
        # Calcula: Soma de (quantidade * valor_unitario) de todos os itens
        resultado = orcamento.itens.aggregate(
            total=Sum(F('quantidade') * F('valor_unitario'))
        )
        
        # Se não tiver itens, o resultado é None, então usamos 0.00
        novo_total = resultado['total'] or 0.00
        
        # Atualiza o orçamento apenas se o valor mudou para evitar loop infinito
        if orcamento.valor_total != novo_total:
            orcamento.valor_total = novo_total
            orcamento.save(update_fields=['valor_total'])

@receiver(post_save, sender=ItemMovimentacao)
def atualizar_estoque_item_adicionado_apos_conclusao(sender, instance, created, **kwargs):
    """
    Se um item for adicionado DIRETAMENTE a uma OS que já está CONCLUÍDA
    (o que não deveria acontecer no fluxo normal, mas por segurança),
    devemos baixar o estoque imediatamente.
    """
    if created and instance.os and instance.os.status == 'CONCLUIDA' and instance.produto:
         produto = instance.produto
         produto.estoque_atual -= instance.quantidade
         produto.save()
         
         if produto.estoque_atual < produto.estoque_minimo:
              Notificacao.objects.create(
                  mensagem=f"Alerta de Estoque Baixo: O produto '{produto.nome}' está com {produto.estoque_atual} unidades (Mínimo: {produto.estoque_minimo}).",
                  produto=produto
              )

@receiver(pre_save, sender=OrdemServico)
def baixar_estoque_ao_concluir_os(sender, instance, **kwargs):
    """
    Ao alterar o status da OS para 'CONCLUIDA', baixa o estoque dos itens utilizados.
    Itens podem vir da própria OS (itens avulsos) ou do Orçamento vinculado.
    """
    if not instance.pk:
        return

    try:
        os_antiga = OrdemServico.objects.get(pk=instance.pk)
    except OrdemServico.DoesNotExist:
        return

    # Se o status mudou para CONCLUIDA
    if os_antiga.status != 'CONCLUIDA' and instance.status == 'CONCLUIDA':
        itens_a_baixar = []

        # 1. Itens vinculados diretamente à OS
        if instance.itens.exists():
            itens_a_baixar.extend(instance.itens.all())
        
        # 2. Itens do Orçamento vinculado (se houver)
        if instance.orcamento and instance.orcamento.itens.exists():
            itens_a_baixar.extend(instance.orcamento.itens.all())
            
        # Baixa estoque
        for item in itens_a_baixar:
            if item.produto: # Apenas se for produto (não serviço)
                produto = item.produto
                # Otimista: assume que tem estoque ou permite ficar negativo?
                # Requisito não especifica bloqueio na OS, mas é boa prática.
                # Por simplicidade/robustez, vamos apenas subtrair. 
                # Se precisar bloquear, teria que ser validação no serializer/view.
                produto.estoque_atual -= item.quantidade
                produto.save()

                if produto.estoque_atual < produto.estoque_minimo:
                     Notificacao.objects.create(
                          mensagem=f"Alerta de Estoque Baixo: O produto '{produto.nome}' está com {produto.estoque_atual} unidades (Mínimo: {produto.estoque_minimo}).",
                          produto=produto
                     )

@receiver(post_save, sender=OrdemServico)
def atualizar_estoque_ao_finalizar_os(sender, instance, created, **kwargs):
    """
    Quando uma OS é marcada como CONCLUÍDA, registra a saída de estoque
    dos produtos usados (PB11 - TC11 Cenário 1)
    """
    if instance.status == 'CONCLUIDA' and instance.orcamento:
        # Busca os itens do orçamento associado
        itens = instance.orcamento.itens.all()
        
        for item in itens:
            # Verifica se já existe movimentação para este item
            ja_registrado = MovimentacaoEstoque.objects.filter(
                ordem_servico=instance,
                produto=item.produto,
                tipo_movimentacao='SAIDA'
            ).exists()
            
            if not ja_registrado:
                # ✅ REGISTRA A SAÍDA NO HISTÓRICO
                MovimentacaoEstoque.objects.create(
                    produto=item.produto,
                    tipo_movimentacao='SAIDA',
                    quantidade=item.quantidade,
                    observacao=f'Uso em OS #{instance.numero_os}',
                    ordem_servico=instance
                )
                # O método save() já abate o estoque