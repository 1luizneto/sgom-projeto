from django.db import models
from django.core.exceptions import ValidationError
from apps.usuarios.models import Mecanico
from apps.clientes.models import Cliente, Veiculo

class Agendamento(models.Model):
    STATUS_CHOICES = [
        ('PENDENTE', 'Pendente'),
        ('CONFIRMADO', 'Confirmado'),
        ('CANCELADO', 'Cancelado'),
        ('CONCLUIDO', 'Concluído'),
    ]

    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='agendamentos')
    veiculo = models.ForeignKey(Veiculo, on_delete=models.CASCADE, related_name='agendamentos')
    mecanico = models.ForeignKey(Mecanico, on_delete=models.SET_NULL, null=True, blank=True, related_name='agendamentos')
    data_hora = models.DateTimeField()
    servico_descricao = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDENTE')
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    confirmado = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.data} {self.hora_inicio} - {self.cliente.nome}"