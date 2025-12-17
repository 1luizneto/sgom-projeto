from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import Mecanico

class MecanicoSerializer(serializers.ModelSerializer):
    cpf = serializers.CharField(
        max_length=14,
        validators=[UniqueValidator(queryset=Mecanico.objects.all(), message="CPF já vinculado a outro funcionário")]
    )

    class Meta:
        model = Mecanico
        fields = ['id_mecanico', 'nome', 'cpf', 'telefone', 'email', 'endereco']
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