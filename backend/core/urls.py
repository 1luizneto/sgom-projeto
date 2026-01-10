from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from usuarios.views import MecanicoViewSet, ClienteViewSet, FornecedorViewSet
from veiculos.views import VeiculoViewSet, AgendamentoViewSet, ServicoViewSet,cadastrar_veiculo, agenda_mecanico
from django.views.generic import RedirectView
from usuarios.serializers import CustomTokenObtainPairSerializer

router = DefaultRouter()
router.register(r'mecanicos', MecanicoViewSet, basename='mecanico')
router.register(r'clientes', ClienteViewSet, basename='cliente')
router.register(r'veiculos', VeiculoViewSet, basename='veiculo')
router.register(r'agendamentos', AgendamentoViewSet, basename='agendamento')
router.register(r'servicos', ServicoViewSet, basename='servico')
router.register(r'fornecedor', FornecedorViewSet, basename='fornecedor')

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

urlpatterns = [
    path('', RedirectView.as_view(url='/api/', permanent=False)), 
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/', include('oficina.urls')),
    # UI PB04 veículo
    path('veiculos/cadastrar/', cadastrar_veiculo, name='cadastrar_veiculo'),
    path('agenda/', agenda_mecanico, name='agenda_mecanico'),

    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
