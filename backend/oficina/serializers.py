from rest_framework import serializers
from .models import Orcamento, ItemMovimentacao, Produto, OrdemServico, Venda, ItemVenda
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
            if produto.qtd_estoque < quantidade:
                raise serializers.ValidationError(
                    f"Quantidade solicitada superior ao estoque disponível para o produto {produto.nome} (Atual: {produto.qtd_estoque})"
                )
            
            # Atualiza estoque
            produto.qtd_estoque -= quantidade
            produto.save()
            
            # Cria item
            item_venda = ItemVenda.objects.create(venda=venda, **item_data)
            total_venda += item_venda.subtotal
            
        venda.total = total_venda
        venda.save()
        
        return venda