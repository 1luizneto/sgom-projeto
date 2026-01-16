from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from .models import Servico

class CadastroServicoTest(APITestCase):
    def setUp(self):
        # Given que o mecânico está autenticado (simulado)
        self.user = User.objects.create_user(username='mecanico_pb06', password='123')
        self.client.force_authenticate(user=self.user)
        self.url = '/api/servicos/'

    def test_cenario_1_cadastro_novo_servico(self):
        """
        Cenário 1: Cadastro de um novo tipo de serviço no catálogo (CRUD)
        """
        data = {
            "descricao": "Alinhamento e Balanceamento",
            "preco_base": "120.00",
            "detalhes_padrao": "Inclui verificação de pneus"
        }
        
        # When eu confirmo o cadastro
        response = self.client.post(self.url, data)
        
        # Then o sistema deve exibir a mensagem de sucesso (HTTP 201)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # And o serviço deve ficar disponível na lista
        self.assertTrue(Servico.objects.filter(descricao="Alinhamento e Balanceamento").exists())
        self.assertEqual(float(response.data['preco_base']), 120.00)

    def test_cenario_3_validacao_preco_descricao(self):
        """
        Cenário 3: Validação de preço e descrição obrigatórios
        """
        # Caso A: Preço Zerado ou Negativo
        data_preco_ruim = {
            "descricao": "Serviço Grátis",
            "preco_base": "0.00"
        }
        response = self.client.post(self.url, data_preco_ruim)
        
        # Then o sistema deve impedir a gravação
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('preco_base', response.data) # Verifica se o erro é no campo preço

        # Caso B: Descrição Vazia
        data_desc_ruim = {
            "descricao": "",
            "preco_base": "100.00"
        }
        response_desc = self.client.post(self.url, data_desc_ruim)
        self.assertEqual(response_desc.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('descricao', response_desc.data)

    def test_leitura_servicos(self):
        """
        Teste extra para garantir que o 'Read' do CRUD funciona
        """
        Servico.objects.create(descricao="Troca de Oleo", preco_base=50.00)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)