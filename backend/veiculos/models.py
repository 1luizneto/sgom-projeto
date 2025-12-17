from django.db import models
from django.core.exceptions import ValidationError
from usuarios.models import Cliente

class Veiculo(models.Model):
    id_veiculo = models.AutoField(primary_key=True)
    placa = models.CharField(max_length=10, unique=True)
    modelo = models.CharField(max_length=100)
    marca = models.CharField(max_length=100)
    ano = models.IntegerField()
    
    # Referência ao app 'usuarios' sem precisar de importar o ficheiro
    cliente = models.ForeignKey('usuarios.Cliente', on_delete=models.CASCADE, related_name='veiculos')

    def __str__(self):
        return f"{self.modelo} - {self.placa}"

class Servico(models.Model):
    id_servico = models.AutoField(primary_key=True)
    descricao = models.CharField(max_length=255)
    preco_base = models.DecimalField(max_digits=10, decimal_places=2)

    detalhes_padrao = models.TextField(blank=True, null=True, verbose_name="Detalhamento Padrão")

    def __str__(self):
        return self.descricao
    
    def clean(self):
        if self.preco_base < 0:
            raise ValidationError("O preço do serviço não pode ser negativo.")

# PB01: Agendamento de serviços
class Agendamento(models.Model):
    STATUS_CHOICES = [
        ('AGENDADO', 'Agendado'),
        ('CANCELADO', 'Cancelado'),
        ('CONCLUIDO', 'Concluído'),
    ]

    id_agendamento = models.AutoField(primary_key=True)
    cliente = models.ForeignKey('usuarios.Cliente', on_delete=models.CASCADE, related_name='agendamentos')
    veiculo = models.ForeignKey('veiculos.Veiculo', on_delete=models.PROTECT, related_name='agendamentos')
    mecanico = models.ForeignKey('usuarios.Mecanico', on_delete=models.PROTECT, related_name='agendamentos')
    servico = models.ForeignKey('veiculos.Servico', on_delete=models.PROTECT)

    horario_inicio = models.DateTimeField()
    horario_fim = models.DateTimeField(blank=True, null=True)

    preco = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AGENDADO')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['horario_inicio']

    def __str__(self):
        return f"{self.servico.descricao} - {self.cliente.nome} - {self.horario_inicio}"
