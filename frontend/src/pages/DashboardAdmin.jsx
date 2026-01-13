import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function DashboardAdmin() {
    const navigate = useNavigate();

    // ESTADOS
    const [produtos, setProdutos] = useState([]);
    const [servicos, setServicos] = useState([]);
    const [movimentacoes, setMovimentacoes] = useState([]);
    const [mostrarModalEntrada, setMostrarModalEntrada] = useState(false);
    const [mostrarModalServico, setMostrarModalServico] = useState(false);
    const [buscaProduto, setBuscaProduto] = useState('');

    // FORMULÁRIO DE ENTRADA DE ESTOQUE
    const [entradaEstoque, setEntradaEstoque] = useState({
        produto: '',
        quantidade: 1,  // <--- MUDE DE 0 PARA 1
        custo_unitario: '',  // <--- MUDE DE 0 PARA '' (string vazia)
        observacao: ''
    });

    // FORMULÁRIO DE CADASTRO DE SERVIÇO
    const [novoServico, setNovoServico] = useState({
        descricao: '',
        preco_base: 0,
        tempo_estimado: ''
    });

    // VERIFICAR TOKEN
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.defaults.headers.Authorization = `Bearer ${token}`;
        } else {
            navigate('/');
        }
    }, [navigate]);

    // CARREGAR DADOS INICIAIS
    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            const [prodResp, servResp, movResp] = await Promise.all([
                api.get('produtos/'),
                api.get('servicos/'),
                api.get('movimentacoes-estoque/')
            ]);

            setProdutos(prodResp.data);
            setServicos(servResp.data);
            setMovimentacoes(movResp.data);
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
            if (err.response?.status === 401) navigate('/');
        }
    };

    // REGISTRAR ENTRADA DE ESTOQUE (PB11)
    const handleRegistrarEntrada = async (e) => {
        e.preventDefault();

        if (!entradaEstoque.produto || entradaEstoque.quantidade <= 0) {
            alert('Selecione um produto e informe uma quantidade válida.');
            return;
        }

        try {
            const payload = {
                produto: parseInt(entradaEstoque.produto),
                tipo_movimentacao: 'ENTRADA',
                quantidade: parseInt(entradaEstoque.quantidade),
                custo_unitario: entradaEstoque.custo_unitario ? parseFloat(entradaEstoque.custo_unitario) : null,
                observacao: entradaEstoque.observacao || 'Entrada manual de estoque'
            };

            console.log('📦 Payload de entrada:', payload);

            await api.post('movimentacoes-estoque/', payload);  // <--- MUDE AQUI (linha 89)

            alert('Entrada de estoque registrada com sucesso!');
            setMostrarModalEntrada(false);
            setEntradaEstoque({ produto: '', quantidade: 1, custo_unitario: '', observacao: '' });
            carregarDados();

        } catch (err) {
            console.error('Erro ao registrar entrada:', err);
            console.error('Detalhes:', err.response?.data);
            alert(`Erro: ${JSON.stringify(err.response?.data)}`);
        }
    };

    // CADASTRAR SERVIÇO
    const handleCadastrarServico = async (e) => {
        e.preventDefault();

        if (!novoServico.descricao || novoServico.preco_base <= 0) {
            alert('Preencha a descrição e o preço base.');
            return;
        }

        try {
            await api.post('servicos/', novoServico);
            alert('Serviço cadastrado com sucesso!');
            setMostrarModalServico(false);
            setNovoServico({ descricao: '', preco_base: 0, tempo_estimado: '' });
            carregarDados();
        } catch (err) {
            console.error('Erro ao cadastrar serviço:', err);
            alert('Erro ao cadastrar serviço.');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    const produtosFiltrados = produtos.filter(p =>
        p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* NAVBAR */}
            <nav className="bg-blue-800 text-white px-6 py-4 flex justify-between shadow-lg sticky top-0 z-10">
                <h1 className="text-2xl font-bold">🛠️ Admin - Controle de Estoque</h1>
                <div className="flex gap-4">
                    <button
                        onClick={() => setMostrarModalEntrada(true)}
                        className="bg-green-600 px-4 py-2 rounded font-bold hover:bg-green-700"
                    >
                        ➕ Entrada de Estoque
                    </button>
                    <button
                        onClick={() => setMostrarModalServico(true)}
                        className="bg-purple-600 px-4 py-2 rounded font-bold hover:bg-purple-700"
                    >
                        🔧 Cadastrar Serviço
                    </button>
                    <button onClick={handleLogout} className="text-gray-300 font-bold">Sair</button>
                </div>
            </nav>

            <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
                {/* LISTAGEM DE PRODUTOS */}
                <section className="bg-white rounded-lg shadow-lg p-6 mb-8">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">📦 Estoque Atual</h2>

                    <input
                        type="text"
                        placeholder="🔍 Buscar produto..."
                        className="w-full p-3 border rounded-lg mb-4"
                        value={buscaProduto}
                        onChange={e => setBuscaProduto(e.target.value)}
                    />

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 text-left">Produto</th>
                                    <th className="p-3 text-left">Estoque Atual</th>
                                    <th className="p-3 text-left">Estoque Mínimo</th>
                                    <th className="p-3 text-left">Custo</th>
                                    <th className="p-3 text-left">Preço Venda</th>
                                    <th className="p-3 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {produtosFiltrados.map(p => (
                                    <tr key={p.id_produto} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-bold">{p.nome}</td>
                                        <td className="p-3">{p.estoque_atual}</td>
                                        <td className="p-3">{p.estoque_minimo}</td>
                                        <td className="p-3">R$ {parseFloat(p.custo).toFixed(2)}</td>
                                        <td className="p-3">R$ {parseFloat(p.preco_venda).toFixed(2)}</td>
                                        <td className="p-3">
                                            {p.estoque_atual < p.estoque_minimo ? (
                                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">
                                                    ⚠️ Baixo
                                                </span>
                                            ) : (
                                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                                                    ✅ OK
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* HISTÓRICO DE MOVIMENTAÇÕES */}
                <section className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">📊 Histórico de Movimentações</h2>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {movimentacoes.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">Nenhuma movimentação registrada</p>
                        ) : (
                            movimentacoes.slice(-20).reverse().map(m => (
                                <div key={m.id_movimentacao} className="flex justify-between items-center bg-gray-50 p-3 rounded border">  {/* <--- MUDE DE id_item_movimentacao PARA id_movimentacao */}
                                    <div>
                                        <span className={`font-bold ${m.tipo_movimentacao === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                                            {m.tipo_movimentacao === 'ENTRADA' ? '⬆️ ENTRADA' : '⬇️ SAÍDA'}
                                        </span>
                                        <span className="ml-3 text-gray-700">{m.produto_nome || `Produto #${m.produto}`}</span>
                                        {m.observacao && <span className="ml-2 text-sm text-gray-500">({m.observacao})</span>}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">{m.quantidade} un.</p>
                                        <p className="text-sm text-gray-500">{new Date(m.data_movimentacao).toLocaleString('pt-BR')}</p>
                                    </div>
                                </div>
                            ))
                        )};
                    </div>
                </section>
            </main>

            {/* MODAL: ENTRADA DE ESTOQUE */}
            {mostrarModalEntrada && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4 text-green-700">➕ Registrar Entrada de Estoque</h2>

                        <form onSubmit={handleRegistrarEntrada}>
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Produto</label>
                                <select
                                    className="w-full p-3 border rounded-lg"
                                    value={entradaEstoque.produto}
                                    onChange={e => setEntradaEstoque({ ...entradaEstoque, produto: e.target.value })}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {produtos.map(p => (
                                        <option key={p.id_produto} value={p.id_produto}>
                                            {p.nome} (Estoque: {p.estoque_atual})
                                        </option>
                                    ))}
                                </select>

                                {/* DEBUG: Mostra quantos produtos foram carregados */}
                                <p className="text-xs text-gray-500 mt-1">
                                    {produtos.length === 0 ? '⚠️ Nenhum produto encontrado' : `✅ ${produtos.length} produto(s) disponível(is)`}
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Quantidade</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full p-3 border rounded-lg"
                                    value={entradaEstoque.quantidade}
                                    onChange={e => setEntradaEstoque({ ...entradaEstoque, quantidade: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Custo Unitário (Opcional)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-full p-3 border rounded-lg"
                                    value={entradaEstoque.custo_unitario}
                                    onChange={e => setEntradaEstoque({ ...entradaEstoque, custo_unitario: e.target.value })}
                                    placeholder="Deixe em branco para manter o custo atual"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Observação</label>
                                <textarea
                                    className="w-full p-3 border rounded-lg"
                                    rows="3"
                                    value={entradaEstoque.observacao}
                                    onChange={e => setEntradaEstoque({ ...entradaEstoque, observacao: e.target.value })}
                                    placeholder="Ex: Compra do fornecedor X"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button type="submit" className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700">
                                    ✅ Confirmar Entrada
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMostrarModalEntrada(false)}
                                    className="flex-1 bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: CADASTRAR SERVIÇO */}
            {mostrarModalServico && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4 text-purple-700">🔧 Cadastrar Serviço</h2>

                        <form onSubmit={handleCadastrarServico}>
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Descrição</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-lg"
                                    value={novoServico.descricao}
                                    onChange={e => setNovoServico({ ...novoServico, descricao: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Preço Base (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full p-3 border rounded-lg"
                                    value={novoServico.preco_base}
                                    onChange={e => setNovoServico({ ...novoServico, preco_base: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Tempo Estimado (ex: 2h)</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-lg"
                                    value={novoServico.tempo_estimado}
                                    onChange={e => setNovoServico({ ...novoServico, tempo_estimado: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button type="submit" className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700">
                                    ✅ Cadastrar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMostrarModalServico(false)}
                                    className="flex-1 bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DashboardAdmin;