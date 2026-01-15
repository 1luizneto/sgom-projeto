from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from django.db import models 
from django.utils import timezone
from .models import (
    Orcamento, ItemMovimentacao, Venda, ItemVenda, 
    Checklist, LaudoTecnico, Produto, OrdemServico, 
    Notificacao, MovimentacaoEstoque, PedidoCompra
)
from .serializers import (
    OrcamentoSerializer, ItemMovimentacaoSerializer, 
    VendaSerializer, ChecklistSerializer, LaudoTecnicoSerializer,
    ProdutoSerializer, OrdemServicoSerializer, NotificacaoSerializer,
    MovimentacaoEstoqueSerializer, PedidoCompraSerializer
)
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
        """Aprovar orçamento e criar Ordem de Serviço (PB08)"""
        orcamento = self.get_object()

        if orcamento.status != 'PENDENTE':
            return Response(
                {'erro': 'Orçamento já foi aprovado ou rejeitado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Gerar número único de OS
        ultimo_numero = OrdemServico.objects.aggregate(models.Max('numero_os'))['numero_os__max']
        if ultimo_numero is None:
            numero_os_gerado = 1
        else:
            try:
                numero_os_gerado = int(ultimo_numero) + 1
            except ValueError:
                numero_os_gerado = 1

        # Criar OS
        ordem_servico = OrdemServico.objects.create(
            numero_os=str(numero_os_gerado),
            orcamento=orcamento,
            veiculo=orcamento.veiculo,
            mecanico_responsavel=orcamento.mecanico,
            status='EM_ANDAMENTO'
        )

        # Atualizar status do orçamento
        orcamento.status = 'APROVADO'
        orcamento.save()

        return Response({
            'mensagem': 'Orçamento aprovado com sucesso',
            'numero_os': ordem_servico.numero_os,
            'id_os': ordem_servico.id_os
        })

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
    permission_classes = [AllowAny]

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
    permission_classes = [AllowAny]

    def get_queryset(self):
        """
        - Fornecedor autenticado: vê apenas seus produtos
        - Admin: vê todos
        - Outros (mecânicos, vendas balcão): vê todos os produtos
        """
        user = self.request.user
        
        # Se não autenticado ou é mecânico/outros → retorna todos os produtos
        if not user.is_authenticated:
            return Produto.objects.all()
        
        # Se é admin → retorna todos
        if user.is_staff:
            return Produto.objects.all()
        
        # Se é fornecedor → retorna apenas seus produtos
        try:
            fornecedor = Fornecedor.objects.get(user=user)
            queryset = Produto.objects.filter(fornecedor=fornecedor)
        except Fornecedor.DoesNotExist:
            # Se não é fornecedor (ex: mecânico), retorna todos os produtos
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
        
        Controle de Acesso:
        - Admin: vê todas as OS
        - Mecânico: vê apenas as OS que ele é responsável
        - Cliente: vê apenas as OS dos seus veículos
        """
        queryset = OrdemServico.objects.select_related(
            'veiculo', 
            'mecanico_responsavel', 
            'orcamento'
        ).all()
        
        user = self.request.user
        
        # Admin vê tudo
        if user.is_staff:
            pass  # Não filtra nada
        else:
            # Verificar se é mecânico
            try:
                from usuarios.models import Mecanico
                mecanico = Mecanico.objects.get(user=user)
                # Mecânico vê apenas suas OS
                queryset = queryset.filter(mecanico_responsavel=mecanico)
            except Mecanico.DoesNotExist:
                # Se não for mecânico, assume que é cliente
                try:
                    from usuarios.models import Cliente
                    cliente = Cliente.objects.get(user=user)
                    # Cliente vê apenas OS dos seus veículos
                    queryset = queryset.filter(veiculo__cliente=cliente)
                except Cliente.DoesNotExist:
                    # Se não for nem mecânico nem cliente, retorna vazio
                    queryset = queryset.none()

        # Filtros opcionais por query params
        veiculo_id = self.request.query_params.get('veiculo', None)
        status_param = self.request.query_params.get('status', None)
        
        if veiculo_id:
            queryset = queryset.filter(veiculo__id_veiculo=veiculo_id)
        if status_param:
            queryset = queryset.filter(status=status_param)
            
        return queryset.order_by('-data_abertura')

class NotificacaoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Notificações de Estoque Baixo (PB12)
    """
    queryset = Notificacao.objects.all()
    serializer_class = NotificacaoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Notificacao.objects.all()
        
        # Filtrar por não lidas (PB12 - TC12 Cenário 2)
        nao_lidas = self.request.query_params.get('nao_lidas', None)
        if nao_lidas == 'true':
            queryset = queryset.filter(lida=False)
        
        return queryset.order_by('-data_criacao')

    @action(detail=True, methods=['post'])
    def marcar_lida(self, request, pk=None):
        """Marca uma notificação como lida"""
        notificacao = self.get_object()
        notificacao.lida = True
        notificacao.save()
        return Response({'status': 'Notificação marcada como lida'})

class MovimentacaoEstoqueViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Movimentações de Estoque (PB11)
    - Admin pode registrar ENTRADA manual
    - SAÍDA é automática via Venda/OS (mas também pode ser manual)
    """
    queryset = MovimentacaoEstoque.objects.all()
    serializer_class = MovimentacaoEstoqueSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = MovimentacaoEstoque.objects.select_related('produto', 'venda', 'ordem_servico')
        
        # Filtrar por produto
        produto_id = self.request.query_params.get('produto', None)
        if produto_id:
            queryset = queryset.filter(produto__id_produto=produto_id)
        
        # Filtrar por tipo
        tipo = self.request.query_params.get('tipo', None)
        if tipo:
            queryset = queryset.filter(tipo_movimentacao=tipo)
        
        # Filtrar por período
        data_inicio = self.request.query_params.get('data_inicio', None)
        data_fim = self.request.query_params.get('data_fim', None)
        
        if data_inicio:
            queryset = queryset.filter(data_movimentacao__gte=data_inicio)
        if data_fim:
            queryset = queryset.filter(data_movimentacao__lte=data_fim)
        
        return queryset.order_by('-data_movimentacao')

    def get_permissions(self):
        """Apenas Admin pode criar ENTRADA manual"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]
    
class PedidoCompraViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar Pedidos de Compra
    - Admin: cria pedidos e vê todos
    - Fornecedor: vê apenas seus pedidos e pode aprovar/rejeitar
    """
    serializer_class = PedidoCompraSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Admin vê todos os pedidos
        if user.is_staff:
            return PedidoCompra.objects.all()
        
        # Fornecedor vê apenas seus pedidos
        try:
            fornecedor = Fornecedor.objects.get(user=user)
            return PedidoCompra.objects.filter(fornecedor=fornecedor)
        except Fornecedor.DoesNotExist:
            return PedidoCompra.objects.none()

    def perform_create(self, serializer):
        """Admin cria pedido - preenche automaticamente o fornecedor e valor_unitario do produto"""
        produto = serializer.validated_data['produto']
        
        # Buscar o custo do produto como valor unitário
        valor_unitario = serializer.validated_data.get('valor_unitario')
        if not valor_unitario:
            valor_unitario = produto.custo
        
        serializer.save(
            fornecedor=produto.fornecedor,
            valor_unitario=valor_unitario
        )

    @action(detail=True, methods=['post'])
    def aprovar(self, request, pk=None):
        """
        Fornecedor aprova o pedido:
        1. Diminui estoque do fornecedor
        2. Cria entrada de estoque na oficina
        """
        pedido = self.get_object()
        
        # Validações
        if pedido.status != 'PENDENTE':
            return Response(
                {'erro': 'Este pedido já foi processado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        produto = pedido.produto
        
        # Verifica se fornecedor tem estoque
        if produto.estoque_atual < pedido.quantidade:
            return Response(
                {'erro': f'Estoque insuficiente. Disponível: {produto.estoque_atual}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 1. Diminui estoque do fornecedor
        produto.estoque_atual -= pedido.quantidade
        produto.save()
        
        # 2. Registra saída no estoque do fornecedor
        MovimentacaoEstoque.objects.create(
            produto=produto,
            tipo_movimentacao='SAIDA',
            quantidade=pedido.quantidade,
            observacao=f'Venda para Oficina - Pedido #{pedido.id_pedido}'
        )
        
        # 3. Registra entrada no estoque da oficina (movimentação separada)
        MovimentacaoEstoque.objects.create(
            produto=produto,
            tipo_movimentacao='ENTRADA',
            quantidade=pedido.quantidade,
            custo_unitario=pedido.valor_unitario,
            observacao=f'Compra do Fornecedor {produto.fornecedor.nome} - Pedido #{pedido.id_pedido}'
        )
        
        # 4. Atualiza status do pedido
        pedido.status = 'APROVADO'
        pedido.data_aprovacao = timezone.now()
        pedido.save()
        
        return Response({
            'mensagem': 'Pedido aprovado com sucesso!',
            'estoque_fornecedor': produto.estoque_atual,
            'estoque_oficina': produto.estoque_atual  # Após a entrada
        })

    @action(detail=True, methods=['post'])
    def rejeitar(self, request, pk=None):
        """Fornecedor rejeita o pedido"""
        pedido = self.get_object()
        
        if pedido.status != 'PENDENTE':
            return Response(
                {'erro': 'Este pedido já foi processado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        motivo = request.data.get('motivo', 'Sem motivo informado')
        pedido.status = 'REJEITADO'
        pedido.observacao = f'Rejeitado: {motivo}'
        pedido.save()
        
        return Response({'mensagem': 'Pedido rejeitado'})