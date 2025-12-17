from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Orcamento, ItemMovimentacao
from .serializers import OrcamentoSerializer, ItemMovimentacaoSerializer

class OrcamentoViewSet(viewsets.ModelViewSet):
    queryset = Orcamento.objects.all()
    serializer_class = OrcamentoSerializer

    @action(detail=True, methods=['post'])
    def adicionar_item(self, request, pk=None):
        """
        Endpoint personalizado para adicionar itens ao orçamento.
        URL: /api/orcamentos/{id}/adicionar_item/
        """
        orcamento = self.get_object()
        serializer = ItemMovimentacaoSerializer(data=request.data)
        
        if serializer.is_valid():
            # Vincula o item ao orçamento atual
            serializer.save(orcamento=orcamento)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def finalizar(self, request, pk=None):
        """
        Valida se o orçamento tem itens antes de permitir finalizar/enviar.
        Atende ao Cenário 2 (Orçamento Vazio).
        """
        orcamento = self.get_object()
        if not orcamento.itens.exists():
            return Response(
                {"erro": "O orçamento deve conter pelo menos um serviço ou produto."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Lógica de envio de notificação iria aqui (PB08 - Notificação)
        # enviar_email_cliente(orcamento)
        
        return Response({"mensagem": "Orçamento finalizado e notificação enviada."}, status=status.HTTP_200_OK)

class ItemMovimentacaoViewSet(viewsets.ModelViewSet):
    queryset = ItemMovimentacao.objects.all()
    serializer_class = ItemMovimentacaoSerializer
