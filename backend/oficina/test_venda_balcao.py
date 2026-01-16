from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import Produto, Venda

class VendaBalcaoTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Setup products
        self.produto1 = Produto.objects.create(
            nome="Lâmpada de Farol H4",
            custo_compra=10.00,
            preco_venda=20.00,
            qtd_estoque=50
        )
        self.produto2 = Produto.objects.create(
            nome="Aditivo Radiador",
            custo_compra=15.00,
            preco_venda=30.00,
            qtd_estoque=3
        )
        self.produto3 = Produto.objects.create(
            nome="Filtro de Ar",
            custo_compra=20.00,
            preco_venda=40.00,
            qtd_estoque=10
        )
        self.produto4 = Produto.objects.create(
            nome="Vela de Ignição",
            custo_compra=5.00,
            preco_venda=10.00,
            qtd_estoque=20
        )

    def test_venda_estoque_suficiente(self):
        """
        Scenario: Venda de produto com estoque suficiente
        Given que o produto "Lâmpada de Farol H4" possui "50" unidades em estoque
        When eu inicio uma nova venda
        And adiciono "2" unidades do produto "Lâmpada de Farol H4" ao carrinho
        And finalizo a venda
        Then o sistema deve exibir a mensagem "Venda realizada com sucesso" (Implícito no status 201)
        And o estoque do produto "Lâmpada de Farol H4" deve ser atualizado automaticamente para "48" unidades
        """
        data = {
            "itens": [
                {
                    "produto": self.produto1.id_produto,
                    "quantidade": 2,
                    "valor_unitario": 20.00
                }
            ]
        }
        
        response = self.client.post('/api/vendas/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify stock update
        self.produto1.refresh_from_db()
        self.assertEqual(self.produto1.qtd_estoque, 48)
        
        # Verify sale total
        self.assertEqual(float(response.data['total']), 40.00)

    def test_venda_estoque_insuficiente(self):
        """
        Scenario: Tentativa de venda com estoque insuficiente
        Given que o produto "Aditivo Radiador" possui apenas "3" unidades em estoque
        When eu tento adicionar "5" unidades deste produto na venda
        Then o sistema deve impedir a adição do item
        And deve exibir a mensagem de alerta "Quantidade solicitada superior ao estoque disponível"
        """
        data = {
            "itens": [
                {
                    "produto": self.produto2.id_produto,
                    "quantidade": 5,
                    "valor_unitario": 30.00
                }
            ]
        }
        
        response = self.client.post('/api/vendas/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("superior ao estoque disponível", str(response.data))
        
        # Verify stock remains unchanged
        self.produto2.refresh_from_db()
        self.assertEqual(self.produto2.qtd_estoque, 3)
        
        # Verify no sale was created
        self.assertEqual(Venda.objects.count(), 0)

    def test_venda_multiplos_itens(self):
        """
        Scenario: Registro de venda de múltiplos itens
        Given que existe estoque suficiente para todos os produtos
        When eu adiciono "1" unidade de "Filtro de Ar"
        And adiciono "4" unidades de "Vela de Ignição"
        And confirmo o pagamento e finalizo a venda
        Then o sistema deve gerar um comprovante da venda com o total somado
        And deve abater as quantidades respectivas de cada item no inventário
        """
        data = {
            "itens": [
                {
                    "produto": self.produto3.id_produto,
                    "quantidade": 1,
                    "valor_unitario": 40.00
                },
                {
                    "produto": self.produto4.id_produto,
                    "quantidade": 4,
                    "valor_unitario": 10.00
                }
            ]
        }
        
        response = self.client.post('/api/vendas/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify total (1*40 + 4*10 = 80)
        self.assertEqual(float(response.data['total']), 80.00)
        
        # Verify stock updates
        self.produto3.refresh_from_db()
        self.assertEqual(self.produto3.qtd_estoque, 9) # 10 - 1
        
        self.produto4.refresh_from_db()
        self.assertEqual(self.produto4.qtd_estoque, 16) # 20 - 4

    def test_venda_estoque_exato(self):
        """
        Scenario: Venda de toda a quantidade disponível
        Given que o produto "Aditivo Radiador" possui 3 unidades
        When eu vendo 3 unidades
        Then a venda deve ser concluída e o estoque deve zerar
        """
        data = {
            "itens": [
                {
                    "produto": self.produto2.id_produto,
                    "quantidade": 3,
                    "valor_unitario": 30.00
                }
            ]
        }
        
        response = self.client.post('/api/vendas/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        self.produto2.refresh_from_db()
        self.assertEqual(self.produto2.qtd_estoque, 0)

    def test_transacao_atomica_multiplos_itens(self):
        """
        Scenario: Um item com estoque ok, outro com estoque insuficiente
        Given produto 1 (50 qtd) e produto 2 (3 qtd)
        When tento vender 10 do produto 1 e 10 do produto 2
        Then a venda falha completamente e NENHUM estoque é alterado
        """
        data = {
            "itens": [
                {
                    "produto": self.produto1.id_produto,
                    "quantidade": 10,
                    "valor_unitario": 20.00
                },
                {
                    "produto": self.produto2.id_produto,
                    "quantidade": 10, # Estoque é só 3!
                    "valor_unitario": 30.00
                }
            ]
        }
        
        response = self.client.post('/api/vendas/', data, format='json')
        
        # Deve falhar
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Verifica se o produto 1 (que tinha estoque) NÃO foi alterado
        self.produto1.refresh_from_db()
        self.assertEqual(self.produto1.qtd_estoque, 50) # Deve manter 50
        
        # Verifica se o produto 2 não foi alterado
        self.produto2.refresh_from_db()
        self.assertEqual(self.produto2.qtd_estoque, 3)

    def test_venda_produto_inexistente(self):
        """
        Scenario: Tentar vender um produto que não existe
        """
        data = {
            "itens": [
                {
                    "produto": 9999,
                    "quantidade": 1,
                    "valor_unitario": 10.00
                }
            ]
        }
        
        response = self.client.post('/api/vendas/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_venda_quantidade_negativa(self):
        """
        Scenario: Tentar vender quantidade negativa (deveria falhar ou ser impedido)
        Obs: O serializer por padrão aceita IntegerField negativo se não houver validador.
        Se a lógica de negócio apenas subtrai, -1 aumentaria o estoque. Isso é um BUG potencial se não tratado.
        Vamos assumir que deve falhar. Se falhar o teste, precisaremos corrigir o serializer.
        """
        data = {
            "itens": [
                {
                    "produto": self.produto1.id_produto,
                    "quantidade": -1,
                    "valor_unitario": 20.00
                }
            ]
        }
        
        response = self.client.post('/api/vendas/', data, format='json')
        # Se não houver validação explicita, isso pode passar ou dar erro dependendo do banco (unsigned).
        # Vamos verificar comportamento desejado: BAD REQUEST.
        
        # Se o teste falhar aqui dizendo que foi 201, significa que precisamos adicionar validação min_value=1 no serializer.
        if response.status_code == 201:
             self.fail("Permitiu venda com quantidade negativa!")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
