from django.db import models
from django.core.exceptions import ValidationError

# --- Produto (Estoque) ---
class Produto(models.Model):
    id_produto = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=255)
    descricao = models.TextField(blank=True, null=True)
    custo_compra = models.DecimalField(max_digits=10, decimal_places=2)
    preco_venda = models.DecimalField(max_digits=10, decimal_places=2)
    qtd_estoque = models.IntegerField(default=0)
    estoque_minimo = models.IntegerField(default=5)
    
    # Referência ao app 'usuarios'
    fornecedor = models.ForeignKey('usuarios.Fornecedor', on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return self.nome

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
    valor_total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Referências cruzadas entre apps
    cliente = models.ForeignKey('usuarios.Cliente', on_delete=models.CASCADE)
    veiculo = models.ForeignKey('veiculos.Veiculo', on_delete=models.CASCADE)
    mecanico = models.ForeignKey('usuarios.Mecanico', on_delete=models.PROTECT)

    def __str__(self):
        return f"Orçamento #{self.id_orcamento}"

# --- Ordem de Serviço (OS) ---
class OrdemServico(models.Model):
    STATUS_CHOICES = [
        ('EM_ANDAMENTO', 'Em Andamento'),
        ('AGUARDANDO_PECAS', 'Aguardando Peças'),
        ('CONCLUIDA', 'Concluída'),
        ('CANCELADA', 'Cancelada'),
    ]

    id_os = models.AutoField(primary_key=True)
    numero_os = models.CharField(max_length=20, unique=True)
    data_abertura = models.DateTimeField(auto_now_add=True)
    data_conclusao = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='EM_ANDAMENTO')
    
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
    os = models.OneToOneField(OrdemServico, on_delete=models.CASCADE, related_name='checklist')
    nivel_combustivel = models.CharField(max_length=50)
    avarias_lataria = models.TextField(blank=True, null=True)
    observacoes = models.TextField(blank=True, null=True)

class LaudoTecnico(models.Model):
    id_laudo = models.AutoField(primary_key=True)
    os = models.OneToOneField(OrdemServico, on_delete=models.CASCADE, related_name='laudo')
    diagnostico_detalhado = models.TextField()
    recomendacoes_futuras = models.TextField()