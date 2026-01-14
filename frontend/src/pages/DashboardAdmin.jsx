import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function DashboardAdmin() {
    const navigate = useNavigate();

    // ESTADOS
    const [abaSelecionada, setAbaSelecionada] = useState('estoque');
    const [produtos, setProdutos] = useState([]);
    const [servicos, setServicos] = useState([]);
    const [movimentacoes, setMovimentacoes] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [mecanicos, setMecanicos] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);

    // MODAIS
    const [mostrarModalEntrada, setMostrarModalEntrada] = useState(false);
    const [mostrarModalServico, setMostrarModalServico] = useState(false);
    const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
    const [mostrarModalMecanico, setMostrarModalMecanico] = useState(false);
    const [mostrarModalFornecedor, setMostrarModalFornecedor] = useState(false);

    const [buscaProduto, setBuscaProduto] = useState('');

    // FORMULÁRIOS
    const [entradaEstoque, setEntradaEstoque] = useState({
        produto: '',
        quantidade: 1,
        custo_unitario: '',
        observacao: ''
    });

    const [novoServico, setNovoServico] = useState({
        descricao: '',
        preco_base: 0,
        tempo_estimado: ''
    });

    const [novoCliente, setNovoCliente] = useState({
        nome: '',
        cpf: '',
        telefone: '',
        email: '',
        endereco: '',
        password: ''
    });

    const [novoMecanico, setNovoMecanico] = useState({
        nome: '',
        cpf: '',
        telefone: '',
        email: '',
        endereco: '',
        password: ''
    });

    const [novoFornecedor, setNovoFornecedor] = useState({
        nome: '',
        cnpj: '',
        telefone: '',
        endereco: '',
        email: '',
        password: ''
    });

    const usuarioNome = localStorage.getItem('user_name') || 'Administrador';

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
            const [prodResp, servResp, movResp, cliResp, mecResp, fornResp] = await Promise.all([
                api.get('produtos/'),
                api.get('servicos/'),
                api.get('movimentacoes-estoque/'),
                api.get('clientes/'),
                api.get('mecanicos/'),
                api.get('fornecedores/')
            ]);

            setProdutos(prodResp.data);
            setServicos(servResp.data);
            setMovimentacoes(movResp.data);
            setClientes(cliResp.data);
            setMecanicos(mecResp.data);
            setFornecedores(fornResp.data);
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
            if (err.response?.status === 401) navigate('/');
        }
    };

    // REGISTRAR ENTRADA DE ESTOQUE
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

            await api.post('movimentacoes-estoque/', payload);
            alert('Entrada de estoque registrada com sucesso!');
            setMostrarModalEntrada(false);
            setEntradaEstoque({ produto: '', quantidade: 1, custo_unitario: '', observacao: '' });
            carregarDados();
        } catch (err) {
            console.error('Erro ao registrar entrada:', err);
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

    // CADASTRAR CLIENTE
    const handleCadastrarCliente = async (e) => {
        e.preventDefault();

        try {
            await api.post('clientes/', novoCliente);
            alert('✅ Cliente cadastrado com sucesso!');
            setMostrarModalCliente(false);
            setNovoCliente({ nome: '', cpf: '', telefone: '', email: '', endereco: '', password: '' });
            carregarDados();
        } catch (err) {
            console.error('Erro ao cadastrar cliente:', err);
            alert(`Erro: ${JSON.stringify(err.response?.data)}`);
        }
    };

    // CADASTRAR MECÂNICO
    const handleCadastrarMecanico = async (e) => {
        e.preventDefault();

        try {
            await api.post('mecanicos/', novoMecanico);
            alert('✅ Mecânico cadastrado com sucesso!');
            setMostrarModalMecanico(false);
            setNovoMecanico({ nome: '', cpf: '', telefone: '', email: '', endereco: '', password: '' });
            carregarDados();
        } catch (err) {
            console.error('Erro ao cadastrar mecânico:', err);
            alert(`Erro: ${JSON.stringify(err.response?.data)}`);
        }
    };

    // CADASTRAR FORNECEDOR
    const handleCadastrarFornecedor = async (e) => {
        e.preventDefault();

        try {
            await api.post('fornecedores/', novoFornecedor);
            alert('✅ Fornecedor cadastrado com sucesso!');
            setMostrarModalFornecedor(false);
            setNovoFornecedor({ nome: '', cnpj: '', telefone: '', endereco: '', email: '', password: '' });
            carregarDados();
        } catch (err) {
            console.error('Erro ao cadastrar fornecedor:', err);
            alert(`Erro: ${JSON.stringify(err.response?.data)}`);
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* HEADER */}
            <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🛠️</span>
                        <h1 className="text-2xl font-bold">Painel do Administrador</h1>
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
                {/* SISTEMA DE ABAS */}
                <div className="bg-white rounded-t-lg shadow-sm border-b flex gap-1 p-1 mb-6">
                    <button
                        onClick={() => setAbaSelecionada('estoque')}
                        className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${abaSelecionada === 'estoque'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        📦 Estoque
                    </button>
                    <button
                        onClick={() => setAbaSelecionada('usuarios')}
                        className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${abaSelecionada === 'usuarios'
                                ? 'bg-green-600 text-white shadow-md'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        👥 Usuários
                    </button>
                </div>

                {/* ABA: ESTOQUE */}
                {abaSelecionada === 'estoque' && (
                    <div>
                        {/* Botões de Ação */}
                        <div className="flex gap-4 mb-6">
                            <button
                                onClick={() => setMostrarModalEntrada(true)}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2"
                            >
                                ➕ Entrada de Estoque
                            </button>
                            <button
                                onClick={() => setMostrarModalServico(true)}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2"
                            >
                                🔧 Cadastrar Serviço
                            </button>
                        </div>

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
                                        <div key={m.id_movimentacao} className="flex justify-between items-center bg-gray-50 p-3 rounded border">
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
                                )}
                            </div>
                        </section>
                    </div>
                )}

                {/* ABA: USUÁRIOS */}
                {abaSelecionada === 'usuarios' && (
                    <div>
                        {/* Botões de Cadastro */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <button
                                onClick={() => setMostrarModalCliente(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                            >
                                👤 Cadastrar Cliente
                            </button>
                            <button
                                onClick={() => setMostrarModalMecanico(true)}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                            >
                                🔧 Cadastrar Mecânico
                            </button>
                            <button
                                onClick={() => setMostrarModalFornecedor(true)}
                                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                            >
                                📦 Cadastrar Fornecedor
                            </button>
                        </div>

                        {/* LISTA DE CLIENTES */}
                        <section className="bg-white rounded-lg shadow-lg p-6 mb-6">
                            <h2 className="text-2xl font-bold mb-4 text-gray-800">👤 Clientes ({clientes.length})</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-3 text-left">Nome</th>
                                            <th className="p-3 text-left">CPF</th>
                                            <th className="p-3 text-left">Telefone</th>
                                            <th className="p-3 text-left">Email</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clientes.map(c => (
                                            <tr key={c.id_cliente} className="border-b hover:bg-gray-50">
                                                <td className="p-3 font-bold">{c.nome}</td>
                                                <td className="p-3">{c.cpf}</td>
                                                <td className="p-3">{c.telefone}</td>
                                                <td className="p-3">{c.email}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* LISTA DE MECÂNICOS */}
                        <section className="bg-white rounded-lg shadow-lg p-6 mb-6">
                            <h2 className="text-2xl font-bold mb-4 text-gray-800">🔧 Mecânicos ({mecanicos.length})</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-3 text-left">Nome</th>
                                            <th className="p-3 text-left">CPF</th>
                                            <th className="p-3 text-left">Telefone</th>
                                            <th className="p-3 text-left">Email</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mecanicos.map(m => (
                                            <tr key={m.id_mecanico} className="border-b hover:bg-gray-50">
                                                <td className="p-3 font-bold">{m.nome}</td>
                                                <td className="p-3">{m.cpf}</td>
                                                <td className="p-3">{m.telefone}</td>
                                                <td className="p-3">{m.email}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* LISTA DE FORNECEDORES */}
                        <section className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-2xl font-bold mb-4 text-gray-800">📦 Fornecedores ({fornecedores.length})</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-3 text-left">Nome</th>
                                            <th className="p-3 text-left">CNPJ</th>
                                            <th className="p-3 text-left">Telefone</th>
                                            <th className="p-3 text-left">Endereço</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fornecedores.map(f => (
                                            <tr key={f.id} className="border-b hover:bg-gray-50">
                                                <td className="p-3 font-bold">{f.nome}</td>
                                                <td className="p-3">{f.cnpj}</td>
                                                <td className="p-3">{f.telefone}</td>
                                                <td className="p-3">{f.endereco}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                )}
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

            {/* MODAL: CADASTRAR CLIENTE */}
            {mostrarModalCliente && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-4 text-blue-700">👤 Cadastrar Cliente</h2>

                        <form onSubmit={handleCadastrarCliente}>
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Nome *</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-lg"
                                    value={novoCliente.nome}
                                    onChange={e => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">CPF *</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-lg"
                                    value={novoCliente.cpf}
                                    onChange={e => setNovoCliente({ ...novoCliente, cpf: e.target.value })}
                                    placeholder="000.000.000-00"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Telefone *</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-lg"
                                    value={novoCliente.telefone}
                                    onChange={e => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                                    placeholder="(00) 00000-0000"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
                                <input
                                    type="email"
                                    className="w-full p-3 border rounded-lg"
                                    value={novoCliente.email}
                                    onChange={e => setNovoCliente({ ...novoCliente, email: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Endereço *</label>
                                <textarea
                                    className="w-full p-3 border rounded-lg"
                                    value={novoCliente.endereco}
                                    onChange={e => setNovoCliente({ ...novoCliente, endereco: e.target.value })}
                                    rows="2"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Senha *</label>
                                <input
                                    type="password"
                                    className="w-full p-3 border rounded-lg"
                                    value={novoCliente.password}
                                    onChange={e => setNovoCliente({ ...novoCliente, password: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex gap-3">
                                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700">
                                    ✅ Cadastrar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMostrarModalCliente(false)}
                                    className="flex-1 bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: CADASTRAR MECÂNICO */}
            {mostrarModalMecanico && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-4 text-green-700">🔧 Cadastrar Mecânico</h2>

                        <form onSubmit={handleCadastrarMecanico}>
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Nome *</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-lg"
                                    value={novoMecanico.nome}
                                    onChange={e => setNovoMecanico({ ...novoMecanico, nome: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">CPF *</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-lg"
                                    value={novoMecanico.cpf}
                                    onChange={e => setNovoMecanico({ ...novoMecanico, cpf: e.target.value })}
                                    placeholder="000.000.000-00"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Telefone *</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-lg"
                                    value={novoMecanico.telefone}
                                    onChange={e => setNovoMecanico({ ...novoMecanico, telefone: e.target.value })}
                                    placeholder="(00) 00000-0000"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
                                <input
                                    type="email"
                                    className="w-full p-3 border rounded-lg"
                                    value={novoMecanico.email}
                                    onChange={e => setNovoMecanico({ ...novoMecanico, email: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Endereço *</label>
                                <textarea
                                    className="w-full p-3 border rounded-lg"
                                    value={novoMecanico.endereco}
                                    onChange={e => setNovoMecanico({ ...novoMecanico, endereco: e.target.value })}
                                    rows="2"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Senha *</label>
                                <input
                                    type="password"
                                    className="w-full p-3 border rounded-lg"
                                    value={novoMecanico.password}
                                    onChange={e => setNovoMecanico({ ...novoMecanico, password: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex gap-3">
                                <button type="submit" className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700">
                                    ✅ Cadastrar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMostrarModalMecanico(false)}
                                    className="flex-1 bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: CADASTRAR FORNECEDOR */}
            {mostrarModalFornecedor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-4 text-orange-700">📦 Cadastrar Fornecedor</h2>

                        <form onSubmit={handleCadastrarFornecedor}>
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Nome da Empresa *</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-lg"
                                    value={novoFornecedor.nome}
                                    onChange={e => setNovoFornecedor({ ...novoFornecedor, nome: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">CNPJ *</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-lg"
                                    value={novoFornecedor.cnpj}
                                    onChange={e => setNovoFornecedor({ ...novoFornecedor, cnpj: e.target.value })}
                                    placeholder="00.000.000/0000-00"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Telefone *</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-lg"
                                    value={novoFornecedor.telefone}
                                    onChange={e => setNovoFornecedor({ ...novoFornecedor, telefone: e.target.value })}
                                    placeholder="(00) 00000-0000"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    className="w-full p-3 border rounded-lg"
                                    value={novoFornecedor.email}
                                    onChange={e => setNovoFornecedor({ ...novoFornecedor, email: e.target.value })}
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Endereço *</label>
                                <textarea
                                    className="w-full p-3 border rounded-lg"
                                    value={novoFornecedor.endereco}
                                    onChange={e => setNovoFornecedor({ ...novoFornecedor, endereco: e.target.value })}
                                    rows="2"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Senha *</label>
                                <input
                                    type="password"
                                    className="w-full p-3 border rounded-lg"
                                    value={novoFornecedor.password}
                                    onChange={e => setNovoFornecedor({ ...novoFornecedor, password: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex gap-3">
                                <button type="submit" className="flex-1 bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700">
                                    ✅ Cadastrar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMostrarModalFornecedor(false)}
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