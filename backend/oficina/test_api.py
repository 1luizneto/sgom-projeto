from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from usuarios.models import Mecanico, Cliente
from veiculos.models import Veiculo, Servico
from .models import Orcamento, Produto
from datetime import date, timedelta

class OrcamentoAPITest(APITestCase):
    def setUp(self):
        # 1. Criar dados básicos
        self.user = User.objects.create_user(username='mecanico', password='123')
        self.mecanico = Mecanico.objects.create(user=self.user)
        self.cliente = Cliente.objects.create(nome="Cliente API", cpf="00000000000")
        self.veiculo = Veiculo.objects.create(placa="API-1234", modelo="Teste", ano=2020, cliente=self.cliente)
        
        self.produto = Produto.objects.create(nome="Oleo", custo_compra=10, preco_venda=50, qtd_estoque=10)
        self.servico = Servico.objects.create(descricao="Troca Oleo", preco_base=100)

        # URL base
        self.url_orcamentos = '/api/orcamentos/'

    def test_fluxo_completo_orcamento(self):
        """
        Testa: Criar Orçamento -> Adicionar Item -> Verificar Total -> Finalizar
        """
        # 1. Criar Orçamento (POST)
        dados_orcamento = {
            "cliente": self.cliente.pk,
            "veiculo": self.veiculo.pk,
            "mecanico": self.mecanico.pk,
            "validade": date.today() + timedelta(days=5),
            "status": "PENDENTE"
        }
        response = self.client.post(self.url_orcamentos, dados_orcamento)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        orcamento_id = response.data['id_orcamento'] # ou 'id' dependendo do seu model

        # 2. Adicionar Item (POST na action personalizada ou direto em /itens/)
        # Vamos testar via endpoint de itens que é o padrão REST
        url_item = '/api/itens/'
        dados_item = {
            "orcamento": orcamento_id,
            "produto": self.produto.id_produto, # ou 'id'
            "quantidade": 2,
            "valor_unitario": 50.00 # 2 * 50 = 100
        }
        response_item = self.client.post(url_item, dados_item)
        self.assertEqual(response_item.status_code, status.HTTP_201_CREATED)

        # 3. Verificar se o Total atualizou (GET)
        response_get = self.client.get(f'{self.url_orcamentos}{orcamento_id}/')
        self.assertEqual(response_get.data['valor_total'], '100.00')

        # 4. Tentar Finalizar (POST na action personalizada)
        url_finalizar = f'{self.url_orcamentos}{orcamento_id}/finalizar/'
        response_finalizar = self.client.post(url_finalizar)
        self.assertEqual(response_finalizar.status_code, status.HTTP_200_OK)

    def test_validacao_orcamento_vazio(self):
        """
        Testa se a API impede finalizar orçamento sem itens
        """
        # Criar orçamento
        orcamento = Orcamento.objects.create(
            cliente=self.cliente, veiculo=self.veiculo, mecanico=self.mecanico, validade=date.today()
        )
        
        # Tentar finalizar sem adicionar itens
        url_finalizar = f'{self.url_orcamentos}{orcamento.id_orcamento}/finalizar/'
        response = self.client.post(url_finalizar)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("erro", response.data)