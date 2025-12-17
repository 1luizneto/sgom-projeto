from rest_framework.test import APITestCase
from django.urls import reverse
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from django.test import override_settings
from django.core import mail
from usuarios.models import Cliente, Mecanico
from veiculos.models import Veiculo, Servico, Agendamento


class PB01AgendamentoTests(APITestCase):
    def setUp(self):
        # Usuário autenticado (mecânico)
        self.mecanico_user = User.objects.create_user(username='mec_pb01', email='mec.pb01@sgom.local', password='mecpass01')
        self.client.force_authenticate(user=self.mecanico_user)
        # Mecanico vinculado ao usuário
        self.mecanico = Mecanico.objects.create(
            nome='Mecânico PB01',
            cpf='111.222.333-44',
            telefone='(83) 91111-2222',
            email='mecanico.pb01@sgom.local',
            endereco='Rua dos Mecânicos, 1',
            user=self.mecanico_user,
        )
        # Cliente e veículo
        self.cliente = Cliente.objects.create(
            nome='Cliente PB01',
            cpf='555.666.777-88',
            telefone='(83) 92222-3333',
            email='cliente.pb01@sgom.local',
            endereco='Rua dos Clientes, 2',
        )
        self.veiculo = Veiculo.objects.create(
            placa='PB01-1234',
            modelo='Fiesta',
            marca='Ford',
            ano=2015,
            cliente=self.cliente,
        )
        # Serviço
        self.servico = Servico.objects.create(descricao='Troca de Óleo', preco_base=120.00)
        # URLs
        self.url_list = reverse('agendamento-list')
        self.url_futuros = reverse('agendamento-futuros')

    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
        DEFAULT_FROM_EMAIL='no-reply@sgom.local'
    )
    def test_criar_agendamento_com_sucesso_envia_notificacao(self):
        inicio = (timezone.now() + timedelta(days=1, hours=2)).isoformat()
        fim = (timezone.now() + timedelta(days=1, hours=3)).isoformat()
        payload = {
            'cliente': self.cliente.id_cliente,
            'veiculo': self.veiculo.id_veiculo,
            'mecanico': self.mecanico.id_mecanico,
            'servico': self.servico.id_servico,
            'horario_inicio': inicio,
            'horario_fim': fim,
            'preco': '200.00',
        }
        resp = self.client.post(self.url_list, payload, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(Agendamento.objects.filter(cliente=self.cliente, veiculo=self.veiculo, mecanico=self.mecanico).exists())
        # Campos derivados para PB02
        self.assertIn('cliente_nome', resp.data)
        self.assertIn('veiculo_placa', resp.data)
        self.assertIn('veiculo_modelo', resp.data)
        self.assertIn('servico_descricao', resp.data)
        # Email de confirmação
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(self.cliente.email, mail.outbox[0].to)
        self.assertIn('Agendamento confirmado', mail.outbox[0].subject)

    def test_validacao_campos_obrigatorios(self):
        # Ausentando vários campos obrigatórios
        payload = {
            'preco': '150.00'
        }
        resp = self.client.post(self.url_list, payload, format='json')
        self.assertEqual(resp.status_code, 400)
        # Espera erros nos campos obrigatórios ausentes
        for field in ['cliente', 'veiculo', 'mecanico', 'servico', 'horario_inicio']:
            self.assertIn(field, resp.data)
        # Mensagem localizada para horario_inicio
        self.assertIn('Este campo é obrigatório.', [str(e) for e in resp.data['horario_inicio']])

    def test_agendamento_no_passado_deve_falhar(self):
        inicio = (timezone.now() - timedelta(hours=2)).isoformat()
        payload = {
            'cliente': self.cliente.id_cliente,
            'veiculo': self.veiculo.id_veiculo,
            'mecanico': self.mecanico.id_mecanico,
            'servico': self.servico.id_servico,
            'horario_inicio': inicio,
            'preco': '120.00',
        }
        resp = self.client.post(self.url_list, payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('horario_inicio', resp.data)
        self.assertIn('Não é possível agendar no passado.', resp.data['horario_inicio'])

    def test_horario_fim_antes_do_inicio_deve_falhar(self):
        inicio = timezone.now() + timedelta(days=1)
        fim = inicio - timedelta(minutes=30)
        payload = {
            'cliente': self.cliente.id_cliente,
            'veiculo': self.veiculo.id_veiculo,
            'mecanico': self.mecanico.id_mecanico,
            'servico': self.servico.id_servico,
            'horario_inicio': inicio.isoformat(),
            'horario_fim': fim.isoformat(),
            'preco': '180.00',
        }
        resp = self.client.post(self.url_list, payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('horario_fim', resp.data)
        self.assertIn('O fim deve ser após o início.', resp.data['horario_fim'])

    def test_conflito_agendamento_para_mesmo_mecanico(self):
        base_inicio = timezone.now() + timedelta(days=1, hours=1)
        Agendamento.objects.create(
            cliente=self.cliente,
            veiculo=self.veiculo,
            mecanico=self.mecanico,
            servico=self.servico,
            horario_inicio=base_inicio,
            horario_fim=base_inicio + timedelta(hours=1),
            preco=200.00,
        )
        # Tentativa de agendar que se sobrepõe (começa 30min depois, ainda dentro do slot existente)
        payload = {
            'cliente': self.cliente.id_cliente,
            'veiculo': self.veiculo.id_veiculo,
            'mecanico': self.mecanico.id_mecanico,
            'servico': self.servico.id_servico,
            'horario_inicio': (base_inicio + timedelta(minutes=30)).isoformat(),
            'horario_fim': (base_inicio + timedelta(hours=2)).isoformat(),
            'preco': '220.00',
        }
        resp = self.client.post(self.url_list, payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('horario_inicio', resp.data)
        self.assertIn('Horário já ocupado para o mecânico.', resp.data['horario_inicio'])

    def test_veiculo_deve_pertencer_ao_cliente(self):
        outro_cliente = Cliente.objects.create(
            nome='Outro Cliente', cpf='999.000.111-22', telefone='(83) 93333-4444', email='outro@sgom.local', endereco='Rua Outra, 3'
        )
        inicio = timezone.now() + timedelta(days=1)
        payload = {
            'cliente': outro_cliente.id_cliente,
            'veiculo': self.veiculo.id_veiculo,  # veiculo pertence ao self.cliente, não ao outro_cliente
            'mecanico': self.mecanico.id_mecanico,
            'servico': self.servico.id_servico,
            'horario_inicio': inicio.isoformat(),
            'preco': '150.00',
        }
        resp = self.client.post(self.url_list, payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('veiculo', resp.data)
        self.assertIn('O veículo selecionado não pertence ao cliente informado.', resp.data['veiculo'])


class PB02AgendamentosFuturosTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='user_pb02', email='user.pb02@sgom.local', password='userpass02')
        self.client.force_authenticate(user=self.user)
        self.mecanico = Mecanico.objects.create(
            nome='Mec PB02', cpf='333.444.555-66', telefone='(83) 94444-5555', email='mec.pb02@sgom.local', endereco='Rua PB02, 10'
        )
        self.cliente = Cliente.objects.create(
            nome='Cliente PB02', cpf='777.888.999-00', telefone='(83) 95555-6666', email='cliente.pb02@sgom.local', endereco='Rua PB02, 20'
        )
        self.veiculo = Veiculo.objects.create(
            placa='PB02-5678', modelo='Onix', marca='Chevrolet', ano=2019, cliente=self.cliente
        )
        self.servico = Servico.objects.create(descricao='Revisão Completa', preco_base=300.00)
        self.url_futuros = reverse('agendamento-futuros')

    def test_listar_agendamentos_futuros_em_ordem_cronologica(self):
        agora = timezone.now()
        # Um passado, dois futuros
        Agendamento.objects.create(
            cliente=self.cliente, veiculo=self.veiculo, mecanico=self.mecanico, servico=self.servico,
            horario_inicio=agora - timedelta(days=1), horario_fim=(agora - timedelta(days=1)) + timedelta(hours=1), preco=100.00
        )
        a1 = Agendamento.objects.create(
            cliente=self.cliente, veiculo=self.veiculo, mecanico=self.mecanico, servico=self.servico,
            horario_inicio=agora + timedelta(days=1), horario_fim=agora + timedelta(days=1, hours=1), preco=200.00
        )
        a2 = Agendamento.objects.create(
            cliente=self.cliente, veiculo=self.veiculo, mecanico=self.mecanico, servico=self.servico,
            horario_inicio=agora + timedelta(days=2), horario_fim=agora + timedelta(days=2, hours=1), preco=220.00
        )
        resp = self.client.get(self.url_futuros)
        self.assertEqual(resp.status_code, 200)
        ids = [item['id_agendamento'] for item in resp.data]
        self.assertEqual(ids, [a1.id_agendamento, a2.id_agendamento])
        # Campos derivados presentes
        self.assertEqual(resp.data[0]['cliente_nome'], self.cliente.nome)
        self.assertEqual(resp.data[0]['servico_descricao'], self.servico.descricao)
        self.assertEqual(resp.data[0]['veiculo_placa'], self.veiculo.placa)
        self.assertEqual(resp.data[0]['veiculo_modelo'], self.veiculo.modelo)

    def test_ui_agenda_mecanico_renderiza_lista(self):
        # Criar futuros
        Agendamento.objects.create(
            cliente=self.cliente, veiculo=self.veiculo, mecanico=self.mecanico, servico=self.servico,
            horario_inicio=timezone.now() + timedelta(days=1), preco=180.00
        )
        url_ui = reverse('agenda_mecanico')
        resp = self.client.get(url_ui)
        self.assertEqual(resp.status_code, 200)
        # Conteúdo básico esperado na página
        html = resp.content.decode(resp.charset or 'utf-8')
        self.assertIn('Agenda de Agendamentos Futuros', html)
        self.assertIn(self.servico.descricao, html)
        self.assertIn(self.veiculo.placa, html)