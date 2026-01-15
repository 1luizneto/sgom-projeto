from rest_framework import serializers
from .models import Orcamento, ItemMovimentacao, Produto, OrdemServico, Venda, ItemVenda, Checklist, LaudoTecnico, Notificacao, MovimentacaoEstoque, PedidoCompra
from veiculos.models import Servico
from usuarios.models import Fornecedor

class ItemMovimentacaoSerializer(serializers.ModelSerializer):
    # Campos calculados para facilitar a leitura no frontend
    nome_produto = serializers.ReadOnlyField(source='produto.nome')
    nome_servico = serializers.ReadOnlyField(source='servico.descricao')
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ItemMovimentacao
        fields = ['id_item', 'orcamento','produto', 'nome_produto', 'servico', 'nome_servico', 'quantidade', 'valor_unitario', 'subtotal']

class ChecklistSerializer(serializers.ModelSerializer):
    mecanico_nome = serializers.CharField(source='mecanico.nome', read_only=True)
    agendamento_info = serializers.SerializerMethodField()

    class Meta:
        model = Checklist
        fields = '__all__'
    
    def get_agendamento_info(self, obj):
        if obj.agendamento:
            return {
                'id': obj.agendamento.id_agendamento,
                'cliente': obj.agendamento.cliente.nome,
                'veiculo': obj.agendamento.veiculo.modelo,
                'servico': obj.agendamento.servico.descricao
            }
        return None

class OrcamentoSerializer(serializers.ModelSerializer):
    veiculo_placa = serializers.CharField(source='veiculo.placa', read_only=True)
    veiculo_modelo = serializers.CharField(source='veiculo.modelo', read_only=True)
    mecanico_nome = serializers.CharField(source='mecanico.nome', read_only=True)
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    valor_total = serializers.SerializerMethodField()
    checklist_info = serializers.SerializerMethodField()
    agendamento_info = serializers.SerializerMethodField()

    class Meta:
        model = Orcamento
        fields = [
            'id_orcamento', 'veiculo', 'veiculo_placa', 'veiculo_modelo',
            'mecanico', 'mecanico_nome', 'cliente', 'cliente_nome',
            'descricao', 'valor_total', 'validade', 'status',
            'data_criacao', 'agendamento', 'checklist',
            'checklist_info', 'agendamento_info'
        ]
        read_only_fields = ['data_criacao', 'valor_total', 'cliente']

    def get_valor_total(self, obj):
        """Calcula o valor total dos itens do orçamento"""
        return obj.calcular_total()
    
    def get_checklist_info(self, obj):
        if obj.checklist:
            return {
                'id': obj.checklist.id_checklist,
                'defeito': obj.checklist.possivel_defeito
            }
        return None
    
    def get_agendamento_info(self, obj):
        if obj.agendamento:
            return {
                'id': obj.agendamento.id_agendamento,
                'horario': obj.agendamento.horario_inicio
            }
        return None

    def create(self, validated_data):
        """Preenche automaticamente o cliente a partir do veículo"""
        veiculo = validated_data.get('veiculo')
        if veiculo:
            validated_data['cliente'] = veiculo.cliente
        return super().create(validated_data)

class LaudoTecnicoSerializer(serializers.ModelSerializer):
    # Campos informativos da OS (peças usadas)
    # Aqui assumimos que as peças usadas são os itens da OS (se houver) ou do Orçamento vinculado
    # Vamos criar um campo ReadOnly para exibir as peças, caso existam na OS
    pecas_utilizadas = serializers.SerializerMethodField()

    class Meta:
        model = LaudoTecnico
        fields = ['id_laudo', 'os', 'diagnostico_detalhado', 'acoes_corretivas', 'recomendacoes_futuras', 'data_conclusao', 'mecanico', 'pecas_utilizadas']
        read_only_fields = ['data_conclusao']

    def get_pecas_utilizadas(self, obj):
        # Tenta pegar itens da OS ou do Orçamento da OS
        itens = []
        if hasattr(obj.os, 'itens') and obj.os.itens.exists():
            itens = obj.os.itens.all()
        elif obj.os.orcamento and obj.os.orcamento.itens.exists():
            itens = obj.os.orcamento.itens.all()
        
        # Serializa os itens (nome do produto e quantidade)
        return [
            f"{item.quantidade}x {item.produto.nome if item.produto else 'Serviço'}" 
            for item in itens if item.produto # Filtra apenas produtos (peças)
        ]

    def validate_diagnostico_detalhado(self, value):
        if not value.strip():
            raise serializers.ValidationError("A descrição técnica do defeito é obrigatória para o laudo")
        return value

