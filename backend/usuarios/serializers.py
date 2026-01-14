from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from .models import Mecanico, Cliente, Fornecedor, Administrador

class MecanicoSerializer(serializers.ModelSerializer):
    cpf = serializers.CharField(
        max_length=14,
        validators=[UniqueValidator(queryset=Mecanico.objects.all(), message="CPF já vinculado a outro funcionário")]
    )

    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = Mecanico
        fields = ['id_mecanico', 'nome', 'cpf', 'telefone', 'email', 'endereco', 'password']
        extra_kwargs = {
            'nome': {
                'required': True,
                'error_messages': {
                    'blank': 'Este campo é obrigatório.',
                    'required': 'Este campo é obrigatório.',
                }
            },
            'cpf': {
                'required': True,
                'error_messages': {
                    'blank': 'Este campo é obrigatório.',
                    'required': 'Este campo é obrigatório.',
                }
            },
            'telefone': {
                'required': True,
                'error_messages': {
                    'blank': 'Este campo é obrigatório.',
                    'required': 'Este campo é obrigatório.',
                }
            },
            'email': {
                'required': True,
                'error_messages': {
                    'blank': 'Este campo é obrigatório.',
                    'required': 'Este campo é obrigatório.',
                }
            },
            'endereco': {
                'required': True,
                'error_messages': {
                    'blank': 'Este campo é obrigatório.',
                    'required': 'Este campo é obrigatório.',
                }
            },
        }

    def validate(self, attrs):
        # Garantir campos obrigatórios (defensivo, além de extra_kwargs)
        required_fields = ['nome', 'cpf', 'telefone', 'email', 'endereco']
        for field in required_fields:
            if not attrs.get(field):
                raise serializers.ValidationError({field: 'Este campo é obrigatório.'})
        return attrs
    
    def create(self, validated_data):
        # 1. Remove a senha dos dados (pois ela não vai para o model Mecanico)
        password = validated_data.pop('password')
        email = validated_data.get('email')
        cpf = validated_data.get('cpf')

        # 2. Cria o User do Django (para login)
        # Usaremos o CPF ou Email como username para evitar duplicidade
        user = User.objects.create_user(
            username=cpf, # O Login será feito com o CPF
            email=email,
            password=password
        )

        # 3. Cria o Mecânico e vincula ao User
        mecanico = Mecanico.objects.create(user=user, **validated_data)
        
        return mecanico

class ClienteSerializer(serializers.ModelSerializer):
    cpf = serializers.CharField(
        max_length=14,
        validators=[UniqueValidator(queryset=Cliente.objects.all(), message="CPF já vinculado a outro cliente")]
    )

    password = serializers.CharField(
        write_only=True, 
        required=True, 
        style={'input_type': 'password'}
    )

    class Meta:
        model = Cliente
        fields = ['id_cliente', 'nome', 'cpf', 'telefone', 'email', 'endereco', 'password'
        ]
        extra_kwargs = {
            'nome': {
                'required': True,
                'error_messages': {
                    'blank': 'Este campo é obrigatório.',
                    'required': 'Este campo é obrigatório.',
                }
            },
            'cpf': {
                'required': True,
                'error_messages': {
                    'blank': 'Este campo é obrigatório.',
                    'required': 'Este campo é obrigatório.',
                }
            },
            'telefone': {
                'required': True,
                'error_messages': {
                    'blank': 'Este campo é obrigatório.',
                    'required': 'Este campo é obrigatório.',
                }
            },
            'email': {
                'required': True,
                'error_messages': {
                    'blank': 'Este campo é obrigatório.',
                    'required': 'Este campo é obrigatório.',
                }
            },
            'endereco': {
                'required': True,
                'error_messages': {
                    'blank': 'Este campo é obrigatório.',
                    'required': 'Este campo é obrigatório.',
                }
            },
        }

    def validate(self, attrs):
        required_fields = ['nome', 'cpf', 'telefone', 'email', 'endereco']
        for field in required_fields:
            if not attrs.get(field):
                raise serializers.ValidationError({field: 'Este campo é obrigatório.'})
        return attrs
    
class FornecedorSerializer(serializers.ModelSerializer):
    # Campos para criar o usuário vinculado
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    email = serializers.EmailField(write_only=True, required=False)

    class Meta:
        model = Fornecedor
        fields = ['id', 'nome', 'cnpj', 'telefone', 'endereco', 'password', 'email']

    def create(self, validated_data):
        password = validated_data.pop('password')
        email = validated_data.pop('email', '')
        
        # 1. Cria o Usuário de Acesso (Username = CNPJ)
        user = User.objects.create_user(
            username=validated_data['cnpj'], # Credencial de acesso
            password=password,
            email=email
        )
        
        # 2. Cria o Fornecedor vinculado
        fornecedor = Fornecedor.objects.create(user=user, **validated_data)
        return fornecedor

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        # Inicializa flags
        is_mecanico = False
        is_cliente = False
        is_fornecedor = False
        is_admin = False
        user_name = user.username

        # Verifica tipo de usuário
        if user.is_staff or user.is_superuser:  
            is_admin = True
            if hasattr(user, 'administrador'):
                user_name = user.administrador.nome
            else:
                user_name = user.username
        elif hasattr(user, 'mecanico'):
            is_mecanico = True
            user_name = user.mecanico.nome
        elif hasattr(user, 'cliente'):
            is_cliente = True
            user_name = user.cliente.nome
        elif hasattr(user, 'fornecedor'):
            is_fornecedor = True
            user_name = user.fornecedor.nome

        # Adiciona ao payload
        data['is_mecanico'] = is_mecanico
        data['is_cliente'] = is_cliente
        data['is_fornecedor'] = is_fornecedor
        data['is_admin'] = is_admin  
        data['user_name'] = user_name

        return data

class AdministradorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Administrador
        fields = ['id_admin', 'nome', 'email', 'telefone']
        read_only_fields = ['id_admin']