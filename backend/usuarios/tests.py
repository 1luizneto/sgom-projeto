from rest_framework.test import APITestCase
from django.urls import reverse
from django.contrib.auth.models import User
from django.core import mail
from django.test import override_settings
from usuarios.models import Mecanico


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
