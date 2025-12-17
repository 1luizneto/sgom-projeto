from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.db.models import Q
from .models import Veiculo, Agendamento, Servico
from usuarios.models import Cliente, Mecanico
from django.utils import timezone

class VeiculoSerializer(serializers.ModelSerializer):
    placa = serializers.CharField(
        max_length=10,
        validators=[UniqueValidator(queryset=Veiculo.objects.all(), message="Placa já cadastrada")]
    )
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all(), required=True, error_messages={'required': 'Este campo é obrigatório.'})

    class Meta:
        model = Veiculo
        fields = ['id_veiculo', 'placa', 'modelo', 'marca', 'ano', 'cliente']
        extra_kwargs = {
            'placa': {
                'required': True,
                'error_messages': {
                    'blank': 'Este campo é obrigatório.',
                    'required': 'Este campo é obrigatório.',
                }
            },
            'modelo': {
                'required': True,
                'error_messages': {
                    'blank': 'Este campo é obrigatório.',
                    'required': 'Este campo é obrigatório.',
                }
            },
            'marca': {
                'required': True,
                'error_messages': {
                    'blank': 'Este campo é obrigatório.',
                    'required': 'Este campo é obrigatório.',
                }
            },
            'ano': {
                'required': True,
                'error_messages': {
                    'blank': 'Este campo é obrigatório.',
                    'required': 'Este campo é obrigatório.',
                }
            },
            'cliente': {
                'required': True,
                'error_messages': {
                    'required': 'Este campo é obrigatório.',
                }
            },
        }

class AgendamentoSerializer(serializers.ModelSerializer):
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all(), required=True)
    veiculo = serializers.PrimaryKeyRelatedField(queryset=Veiculo.objects.all(), required=True)
    mecanico = serializers.PrimaryKeyRelatedField(queryset=Mecanico.objects.all(), required=True)
    servico = serializers.PrimaryKeyRelatedField(queryset=Servico.objects.all(), required=True)
    cliente_nome = serializers.SerializerMethodField()
    veiculo_placa = serializers.SerializerMethodField()
    veiculo_modelo = serializers.SerializerMethodField()
    servico_descricao = serializers.SerializerMethodField()

    def get_cliente_nome(self, obj):
        return obj.cliente.nome

    def get_veiculo_placa(self, obj):
        return obj.veiculo.placa

    def get_veiculo_modelo(self, obj):
        return obj.veiculo.modelo

    def get_servico_descricao(self, obj):
        return obj.servico.descricao

    class Meta:
        model = Agendamento
        fields = [
            'id_agendamento', 'cliente', 'veiculo', 'mecanico', 'servico',
            'horario_inicio', 'horario_fim', 'preco', 'status', 'criado_em',
            'cliente_nome', 'veiculo_placa', 'veiculo_modelo', 'servico_descricao'
        ]
        read_only_fields = ['status', 'criado_em']
        extra_kwargs = {
            'horario_inicio': {
                'required': True,
                'error_messages': {
                    'blank': 'Este campo é obrigatório.',
                    'required': 'Este campo é obrigatório.',
                }
            },
            'preco': {
                'required': True,
                'error_messages': {
                    'blank': 'Este campo é obrigatório.',
                    'required': 'Este campo é obrigatório.',
                }
            },
        }

    def validate(self, attrs):
        cliente = attrs.get('cliente')
        veiculo = attrs.get('veiculo')
        mecanico = attrs.get('mecanico')
        servico = attrs.get('servico')
        inicio = attrs.get('horario_inicio')
        fim = attrs.get('horario_fim')
        preco = attrs.get('preco')

        # checagens básicas
        if not all([cliente, veiculo, mecanico, servico, inicio, preco]):
            raise serializers.ValidationError('Todos os campos obrigatórios devem ser preenchidos.')

        if inicio < timezone.now():
            raise serializers.ValidationError({'horario_inicio': ['Não é possível agendar no passado.']})
        if fim and fim <= inicio:
            raise serializers.ValidationError({'horario_fim': ['O fim deve ser após o início.']})

        # conflito de horário para o mecânico
        new_end = fim or (inicio + timezone.timedelta(hours=1))
        conflitos = Agendamento.objects.filter(mecanico=mecanico).filter(
            Q(horario_inicio__lt=new_end) & (
                Q(horario_fim__gt=inicio) | Q(horario_fim__isnull=True, horario_inicio__lt=new_end)
            )
        )
        if conflitos.exists():
            raise serializers.ValidationError({'horario_inicio': ['Horário já ocupado para o mecânico.']})

        # veiculo pertence ao cliente
        if veiculo.cliente_id != cliente.id_cliente:
            raise serializers.ValidationError({'veiculo': ['O veículo selecionado não pertence ao cliente informado.']})

        return attrs

    def create(self, validated_data):
        # permite camada superior definir mecanico a partir do request, mas mantém create padrão
        return super().create(validated_data)
    
class ServicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servico
        fields = ['id_servico', 'descricao', 'preco_base', 'detalhes_padrao']

    def validate_preco_base(self, value):
        """
        Validação específica para o campo preço (Cenário 3)
        """
        if value <= 0:
            raise serializers.ValidationError("O preço deve ser maior que zero.")
        return value
    
    def validate_descricao(self, value):
        """
        Validação para descrição vazia (Cenário 3)
        """
        if not value or value.strip() == "":
            raise serializers.ValidationError("A descrição do serviço é obrigatória.")
        return value
