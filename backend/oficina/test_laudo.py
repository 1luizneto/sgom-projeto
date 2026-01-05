from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import LaudoTecnico, OrdemServico, Produto, ItemMovimentacao
from django.contrib.auth.models import User
from usuarios.models import Cliente, Mecanico
from veiculos.models import Veiculo

class LaudoTecnicoTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Setup Dependencies
        self.user_cliente = User.objects.create_user(username='cliente1', email='c1@test.com', password='password')
        self.cliente = Cliente.objects.create(
            user=self.user_cliente, 
            nome='Cliente Teste',
            cpf='11122233344',
            telefone='11999999999',
            endereco='Rua Teste, 123'
        )
        
        self.user_mecanico = User.objects.create_user(username='mec1', email='m1@test.com', password='password')
        self.mecanico = Mecanico.objects.create(
            user=self.user_mecanico, 
            nome='Mecanico Teste',
            cpf='99988877766',
            telefone='11888888888',
            email='m1@test.com'
        )
        
        self.veiculo = Veiculo.objects.create(placa='ABC-1234', modelo='Fiat Argo', ano=2020, cliente=self.cliente)
        
        # Create OS (Laudo depends on OS)
        self.os = OrdemServico.objects.create(
            numero_os='OS-500',
            veiculo=self.veiculo,
            mecanico_responsavel=self.mecanico,
            status='EM_ANDAMENTO'
        )
        
        # Create Items for OS (Parts used)
        self.produto1 = Produto.objects.create(nome="Terminal de Direção", custo_compra=50, preco_venda=100, qtd_estoque=10)
        self.produto2 = Produto.objects.create(nome="Pivô", custo_compra=40, preco_venda=80, qtd_estoque=10)
        
        ItemMovimentacao.objects.create(os=self.os, produto=self.produto1, quantidade=1, valor_unitario=100)
        ItemMovimentacao.objects.create(os=self.os, produto=self.produto2, quantidade=1, valor_unitario=80)

    def test_create_laudo_success(self):
        """
        Scenario: Geração de laudo com sucesso
        """
        data = {
            "os": self.os.id_os,
            "diagnostico_detalhado": "Desvio no eixo dianteiro esquerdo de 2 graus",
            "acoes_corretivas": "Substituição do terminal e pivô, alinhamento 3D.",
            "recomendacoes_futuras": "Verificar pneus em 5000km",
            "mecanico": self.mecanico.id_mecanico
        }
        
        response = self.client.post('/api/laudos/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(LaudoTecnico.objects.count(), 1)
        
        laudo = LaudoTecnico.objects.first()
        self.assertEqual(laudo.diagnostico_detalhado, "Desvio no eixo dianteiro esquerdo de 2 graus")
        self.assertEqual(laudo.os.numero_os, 'OS-500')
        
        # Verify returned data includes parts
        self.assertIn('pecas_utilizadas', response.data)
        pecas = response.data['pecas_utilizadas']
        self.assertEqual(len(pecas), 2)
        self.assertIn("1x Terminal de Direção", pecas)
        self.assertIn("1x Pivô", pecas)

    def test_create_laudo_missing_defect(self):
        """
        Scenario: Tentativa de gerar laudo sem descrição do defeito
        """
        data = {
            "os": self.os.id_os,
            "diagnostico_detalhado": "", # Empty
            "mecanico": self.mecanico.id_mecanico
        }
        
        response = self.client.post('/api/laudos/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("diagnostico_detalhado", response.data)

    def test_view_laudo_in_os(self):
        """
        Scenario: Visualização do laudo na OS (via link reverso ou endpoint)
        """
        # Create laudo manually
        laudo = LaudoTecnico.objects.create(
            os=self.os,
            diagnostico_detalhado="Teste View",
            mecanico=self.mecanico
        )
        
        # Check if we can access it via API
        response = self.client.get(f'/api/laudos/{laudo.id_laudo}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['diagnostico_detalhado'], "Teste View")
        
        # Verify parts are listed
        self.assertIn('pecas_utilizadas', response.data)
        self.assertEqual(len(response.data['pecas_utilizadas']), 2)

    def test_prevent_duplicate_laudo(self):
        """
        Scenario: Tentativa de criar um segundo laudo para a mesma OS (deve falhar)
        """
        # Create first laudo
        LaudoTecnico.objects.create(
            os=self.os,
            diagnostico_detalhado="Primeiro laudo",
            mecanico=self.mecanico
        )
        
        # Try to create second laudo via API
        data = {
            "os": self.os.id_os,
            "diagnostico_detalhado": "Segundo laudo",
            "mecanico": self.mecanico.id_mecanico
        }
        
        response = self.client.post('/api/laudos/', data, format='json')
        
        # DRF UniqueValidator or Database IntegrityError should catch this
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue("os" in response.data or "non_field_errors" in response.data)

    def test_auto_assign_mecanico(self):
        """
        Scenario: Atribuição automática do mecânico logado
        """
        # Authenticate as mechanic
        self.client.force_authenticate(user=self.user_mecanico)
        
        data = {
            "os": self.os.id_os,
            "diagnostico_detalhado": "Laudo auto-assigned",
        }
        
        response = self.client.post('/api/laudos/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        laudo = LaudoTecnico.objects.get(diagnostico_detalhado="Laudo auto-assigned")
        self.assertEqual(laudo.mecanico, self.mecanico)

    def test_laudo_without_parts(self):
        """
        Scenario: Laudo de serviço sem peças (apenas mão de obra)
        """
        # Create new OS without parts
        os_sem_pecas = OrdemServico.objects.create(
            numero_os='OS-501',
            veiculo=self.veiculo,
            mecanico_responsavel=self.mecanico,
            status='EM_ANDAMENTO'
        )
        
        data = {
            "os": os_sem_pecas.id_os,
            "diagnostico_detalhado": "Apenas regulagem",
            "mecanico": self.mecanico.id_mecanico
        }
        
        response = self.client.post('/api/laudos/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['pecas_utilizadas'], [])

    def test_readonly_fields(self):
        """
        Scenario: Tentativa de manipular campos somente leitura (data_conclusao)
        """
        data = {
            "os": self.os.id_os,
            "diagnostico_detalhado": "Teste Readonly",
            "data_conclusao": "2000-01-01T00:00:00Z", # Should be ignored
            "mecanico": self.mecanico.id_mecanico
        }
        
        response = self.client.post('/api/laudos/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        laudo = LaudoTecnico.objects.get(os=self.os)
        # Ensure data_conclusao is NOT 2000-01-01 (it should be today/now)
        self.assertNotEqual(str(laudo.data_conclusao)[:10], "2000-01-01")

    def test_create_laudo_invalid_os(self):
        """
        Scenario: Tentativa de criar laudo para OS inexistente
        """
        data = {
            "os": 9999, # Invalid ID
            "diagnostico_detalhado": "Teste OS Invalida",
            "mecanico": self.mecanico.id_mecanico
        }
        
        response = self.client.post('/api/laudos/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("os", response.data)