class ItemVendaSerializer(serializers.ModelSerializer):
    nome_produto = serializers.ReadOnlyField(source='produto.nome')
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ItemVenda
        fields = ['id_item_venda', 'venda', 'produto', 'nome_produto', 'quantidade', 'valor_unitario', 'subtotal']
        read_only_fields = ['venda', 'subtotal']

class VendaSerializer(serializers.ModelSerializer):
    itens = ItemVendaSerializer(many=True)

    class Meta:
        model = Venda
        fields = ['id_venda', 'data_venda', 'total', 'itens']
        read_only_fields = ['total', 'data_venda']

    def validate_itens(self, value):
        if not value or len(value) == 0:
            raise serializers.ValidationError("A venda deve conter pelo menos um item.")
        return value

    def create(self, validated_data):
        itens_data = validated_data.pop('itens')
        venda = Venda.objects.create(total=0)
        
        total_venda = 0
        
        for item_data in itens_data:
            produto = item_data['produto']
            quantidade = item_data['quantidade']
            valor_unitario = item_data['valor_unitario']
            
            # Validação de Estoque (TC07 - Cenário 2)
            if produto.estoque_atual < quantidade:
                raise serializers.ValidationError(
                    f"Quantidade solicitada superior ao estoque disponível para {produto.nome} (Atual: {produto.estoque_atual})"
                )
            
            # ✅ REGISTRA A SAÍDA NO HISTÓRICO (PB11)
            MovimentacaoEstoque.objects.create(
                produto=produto,
                tipo_movimentacao='SAIDA',
                quantidade=quantidade,
                observacao=f'Venda Balcão #{venda.id_venda}',
                venda=venda
            )
            # O método save() do MovimentacaoEstoque já abate o estoque automaticamente
            
            # Cria item da venda
            item_venda = ItemVenda.objects.create(
                venda=venda,
                produto=produto,
                quantidade=quantidade,
                valor_unitario=valor_unitario
            )
            total_venda += item_venda.subtotal
        
        venda.total = total_venda
        venda.save()
        
        return venda

class ProdutoSerializer(serializers.ModelSerializer):
    # Campo read-only para exibir o nome do fornecedor na listagem
    fornecedor_nome = serializers.ReadOnlyField(source='fornecedor.nome')

    class Meta:
        model = Produto
        fields = [
            'id_produto', 'fornecedor', 'fornecedor_nome', 
            'nome', 'descricao', 'custo', 'preco_venda', 
            'estoque_minimo', 'estoque_atual', 'data_cadastro'
        ]
        read_only_fields = ['fornecedor', 'data_cadastro']  # Fornecedor é setado automaticamente

    def validate_preco_venda(self, value):
        """TC05 - Cenário 3: Preço deve ser maior que zero"""
        if value <= 0:
            raise serializers.ValidationError("O preço de venda deve ser maior que zero.")
        return value

    def validate_custo(self, value):
        """Validação adicional de segurança"""
        if value < 0:
            raise serializers.ValidationError("O custo não pode ser negativo.")
        return value

    def validate(self, attrs):
        """TC05 - Cenário 2: Campos obrigatórios"""
        required_fields = ['nome', 'custo', 'preco_venda', 'estoque_minimo']
        for field in required_fields:
            if field not in attrs or attrs[field] in [None, '']:
                raise serializers.ValidationError({field: 'Este campo é obrigatório.'})
        return attrs

