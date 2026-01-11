import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function DashboardFornecedor() {
    const navigate = useNavigate();
    const [produtos, setProdutos] = useState([]);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [novoProduto, setNovoProduto] = useState({
        nome: '',
        descricao: '',
        custo: '',
        preco_venda: '',
        estoque_minimo: '',
        estoque_atual: ''
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.defaults.headers.Authorization = `Bearer ${token}`;
            carregarProdutos();
        } else {
            navigate('/');
        }
    }, [navigate]);

    const carregarProdutos = async () => {
        try {
            const response = await api.get('produtos/');
            setProdutos(response.data);
        } catch (err) {
            console.error("Erro ao carregar produtos", err);
        }
    };

    const handleChange = (e) => {
        setNovoProduto({ ...novoProduto, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // TC05 - Cenário 3: Validação no Frontend também
        if (parseFloat(novoProduto.preco_venda) <= 0) {
            alert("O preço de venda deve ser maior que zero.");
            return;
        }

        try {
            await api.post('produtos/', novoProduto);
            alert('Produto cadastrado com sucesso!');
            setMostrarModal(false);
            setNovoProduto({ nome: '', descricao: '', custo: '', preco_venda: '', estoque_minimo: '', estoque_atual: '' });
            carregarProdutos();
        } catch (err) {
            console.error(err);
            if (err.response?.data) {
                const erros = err.response.data;
                let msg = "Erro ao cadastrar:\n";
                Object.keys(erros).forEach(key => {
                    msg += `- ${key}: ${erros[key]}\n`;
                });
                alert(msg);
            } else {
                alert('Erro ao cadastrar produto.');
            }
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <nav className="bg-white px-6 py-4 shadow-sm flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800">Painel do Fornecedor</h1>
                <div className="flex items-center gap-4">
                    <button onClick={() => setMostrarModal(true)} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700">
                        + Cadastrar Produto
                    </button>
                    <button onClick={handleLogout} className="text-red-500 font-bold text-sm hover:underline">Sair</button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-6">
                <h2 className="text-2xl font-bold text-gray-700 mb-6">Meus Produtos</h2>

                {produtos.length === 0 ? (
                    <div className="bg-white p-8 rounded shadow text-center text-gray-400">
                        Você ainda não cadastrou nenhum produto.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {produtos.map((prod) => (
                            <div key={prod.id_produto} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                                <h3 className="text-lg font-bold text-gray-800 mb-2">{prod.nome}</h3>
                                <p className="text-sm text-gray-600 mb-3">{prod.descricao || 'Sem descrição'}</p>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="font-bold text-gray-500">Custo:</span>
                                        <p className="text-blue-600">R$ {parseFloat(prod.custo).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <span className="font-bold text-gray-500">Venda:</span>
                                        <p className="text-green-600 font-bold">R$ {parseFloat(prod.preco_venda).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <span className="font-bold text-gray-500">Estoque:</span>
                                        <p>{prod.estoque_atual} un.</p>
                                    </div>
                                    <div>
                                        <span className="font-bold text-gray-500">Mínimo:</span>
                                        <p className="text-orange-600">{prod.estoque_minimo} un.</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* MODAL DE CADASTRO */}
            {mostrarModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg relative">
                        <button onClick={() => setMostrarModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
                        <h2 className="text-xl font-bold mb-4 text-green-700">Cadastrar Novo Produto</h2>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                            <div>
                                <label className="text-sm font-bold text-gray-600">Nome do Produto *</label>
                                <input type="text" name="nome" className="w-full p-2 border rounded" placeholder="Ex: Filtro de Óleo AB-200" onChange={handleChange} required />
                            </div>

                            <div>
                                <label className="text-sm font-bold text-gray-600">Descrição</label>
                                <textarea name="descricao" className="w-full p-2 border rounded h-20" placeholder="Detalhes do produto..." onChange={handleChange} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-bold text-gray-600">Custo (R$) *</label>
                                    <input type="number" step="0.01" name="custo" className="w-full p-2 border rounded" placeholder="0.00" onChange={handleChange} required />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-600">Preço Venda (R$) *</label>
                                    <input type="number" step="0.01" name="preco_venda" className="w-full p-2 border rounded" placeholder="0.00" onChange={handleChange} required />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-bold text-gray-600">Estoque Mínimo *</label>
                                    <input type="number" name="estoque_minimo" className="w-full p-2 border rounded" placeholder="10" onChange={handleChange} required />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-600">Estoque Atual</label>
                                    <input type="number" name="estoque_atual" className="w-full p-2 border rounded" placeholder="50" onChange={handleChange} />
                                </div>
                            </div>

                            <button type="submit" className="mt-4 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 shadow-md">
                                Cadastrar Produto
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DashboardFornecedor;