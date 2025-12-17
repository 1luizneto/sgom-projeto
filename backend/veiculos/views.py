from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth.models import User
from django.utils.crypto import get_random_string
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from usuarios.models import Cliente
from .models import Veiculo
from .serializers import VeiculoSerializer

class VeiculoViewSet(viewsets.ModelViewSet):
    queryset = Veiculo.objects.select_related('cliente').all()
    serializer_class = VeiculoSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()

# Remover exigência de login para permitir pré-visualização da UI
# @login_required
def cadastrar_veiculo(request):
    if request.method == 'GET':
        clientes = Cliente.objects.all().order_by('nome')
        return render(request, 'veiculos/cadastrar_veiculo.html', { 'clientes': clientes })

    # POST
    placa = request.POST.get('placa', '').strip()
    modelo = request.POST.get('modelo', '').strip()
    marca = request.POST.get('marca', '').strip()
    ano = request.POST.get('ano', '').strip()

    cliente_id = request.POST.get('cliente')
    cliente = None

    # Dados de cadastro rápido de cliente
    novo_nome = request.POST.get('novo_nome', '').strip()
    novo_cpf = request.POST.get('novo_cpf', '').strip()
    novo_email = request.POST.get('novo_email', '').strip()
    novo_telefone = request.POST.get('novo_telefone', '').strip()
    novo_endereco = request.POST.get('novo_endereco', '').strip()

    # Vincular cliente existente ou criar novo rapidamente
    if cliente_id:
        try:
            cliente = Cliente.objects.get(id_cliente=cliente_id)
        except Cliente.DoesNotExist:
            messages.error(request, 'Cliente selecionado não encontrado.')
    else:
        # Criar cliente rapidamente, se fornecidos os dados mínimos
        if novo_nome and novo_cpf and novo_telefone and novo_endereco:
            # Criar usuário/credenciais semelhantes à ClienteViewSet
            base_username = (novo_email.split('@')[0] if novo_email else novo_nome.split(' ')[0].lower())
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            password = get_random_string(length=10)
            user = User.objects.create_user(username=username, email=(novo_email or ''), password=password)
            user.first_name = novo_nome
            user.save()

            cliente = Cliente.objects.create(
                user=user,
                nome=novo_nome,
                cpf=novo_cpf,
                telefone=novo_telefone,
                email=(novo_email or None),
                endereco=novo_endereco,
            )

            # Envio de email com credenciais (se email fornecido)
            if novo_email:
                subject = 'Credenciais de acesso - SGOM'
                message = (
                    f"Olá {novo_nome},\n\n"
                    f"Seu acesso foi criado.\n"
                    f"Login: {username}\n"
                    f"Senha provisória: {password}\n\n"
                    f"Por favor, altere sua senha no primeiro acesso."
                )
                from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@sgom.local')
                try:
                    send_mail(subject, message, from_email, [novo_email], fail_silently=True)
                except Exception:
                    pass
        else:
            messages.error(request, 'Selecione um cliente existente ou informe os dados para cadastro rápido.')

    # Se já temos um cliente, tentar criar o veículo
    context = { 'clientes': Cliente.objects.all().order_by('nome') }
    if cliente:
        data = {
            'placa': placa,
            'modelo': modelo,
            'marca': marca,
            'ano': ano,
            'cliente': cliente.id_cliente,
        }
        serializer = VeiculoSerializer(data=data)
        if serializer.is_valid():
            veiculo = serializer.save()
            messages.success(request, 'Veículo cadastrado com sucesso!')
            return redirect('cadastrar_veiculo')
        else:
            # Exibir erros no formulário
            context['errors'] = serializer.errors
            context['form_data'] = data
    else:
        # Repopular dados do formulário caso erro
        context['form_data'] = {
            'placa': placa,
            'modelo': modelo,
            'marca': marca,
            'ano': ano,
            'cliente': cliente_id,
            'novo_nome': novo_nome,
            'novo_cpf': novo_cpf,
            'novo_email': novo_email,
            'novo_telefone': novo_telefone,
            'novo_endereco': novo_endereco,
        }

    return render(request, 'veiculos/cadastrar_veiculo.html', context)
