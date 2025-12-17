from rest_framework import serializers
from .models import Orcamento, ItemMovimentacao, Produto, OrdemServico
from veiculos.models import Servico

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