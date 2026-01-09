from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.utils.crypto import get_random_string
from django.core.mail import send_mail
from django.conf import settings
from .forms import MecanicoForm
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny
from .models import Mecanico, Cliente
from .serializers import MecanicoSerializer, ClienteSerializer


def cadastrar_mecanico(request):
    if request.method == 'POST':
        form = MecanicoForm(request.POST)
        if form.is_valid():
            mecanico = form.save()
            return redirect('/')
    else:
        form = MecanicoForm()
    return render(request, 'usuarios/cadastrar_mecanico.html', {'form': form})


class MecanicoViewSet(viewsets.ModelViewSet):
    queryset = Mecanico.objects.all()
    serializer_class = MecanicoSerializer
    permission_classes = [AllowAny] 

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Copiamos os dados para manipular
        dados_validados = dict(serializer.validated_data)
        
        email = dados_validados.get('email')
        nome = dados_validados.get('nome')
        cpf = dados_validados.get('cpf')
        
        # 1. PEGAR SENHA (Obrigatória no serializer)
        # O pop remove 'password' dos dados para não quebrar o Mecanico.objects.create
        password = dados_validados.pop('password') 

        # 2. DEFINIR USERNAME
        if cpf:
            username = cpf.replace('.', '').replace('-', '') # Login via CPF
        else:
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

        # 3. CRIAR USUÁRIO DE LOGIN
        if User.objects.filter(username=username).exists():
             return Response({"error": "Usuário já existe"}, status=status.HTTP_400_BAD_REQUEST)
             
        user = User.objects.create_user(username=username, email=email, password=password)
        user.first_name = nome
        user.save()

        # 4. CRIAR MECÂNICO (Sem o campo password, pois fizemos pop)
        mecanico = Mecanico.objects.create(user=user, **dados_validados)

        # 5. ENVIAR E-MAIL (PB19 Requisito)
        subject = 'Bem-vindo ao SGOM - Cadastro Realizado'
        message = (
            f"Olá {nome},\n\n"
            f"Seu acesso foi criado com sucesso.\n"
            f"Login: {username}\n"
            # ATENÇÃO: Enviar senha por e-mail não é seguro, mas atende ao requisito de confirmação
            # Se preferir segurança, remova a linha abaixo.
            f"Senha: {password}\n\n" 
            f"Acesse o sistema para começar."
        )
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@sgom.local')
        try:
            send_mail(subject, message, from_email, [email], fail_silently=True)
        except Exception:
            pass

        # 6. RESPOSTA FINAL
        data = MecanicoSerializer(mecanico).data
        data['credenciais'] = { 'username': username } 
        data['message'] = 'Mecânico cadastrado com sucesso'
        headers = self.get_success_headers(data)
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    def destroy(self, request, *args, **kwargs):
        # ...existing code... (mantenha o destroy como estava)
        instance = self.get_object()
        user = instance.user
        response = super().destroy(request, *args, **kwargs)
        if user:
            user.delete()
        return response

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAdminUser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        nome = serializer.validated_data['nome']
        base_username = email.split('@')[0] if email else nome.split(' ')[0].lower()
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        password = get_random_string(length=10)
        user = User.objects.create_user(username=username, email=email or '', password=password)
        user.first_name = nome
        user.save()

        cliente = Cliente.objects.create(user=user, **serializer.validated_data)

        subject = 'Credenciais de acesso - SGOM'
        message = (
            f"Olá {nome},\n\n"
            f"Seu acesso foi criado.\n"
            f"Login: {username}\n"
            f"Senha provisória: {password}\n\n"
            f"Por favor, altere sua senha no primeiro acesso."
        )
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@sgom.local')
        try:
            if email:
                send_mail(subject, message, from_email, [email], fail_silently=True)
        except Exception:
            pass

        data = ClienteSerializer(cliente).data
        data['credenciais'] = { 'username': username, 'password': password }
        data['message'] = 'Cliente cadastrado com sucesso'
        headers = self.get_success_headers(data)
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = instance.user
        response = super().destroy(request, *args, **kwargs)
        if user:
            user.delete()
        return response
