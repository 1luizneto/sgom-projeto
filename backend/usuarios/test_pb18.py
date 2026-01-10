from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from .models import Fornecedor

class TC18_GestaoFornecedoresTest(TestCase):
    """
    Testes de Aceitação para PB18 - Cadastro de Fornecedores
    """
    
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/fornecedores/'
        
        # Dados padrão para testes
        self.fornecedor_data = {
            "nome": "Auto Peças Brasil",
            "cnpj": "12.345.678/0001-99",
            "telefone": "(11) 3030-4040",
            "endereco": "Av. Industrial, 500",
            "password": "senha_segura_123"
        }

    def test_cenario_1_cadastro_sucesso(self):
        """
        Cenário 1: Cadastro de novo fornecedor com sucesso
        Given que não existe nenhum fornecedor com o CNPJ...
        When eu inicio o cadastro...
        Then o sistema deve exibir sucesso e gerar credenciais.
        """
        response = self.client.post(self.url, self.fornecedor_data)
        
        # Verifica status HTTP 201 Created
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verifica se gravou no banco
        self.assertTrue(Fornecedor.objects.filter(cnpj="12.345.678/0001-99").exists())
        
        # Verifica se gerou o Usuário (Credenciais)
        user_exists = User.objects.filter(username="12.345.678/0001-99").exists()
        self.assertTrue(user_exists, "As credenciais de acesso (User) deveriam ter sido criadas.")

    def test_cenario_2_cnpj_duplicado(self):
        """
        Cenário 2: Tentativa de cadastro com CNPJ duplicado
        Given que já existe um fornecedor cadastrado...
        When eu tento cadastrar com mesmo CNPJ...
        Then o sistema deve impedir e mostrar erro.
        """
        # Cria o primeiro
        self.client.post(self.url, self.fornecedor_data)
        
        # Tenta criar o segundo igual
        response = self.client.post(self.url, self.fornecedor_data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cnpj', response.data, "Deve haver mensagem de erro no campo CNPJ")

    def test_cenario_3_campos_obrigatorios(self):
        """
        Cenário 3: Validação de campos obrigatórios
        When eu tento salvar sem Nome ou CNPJ...
        Then o sistema deve impedir.
        """
        dados_incompletos = {
            "telefone": "123",
            "password": "123"
        }
        response = self.client.post(self.url, dados_incompletos)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('nome', response.data)
        self.assertIn('cnpj', response.data)