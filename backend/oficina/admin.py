from django.contrib import admin
from .models import Produto, Orcamento, OrdemServico, ItemMovimentacao, Venda, ItemVenda, Checklist, LaudoTecnico

admin.site.register(Produto)
admin.site.register(Orcamento)
admin.site.register(OrdemServico)
admin.site.register(ItemMovimentacao)
admin.site.register(Venda)
admin.site.register(ItemVenda)
admin.site.register(Checklist)
admin.site.register(LaudoTecnico)
