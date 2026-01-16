from django.contrib import admin
from .models import Mecanico, Cliente, Fornecedor

@admin.register(Mecanico)
class MecanicoAdmin(admin.ModelAdmin):
    list_display = ('id_mecanico', 'nome', 'cpf', 'email', 'telefone')
    search_fields = ('nome', 'cpf', 'email')
    list_filter = ('is_mecanico',)

@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('id_cliente', 'nome', 'cpf', 'email', 'telefone')
    search_fields = ('nome', 'cpf', 'email')

@admin.register(Fornecedor)
class FornecedorAdmin(admin.ModelAdmin):
    list_display = ['id', 'nome', 'cnpj', 'telefone', 'data_cadastro']  # <--- Corrigido
    search_fields = ['nome', 'cnpj']
    list_filter = ['data_cadastro']
