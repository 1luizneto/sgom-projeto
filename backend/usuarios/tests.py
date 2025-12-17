from rest_framework.test import APITestCase
from django.urls import reverse
from django.contrib.auth.models import User
from django.core import mail
from django.test import override_settings
from usuarios.models import Mecanico, Cliente


class PB19CadastroMecanicosTests(APITestCase):
    def setUp(self):
        # Background: administrador autenticado
        self.admin_user = User.objects.create_superuser(
            username='admin', email='admin@sgom.local', password='adminpass'
        )
        self.client.force_authenticate(user=self.admin_user)
        self.url_list = reverse('mecanico-list')

    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
        DEFAULT_FROM_EMAIL='no-reply@sgom.local'
    )
    def test_cadastro_novo_mecanico_com_sucesso(self):
        # Given que não existe nenhum mecânico com o CPF
        cpf = '222.333.444-55'
        self.assertFalse(Mecanico.objects.filter(cpf=cpf).exists())

        payload = {
            'nome': 'Roberto Alves',
            'cpf': cpf,
            'email': 'roberto.alves@oficina.com',
            'telefone': '(83) 99999-1111',
            'endereco': 'Rua das Oficinas, 10',
        }

        # When confirmo o cadastro
        response = self.client.post(self.url_list, payload, format='json')

        # Then deve retornar sucesso e mensagem
        self.assertEqual(response.status_code, 201)
        self.assertIn('message', response.data)
        self.assertEqual(response.data['message'], 'Mecânico cadastrado com sucesso')
        self.assertIn('credenciais', response.data)
        self.assertIn('username', response.data['credenciais'])
        self.assertIn('password', response.data['credenciais'])

        # And o mecânico deve aparecer na lista de funcionários
        self.assertTrue(Mecanico.objects.filter(cpf=cpf, nome='Roberto Alves').exists())
        list_response = self.client.get(self.url_list)
        self.assertEqual(list_response.status_code, 200)
        nomes = [m['nome'] for m in list_response.data]
        self.assertIn('Roberto Alves', nomes)

        # And o sistema envia credenciais por email
        self.assertEqual(len(mail.outbox), 1)
        email_sent = mail.outbox[0]
        self.assertIn('roberto.alves@oficina.com', email_sent.to)
        self.assertIn('Login:', email_sent.body)
        self.assertIn('Senha provisória:', email_sent.body)

        # And o usuário de autenticação é criado e vinculado
        mecanico = Mecanico.objects.get(cpf=cpf)
        self.assertIsNotNone(mecanico.user)
        self.assertEqual(mecanico.user.email, 'roberto.alves@oficina.com')

    def test_tentativa_cadastro_com_cpf_duplicado(self):
        # Given já existe um funcionário com o CPF
        cpf = '555.666.777-88'
        Mecanico.objects.create(
            nome='Funcionario Existente',
            cpf=cpf,
            telefone='(83) 98888-7777',
            email='existente@oficina.com',
            endereco='Rua A, 1',
        )

        # When tento cadastrar novo mecânico com o mesmo CPF
        payload = {
            'nome': 'Outro Mecanico',
            'cpf': cpf,
            'email': 'novo@oficina.com',
            'telefone': '(83) 97777-6666',
            'endereco': 'Rua B, 2',
        }
        response = self.client.post(self.url_list, payload, format='json')

        # Then o sistema impede gravação e exibe mensagem de erro
        self.assertEqual(response.status_code, 400)
        self.assertIn('cpf', response.data)
        self.assertIn('CPF já vinculado a outro funcionário', response.data['cpf'][0])

    def test_validacao_de_campos_obrigatorios(self):
        # Nome em branco
        payload_nome_branco = {
            'nome': '',
            'cpf': '111.222.333-44',
            'email': 'teste@oficina.com',
            'telefone': '(83) 90000-0000',
            'endereco': 'Rua Teste, 1',
        }
        resp1 = self.client.post(self.url_list, payload_nome_branco, format='json')
        self.assertEqual(resp1.status_code, 400)
        self.assertIn('nome', resp1.data)
        self.assertIn('Este campo é obrigatório.', resp1.data['nome'][0])

        # Email ausente
        payload_sem_email = {
            'nome': 'Sem Email',
            'cpf': '111.222.333-45',
            'telefone': '(83) 90000-0001',
            'endereco': 'Rua Teste, 2',
        }
        resp2 = self.client.post(self.url_list, payload_sem_email, format='json')
        self.assertEqual(resp2.status_code, 400)
        self.assertIn('email', resp2.data)
        self.assertIn('Este campo é obrigatório.', resp2.data['email'][0])


