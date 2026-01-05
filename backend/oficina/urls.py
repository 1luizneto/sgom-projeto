from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrcamentoViewSet, ItemMovimentacaoViewSet, VendaViewSet

router = DefaultRouter()
router.register(r'orcamentos', OrcamentoViewSet)
router.register(r'itens', ItemMovimentacaoViewSet)
router.register(r'vendas', VendaViewSet)

urlpatterns = [
    path('', include(router.urls)),
]