from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.utils.crypto import get_random_string
from django.core.mail import send_mail
from django.conf import settings
from .forms import MecanicoForm
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
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
    permission_classes = [IsAdminUser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        nome = serializer.validated_data['nome']
        base_username = email.split('@')[0]
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        password = get_random_string(length=10)
        user = User.objects.create_user(username=username, email=email, password=password)
        user.first_name = nome
        user.save()

        mecanico = Mecanico.objects.create(user=user, **serializer.validated_data)

        # Enviar credenciais por email conforme requisito pb19
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
            send_mail(subject, message, from_email, [email], fail_silently=True)
        except Exception:
            pass

        data = MecanicoSerializer(mecanico).data
        data['credenciais'] = { 'username': username, 'password': password }
        data['message'] = 'Mecânico cadastrado com sucesso'
        headers = self.get_success_headers(data)
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    def destroy(self, request, *args, **kwargs):
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
