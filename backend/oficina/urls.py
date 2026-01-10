from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrcamentoViewSet, ItemMovimentacaoViewSet, VendaViewSet, ChecklistViewSet, LaudoTecnicoViewSet

router = DefaultRouter()
router.register(r'orcamentos', OrcamentoViewSet)
router.register(r'itens', ItemMovimentacaoViewSet)
router.register(r'vendas', VendaViewSet)
router.register(r'checklists', ChecklistViewSet)
router.register(r'laudos', LaudoTecnicoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]