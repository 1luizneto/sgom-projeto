from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django.shortcuts import render
from django.contrib import messages
from django.core.mail import send_mail
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Agendamento
from .serializers import VeiculoSerializer, AgendamentoSerializer, ServicoSerializer
from .models import Veiculo, Agendamento, Servico
from usuarios.models import Cliente, Mecanico
from django.utils import timezone
from datetime import datetime

class VeiculoViewSet(viewsets.ModelViewSet):
    queryset = Veiculo.objects.all()
    serializer_class = VeiculoSerializer
    permission_classes = [permissions.IsAuthenticated]

# PB01/PB02: Agendamentos
class AgendamentoViewSet(viewsets.ModelViewSet):
    queryset = Agendamento.objects.all().select_related('cliente', 'veiculo', 'mecanico', 'servico')
    serializer_class = AgendamentoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        agendamento = serializer.save()
        # notificação simples por email para o cliente (se email existir) e log para mecânico
        if agendamento.cliente.email:
            try:
                send_mail(
                    subject='SGOM: Agendamento confirmado',
                    message=(
                        f"Olá {agendamento.cliente.nome}, seu agendamento foi confirmado.\n"
                        f"Serviço: {agendamento.servico.descricao}\n"
                        f"Horário: {agendamento.horario_inicio}"
                    ),
                    from_email='no-reply@sgom.local',
                    recipient_list=[agendamento.cliente.email],
                    fail_silently=True,
                )
            except Exception:
                pass

    @action(detail=False, methods=['get'], url_path='futuros')
    def futuros(self, request):
        qs = self.get_queryset().filter(horario_inicio__gte=timezone.now()).order_by('horario_inicio')
        page = self.paginate_queryset(qs)
        if page is not None:
            ser = self.get_serializer(page, many=True)
            return self.get_paginated_response(ser.data)
        ser = self.get_serializer(qs, many=True)
        return Response(ser.data)

class ServicoViewSet(viewsets.ModelViewSet):
    """
    PB06 - CRUD de Serviços e Mão de Obra.
    Permite listar, criar, editar e excluir tipos de serviços.
    """
    queryset = Servico.objects.all()
    serializer_class = ServicoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly] 

# UI PB04 existente
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
    novo_cliente_criado = False

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
            i = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{i}"
                i += 1
            password = User.objects.make_random_password(length=10)
            user = User.objects.create_user(username=username, email=novo_email or '', password=password)
            cliente = Cliente.objects.create(
                nome=novo_nome,
                cpf=novo_cpf,
                telefone=novo_telefone,
                email=novo_email or None,
                endereco=novo_endereco,
                user=user,
            )
            novo_cliente_criado = True
            if novo_email:
                try:
                    send_mail(
                        subject='SGOM: Credenciais de acesso',
                        message=(
                            f"Olá {cliente.nome}, suas credenciais foram criadas.\n"
                            f"Usuário: {username}\nSenha: {password}"
                        ),
                        from_email='no-reply@sgom.local',
                        recipient_list=[novo_email],
                        fail_silently=True,
                    )
                except Exception:
                    pass
        else:
            messages.error(request, 'É obrigatório vincular o veículo a um cliente (existente ou novo)')

    # Persistir veículo via serializer
    data = {
        'placa': placa,
        'modelo': modelo,
        'marca': marca,
        'ano': ano,
        'cliente': cliente.id_cliente if cliente else None,
    }
    serializer = VeiculoSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        # Mensagens de sucesso conforme cenário
        if novo_cliente_criado:
            messages.success(request, 'Cliente e Veículo cadastrados com sucesso')
        else:
            messages.success(request, 'Veículo cadastrado com sucesso')
        clientes = Cliente.objects.all().order_by('nome')
        context = {
            'clientes': clientes,
            'form_data': {},
        }
        return render(request, 'veiculos/cadastrar_veiculo.html', context)
    else:
        clientes = Cliente.objects.all().order_by('nome')
        context = {
            'clientes': clientes,
            'errors': serializer.errors,
            'form_data': data,
        }
        return render(request, 'veiculos/cadastrar_veiculo.html', context)


@api_view(['GET'])
def agenda_mecanico(request):
    data_str = request.GET.get('data')
    context_extra = {}
    if data_str:
        try:
            selected_date = datetime.strptime(data_str, '%Y-%m-%d').date()
        except ValueError:
            selected_date = timezone.localdate()
        qs = Agendamento.objects.filter(horario_inicio__date=selected_date)
        context_extra['selected_date'] = selected_date
    else:
        # Padrão: listar agendamentos futuros
        qs = Agendamento.objects.filter(horario_inicio__gte=timezone.now())
    qs = qs.order_by('horario_inicio')
    if request.user and hasattr(request.user, 'mecanico'):
        qs = qs.filter(mecanico=request.user.mecanico)
    serializer = AgendamentoSerializer(qs, many=True)

    context = { 'agendamentos': serializer.data, **context_extra }
    return render(request, 'veiculos/agenda.html', context)
