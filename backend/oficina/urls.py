from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrcamentoViewSet, ItemMovimentacaoViewSet, VendaViewSet, ChecklistViewSet, LaudoTecnicoViewSet, ProdutoViewSet
from usuarios.views import FornecedorViewSet

router = DefaultRouter()
router.register(r'orcamentos', OrcamentoViewSet)
router.register(r'itens', ItemMovimentacaoViewSet)
router.register(r'vendas', VendaViewSet)
router.register(r'checklists', ChecklistViewSet)
router.register(r'laudos', LaudoTecnicoViewSet)
router.register(r'fornecedores', FornecedorViewSet)
router.register(r'produtos', ProdutoViewSet, basename='produto')

urlpatterns = [
    path('', include(router.urls)),
]