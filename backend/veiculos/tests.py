from rest_framework.test import APITestCase
from django.urls import reverse
from django.contrib.auth.models import User
from usuarios.models import Cliente
from veiculos.models import Veiculo
from django.test import TestCase
from django.core.exceptions import ValidationError
from .models import Servico

class PB04VeiculosTests(APITestCase):
    def setUp(self):
        # Usuário mecânico autenticado
        self.mecanico_user = User.objects.create_user(username='mec1', email='mec1@sgom.local', password='mecpass')
        self.client.force_authenticate(user=self.mecanico_user)
        # Criar cliente para vincular veículo
        self.cliente = Cliente.objects.create(
            nome='Cliente Veículos',
            cpf='000.111.222-33',
            telefone='(83) 90000-0200',
            email='cliente.veiculos@sgom.com',
            endereco='Rua dos Testes, 20',
        )
        self.url_list = reverse('veiculo-list')

    def test_criar_veiculo_vinculado_a_cliente(self):
        payload = {
            'placa': 'ABC-1234',
            'modelo': 'Onix',
            'marca': 'Chevrolet',
            'ano': 2020,
            'cliente': self.cliente.id_cliente,
        }
        resp = self.client.post(self.url_list, payload, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(Veiculo.objects.filter(placa='ABC-1234', cliente=self.cliente).exists())

    def test_criar_veiculo_sem_cliente_obrigatorio(self):
        payload = {
            'placa': 'DEF-5678',
            'modelo': 'HB20',
            'marca': 'Hyundai',
            'ano': 2019,
        }
        resp = self.client.post(self.url_list, payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('cliente', resp.data)
        self.assertIn('This field is required.', resp.data['cliente'][0])

    def test_crud_veiculo(self):
        # Create
        payload = {
            'placa': 'GHI-9101',
            'modelo': 'Corolla',
            'marca': 'Toyota',
            'ano': 2018,
            'cliente': self.cliente.id_cliente,
        }
        create_resp = self.client.post(self.url_list, payload, format='json')
        self.assertEqual(create_resp.status_code, 201)
        veiculo_id = create_resp.data.get('id_veiculo')
        url_detail = reverse('veiculo-detail', args=[veiculo_id])

        # Read
        read_resp = self.client.get(url_detail)
        self.assertEqual(read_resp.status_code, 200)
        self.assertEqual(read_resp.data['placa'], 'GHI-9101')

        # Update (PUT)
        put_payload = {
            'placa': 'GHI-9101',
            'modelo': 'Corolla XEi',
            'marca': 'Toyota',
            'ano': 2019,
            'cliente': self.cliente.id_cliente,
        }
        put_resp = self.client.put(url_detail, put_payload, format='json')
        self.assertEqual(put_resp.status_code, 200)
        self.assertEqual(put_resp.data['modelo'], 'Corolla XEi')

        # Partial Update (PATCH)
        patch_payload = { 'modelo': 'Corolla Altis' }
        patch_resp = self.client.patch(url_detail, patch_payload, format='json')
        self.assertEqual(patch_resp.status_code, 200)
        self.assertEqual(patch_resp.data['modelo'], 'Corolla Altis')

        # Delete
        delete_resp = self.client.delete(url_detail)
        self.assertEqual(delete_resp.status_code, 204)
        self.assertFalse(Veiculo.objects.filter(id_veiculo=veiculo_id).exists())

class ServicoModelTest(TestCase):
    def test_criacao_servico_valido(self):
        """
        Teste Unitário: Verifica se um serviço é salvo corretamente com dados válidos.
        """
        servico = Servico.objects.create(
            descricao="Troca de Pastilha",
            preco_base=250.00,
            detalhes_padrao="Inclui retífica dos discos"
        )
        self.assertEqual(servico.descricao, "Troca de Pastilha")
        self.assertEqual(servico.preco_base, 250.00)
        self.assertIsNotNone(servico.id_servico)

    def test_str_representation(self):
        """
        Teste Unitário: Verifica se o __str__ retorna a descrição do serviço.
        """
        servico = Servico(descricao="Alinhamento 3D", preco_base=100.00)
        self.assertEqual(str(servico), "Alinhamento 3D")

    def test_preco_negativo_nao_permitido(self):
        """
        Teste Unitário: Verifica se o método clean() impede preços negativos.
        Nota: No Django, .save() não chama .full_clean() automaticamente,
        por isso chamamos explicitamente no teste.
        """
        servico = Servico(
            descricao="Serviço Inválido",
            preco_base=-50.00  # Preço negativo
        )
        
        with self.assertRaises(ValidationError):
            servico.full_clean() # Isso dispara o método clean()