from rest_framework import serializers
from .models import Orcamento, ItemMovimentacao, Produto, OrdemServico, Venda, ItemVenda, Checklist, LaudoTecnico, Notificacao
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

class OrcamentoSerializer(serializers.ModelSerializer):
    # Permite ver e criar itens junto com o orçamento (Nested Serializer)
    itens = ItemMovimentacaoSerializer(many=True, read_only=True)
    veiculo_modelo = serializers.ReadOnlyField(source='veiculo.modelo')
    veiculo_placa = serializers.ReadOnlyField(source='veiculo.placa')
    cliente_nome = serializers.ReadOnlyField(source='cliente.nome')

    status = serializers.CharField(required=False)
    
    class Meta:
        model = Orcamento
        fields = '__all__'
        read_only_fields = ['valor_total', 'status'] # Valor total é calculado pelo Signal

    def validate(self, data):
        """
        Aqui você pode adicionar validações extras se necessário.
        A validação de 'Orçamento Vazio' é complexa de fazer na criação inicial 
        se os itens forem enviados em endpoints separados. 
        Geralmente validamos isso na transição de status (ex: ao tentar 'Aprovar').
        """
        return data

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
        read_only_fields = ['venda']
        extra_kwargs = {
            'quantidade': {'min_value': 1}
        }

class VendaSerializer(serializers.ModelSerializer):
    itens = ItemVendaSerializer(many=True)

    class Meta:
        model = Venda
        fields = ['id_venda', 'data_venda', 'total', 'itens']
        read_only_fields = ['total', 'data_venda']

    def create(self, validated_data):
        itens_data = validated_data.pop('itens')
        venda = Venda.objects.create(**validated_data)
        
        total_venda = 0
        for item_data in itens_data:
            produto = item_data['produto']
            quantidade = item_data['quantidade']
            
            # Validação de Estoque (Requisito: impedir venda se estoque insuficiente)
            if produto.estoque_atual < quantidade:
                raise serializers.ValidationError(
                    f"Quantidade solicitada superior ao estoque disponível para o produto {produto.nome} (Atual: {produto.estoque_atual})"
                )
            
            # Atualiza estoque
            produto.estoque_atual -= quantidade
            produto.save()
            
            # Cria item
            item_venda = ItemVenda.objects.create(venda=venda, **item_data)
            total_venda += item_venda.subtotal
            
        venda.total = total_venda
        venda.save()
        
        return venda

class ChecklistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Checklist
        fields = ['id_checklist', 'os', 'nivel_combustivel', 'avarias_lataria', 'pneus_estado', 'possivel_defeito', 'observacoes', 'data_criacao', 'mecanico']
        read_only_fields = ['data_criacao']

    def validate(self, data):
        """
        Valida regras de negócio do Checklist.
        """
        # Requisito: "É necessário informar o estado do veículo e o defeito relatado"
        if not data.get('possivel_defeito'):
             raise serializers.ValidationError({"possivel_defeito": "É necessário informar o defeito relatado."})
        
        # Validar estado do veículo (pelo menos um campo de estado deve estar preenchido?)
        # O requisito diz: "Se a quantidade de um produto solicitada..." (não, isso é venda).
        # "Scenario: Tentativa de salvar sem descrever o defeito"
        # "But deixo o campo 'Possível Defeito' ou 'Estado Atual' em branco"
        # Estado Atual = Nível Combustível + Avarias + Pneus.
        
        if not data.get('nivel_combustivel') and not data.get('avarias_lataria') and not data.get('pneus_estado'):
             raise serializers.ValidationError("É necessário informar o estado atual do veículo (combustível, avarias ou pneus).")

        return data
    
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
    
    class Meta:
        model = OrdemServico
        fields = [
            'id_os', 'numero_os', 'data_abertura', 'data_conclusao', 
            'status', 'orcamento', 'veiculo', 'veiculo_modelo', 
            'veiculo_placa', 'mecanico_responsavel', 'mecanico_nome'
        ]
        read_only_fields = ['data_abertura']

class NotificacaoSerializer(serializers.ModelSerializer):
    produto_nome = serializers.ReadOnlyField(source='produto.nome')
    
    class Meta:
        model = Notificacao
        fields = ['id_notificacao', 'mensagem', 'produto', 'produto_nome', 'lida', 'data_criacao']
        read_only_fields = ['data_criacao']