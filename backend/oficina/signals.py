from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Sum, F
from .models import ItemMovimentacao

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