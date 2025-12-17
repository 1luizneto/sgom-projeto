from django.db import models

class Cliente(models.Model):
    id_cliente = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=255)
    cpf = models.CharField(max_length=14, unique=True)
    telefone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    endereco = models.TextField()
    #oi
    #agora vai
    #teste
    def __str__(self):
        return f"{self.nome} ({self.cpf})"

class Mecanico(models.Model):
    id_mecanico = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=255)
    cpf = models.CharField(max_length=14, unique=True)
    telefone = models.CharField(max_length=20)
    email = models.EmailField()
    endereco = models.TextField(blank=True, null=True)

    is_mecanico = models.BooleanField(default=True)
    user = models.OneToOneField('auth.User', on_delete=models.CASCADE, related_name='mecanico', null=True, blank=True)

    def __str__(self):
        return f"{self.nome} ({self.cpf})"

class Fornecedor(models.Model):
    id_fornecedor = models.AutoField(primary_key=True)
    razao_social = models.CharField(max_length=255)
    cnpj = models.CharField(max_length=20, unique=True)
    telefone = models.CharField(max_length=20)
    endereco = models.TextField()

    def __str__(self):
        return self.razao_social