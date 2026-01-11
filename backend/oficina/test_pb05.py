from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from usuarios.models import Fornecedor
from .models import Produto

class TC05_CadastroProdutosTest(TestCase):
    """
    Testes de Aceitação para PB05 - Cadastro de Produtos pelo Fornecedor
    """
    
    def setUp(self):
        self.client = APIClient()
        
        # Cria um fornecedor de teste
        self.user_fornecedor = User.objects.create_user(
            username='12345678000199',
            password='senha123'
        )
        self.fornecedor = Fornecedor.objects.create(
            user=self.user_fornecedor,
            nome='Auto Peças Brasil',
            cnpj='12345678000199',
            telefone='11999999999',
            endereco='Rua Teste, 123'
        )
        
        # Autentica o fornecedor
        self.client.force_authenticate(user=self.user_fornecedor)
        
        self.url = '/api/produtos/'

    def test_cenario_1_cadastro_sucesso(self):
        """
        Cenário 1: Cadastro de produto com sucesso
        Given que estou autenticado como fornecedor
        When preencho todos os campos corretamente
        Then o produto deve ser cadastrado e vinculado ao meu perfil
        """
        dados = {
            "nome": "Filtro de Óleo AB-200",
            "descricao": "Filtro compatível com motores 1.0 a 1.6",
            "custo": "25.00",
            "preco_venda": "45.00",
            "estoque_minimo": 10,
            "estoque_atual": 50
        }
        
        response = self.client.post(self.url, dados)
        
        # Verifica status 201 Created
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verifica se salvou no banco
        self.assertTrue(Produto.objects.filter(nome="Filtro de Óleo AB-200").exists())
        
        # Verifica vínculo automático com o fornecedor
        produto = Produto.objects.get(nome="Filtro de Óleo AB-200")
        self.assertEqual(produto.fornecedor, self.fornecedor)

    def test_cenario_2_campos_obrigatorios(self):
        """
        Cenário 2: Tentativa de cadastro com campos vazios
        When deixo campos obrigatórios em branco
        Then o sistema deve impedir e mostrar alertas
        """
        dados_incompletos = {
            "nome": "Amortecedor Dianteiro",
            # Faltam: custo, preco_venda, estoque_minimo
        }
        
        response = self.client.post(self.url, dados_incompletos)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('custo', response.data)
        self.assertIn('preco_venda', response.data)

    def test_cenario_3_preco_invalido(self):
        """
        Cenário 3: Validação de valores negativos ou zero
        When informo preço 0 ou negativo
        Then o sistema deve rejeitar
        """
        dados_preco_zero = {
            "nome": "Produto Teste",
            "custo": "10.00",
            "preco_venda": "0.00",  # INVÁLIDO
            "estoque_minimo": 5
        }
        
        response = self.client.post(self.url, dados_preco_zero)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('preco_venda', response.data)
        self.assertIn('maior que zero', str(response.data['preco_venda']))

    def test_acesso_nao_fornecedor(self):
        """
        Teste Extra: Usuário que NÃO é fornecedor não pode cadastrar
        """
        # Cria um cliente comum
        user_cliente = User.objects.create_user(username='cliente', password='123')
        self.client.force_authenticate(user=user_cliente)
        
        dados = {
            "nome": "Produto Teste",
            "custo": "10.00",
            "preco_venda": "20.00",
            "estoque_minimo": 5
        }
        
        response = self.client.post(self.url, dados)
        
        # Deve retornar erro 400 (não é fornecedor)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)