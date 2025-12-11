from django.db import models

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

    def __str__(self):
        return self.descricao
