from django.test import TestCase
from usuarios.models import Fornecedor, Mecanico, Cliente
from veiculos.models import Veiculo
from .models import Produto, OrdemServico, ItemMovimentacao, Orcamento, Notificacao
from django.contrib.auth.models import User

class MonitoramentoEstoqueTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.fornecedor = Fornecedor.objects.create(user=self.user, nome="Fornecedor Teste", cnpj="12345678000199")
        
        # Produto com estoque 11, minimo 10
        self.amortecedor = Produto.objects.create(
            fornecedor=self.fornecedor, nome="Amortecedor", custo=100.00, preco_venda=200.00, 
            estoque_atual=11, estoque_minimo=10
        )
        
        # Produto com estoque seguro
        self.oleo = Produto.objects.create(
            fornecedor=self.fornecedor, nome="Óleo", custo=20.00, preco_venda=40.00, 
            estoque_atual=50, estoque_minimo=10
        )
        
        # Cliente e Veículo
        self.cliente = Cliente.objects.create(nome="João Silva", cpf="11122233344", telefone="11999999999")
        self.veiculo = Veiculo.objects.create(
            cliente=self.cliente, modelo="Uno", marca="Fiat", placa="ABC-1234", ano=2020
        )
        self.mecanico_user = User.objects.create_user(username='mecanico', password='password')
        self.mecanico = Mecanico.objects.create(
            user=self.mecanico_user, nome="Mecânico", cpf="12345678900", telefone="11999999999", email="m@test.com"
        )

    def test_disparo_notificacao_estoque_baixo(self):
        """Scenario: Disparo de notificação de estoque baixo após venda (via OS)"""
        
        # Creates an OS using 2 units of Amortecedor (11 - 2 = 9 < 10)
        orcamento = Orcamento.objects.create(
            cliente=self.cliente, veiculo=self.veiculo, mecanico=self.mecanico, status='APROVADO',
            validade='2025-12-31'
        )
        
        ItemMovimentacao.objects.create(
            orcamento=orcamento, produto=self.amortecedor, quantidade=2, valor_unitario=200.00
        )
        
        os = OrdemServico.objects.create(
            numero_os="OS-NOTIF-1", veiculo=self.veiculo, mecanico_responsavel=self.mecanico, 
            status='EM_ANDAMENTO', orcamento=orcamento
        )
        
        # Concluir OS
        os.status = 'CONCLUIDA'
        os.save()
        
        # Verifica estoque
        self.amortecedor.refresh_from_db()
        self.assertEqual(self.amortecedor.estoque_atual, 9)
        
        # Verify notification created
        notificacao = Notificacao.objects.filter(produto=self.amortecedor).first()
        self.assertIsNotNone(notificacao)
        self.assertIn("Alerta de Estoque Baixo", notificacao.mensagem)
        self.assertIn("Amortecedor", notificacao.mensagem)

    def test_filtragem_produtos_em_baixa(self):
        """Scenario: Filtragem de produtos em baixa"""
        
        # Creates a product with low stock
        Produto.objects.create(
            fornecedor=self.fornecedor, nome="Pastilha", custo=50, preco_venda=100,
            estoque_atual=2, estoque_minimo=5
        )
        
        # Test API filter via client
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.fornecedor.user) # Auth as fornecedor owner
        
        response = client.get('/api/produtos/?estoque_baixo=true')
        self.assertEqual(response.status_code, 200)
        
        # Should contain 'Pastilha' but not 'Óleo' (50 > 10) or 'Amortecedor' (11 > 10 initially)
        # Amortecedor is 11 in setUp.
        
        nomes_retornados = [p['nome'] for p in response.data['results']] if 'results' in response.data else [p['nome'] for p in response.data]
        
        self.assertIn("Pastilha", nomes_retornados)
        self.assertNotIn("Óleo", nomes_retornados)
        self.assertNotIn("Amortecedor", nomes_retornados)
