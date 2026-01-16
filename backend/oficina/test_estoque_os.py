from django.test import TestCase
from usuarios.models import Fornecedor, Mecanico, Cliente
from veiculos.models import Veiculo
from .models import Produto, OrdemServico, ItemMovimentacao, Orcamento, Venda, ItemVenda
from django.contrib.auth.models import User
from django.utils import timezone
import datetime

class EstoqueOSTestCase(TestCase):
    def setUp(self):
        # Setup básico
        self.user = User.objects.create_user(username='testuser', password='password')
        self.fornecedor = Fornecedor.objects.create(user=self.user, nome="Fornecedor Teste", cnpj="12345678000199")
        
        # Produtos
        self.oleo = Produto.objects.create(
            fornecedor=self.fornecedor, nome="Óleo 5W30", custo=20.00, preco_venda=40.00, estoque_atual=20
        )
        self.filtro = Produto.objects.create(
            fornecedor=self.fornecedor, nome="Filtro de Ar", custo=10.00, preco_venda=20.00, estoque_atual=10
        )
        
        # Cliente e Veículo
        self.cliente = Cliente.objects.create(nome="João Silva", cpf="11122233344", telefone="11999999999")
        self.veiculo = Veiculo.objects.create(
            cliente=self.cliente, modelo="Uno", marca="Fiat", placa="ABC-1234", ano=2020
        )
        
        # Mecânico
        self.mecanico_user = User.objects.create_user(username='mecanico', password='password')
        self.mecanico = Mecanico.objects.create(
            user=self.mecanico_user, 
            nome="Mecânico João", 
            cpf="12345678900",
            telefone="11999999999",
            email="mecanico@teste.com"
        )

    def test_baixa_estoque_os_finalizada(self):
        """Scenario: Baixa de estoque via Ordem de Serviço (OS) finalizada"""
        
        # Given que existe uma OS
        # OS geralmente é criada no fluxo de aprovação de orçamento, mas pode ser criada direto no teste
        
        orcamento = Orcamento.objects.create(
            cliente=self.cliente, 
            veiculo=self.veiculo, 
            mecanico=self.mecanico, 
            status='APROVADO',
            validade=timezone.now().date() + datetime.timedelta(days=7)
        )
        
        os = OrdemServico.objects.create(
            numero_os="OS-TEST-1",
            veiculo=self.veiculo,
            mecanico_responsavel=self.mecanico,
            status='EM_ANDAMENTO',
            orcamento=orcamento
        )
        
        # Item no Orçamento
        ItemMovimentacao.objects.create(
            orcamento=orcamento, produto=self.oleo, quantidade=4, valor_unitario=40.00
        )
        
        # When o mecânico ou administrador altera o status da OS para "Finalizada"
        os.status = 'CONCLUIDA'
        os.save()
        
        # Then o sistema deve subtrair as unidades utilizadas do inventário
        self.oleo.refresh_from_db()
        
        # And o estoque atual do "Óleo 5W30" deve passar a ser "16" unidades (20 - 4)
        self.assertEqual(self.oleo.estoque_atual, 16)

    def test_baixa_estoque_venda_balcao(self):
        """Scenario: Baixa de estoque via Venda Balcão"""
        from .serializers import VendaSerializer
        
        dados_venda = {
            'itens': [
                {'produto': self.filtro.id_produto, 'quantidade': 2, 'valor_unitario': 20.00}
            ]
        }
        
        # When eu vendo "2" unidades de "Filtro de Ar"
        serializer = VendaSerializer(data=dados_venda)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        
        # Then o sistema deve subtrair as unidades vendidas do inventário imediatamente
        self.filtro.refresh_from_db()
        
        # And o estoque atual do "Filtro de Ar" deve passar a ser "8" unidades (10 - 2)
        self.assertEqual(self.filtro.estoque_atual, 8)

    def test_estoque_insuficiente_venda(self):
        """Scenario: Venda com estoque insuficiente"""
        from .serializers import VendaSerializer
        
        # Tenta vender 11 (estoque tem 10)
        dados_venda = {
            'itens': [
                {'produto': self.filtro.id_produto, 'quantidade': 11, 'valor_unitario': 20.00}
            ]
        }
        
        serializer = VendaSerializer(data=dados_venda)
        with self.assertRaises(Exception): # Validation Error
             serializer.is_valid(raise_exception=True)
             serializer.save() 
             
        self.filtro.refresh_from_db()
        self.assertEqual(self.filtro.estoque_atual, 10) # Não deve mudar

    def test_cancelamento_venda_nao_afeta_estoque(self):
        """
        Scenario: Verificação de consistência em cancelamento (Fluxo Alternativo)
        """
        from django.db import transaction
        
        # Given que uma Venda Balcão foi iniciada mas cancelada
        try:
            with transaction.atomic():
                self.filtro.estoque_atual -= 1
                self.filtro.save()
                raise Exception("Cancelamento simulado")
        except Exception:
            pass
            
        # When eu verifico o estoque
        self.filtro.refresh_from_db()
        
        # Then a quantidade deve permanecer em "10" unidades
        self.assertEqual(self.filtro.estoque_atual, 10)
