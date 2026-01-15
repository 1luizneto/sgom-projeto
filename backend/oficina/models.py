from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from usuarios.models import Fornecedor
from decimal import Decimal

# --- Produto (Estoque) ---
class Produto(models.Model):
    id_produto = models.AutoField(primary_key=True)
    fornecedor = models.ForeignKey(Fornecedor, on_delete=models.CASCADE, related_name='produtos')
    nome = models.CharField(max_length=255)
    descricao = models.TextField(blank=True, null=True)
    custo = models.DecimalField(max_digits=10, decimal_places=2)
    preco_venda = models.DecimalField(max_digits=10, decimal_places=2)
    estoque_minimo = models.IntegerField(default=0)
    estoque_atual = models.IntegerField(default=0)
    data_cadastro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nome} - {self.fornecedor.nome}"

    class Meta:
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"
        ordering = ['-data_cadastro']

# --- Orçamento ---
class Orcamento(models.Model):
    STATUS_CHOICES = [
        ('PENDENTE', 'Pendente'),
        ('APROVADO', 'Aprovado'),
        ('REJEITADO', 'Rejeitado'),
    ]

    id_orcamento = models.AutoField(primary_key=True)
    data_criacao = models.DateTimeField(auto_now_add=True)
    validade = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDENTE')
    descricao = models.TextField(blank=True, null=True)
    
    # Referências
    cliente = models.ForeignKey('usuarios.Cliente', on_delete=models.CASCADE)
    veiculo = models.ForeignKey('veiculos.Veiculo', on_delete=models.CASCADE)
    mecanico = models.ForeignKey('usuarios.Mecanico', on_delete=models.PROTECT)
    agendamento = models.ForeignKey('veiculos.Agendamento', on_delete=models.SET_NULL, null=True, blank=True, related_name='orcamentos')  # <--- ADICIONE
    checklist = models.ForeignKey('Checklist', on_delete=models.SET_NULL, null=True, blank=True, related_name='orcamentos')  # <--- ADICIONE

    def __str__(self):
        return f"Orçamento #{self.id_orcamento}"

    def calcular_total(self):
        from decimal import Decimal
        total = self.itens.aggregate(
            total=models.Sum(models.F('quantidade') * models.F('valor_unitario'))
        )['total']
        return total or Decimal('0.00')

    @property
    def valor_total(self):
        return self.calcular_total()

