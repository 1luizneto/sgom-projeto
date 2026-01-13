from django.contrib import admin
from .models import Produto, Orcamento, OrdemServico, ItemMovimentacao, Venda, ItemVenda, Checklist, LaudoTecnico, MovimentacaoEstoque

admin.site.register(Orcamento)
admin.site.register(OrdemServico)
admin.site.register(ItemMovimentacao)
admin.site.register(Venda)
admin.site.register(ItemVenda)
admin.site.register(Checklist)
admin.site.register(LaudoTecnico)

@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ['id_produto', 'nome', 'fornecedor', 'custo', 'preco_venda', 'estoque_atual', 'data_cadastro']
    search_fields = ['nome', 'fornecedor__nome']
    list_filter = ['fornecedor', 'data_cadastro']

@admin.register(MovimentacaoEstoque)
class MovimentacaoEstoqueAdmin(admin.ModelAdmin):
    list_display = ['id_movimentacao', 'produto', 'tipo_movimentacao', 'quantidade', 'data_movimentacao', 'observacao']
    list_filter = ['tipo_movimentacao', 'data_movimentacao', 'produto']
    search_fields = ['produto__nome', 'observacao']
    readonly_fields = ['data_movimentacao']