import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function HomeCliente() {
    const [orcamentos, setOrcamentos] = useState([]);
    const navigate = useNavigate();
    const usuarioNome = localStorage.getItem('user_name') || 'Cliente';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.defaults.headers.Authorization = `Bearer ${token}`;
            carregarOrcamentos();
        } else {
            navigate('/');
        }
    }, [navigate]);

    const carregarOrcamentos = async () => {
        try {
            const response = await api.get('orcamentos/');
            console.log("Dados recebidos da API:", response.data); // <--- DEBUG: Veja no F12 o que chega
            setOrcamentos(response.data);
        } catch (err) {
            console.error("Erro ao carregar orçamentos", err);
        }
    };

    const aprovarOrcamento = async (id, statusAtual) => {
        if (statusAtual !== 'PENDENTE') return;

        if (!window.confirm("Deseja aprovar este orçamento? Isso irá gerar uma Ordem de Serviço.")) return;

        try {
            await api.patch(`orcamentos/${id}/`, { status: 'APROVADO' });
            alert("Orçamento aprovado com sucesso! A oficina iniciará o trabalho em breve.");
            carregarOrcamentos();
        } catch (err) {
            console.error(err);
            alert("Erro ao aprovar orçamento.");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    // Função auxiliar para formatar dinheiro com segurança
    const formataValor = (valor) => {
        if (!valor) return '0.00';
        const numero = parseFloat(valor);
        if (isNaN(numero)) return '0.00';
        return numero.toFixed(2);
    };

    // Função para tentar achar o nome do veículo de várias formas
    const getVeiculoInfo = (orc) => {
        if (orc.veiculo_modelo) return `${orc.veiculo_modelo} (${orc.veiculo_placa})`;
        // Suporte caso o backend mande objeto aninhado (depth=1)
        if (orc.veiculo && typeof orc.veiculo === 'object' && orc.veiculo.modelo) {
            return `${orc.veiculo.modelo} (${orc.veiculo.placa})`;
        }
        return 'Veículo não identificado';
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <nav className="bg-white px-6 py-4 shadow-sm flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800">Minha Oficina</h1>
                <div className="flex items-center gap-4">
                    <span className="text-gray-500 text-sm">Olá, {usuarioNome}</span>
                    <button onClick={handleLogout} className="text-red-500 font-bold text-sm hover:underline">Sair</button>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto p-6">
                <h2 className="text-2xl font-bold text-gray-700 mb-6">Meus Orçamentos</h2>

                {orcamentos.length === 0 ? (
                    <div className="bg-white p-8 rounded shadow text-center text-gray-400">
                        Você não possui orçamentos pendentes no momento.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {orcamentos.map((orc) => (
                            <div key={orc.id_orcamento || orc.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 flex justify-between items-center border-blue-500">
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-gray-400 uppercase mb-1">
                                        Orçamento #{orc.id_orcamento || orc.id}
                                        <span className='ml-2 text-gray-300 font-normal'>Validade: {orc.validade ? new Date(orc.validade).toLocaleDateString() : '--/--'}</span>
                                    </div>

                                    {/* CORREÇÃO: Fallback se a descrição vier vazia */}
                                    <h3 className="text-lg font-bold text-gray-800">
                                        {orc.descricao || "Manutenção Solicitada"}
                                    </h3>

                                    <p className="text-gray-600 mb-2">{getVeiculoInfo(orc)}</p>

                                    {/* DEBUG VISUAL: Se for 0, mostra um aviso */}
                                    {parseFloat(orc.valor_total || orc.valor) <= 0 ? (
                                        <span className="text-sm font-bold text-orange-500">
                                            Valor sob análise
                                        </span>
                                    ) : (
                                        <span className="text-2xl font-bold text-blue-600">
                                            R$ {formataValor(orc.valor_total || orc.valor)}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-col items-end gap-2 ml-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${orc.status === 'APROVADO' ? 'bg-green-100 text-green-700' :
                                        orc.status === 'REJEITADO' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {orc.status}
                                    </span>

                                    {orc.status === 'PENDENTE' && (
                                        <button
                                            onClick={() => aprovarOrcamento(orc.id_orcamento || orc.id, orc.status)}
                                            className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 font-bold text-sm transition whitespace-nowrap"
                                        >
                                            ✓ APROVAR ORÇAMENTO
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default HomeCliente;