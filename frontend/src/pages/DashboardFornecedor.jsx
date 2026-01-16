import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function DashboardFornecedor() {
    const [pedidos, setPedidos] = useState([]);
    const [pecas, setPecas] = useState([]);
    const [abaSelecionada, setAbaSelecionada] = useState('pedidos');
    const [mostrarModalNovaPeca, setMostrarModalNovaPeca] = useState(false);
    const [mostrarModalEditarPeca, setMostrarModalEditarPeca] = useState(false); // <--- NOVO
    const [mostrarModalConfirmarExclusao, setMostrarModalConfirmarExclusao] = useState(false); // <--- NOVO
    const [pecaSelecionada, setPecaSelecionada] = useState(null); // <--- NOVO
    const [novaPeca, setNovaPeca] = useState({
        nome: '',
        descricao: '',
        custo: '',
        preco_venda: '',
        estoque_minimo: '',
        estoque_atual: ''
    });
    const navigate = useNavigate();
    const usuarioNome = localStorage.getItem('user_name') || 'Fornecedor';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.defaults.headers.Authorization = `Bearer ${token}`;
            carregarPedidos();
            carregarPecas();
        } else {
            navigate('/');
        }
    }, [navigate]);

    const carregarPedidos = async () => {
        try {
            const response = await api.get('pedidos-compra/');
            console.log("📦 Pedidos de compra recebidos:", response.data);
            setPedidos(response.data);
        } catch (err) {
            console.error("Erro ao carregar pedidos", err);
        }
    };

    const carregarPecas = async () => {
        try {
            const response = await api.get('produtos/');
            console.log("🔧 Peças recebidas:", response.data);
            setPecas(response.data);
        } catch (err) {
            console.error("Erro ao carregar peças", err);
        }
    };

    const atualizarStatusPedido = async (id, novoStatus) => {
        if (!window.confirm(`Confirmar mudança de status para "${novoStatus}"?`)) return;

        try {
            await api.patch(`pedidos/${id}/`, { status: novoStatus });
            alert(`Status atualizado para "${novoStatus}" com sucesso!`);
            carregarPedidos();
        } catch (err) {
            console.error(err);
            alert("Erro ao atualizar status do pedido.");
        }
    };

    const cadastrarPeca = async (e) => {
        e.preventDefault();

        try {
            // Pegar o ID do fornecedor logado
            const userId = localStorage.getItem('user_id');

            // Buscar o fornecedor associado ao usuário
            let fornecedorId = null;
            try {
                const fornecedoresResponse = await api.get('fornecedores/');
                const fornecedor = fornecedoresResponse.data.find(f => f.user === parseInt(userId));
                if (fornecedor) {
                    fornecedorId = fornecedor.id_fornecedor;
                }
            } catch (err) {
                console.error("Erro ao buscar fornecedor:", err);
            }

            const produtoData = {
                nome: novaPeca.nome,
                descricao: novaPeca.descricao || '',
                custo: parseFloat(novaPeca.custo) || 0,
                preco_venda: parseFloat(novaPeca.preco_venda) || 0,
                estoque_minimo: parseInt(novaPeca.estoque_minimo) || 0,
                estoque_atual: parseInt(novaPeca.estoque_atual) || 0,
                fornecedor: fornecedorId
            };

            console.log("📦 Enviando produto:", produtoData);

            await api.post('produtos/', produtoData);
            alert('Produto cadastrado com sucesso!');
            setMostrarModalNovaPeca(false);
            setNovaPeca({
                nome: '',
                descricao: '',
                custo: '',
                preco_venda: '',
                estoque_minimo: '',
                estoque_atual: ''
            });
            carregarPecas();
        } catch (err) {
            console.error("Erro completo:", err.response?.data || err);
            const erroMsg = err.response?.data
                ? JSON.stringify(err.response.data, null, 2)
                : 'Erro ao cadastrar produto.';
            alert(`Erro: ${erroMsg}`);
        }
    };

    // NOVA FUNÇÃO: Abrir modal de edição
    const abrirModalEdicao = (peca) => {
        setPecaSelecionada({
            ...peca,
            custo: parseFloat(peca.custo || 0),
            preco_venda: parseFloat(peca.preco_venda || 0),
            estoque_minimo: parseInt(peca.estoque_minimo || 0),
            estoque_atual: parseInt(peca.estoque_atual || 0)
        });
        setMostrarModalEditarPeca(true);
    };

    // NOVA FUNÇÃO: Atualizar produto
    const atualizarPeca = async (e) => {
        e.preventDefault();

        try {
            const produtoData = {
                nome: pecaSelecionada.nome,
                descricao: pecaSelecionada.descricao || '',
                custo: parseFloat(pecaSelecionada.custo),
                preco_venda: parseFloat(pecaSelecionada.preco_venda),
                estoque_minimo: parseInt(pecaSelecionada.estoque_minimo),
                estoque_atual: parseInt(pecaSelecionada.estoque_atual),
                fornecedor: pecaSelecionada.fornecedor
            };

            await api.put(`produtos/${pecaSelecionada.id_produto}/`, produtoData);
            alert('✅ Produto atualizado com sucesso!');
            setMostrarModalEditarPeca(false);
            setPecaSelecionada(null);
            carregarPecas();
        } catch (err) {
            console.error("Erro ao atualizar:", err.response?.data || err);
            alert(`Erro: ${JSON.stringify(err.response?.data)}`);
        }
    };

    // NOVA FUNÇÃO: Confirmar exclusão (1ª etapa)
    const iniciarExclusao = () => {
        setMostrarModalEditarPeca(false);
        setMostrarModalConfirmarExclusao(true);
    };

    // NOVA FUNÇÃO: Executar exclusão (2ª etapa)
    const confirmarExclusao = async () => {
        try {
            await api.delete(`produtos/${pecaSelecionada.id_produto}/`);
            alert('🗑️ Produto excluído com sucesso!');
            setMostrarModalConfirmarExclusao(false);
            setPecaSelecionada(null);
            carregarPecas();
        } catch (err) {
            console.error("Erro ao excluir:", err);
            alert('Erro ao excluir produto.');
        }
    };

    // NOVA FUNÇÃO: Cancelar exclusão
    const cancelarExclusao = () => {
        setMostrarModalConfirmarExclusao(false);
        setMostrarModalEditarPeca(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    const getStatusConfig = (status) => {
        const configs = {
            'PENDENTE': {
                cor: 'bg-yellow-100 text-yellow-700 border-yellow-300',
                icone: '⏳',
                titulo: 'Aguardando Processamento'
            },
            'EM_SEPARACAO': {
                cor: 'bg-blue-100 text-blue-700 border-blue-300',
                icone: '📦',
                titulo: 'Em Separação'
            },
            'ENVIADO': {
                cor: 'bg-purple-100 text-purple-700 border-purple-300',
                icone: '🚚',
                titulo: 'Enviado'
            },
            'ENTREGUE': {
                cor: 'bg-green-100 text-green-700 border-green-300',
                icone: '✅',
                titulo: 'Entregue'
            },
            'CANCELADO': {
                cor: 'bg-red-100 text-red-700 border-red-300',
                icone: '❌',
                titulo: 'Cancelado'
            }
        };

        return configs[status] || {
            cor: 'bg-gray-100 text-gray-700 border-gray-300',
            icone: '📋',
            titulo: status
        };
    };

    const aprovarPedido = async (id) => {
        if (!confirm('Aprovar este pedido? Seu estoque será reduzido.')) return;

        try {
            await api.post(`pedidos-compra/${id}/aprovar/`);
            alert('✅ Pedido aprovado! Estoque atualizado.');
            carregarPedidos();
            carregarPecas();
        } catch (err) {
            alert(`Erro: ${err.response?.data?.erro || 'Erro ao aprovar pedido'}`);
        }
    };

    const rejeitarPedido = async (id) => {
        const motivo = prompt('Motivo da rejeição:');
        if (!motivo) return;

        try {
            await api.post(`pedidos-compra/${id}/rejeitar/`, { motivo });
            alert('❌ Pedido rejeitado.');
            carregarPedidos();
        } catch (err) {
            alert('Erro ao rejeitar pedido.');
        }
    };

    const pedidosPendentes = pedidos.filter(p => p.status === 'PENDENTE');
    const pedidosEmAndamento = pedidos.filter(p => ['EM_SEPARACAO', 'ENVIADO'].includes(p.status));
    const pedidosFinalizados = pedidos.filter(p => ['ENTREGUE', 'CANCELADO'].includes(p.status));

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* HEADER ATUALIZADO - Padrão das outras dashboards */}
            <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">📦</span>
                        <h1 className="text-2xl font-bold">Painel do Fornecedor</h1>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-xs text-blue-200">Bem-vindo(a)</p>
                            <p className="font-bold">{usuarioNome}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-md flex items-center gap-2"
                        >
                            🚪 Sair
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6">
                {/* Sistema de Abas */}
                <div className="bg-white rounded-t-lg shadow-sm border-b flex gap-1 p-1 mb-6">
                    <button
                        onClick={() => setAbaSelecionada('pedidos')}
                        className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${abaSelecionada === 'pedidos'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        📦 Pedidos
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${abaSelecionada === 'pedidos' ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-700'
                            }`}>
                            {pedidos.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setAbaSelecionada('catalogo')}
                        className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${abaSelecionada === 'catalogo'
                            ? 'bg-green-600 text-white shadow-md'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        🔧 Catálogo de Peças
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${abaSelecionada === 'catalogo' ? 'bg-white text-green-600' : 'bg-gray-200 text-gray-700'
                            }`}>
                            {pecas.length}
                        </span>
                    </button>
                </div>

                {/* ABA: PEDIDOS */}
                {abaSelecionada === 'pedidos' && (
                    <div>
                        {/* Estatísticas Rápidas */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-500 p-4 rounded-lg shadow-md">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-yellow-700 text-sm font-bold">Pendentes</p>
                                        <p className="text-3xl font-bold text-yellow-800">{pedidosPendentes.length}</p>
                                    </div>
                                    <span className="text-5xl">⏳</span>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 p-4 rounded-lg shadow-md">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-blue-700 text-sm font-bold">Em Andamento</p>
                                        <p className="text-3xl font-bold text-blue-800">{pedidosEmAndamento.length}</p>
                                    </div>
                                    <span className="text-5xl">🚚</span>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500 p-4 rounded-lg shadow-md">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-green-700 text-sm font-bold">Finalizados</p>
                                        <p className="text-3xl font-bold text-green-800">{pedidosFinalizados.length}</p>
                                    </div>
                                    <span className="text-5xl">✅</span>
                                </div>
                            </div>
                        </div>

                        {/* Lista de Pedidos */}
                        <div className="mb-6 flex items-center gap-3">
                            <span className="text-4xl">📦</span>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Gerenciar Pedidos</h2>
                                <p className="text-sm text-gray-500">Atualize o status dos pedidos recebidos</p>
                            </div>
                        </div>

                        {pedidos.length === 0 ? (
                            <div className="bg-white p-12 rounded-lg shadow text-center">
                                <span className="text-6xl mb-4 block">📭</span>
                                <p className="text-gray-400 text-lg">Nenhum pedido registrado no momento.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {pedidos.map((pedido) => {
                                    const statusConfig = getStatusConfig(pedido.status);

                                    return (
                                        <div key={pedido.id_pedido} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-lg font-bold">📦 {pedido.produto_nome}</h3>
                                                    <p className="text-sm text-gray-600">Quantidade: {pedido.quantidade} un.</p>
                                                    <p className="text-sm text-gray-600">Valor Total: R$ {parseFloat(pedido.valor_total).toFixed(2)}</p>
                                                    <p className="text-xs text-gray-500">{new Date(pedido.data_pedido).toLocaleString('pt-BR')}</p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${pedido.status === 'PENDENTE' ? 'bg-yellow-200 text-yellow-800' :
                                                    pedido.status === 'APROVADO' ? 'bg-green-200 text-green-800' :
                                                        'bg-red-200 text-red-800'
                                                    }`}>
                                                    {pedido.status}
                                                </span>
                                            </div>

                                            {pedido.status === 'PENDENTE' && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => aprovarPedido(pedido.id_pedido)}
                                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold"
                                                    >
                                                        ✅ Aprovar
                                                    </button>
                                                    <button
                                                        onClick={() => rejeitarPedido(pedido.id_pedido)}
                                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold"
                                                    >
                                                        ❌ Rejeitar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ABA: CATÁLOGO DE PEÇAS */}
                {abaSelecionada === 'catalogo' && (
                    <div>
                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-4xl">🔧</span>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">Catálogo de Peças</h2>
                                    <p className="text-sm text-gray-500">Gerencie o estoque e preços das peças</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setMostrarModalNovaPeca(true)}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold shadow-md flex items-center gap-2 transition-colors"
                            >
                                ➕ Cadastrar Peça
                            </button>
                        </div>

                        {pecas.length === 0 ? (
                            /* ...existing empty state code... */
                            <div className="bg-white p-12 rounded-lg shadow text-center">
                                <span className="text-6xl mb-4 block">🔧</span>
                                <p className="text-gray-400 text-lg mb-4">Nenhuma peça cadastrada no catálogo.</p>
                                <button
                                    onClick={() => setMostrarModalNovaPeca(true)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold shadow-md inline-flex items-center gap-2 transition-colors"
                                >
                                    ➕ Cadastrar Primeira Peça
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {pecas.map((peca) => (
                                    <div
                                        key={peca.id_produto}
                                        onClick={() => abrirModalEdicao(peca)} // <--- ADICIONAR CLICK
                                        className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all border-l-4 border-blue-600 overflow-hidden cursor-pointer transform hover:scale-105" // <--- ADICIONAR cursor-pointer e hover
                                    >
                                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b">
                                            <h3 className="font-bold text-gray-800 text-lg">{peca.nome}</h3>
                                            <p className="text-xs text-gray-500">Código: {peca.id_produto}</p>
                                        </div>

                                        <div className="p-4">
                                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                                {peca.descricao || 'Sem descrição'}
                                            </p>

                                            <div className="flex justify-between items-center mb-3 pb-3 border-b">
                                                <div>
                                                    <p className="text-xs text-gray-500">Estoque</p>
                                                    <p className={`text-lg font-bold ${peca.estoque_atual > 10 ? 'text-green-600' : peca.estoque_atual > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                        {peca.estoque_atual || 0} un.
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">Preço</p>
                                                    <p className="text-lg font-bold text-blue-700">
                                                        R$ {parseFloat(peca.preco_venda || 0).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className={`text-xs px-3 py-1 rounded-full text-center font-bold ${peca.estoque_atual > 10
                                                    ? 'bg-green-100 text-green-700'
                                                    : peca.estoque_atual > 0
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-red-100 text-red-700'
                                                }`}>
                                                {peca.estoque_atual > 10 ? '✅ Em Estoque' : peca.estoque_atual > 0 ? '⚠️ Estoque Baixo' : '❌ Sem Estoque'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* MODAL: CADASTRAR NOVA PEÇA */}
            {mostrarModalNovaPeca && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex justify-between items-center sticky top-0">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                ➕ Cadastrar Nova Peça
                            </h2>
                            <button
                                onClick={() => setMostrarModalNovaPeca(false)}
                                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={cadastrarPeca} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Nome da Peça *
                                </label>
                                <input
                                    type="text"
                                    value={novaPeca.nome}
                                    onChange={(e) => setNovaPeca({ ...novaPeca, nome: e.target.value })}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Ex: Filtro de Óleo"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Descrição
                                </label>
                                <textarea
                                    value={novaPeca.descricao}
                                    onChange={(e) => setNovaPeca({ ...novaPeca, descricao: e.target.value })}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Descrição detalhada da peça..."
                                    rows="3"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Custo (R$) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={novaPeca.custo}
                                        onChange={(e) => setNovaPeca({ ...novaPeca, custo: e.target.value })}
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Preço de Venda (R$) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={novaPeca.preco_venda}
                                        onChange={(e) => setNovaPeca({ ...novaPeca, preco_venda: e.target.value })}
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Estoque Mínimo *
                                    </label>
                                    <input
                                        type="number"
                                        value={novaPeca.estoque_minimo}
                                        onChange={(e) => setNovaPeca({ ...novaPeca, estoque_minimo: e.target.value })}
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="0"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Estoque Atual *
                                    </label>
                                    <input
                                        type="number"
                                        value={novaPeca.estoque_atual}
                                        onChange={(e) => setNovaPeca({ ...novaPeca, estoque_atual: e.target.value })}
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="0"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setMostrarModalNovaPeca(false)}
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-bold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold shadow-md transition-colors"
                                >
                                    ✓ Cadastrar Peça
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* NOVO MODAL: EDITAR PEÇA */}
            {mostrarModalEditarPeca && pecaSelecionada && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center sticky top-0">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                ✏️ Editar Peça
                            </h2>
                            <button
                                onClick={() => {
                                    setMostrarModalEditarPeca(false);
                                    setPecaSelecionada(null);
                                }}
                                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={atualizarPeca} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Nome da Peça *
                                </label>
                                <input
                                    type="text"
                                    value={pecaSelecionada.nome}
                                    onChange={(e) => setPecaSelecionada({ ...pecaSelecionada, nome: e.target.value })}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Descrição
                                </label>
                                <textarea
                                    value={pecaSelecionada.descricao}
                                    onChange={(e) => setPecaSelecionada({ ...pecaSelecionada, descricao: e.target.value })}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows="3"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Custo (R$) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={pecaSelecionada.custo}
                                        onChange={(e) => setPecaSelecionada({ ...pecaSelecionada, custo: e.target.value })}
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Preço de Venda (R$) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={pecaSelecionada.preco_venda}
                                        onChange={(e) => setPecaSelecionada({ ...pecaSelecionada, preco_venda: e.target.value })}
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Estoque Mínimo *
                                    </label>
                                    <input
                                        type="number"
                                        value={pecaSelecionada.estoque_minimo}
                                        onChange={(e) => setPecaSelecionada({ ...pecaSelecionada, estoque_minimo: e.target.value })}
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Estoque Atual *
                                    </label>
                                    <input
                                        type="number"
                                        value={pecaSelecionada.estoque_atual}
                                        onChange={(e) => setPecaSelecionada({ ...pecaSelecionada, estoque_atual: e.target.value })}
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={iniciarExclusao}
                                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center gap-2"
                                >
                                    🗑️ Excluir
                                </button>
                                <div className="flex-1 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMostrarModalEditarPeca(false);
                                            setPecaSelecionada(null);
                                        }}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-bold transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-md transition-colors"
                                    >
                                        ✓ Salvar Alterações
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* NOVO MODAL: CONFIRMAR EXCLUSÃO */}
            {mostrarModalConfirmarExclusao && pecaSelecionada && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
                        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-lg">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                ⚠️ Confirmar Exclusão
                            </h2>
                        </div>

                        <div className="p-6">
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                                <p className="text-red-800 font-bold mb-2">Atenção!</p>
                                <p className="text-red-700 text-sm">
                                    Esta ação não pode ser desfeita. O produto será permanentemente removido do sistema.
                                </p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                <p className="text-sm text-gray-600 mb-2">Produto a ser excluído:</p>
                                <p className="font-bold text-lg">{pecaSelecionada.nome}</p>
                                <p className="text-sm text-gray-500">Código: {pecaSelecionada.id_produto}</p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={cancelarExclusao}
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-bold transition-colors"
                                >
                                    ← Voltar
                                </button>
                                <button
                                    onClick={confirmarExclusao}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold shadow-md transition-colors"
                                >
                                    🗑️ Confirmar Exclusão
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DashboardFornecedor;