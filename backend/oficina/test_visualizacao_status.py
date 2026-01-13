from django.test import TestCase
from usuarios.models import Fornecedor, Mecanico, Cliente
from veiculos.models import Veiculo
from .models import OrdemServico
from django.contrib.auth.models import User
from .serializers import OrdemServicoSerializer
from rest_framework.test import APIClient

class VisualizacaoStatusTestCase(TestCase):
    def setUp(self):
        # Users
        self.user_cliente = User.objects.create_user(username='cliente1', password='password')
        self.user_outro_cliente = User.objects.create_user(username='cliente2', password='password')
        self.user_mecanico = User.objects.create_user(username='mecanico', password='password', is_staff=True)
        
        # Cliente
        self.cliente1 = Cliente.objects.create(nome="João", cpf="111", telefone="11", user=self.user_cliente)
        self.cliente2 = Cliente.objects.create(nome="Maria", cpf="222", telefone="22", user=self.user_outro_cliente)
        
        # Veiculos
        self.veiculo1 = Veiculo.objects.create(cliente=self.cliente1, modelo="Toro", marca="Fiat", placa="AAA-1111", ano=2020)
        self.veiculo2 = Veiculo.objects.create(cliente=self.cliente2, modelo="Gol", marca="VW", placa="BBB-2222", ano=2021)
        
        # Mecanico
        self.mecanico = Mecanico.objects.create(user=self.user_mecanico, nome="Mecânico João", cpf="333", telefone="33", email="m@m.com")
        
        # OS
        self.os1 = OrdemServico.objects.create(
            numero_os="OS-CLIENTE-1", veiculo=self.veiculo1, mecanico_responsavel=self.mecanico, status='EM_ANDAMENTO'
        )
        self.os2 = OrdemServico.objects.create(
            numero_os="OS-CLIENTE-2", veiculo=self.veiculo2, mecanico_responsavel=self.mecanico, status='AGUARDANDO_PECAS'
        )

    def test_mapeamento_status_serializer(self):
        """Scenario: Verificação das mensagens amigáveis"""
        
        # Em Andamento
        serializer = OrdemServicoSerializer(self.os1)
        self.assertEqual(serializer.data['status_cliente'], 'Em Manutenção')
        self.assertEqual(serializer.data['descricao_status'], 'Mecânico trabalhando no veículo')
        
        # Aguardando Peças
        serializer = OrdemServicoSerializer(self.os2)
        self.assertEqual(serializer.data['status_cliente'], 'Parado - Aguardando Peças')
        
        # Concluida
        self.os1.status = 'CONCLUIDA'
        self.os1.save()
        serializer = OrdemServicoSerializer(self.os1)
        self.assertEqual(serializer.data['status_cliente'], 'Pronto para Retirada')

    def test_controle_acesso_cliente(self):
        """Scenario: Cliente só vê suas OS"""
        client = APIClient()
        client.force_authenticate(user=self.user_cliente)
        
        response = client.get('/api/ordens-servico/')
        self.assertEqual(response.status_code, 200)
        
        # Deve ver OS1, mas não OS2
        ids_retornados = [os['id_os'] for os in response.data['results']] if 'results' in response.data else [os['id_os'] for os in response.data]
        self.assertIn(self.os1.id_os, ids_retornados)
        self.assertNotIn(self.os2.id_os, ids_retornados)

    def test_controle_acesso_mecanico(self):
        """Scenario: Mecânico vê todas"""
        client = APIClient()
        client.force_authenticate(user=self.user_mecanico)
        
        response = client.get('/api/ordens-servico/')
        ids_retornados = [os['id_os'] for os in response.data['results']] if 'results' in response.data else [os['id_os'] for os in response.data]
        
        self.assertIn(self.os1.id_os, ids_retornados)
        self.assertIn(self.os2.id_os, ids_retornados)
