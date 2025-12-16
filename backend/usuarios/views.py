from django.shortcuts import render, redirect
from django.utils.crypto import get_random_string
from .forms import MecanicoForm

def cadastrar_mecanico(request):
    if request.method == 'POST':
        form = MecanicoForm(request.POST)
        if form.is_valid():
            mecanico = form.save(commit=False)
            # Gera uma senha aleatória para o mecânico
            mecanico.usuario = mecanico.email.split('@')[0]  # Exemplo simples de usuário baseado no email
            senha_aleatoria = get_random_string(length=8)
            # Aqui você pode adicionar lógica para enviar a senha por email, se necessário
            mecanico.senha = senha_aleatoria
            mecanico.save()

            print(f"Senha gerada para o mecânico {mecanico.nome}: User: {mecanico.usuario} | Senha: {senha_aleatoria}")

            return redirect('lista_mecanicos')  # Redireciona para a lista de mecânicos após o cadastro
    else:
        form = MecanicoForm()
    
    return render(request, 'usuarios/cadastrar_mecanico.html', {'form': form})
