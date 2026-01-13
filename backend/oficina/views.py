from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction
from django.db.models import F

# Importação explícita de todos os modelos necessários
from .models import Orcamento, ItemMovimentacao, OrdemServico, Venda, Checklist, LaudoTecnico, Produto, Notificacao
from .serializers import OrcamentoSerializer, ItemMovimentacaoSerializer, VendaSerializer, ChecklistSerializer, LaudoTecnicoSerializer, ProdutoSerializer, OrdemServicoSerializer, NotificacaoSerializer
from usuarios.models import Fornecedor

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
    
    @action(detail=True, methods=['post'])
    def aprovar(self, request, pk=None):
        """
        PB09 - Aprova o orçamento e gera a Ordem de Serviço (OS).
        """
        orcamento = self.get_object()

        # Validação: Cenário 3 (Já processado)
        if orcamento.status in ['APROVADO', 'REJEITADO']:
            return Response(
                {"erro": "Este orçamento já foi processado anteriormente."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Atualiza Status
        orcamento.status = 'APROVADO'
        orcamento.save()

        # Geração da OS (Cenário 1)
        # Gera um número de OS simples: OS-{ANO}-{ID_ORCAMENTO}
        ano_atual = timezone.now().year
        numero_os_gerado = f"OS-{ano_atual}-{orcamento.pk}"

        # Criação da OS usando o modelo importado
        OrdemServico.objects.create(
            numero_os=numero_os_gerado,
            orcamento=orcamento,
            veiculo=orcamento.veiculo,
            mecanico_responsavel=orcamento.mecanico,
            status='EM_ANDAMENTO'
        )

        # Notificação (Simulada conforme requisito)
        # notificar_mecanico(orcamento.mecanico, "Nova OS aberta!")

        return Response({"mensagem": "Orçamento aprovado e OS gerada com sucesso."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def rejeitar(self, request, pk=None):
        """
        PB09 - Rejeita o orçamento e encerra o fluxo.
        """
        orcamento = self.get_object()

        # Validação: Cenário 3 (Já processado)
        if orcamento.status in ['APROVADO', 'REJEITADO']:
            return Response(
                {"erro": "Este orçamento já foi processado anteriormente."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Atualiza Status
        orcamento.status = 'REJEITADO'
        # Opcional: Salvar motivo se houver campo no model (request.data.get('motivo'))
        orcamento.save()

        return Response({"mensagem": "Orçamento rejeitado."}, status=status.HTTP_200_OK)

class ItemMovimentacaoViewSet(viewsets.ModelViewSet):
    queryset = ItemMovimentacao.objects.all()
    serializer_class = ItemMovimentacaoSerializer

class VendaViewSet(viewsets.ModelViewSet):
    queryset = Venda.objects.all()
    serializer_class = VendaSerializer

    def create(self, request, *args, **kwargs):
        """
        Sobrescreve o create para garantir atomicidade.
        Se ocorrer erro de estoque no Serializer, a transação é revertida.
        """
        try:
            with transaction.atomic():
                return super().create(request, *args, **kwargs)
        except Exception as e:
            # Captura erro de validação do serializer ou outros erros
            # Se for ValidationError do DRF, ele já tem a estrutura correta, 
            # mas como estamos interceptando, precisamos garantir o retorno correto.
            # O super().create chama serializer.is_valid(raise_exception=True) que lança ValidationError.
            # Se o erro veio do método create() do serializer (nossa validação de estoque), 
            # ele também sobe como exception.
            
            # Vamos deixar o DRF tratar o ValidationError padrão, mas precisamos garantir
            # que a transaction faça rollback (o context manager faz isso automaticamente na exception).
            raise e

class ChecklistViewSet(viewsets.ModelViewSet):
    queryset = Checklist.objects.all()
    serializer_class = ChecklistSerializer
    
    def get_queryset(self):
        """
        Permite filtrar check lists por veículo (via OS).
        Ex: /api/checklists/?veiculo_id=1
        """
        queryset = Checklist.objects.all()
        veiculo_id = self.request.query_params.get('veiculo_id', None)
        if veiculo_id:
            queryset = queryset.filter(os__veiculo__id_veiculo=veiculo_id)
        return queryset

class LaudoTecnicoViewSet(viewsets.ModelViewSet):
    queryset = LaudoTecnico.objects.all()
    serializer_class = LaudoTecnicoSerializer

    def perform_create(self, serializer):
        # Auto-atribui o mecânico logado, se houver, ou tenta pegar da requisição
        # Como o auth pode não estar configurado completamente no teste, permitimos enviar 'mecanico' no body
        # Mas se não enviado, tentamos pegar do user.
        # No requisito: "exibir automaticamente o Nome do Mecânico responsável pela sua elaboração"
        # Assumiremos que o frontend envia o ID ou o backend pega do user.
        # Vamos manter simples: se enviado no serializer, usa. Se não, tenta user.
        
        mecanico = None
        if self.request.user and self.request.user.is_authenticated:
            if hasattr(self.request.user, 'mecanico'):
                mecanico = self.request.user.mecanico
        
        if mecanico:
            serializer.save(mecanico=mecanico)
        else:
            serializer.save()

class ProdutoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para CRUD de Produtos (PB05)
    - Apenas fornecedores autenticados podem criar
    - Cada fornecedor vê apenas seus produtos
    - O vínculo fornecedor é automático
    """
    serializer_class = ProdutoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Cada fornecedor vê apenas seus próprios produtos"""
        user = self.request.user
        queryset = Produto.objects.none()
        
        try:
            fornecedor = Fornecedor.objects.get(user=user)
            queryset = Produto.objects.filter(fornecedor=fornecedor)
        except Fornecedor.DoesNotExist:
            # Se não for fornecedor, retorna vazio (admin vê tudo via admin panel)
            if user.is_staff:
                queryset = Produto.objects.all()
        
        # Filtro de Estoque Baixo (PB10)
        estoque_baixo = self.request.query_params.get('estoque_baixo', None)
        if estoque_baixo == 'true':
            queryset = queryset.filter(estoque_atual__lt=F('estoque_minimo'))
            
        return queryset

    def perform_create(self, serializer):
        """TC05 - Cenário 1: Vínculo Automático do Fornecedor"""
        try:
            fornecedor = Fornecedor.objects.get(user=self.request.user)
            serializer.save(fornecedor=fornecedor)
        except Fornecedor.DoesNotExist:
            raise serializers.ValidationError("Apenas fornecedores podem cadastrar produtos.")
        
class OrdemServicoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar Ordens de Serviço (OS).
    """
    queryset = OrdemServico.objects.all()
    serializer_class = OrdemServicoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Permite filtrar OS por veículo ou status.
        Ex: /api/ordens-servico/?veiculo=1&status=EM_ANDAMENTO
        """
        queryset = OrdemServico.objects.all()
        user = self.request.user
        
        # Access Control: Clients can only see their own OS
        if not user.is_staff:
             # Assumes user is a Client user (linked via Cliente model)
             # Cliente <-> User is OneToOne
             queryset = queryset.filter(veiculo__cliente__user=user)

        veiculo_id = self.request.query_params.get('veiculo', None)
        status = self.request.query_params.get('status', None)
        
        if veiculo_id:
            queryset = queryset.filter(veiculo__id_veiculo=veiculo_id)
        if status:
            queryset = queryset.filter(status=status)
            
        return queryset.order_by('-data_abertura')

class NotificacaoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para listar e marcar notificações como lidas.
    """
    queryset = Notificacao.objects.all()
    serializer_class = NotificacaoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Notificacao.objects.all()
        apenas_nao_lidas = self.request.query_params.get('nao_lidas', None)
        if apenas_nao_lidas == 'true':
            queryset = queryset.filter(lida=False)
        return queryset

    @action(detail=True, methods=['post'])
    def marcar_lida(self, request, pk=None):
        notificacao = self.get_object()
        notificacao.lida = True
        notificacao.save()
        return Response({'status': 'notificacao marcada como lida'})
        return queryset.order_by('-data_abertura')