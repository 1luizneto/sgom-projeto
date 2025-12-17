from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrcamentoViewSet, ItemMovimentacaoViewSet

router = DefaultRouter()
router.register(r'orcamentos', OrcamentoViewSet)
router.register(r'itens', ItemMovimentacaoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]