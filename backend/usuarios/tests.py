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
            'password': 'senha_segura_123'
        }

        # When confirmo o cadastro
        response = self.client.post(self.url_list, payload, format='json')

        # Then deve retornar sucesso e mensagem
        self.assertEqual(response.status_code, 201)
        self.assertIn('message', response.data)
        self.assertEqual(response.data['message'], 'Mecânico cadastrado com sucesso')
        self.assertIn('credenciais', response.data)
        self.assertIn('username', response.data['credenciais'])

        mec = Mecanico.objects.get(cpf=cpf)
        self.assertIsNotNone(mec.user)
        self.assertTrue(mec.user.check_password('senha_segura_123')) # Verifica se a senha salva é a que enviamos

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
        self.assertIn('Senha:', email_sent.body)

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
        self.url = reverse('cliente-list')

    def test_cadastro_novo_cliente_com_sucesso(self):
        # Given que não existe cliente com o CPF
        cpf = '111.222.333-44'
        self.assertFalse(Cliente.objects.filter(cpf=cpf).exists())

        # When tento cadastrar (AGORA COM TODOS OS CAMPOS)
        payload = {
            'nome': 'João da Silva',
            'cpf': cpf,
            'telefone': '(11) 91234-5678',
            'email': 'joao.silva@email.com',   # Novo obrigatório
            'endereco': 'Rua dos Clientes, 100', # Novo obrigatório
            'password': 'senha_segura_123'       # Novo obrigatório
        }
        response = self.client.post(self.url, payload, format='json')

        # Then deve retornar 201 Created
        self.assertEqual(response.status_code, 201)
        
        # Verifica se criou no banco
        cliente = Cliente.objects.get(cpf=cpf)
        self.assertIsNotNone(cliente.user) # Tem que ter usuário vinculado
        self.assertEqual(cliente.email, 'joao.silva@email.com')

    def test_validacao_campos_obrigatorios(self):
        # When tento cadastrar vazio
        response = self.client.post(self.url, {}, format='json')
        
        # Then deve retornar 400
        self.assertEqual(response.status_code, 400)
        errors = response.data
        self.assertIn('nome', errors)
        self.assertIn('cpf', errors)
        self.assertIn('password', errors) # Agora senha é obrigatória

    def test_impedir_cpf_duplicado(self):
        # Given um cliente já existe
        cpf = '555.666.777-88'
        user = User.objects.create_user(username='olduser', password='123')
        Cliente.objects.create(
            user=user,
            nome='Cliente Antigo', 
            cpf=cpf, 
            telefone='111',
            email='antigo@email.com',
            endereco='Rua A'
        )

        # When tento cadastrar outro com mesmo CPF
        payload = {
            'nome': 'Impostor',
            'cpf': cpf,
            'telefone': '222',
            'email': 'novo@email.com',
            'endereco': 'Rua B',
            'password': '123'
        }
        response = self.client.post(self.url, payload, format='json')

        # Then deve falhar
        self.assertEqual(response.status_code, 400)
        self.assertIn('cpf', response.data)

    def test_exclusao_cliente_remove_usuario(self):
        # Cria cliente completo pra deletar depois
        payload = {
            'nome': 'Para Deletar',
            'cpf': '999.888.777-66',
            'telefone': '000',
            'email': 'delete@me.com',
            'endereco': 'Rua Fim',
            'password': '123'
        }
        create_resp = self.client.post(self.url, payload, format='json')
        self.assertEqual(create_resp.status_code, 201)
        
        cliente_id = create_resp.data['id_cliente']
        username = create_resp.data['credenciais']['username']

        # When deleto o cliente
        del_url = reverse('cliente-detail', args=[cliente_id])
        # Aqui precisamos de autenticação se sua View exigir, mas como deixamos AllowAny...
        response = self.client.delete(del_url)

        # Then
        self.assertEqual(response.status_code, 204)
        # O Cliente sumiu
        self.assertFalse(Cliente.objects.filter(id_cliente=cliente_id).exists())