class PB03CadastroClientesTests(APITestCase):
    def setUp(self):
        # Background: administrador autenticado
        self.admin_user = User.objects.create_superuser(
            username='admin2', email='admin2@sgom.local', password='adminpass2'
        )
        self.client.force_authenticate(user=self.admin_user)
        self.url_list = reverse('cliente-list')

    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
        DEFAULT_FROM_EMAIL='no-reply@sgom.local'
    )
    def test_cadastro_novo_cliente_com_sucesso(self):
        cpf = '123.456.789-00'
        self.assertFalse(Cliente.objects.filter(cpf=cpf).exists())

        payload = {
            'nome': 'Maria Silva',
            'cpf': cpf,
            'email': 'maria.silva@cliente.com',
            'telefone': '(83) 98888-7777',
            'endereco': 'Rua Central, 100',
        }

        response = self.client.post(self.url_list, payload, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertIn('message', response.data)
        self.assertEqual(response.data['message'], 'Cliente cadastrado com sucesso')
        self.assertIn('credenciais', response.data)
        self.assertIn('username', response.data['credenciais'])
        self.assertIn('password', response.data['credenciais'])

        self.assertTrue(Cliente.objects.filter(cpf=cpf, nome='Maria Silva').exists())
        list_response = self.client.get(self.url_list)
        self.assertEqual(list_response.status_code, 200)
        nomes = [c['nome'] for c in list_response.data]
        self.assertIn('Maria Silva', nomes)

        self.assertEqual(len(mail.outbox), 1)
        email_sent = mail.outbox[0]
        self.assertIn('maria.silva@cliente.com', email_sent.to)
        self.assertIn('Login:', email_sent.body)
        self.assertIn('Senha provisória:', email_sent.body)

        cliente = Cliente.objects.get(cpf=cpf)
        self.assertIsNotNone(cliente.user)
        self.assertEqual(cliente.user.email, 'maria.silva@cliente.com')

    def test_tentativa_cadastro_cliente_com_cpf_duplicado(self):
        cpf = '999.888.777-66'
        Cliente.objects.create(
            nome='Cliente Existente',
            cpf=cpf,
            telefone='(83) 90000-0002',
            email='existente@cliente.com',
            endereco='Rua X, 3',
        )

        payload = {
            'nome': 'Outro Cliente',
            'cpf': cpf,
            'email': 'novo@cliente.com',
            'telefone': '(83) 90000-0003',
            'endereco': 'Rua Y, 4',
        }
        response = self.client.post(self.url_list, payload, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('cpf', response.data)
        self.assertIn('CPF já vinculado a outro cliente', response.data['cpf'][0])

    def test_validacao_de_campos_obrigatorios_cliente(self):
        # Nome em branco
        payload_nome_branco = {
            'nome': '',
            'cpf': '111.111.111-11',
            'email': 'cliente@teste.com',
            'telefone': '(83) 90000-0101',
            'endereco': 'Rua Teste, 10',
        }
        resp1 = self.client.post(self.url_list, payload_nome_branco, format='json')
        self.assertEqual(resp1.status_code, 400)
        self.assertIn('nome', resp1.data)
        self.assertIn('Este campo é obrigatório.', resp1.data['nome'][0])

        # Email ausente
        payload_sem_email = {
            'nome': 'Cliente Sem Email',
            'cpf': '222.222.222-22',
            'telefone': '(83) 90000-0102',
            'endereco': 'Rua Teste, 11',
        }
        resp2 = self.client.post(self.url_list, payload_sem_email, format='json')
        self.assertEqual(resp2.status_code, 400)
        self.assertIn('email', resp2.data)
        self.assertIn('Este campo é obrigatório.', resp2.data['email'][0])

    def test_exclusao_cliente_remove_usuario(self):
        # Criar cliente e capturar usuário vinculado
        payload = {
            'nome': 'Carlos Souza',
            'cpf': '333.444.555-66',
            'email': 'carlos.souza@cliente.com',
            'telefone': '(83) 90000-0103',
            'endereco': 'Rua Teste, 12',
        }
        create_resp = self.client.post(self.url_list, payload, format='json')
        self.assertEqual(create_resp.status_code, 201)
        cliente_id = create_resp.data.get('id_cliente')
        cliente = Cliente.objects.get(id_cliente=cliente_id)
        user_id = cliente.user.id

        # Excluir cliente
        url_detail = reverse('cliente-detail', args=[cliente_id])
        delete_resp = self.client.delete(url_detail)
        self.assertEqual(delete_resp.status_code, 204)

        # Verificar remoção de cliente e usuário
        self.assertFalse(Cliente.objects.filter(id_cliente=cliente_id).exists())
        self.assertFalse(User.objects.filter(id=user_id).exists())
