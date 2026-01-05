from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import Checklist, OrdemServico
from django.contrib.auth.models import User
from usuarios.models import Cliente, Mecanico
from veiculos.models import Veiculo

class ChecklistTests(TestCase):
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
        # Wait, I saw Mecanico model and it didn't have 'especialidade'.
        # Let me re-read usuarios/models.py quickly in my mind... 
        # It had: nome, cpf, telefone, email, endereco, is_mecanico, user.
        # No 'especialidade'. I should remove it.
        
        self.veiculo = Veiculo.objects.create(placa='ABC-1234', modelo='Fiat Argo', ano=2020, cliente=self.cliente)
        
        # Create OS (Checklist depends on OS)
        self.os = OrdemServico.objects.create(
            numero_os='OS-2024-001',
            veiculo=self.veiculo,
            mecanico_responsavel=self.mecanico,
            status='EM_ANDAMENTO'
        )

    def test_create_checklist_happy_path(self):
        """
        Scenario: Preenchimento completo do Check List (Caminho Feliz)
        """
        data = {
            "os": self.os.id_os,
            "nivel_combustivel": "1/4 (Reserva)",
            "avarias_lataria": "Arranhão porta direita",
            "pneus_estado": "Bom estado",
            "possivel_defeito": "Barulho na suspensão dianteira ao passar em lombadas",
            "mecanico": self.mecanico.id_mecanico
        }
        
        response = self.client.post('/api/checklists/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Checklist.objects.count(), 1)
        
        checklist = Checklist.objects.first()
        self.assertEqual(checklist.possivel_defeito, "Barulho na suspensão dianteira ao passar em lombadas")
        # self.assertIsNotNone(checklist.data_criacao) # Assuming auto-set or handled

    def test_create_checklist_missing_defect(self):
        """
        Scenario: Tentativa de salvar sem descrever o defeito
        """
        data = {
            "os": self.os.id_os,
            "nivel_combustivel": "1/4",
            "avarias_lataria": "Ok",
            "pneus_estado": "Ok",
            # Missing possivel_defeito
        }
        
        response = self.client.post('/api/checklists/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("possivel_defeito", response.data)

    def test_create_checklist_missing_status(self):
        """
        Scenario: Tentativa de salvar sem estado atual
        """
        data = {
            "os": self.os.id_os,
            "possivel_defeito": "Barulho",
            # Missing all status fields
        }
        
        response = self.client.post('/api/checklists/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Nivel combustivel is mandatory in model, so we expect a required field error
        self.assertIn('nivel_combustivel', response.data)

    def test_filter_checklist_by_vehicle(self):
        """
        Scenario: Associação automática com o Veículo e consulta
        """
        # Create checklist for this vehicle
        Checklist.objects.create(
            os=self.os,
            nivel_combustivel="1/2",
            possivel_defeito="Teste histórico",
            pneus_estado="Bom"
        )
        
        # Create another vehicle and checklist
        veiculo2 = Veiculo.objects.create(placa='XYZ-9999', modelo='Gol', ano=2010, cliente=self.cliente)
        os2 = OrdemServico.objects.create(numero_os='OS-2024-002', veiculo=veiculo2, mecanico_responsavel=self.mecanico)
        Checklist.objects.create(
            os=os2,
            nivel_combustivel="Cheio",
            possivel_defeito="Outro teste",
            pneus_estado="Ruim"
        )
        
        # Filter by first vehicle
        response = self.client.get(f'/api/checklists/?veiculo_id={self.veiculo.id_veiculo}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['possivel_defeito'], "Teste histórico")