# --- Ordem de Serviço (OS) ---
class OrdemServico(models.Model):
    STATUS_CHOICES = [
        ('AGUARDANDO_INICIO', 'Aguardando Início'),
        ('EM_ANDAMENTO', 'Em Andamento'),
        ('AGUARDANDO_PECAS', 'Aguardando Peças'),  
        ('CONCLUIDA', 'Concluída'),
        ('CANCELADA', 'Cancelada'),
    ]

    id_os = models.AutoField(primary_key=True)
    numero_os = models.CharField(max_length=20, unique=True)
    data_abertura = models.DateTimeField(auto_now_add=True)  # <--- Este é o campo correto
    data_conclusao = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AGUARDANDO_INICIO')
    
    # Relacionamento interno no mesmo app
    orcamento = models.OneToOneField(Orcamento, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Relacionamentos externos
    veiculo = models.ForeignKey('veiculos.Veiculo', on_delete=models.PROTECT)
    mecanico_responsavel = models.ForeignKey('usuarios.Mecanico', on_delete=models.PROTECT)

    def __str__(self):
        return f"OS #{self.numero_os}"

# --- Itens (Tabela unificada) ---
class ItemMovimentacao(models.Model):
    id_item = models.AutoField(primary_key=True)
    
    # Ligações com Orçamento ou OS
    orcamento = models.ForeignKey(Orcamento, on_delete=models.CASCADE, null=True, blank=True, related_name='itens')
    os = models.ForeignKey(OrdemServico, on_delete=models.CASCADE, null=True, blank=True, related_name='itens')
    
    # O item pode ser Produto (deste app) ou Serviço (do app veiculos)
    produto = models.ForeignKey(Produto, on_delete=models.SET_NULL, null=True, blank=True)
    servico = models.ForeignKey('veiculos.Servico', on_delete=models.SET_NULL, null=True, blank=True)
    
    quantidade = models.IntegerField(default=1)
    valor_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    def save(self, *args, **kwargs):
        self.subtotal = self.quantidade * self.valor_unitario
        super().save(*args, **kwargs)

# --- Satélites (Checklist e Laudo) ---
class Checklist(models.Model):
    id_checklist = models.AutoField(primary_key=True)
    os = models.ForeignKey(OrdemServico, on_delete=models.CASCADE, related_name='checklists', null=True, blank=True)  # <--- TORNAR OPCIONAL
    agendamento = models.ForeignKey('veiculos.Agendamento', on_delete=models.CASCADE, related_name='checklists', null=True, blank=True)  # <--- ADICIONE
    mecanico = models.ForeignKey('usuarios.Mecanico', on_delete=models.PROTECT, null=True)
    data_criacao = models.DateTimeField(auto_now_add=True, null=True)
    
    # Informações do veículo no momento da entrada
    nivel_combustivel = models.CharField(max_length=50)
    avarias_lataria = models.TextField(
    default='Sem avarias visíveis', blank=True, help_text="Descreva avarias na lataria,vidros, etc.", null=True)
    pneus_estado = models.CharField(max_length=100)
    possivel_defeito = models.TextField(null=True, blank=True)
    observacoes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Checklist #{self.id_checklist}"

class LaudoTecnico(models.Model):
    id_laudo = models.AutoField(primary_key=True)
    os = models.OneToOneField(OrdemServico, on_delete=models.CASCADE, related_name='laudo')
    
    # Detalhes do Laudo
    diagnostico_detalhado = models.TextField() # Obrigatório
    acoes_corretivas = models.TextField(blank=True, null=True) # O que foi feito
    recomendacoes_futuras = models.TextField(blank=True, null=True)
    
    # Auditoria
    data_conclusao = models.DateTimeField(default=timezone.now)
    mecanico = models.ForeignKey('usuarios.Mecanico', on_delete=models.PROTECT, null=True) # Responsável pelo laudo

    def __str__(self):
        return f"Laudo Técnico - OS #{self.os.numero_os}"

# --- Venda Balcão ---
class Venda(models.Model):
    id_venda = models.AutoField(primary_key=True)
    data_venda = models.DateTimeField(auto_now_add=True)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"Venda #{self.id_venda} - {self.data_venda.strftime('%d/%m/%Y')}"

class ItemVenda(models.Model):
    id_item_venda = models.AutoField(primary_key=True)
    venda = models.ForeignKey(Venda, on_delete=models.CASCADE, related_name='itens')
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    quantidade = models.IntegerField()
    valor_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    def save(self, *args, **kwargs):
        self.subtotal = self.quantidade * self.valor_unitario
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantidade}x {self.produto.nome} (Venda #{self.venda.id_venda})"
    
#

# --- Notificações ---
class Notificacao(models.Model):
    id_notificacao = models.AutoField(primary_key=True)
    mensagem = models.TextField()
    produto = models.ForeignKey(Produto, on_delete=models.SET_NULL, null=True, blank=True, related_name='notificacoes')
    lida = models.BooleanField(default=False)
    data_criacao = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-data_criacao']

    def __str__(self):
        return f"Notificação: {self.mensagem[:50]}..."

class MovimentacaoEstoque(models.Model):
    """
    Modelo para registrar TODAS as movimentações de estoque (PB11)
    - ENTRADA: Compra/reposição manual pelo Admin
    - SAIDA: Venda Balcão ou uso em OS
    """
    TIPO_CHOICES = [
        ('ENTRADA', 'Entrada'),
        ('SAIDA', 'Saída'),
    ]

    id_movimentacao = models.AutoField(primary_key=True)
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name='movimentacoes')
    tipo_movimentacao = models.CharField(max_length=10, choices=TIPO_CHOICES)
    quantidade = models.IntegerField()
    custo_unitario = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Custo na compra (apenas para ENTRADA)")
    data_movimentacao = models.DateTimeField(auto_now_add=True)
    observacao = models.TextField(blank=True, null=True)
    venda = models.ForeignKey('Venda', on_delete=models.SET_NULL, null=True, blank=True, related_name='movimentacoes')
    ordem_servico = models.ForeignKey('OrdemServico', on_delete=models.SET_NULL, null=True, blank=True, related_name='movimentacoes')

    def save(self, *args, **kwargs):
        """Atualiza o estoque automaticamente ao salvar"""
        if not self.pk:  # Apenas na criação (não ao editar)
            if self.tipo_movimentacao == 'ENTRADA':
                self.produto.estoque_atual += self.quantidade
            elif self.tipo_movimentacao == 'SAIDA':
                if self.produto.estoque_atual < self.quantidade:
                    raise ValueError(f"Estoque insuficiente para {self.produto.nome}. Disponível: {self.produto.estoque_atual}")
                self.produto.estoque_atual -= self.quantidade
            
            self.produto.save()
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.tipo_movimentacao} - {self.produto.nome} ({self.quantidade}un) - {self.data_movimentacao.strftime('%d/%m/%Y %H:%M')}"

    class Meta:
        ordering = ['-data_movimentacao']
        verbose_name = 'Movimentação de Estoque'
        verbose_name_plural = 'Movimentações de Estoque'

# --- Pedido de Compra ---
class PedidoCompra(models.Model):
    """
    Pedido de compra feito pela Oficina (Admin) ao Fornecedor
    """
    STATUS_CHOICES = [
        ('PENDENTE', 'Pendente'),
        ('APROVADO', 'Aprovado'),
        ('REJEITADO', 'Rejeitado'),
        ('ENTREGUE', 'Entregue'),
    ]

    id_pedido = models.AutoField(primary_key=True)
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name='pedidos_compra')
    fornecedor = models.ForeignKey('usuarios.Fornecedor', on_delete=models.CASCADE, related_name='pedidos_recebidos')
    quantidade = models.IntegerField()
    valor_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    valor_total = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDENTE')
    data_pedido = models.DateTimeField(auto_now_add=True)
    data_aprovacao = models.DateTimeField(null=True, blank=True)
    observacao = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        self.valor_total = self.quantidade * self.valor_unitario
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Pedido #{self.id_pedido} - {self.produto.nome} ({self.quantidade}un)"

    class Meta:
        ordering = ['-data_pedido']
        verbose_name = 'Pedido de Compra'
        verbose_name_plural = 'Pedidos de Compra'