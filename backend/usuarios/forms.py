from django import forms
from .models import Mecanico

class MecanicoForm(forms.ModelForm):
    class Meta:
        model = Mecanico
        fields = ['nome', 'cpf', 'telefone', 'email', 'endereco']   

    def clean_cpf(self):
        cpf = self.cleaned_data.get('cpf')
        if Mecanico.objects.filter(cpf=cpf).exists():
            raise forms.ValidationError("CPF já cadastrado.")
        return cpf
    
    def clean_email(self):
        email = self.cleaned_data.get('email')
        if Mecanico.objects.filter(email=email).exists():
            raise forms.ValidationError("Email já cadastrado.")
        return email
    

    
   
    
