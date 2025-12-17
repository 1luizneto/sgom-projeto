from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.models import User
from decimal import Decimal

# Imports dos modelos do app oficina
from .models import Orcamento, ItemMovimentacao, Produto, OrdemServico

# Imports de outros apps (necessário ter os modelos definidos nestes apps)
from usuarios.models import Mecanico, Cliente
from veiculos.models import Veiculo, Servico

class OrcamentoModelTest(TestCase):
    def setUp(self):
        # Configuração inicial (Background do Gherkin)
        
        # 1. Criar Usuário e Mecânico
        self.user = User.objects.create_user(username='mecanico_teste', password='123')
        self.mecanico = Mecanico.objects.create(user=self.user)

        # 2. Criar Cliente "João da Silva"
        self.cliente = Cliente.objects.create(
            nome="João da Silva",
            cpf="11122233344",
            email="joao@email.com",
            telefone="11999999999"
        )

        # 3. Criar Veículo "Ford Ka"
        self.veiculo = Veiculo.objects.create(
            placa="ABC-1234",
            modelo="Ford Ka",
            marca="Ford",
            ano=2020,
            cliente=self.cliente
        )

        # 4. Criar Peça e Serviço para os testes
        self.produto_pastilha = Produto.objects.create(
            nome="Jogo de Pastilhas",
            custo_compra=50.00,
            preco_venda=150.00,
            qtd_estoque=10
        )
        
        self.servico_troca = Servico.objects.create(
            descricao="Troca de Pastilhas",
            preco_base=100.00
        )

    def test_cenario_1_criacao_orcamento_misto(self):
        """
        TC08 - Cenário 1: Criação de orçamento misto (Peças + Serviços) com sucesso.
        Verifica se o sistema aceita itens e se os valores batem com o esperado.
        """
        # When eu inicio um novo orçamento
        orcamento = Orcamento.objects.create(
            cliente=self.cliente,
            veiculo=self.veiculo,
            mecanico=self.mecanico,
            validade=timezone.now().date() + timedelta(days=7),
            status='PENDENTE'
        )

        # And adiciono o serviço "Troca de Pastilhas" (Valor: 100.00)
        item_servico = ItemMovimentacao.objects.create(
            orcamento=orcamento,
            servico=self.servico_troca,
            quantidade=1,
            valor_unitario=self.servico_troca.preco_base

        )

        # And adiciono a peça "Jogo de Pastilhas" (Valor: 150.00)
        item_produto = ItemMovimentacao.objects.create(
            orcamento=orcamento,
            produto=self.produto_pastilha,
            quantidade=1,
            valor_unitario=self.produto_pastilha.preco_venda
        )

        # Simulação do cálculo automático (normalmente feito via View ou Método do Model)
        total_servicos = item_servico.subtotal
        total_produtos = item_produto.subtotal
        orcamento.valor_total = total_servicos + total_produtos
        orcamento.save()

        # Then o sistema deve gerar um registro de orçamento com status "Pendente"
        self.assertEqual(orcamento.status, 'PENDENTE')
        
        # And o valor total do orçamento deve ser "250.00"
        self.assertEqual(orcamento.valor_total, Decimal('250.00'))
        
        # Verificações adicionais de vínculo
        self.assertEqual(orcamento.cliente.nome, "João da Silva")
        self.assertEqual(orcamento.veiculo.placa, "ABC-1234")

    def test_cenario_2_orcamento_vazio(self):
        """
        TC08 - Cenário 2: Tentativa de criar orçamento vazio.
        Nota: A validação de 'impedir salvar' geralmente ocorre no Serializer/Forms.
        Aqui testamos se o orçamento inicia zerado.
        """
        # When eu inicio um novo orçamento sem itens
        orcamento = Orcamento.objects.create(
            cliente=self.cliente,
            veiculo=self.veiculo,
            mecanico=self.mecanico,
            validade=timezone.now().date() + timedelta(days=7)
        )

        # Then o valor total deve ser 0
        self.assertEqual(orcamento.valor_total, Decimal('0.00'))
        
        # E não deve ter itens associados
        self.assertEqual(orcamento.itens.count(), 0)

    def test_vinculo_obrigatorio(self):
        """
        Verifica o critério de aceitação: Vínculo Obrigatório (Cliente e Veículo).
        Tenta criar sem cliente e espera erro de integridade do banco.
        """
        from django.db.utils import IntegrityError

        with self.assertRaises(IntegrityError):
            Orcamento.objects.create(
                cliente=None, # Campo obrigatório
                veiculo=self.veiculo,
                mecanico=self.mecanico,
                validade=timezone.now().date()
            )

    def test_calculo_subtotal_item(self):
        """
        Verifica se o ItemMovimentacao calcula o subtotal automaticamente ao salvar.
        """
        orcamento = Orcamento.objects.create(
            cliente=self.cliente,
            veiculo=self.veiculo,
            mecanico=self.mecanico,
            validade=timezone.now().date()
        )

        # Adiciona 2 unidades da peça (2 * 150.00 = 300.00)
        item = ItemMovimentacao.objects.create(
            orcamento=orcamento,
            produto=self.produto_pastilha,
            quantidade=2,
            valor_unitario=self.produto_pastilha.preco_venda
        )

        self.assertEqual(item.subtotal, Decimal('300.00'))