from django.shortcuts import render, redirect
from .forms import AgendamentoForm
from django.contrib import messages

def agendar_servico(request):
    if request.method == 'POST':
        form = AgendamentoForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Agendamento realizado com sucesso!")
            return redirect('lista_agendamentos')  # Redireciona para a página inicial ou outra página apropriada
        else:
            messages.error(request, "Erro ao agendar o serviço. Verifique os dados informados.")
    else:
        form = AgendamentoForm()
    
    return render(request, 'servicos/agendamento_form.html', {'form': form})