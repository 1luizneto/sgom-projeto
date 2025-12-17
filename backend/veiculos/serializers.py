from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import Veiculo
from usuarios.models import Cliente

class VeiculoSerializer(serializers.ModelSerializer):
    placa = serializers.CharField(
        max_length=10,
        validators=[UniqueValidator(queryset=Veiculo.objects.all(), message="Placa já cadastrada")]
    )
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all(), required=True)

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

    def validate(self, attrs):
        required_fields = ['placa', 'modelo', 'marca', 'ano', 'cliente']
        for field in required_fields:
            if attrs.get(field) in [None, '']:
                raise serializers.ValidationError({field: 'Este campo é obrigatório.'})
        # Ano básico: deve ser >= 1886 (primeiro automóvel) e <= ano atual + 1
        try:
            ano_val = int(attrs.get('ano'))
        except (TypeError, ValueError):
            raise serializers.ValidationError({'ano': 'Ano inválido.'})
        return attrs
