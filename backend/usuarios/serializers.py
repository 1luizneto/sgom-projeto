from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import Mecanico

class MecanicoSerializer(serializers.ModelSerializer):
    cpf = serializers.CharField(
        max_length=14,
        validators=[UniqueValidator(queryset=Mecanico.objects.all(), message="CPF já cadastrado.")]
    )

    class Meta:
        model = Mecanico
        fields = ['id_mecanico', 'nome', 'cpf', 'telefone', 'email', 'endereco']
        extra_kwargs = {
            'nome': {'required': True},
            'cpf': {'required': True},
            'telefone': {'required': True},
            'email': {'required': True},
            'endereco': {'required': True},
        }

    def validate(self, attrs):
        # Garantir campos obrigatórios (defensivo, além de extra_kwargs)
        required_fields = ['nome', 'cpf', 'telefone', 'email', 'endereco']
        for field in required_fields:
            if not attrs.get(field):
                raise serializers.ValidationError({field: 'Este campo é obrigatório.'})
        return attrs