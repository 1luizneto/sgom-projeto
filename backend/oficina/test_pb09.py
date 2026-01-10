from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from usuarios.models import Mecanico, Cliente
from veiculos.models import Veiculo
from .models import Orcamento, OrdemServico
from datetime import date

class AprovacaoOrcamentoTest(APITestCase):
    def setUp(self):
        # Configuração do cenário (Background)
        self.user = User.objects.create_user(username='mecanico_pb09', password='123')
        self.mecanico = Mecanico.objects.create(user=self.user)
        self.cliente = Cliente.objects.create(nome="Cliente PB09", cpf="99988877700")
        self.veiculo = Veiculo.objects.create(
            placa="PB09-TEST", modelo="Teste", marca="Marca", ano=2021, cliente=self.cliente
        )
        
        # Criar um orçamento Pendente (ID 1050 simulado via criação normal)
        self.orcamento = Orcamento.objects.create(
            cliente=self.cliente,
            veiculo=self.veiculo,
            mecanico=self.mecanico,
            validade=date.today(),
            status='PENDENTE'
        )
        
        self.url_base = f'/api/orcamentos/{self.orcamento.pk}'

    def test_cenario_1_aprovacao_com_sucesso(self):
        """
        Cenário 1: Aprovação do orçamento gera OS e muda status.
        """
        url = f'{self.url_base}/aprovar/'
        response = self.client.post(url)
        
        # Then o status do orçamento deve ser alterado para "Aprovado"
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.orcamento.refresh_from_db()
        self.assertEqual(self.orcamento.status, 'APROVADO')
        
        # And o sistema deve gerar automaticamente uma nova Ordem de Serviço (OS)
        os_gerada = OrdemServico.objects.filter(orcamento=self.orcamento).first()
        self.assertIsNotNone(os_gerada)
        
        # And a nova OS deve conter os dados corretos
        self.assertEqual(os_gerada.veiculo, self.veiculo)
        self.assertEqual(os_gerada.mecanico_responsavel, self.mecanico)
        self.assertEqual(os_gerada.status, 'EM_ANDAMENTO')

    def test_cenario_2_rejeicao_orcamento(self):
        """
        Cenário 2: Rejeição do orçamento muda status e NÃO gera OS.
        """
        url = f'{self.url_base}/rejeitar/'
        data = {"motivo": "Preço elevado"}
        response = self.client.post(url, data)
        
        # Then o status do orçamento deve ser alterado para "Rejeitado"
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.orcamento.refresh_from_db()
        self.assertEqual(self.orcamento.status, 'REJEITADO')
        
        # And o sistema NÃO deve gerar uma Ordem de Serviço
        existe_os = OrdemServico.objects.filter(orcamento=self.orcamento).exists()
        self.assertFalse(existe_os)

    def test_cenario_3_tentativa_duplicada(self):
        """
        Cenário 3: Tentativa de aprovar orçamento já processado.
        """
        # Given que o orçamento já está "Aprovado"
        self.orcamento.status = 'APROVADO'
        self.orcamento.save()
        
        # When o usuário tenta alterar a aprovação novamente
        url = f'{self.url_base}/aprovar/'
        response = self.client.post(url)
        
        # Then o sistema deve impedir a operação
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("já foi processado", str(response.data))