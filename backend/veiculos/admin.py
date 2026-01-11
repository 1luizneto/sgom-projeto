from django.contrib import admin
from .models import Veiculo, Servico, Agendamento

@admin.register(Veiculo)
class VeiculoAdmin(admin.ModelAdmin):
    list_display = ['id_veiculo', 'placa', 'modelo', 'marca', 'ano', 'cliente']
    search_fields = ['placa', 'modelo', 'marca']
    list_filter = ['marca', 'ano']
    ordering = ['-ano']

@admin.register(Servico)
class ServicoAdmin(admin.ModelAdmin):
    list_display = ['id_servico', 'descricao', 'preco_base']
    search_fields = ['descricao']
    list_filter = ['preco_base']
    ordering = ['descricao']
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('descricao', 'preco_base')
        }),
        ('Detalhes', {
            'fields': ('detalhes_padrao',),
            'classes': ('collapse',)  # Campo colapsável
        }),
    )

@admin.register(Agendamento)
class AgendamentoAdmin(admin.ModelAdmin):
    list_display = ['id_agendamento', 'get_cliente_nome', 'get_veiculo_info', 'get_servico_desc', 'horario_inicio', 'status', 'get_mecanico_nome', 'preco']
    search_fields = ['cliente__nome', 'veiculo__placa', 'servico__descricao']
    list_filter = ['status', 'horario_inicio', 'mecanico__nome']
    ordering = ['-horario_inicio']
    date_hierarchy = 'horario_inicio'
    readonly_fields = ['criado_em']
    
    # Métodos para exibir informações relacionadas
    def get_cliente_nome(self, obj):
        return obj.cliente.nome
    get_cliente_nome.short_description = 'Cliente'
    
    def get_veiculo_info(self, obj):
        return f"{obj.veiculo.modelo} - {obj.veiculo.placa}"
    get_veiculo_info.short_description = 'Veículo'
    
    def get_servico_desc(self, obj):
        return obj.servico.descricao
    get_servico_desc.short_description = 'Serviço'
    
    def get_mecanico_nome(self, obj):
        return obj.mecanico.nome
    get_mecanico_nome.short_description = 'Mecânico'

    fieldsets = (
        ('Cliente e Veículo', {
            'fields': ('cliente', 'veiculo')
        }),
        ('Serviço', {
            'fields': ('servico', 'mecanico', 'preco')
        }),
        ('Agendamento', {
            'fields': ('horario_inicio', 'horario_fim', 'status')
        }),
        ('Informações do Sistema', {
            'fields': ('criado_em',),
            'classes': ('collapse',)
        }),
    )