class OrdemServicoSerializer(serializers.ModelSerializer):
    veiculo_modelo = serializers.ReadOnlyField(source='veiculo.modelo')
    veiculo_placa = serializers.ReadOnlyField(source='veiculo.placa')
    mecanico_nome = serializers.ReadOnlyField(source='mecanico_responsavel.nome')
    
    # Campo calculado para o frontend (usar data_abertura)
    data_inicio = serializers.DateTimeField(source='data_abertura', read_only=True)
    
    status_cliente = serializers.SerializerMethodField()
    descricao_status = serializers.SerializerMethodField()
    
    class Meta:
        model = OrdemServico
        fields = [
            'id_os', 'numero_os', 'data_abertura', 'data_inicio', 'data_conclusao', 
            'status', 'orcamento', 'veiculo', 'veiculo_modelo', 
            'veiculo_placa', 'mecanico_responsavel', 'mecanico_nome',
            'status_cliente', 'descricao_status'
        ]
        read_only_fields = ['data_abertura', 'numero_os']

    def get_status_cliente(self, obj):
        mapping = {
            'AGUARDANDO_INICIO': 'Aguardando Início',
            'EM_ANDAMENTO': 'Em Manutenção',
            'AGUARDANDO_PECAS': 'Parado - Aguardando Peças',
            'CONCLUIDA': 'Pronto para Retirada',
            'CANCELADA': 'Cancelado'
        }
        return mapping.get(obj.status, obj.status)

    def get_descricao_status(self, obj):
        mapping = {
            'AGUARDANDO_INICIO': 'Aguardando mecânico iniciar o serviço',
            'EM_ANDAMENTO': 'Mecânico trabalhando no veículo',
            'AGUARDANDO_PECAS': 'Aguardando chegada de peças para continuar',
            'CONCLUIDA': 'O serviço foi finalizado e o veículo pode ser retirado.',
            'CANCELADA': 'O serviço foi cancelado.'
        }
        return mapping.get(obj.status, '')

class NotificacaoSerializer(serializers.ModelSerializer):
    produto_nome = serializers.ReadOnlyField(source='produto.nome')
    
    class Meta:
        model = Notificacao
        fields = ['id_notificacao', 'mensagem', 'produto', 'produto_nome', 'lida', 'data_criacao']
        read_only_fields = ['data_criacao']

class MovimentacaoEstoqueSerializer(serializers.ModelSerializer):
    produto_nome = serializers.ReadOnlyField(source='produto.nome')

    class Meta:
        model = MovimentacaoEstoque
        fields = [
            'id_movimentacao', 'produto', 'produto_nome', 'tipo_movimentacao', 
            'quantidade', 'custo_unitario', 'data_movimentacao', 'observacao',
            'venda', 'ordem_servico'
        ]
        read_only_fields = ['data_movimentacao', 'venda', 'ordem_servico']

    def validate(self, data):
        """Valida estoque antes de registrar saída"""
        if data.get('tipo_movimentacao') == 'SAIDA':
            produto = data['produto']
            quantidade = data['quantidade']
            
            if produto.estoque_atual < quantidade:
                raise serializers.ValidationError(
                    f"Estoque insuficiente para {produto.nome}. Disponível: {produto.estoque_atual}"
                )
        
        return data
    
class PedidoCompraSerializer(serializers.ModelSerializer):
    produto_nome = serializers.ReadOnlyField(source='produto.nome')
    fornecedor_nome = serializers.ReadOnlyField(source='fornecedor.nome')
    
    class Meta:
        model = PedidoCompra
        fields = [
            'id_pedido', 'produto', 'produto_nome', 'fornecedor', 
            'fornecedor_nome', 'quantidade', 'valor_unitario', 
            'valor_total', 'status', 'data_pedido', 'data_aprovacao', 
            'observacao'
        ]
        read_only_fields = ['valor_total', 'data_pedido', 'data_aprovacao', 'fornecedor']