from django import forms
from .models import Agendamento

class AgendamentoForm(forms.ModelForm):
    class Meta:
        model = Agendamento
        fields = [
            'cliente',
            'veiculo',
            'servico_desejado',
            'data',
            'hora_inicio',
            'preco_estimado'
        ]
       
       
    def clean(self):
        cleaned_data = super().clean()
        data = cleaned_data.get('data')
        hora = cleaned_data.get('hora_inicio')

        if data and hora:
            exits = Agendamento.objects.filter(data=data, hora_inicio=hora).exists()
            if exits:
                raise forms.ValidationError("Horário indisponível para esta data.")  
        return cleaned_data