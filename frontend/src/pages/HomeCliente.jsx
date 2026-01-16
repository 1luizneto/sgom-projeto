import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function HomeCliente() {
    const [orcamentos, setOrcamentos] = useState([]);
    const [ordensServico, setOrdensServico] = useState([]);
    const [abaSelecionada, setAbaSelecionada] = useState('orcamentos');
    const navigate = useNavigate();
    const usuarioNome = localStorage.getItem('user_name') || 'Cliente';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.defaults.headers.Authorization = `Bearer ${token}`;
            carregarOrcamentos();
            carregarOrdensServico();
        } else {
            navigate('/');
        }
    }, [navigate]);

    const carregarOrcamentos = async () => {
        try {
            const response = await api.get('orcamentos/');
            console.log("📋 Orçamentos recebidos:", response.data);
            setOrcamentos(response.data);
        } catch (err) {
            console.error("Erro ao carregar orçamentos", err);
        }
    };

    const carregarOrdensServico = async () => {
        try {
            const response = await api.get('ordens-servico/');
            console.log("🔧 OSs recebidas:", response.data);
            setOrdensServico(response.data);
        } catch (err) {
            console.error("Erro ao carregar ordens de serviço", err);
        }
    };

    const aprovarOrcamento = async (id, statusAtual) => {
        if (statusAtual !== 'PENDENTE') return;

        if (!window.confirm("Deseja aprovar este orçamento? Isso irá gerar uma Ordem de Serviço.")) return;

        try {
            await api.post(`orcamentos/${id}/aprovar/`);
            alert("Orçamento aprovado com sucesso! A oficina iniciará o trabalho em breve.");
            carregarOrcamentos();
            carregarOrdensServico();
        } catch (err) {
            console.error(err);
            alert("Erro ao aprovar orçamento.");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    const formataValor = (valor) => {
        if (!valor) return '0.00';
        const numero = parseFloat(valor);
        if (isNaN(numero)) return '0.00';
        return numero.toFixed(2);
    };

    const getVeiculoInfo = (orc) => {
        if (orc.veiculo_modelo) return `${orc.veiculo_modelo} (${orc.veiculo_placa})`;
        if (orc.veiculo && typeof orc.veiculo === 'object' && orc.veiculo.modelo) {
            return `${orc.veiculo.modelo} (${orc.veiculo.placa})`;
        }
        return 'Veículo não identificado';
    };

    const getStatusConfig = (status) => {
        const configs = {
            'EM_ANDAMENTO': {
                cor: 'bg-blue-100 text-blue-700 border-blue-300',
                icone: '🔧',
                titulo: 'Em Manutenção',
                descricao: 'Mecânico trabalhando no veículo'
            },
            'AGUARDANDO_PECAS': {
                cor: 'bg-orange-100 text-orange-700 border-orange-300',
                icone: '📦',
                titulo: 'Parado - Aguardando Peças',
                descricao: 'Aguardando chegada de peças para continuar'
            },
            'CONCLUIDA': {
                cor: 'bg-green-100 text-green-700 border-green-300',
                icone: '✅',
                titulo: 'Pronto para Retirada',
                descricao: 'O serviço foi finalizado e o veículo pode ser retirado'
            },
            'CANCELADA': {
                cor: 'bg-red-100 text-red-700 border-red-300',
                icone: '❌',
                titulo: 'Cancelado',
                descricao: 'O serviço foi cancelado'
            }
        };

        return configs[status] || {
            cor: 'bg-gray-100 text-gray-700 border-gray-300',
            icone: '🔄',
            titulo: status,
            descricao: ''
        };
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* HEADER ATUALIZADO - Padrão das outras dashboards */}
            <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🔧</span>
                        <h1 className="text-2xl font-bold">Portal do Cliente</h1>
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
                        onClick={() => setAbaSelecionada('orcamentos')}
                        className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${abaSelecionada === 'orcamentos'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        📋 Orçamentos Pendentes
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${abaSelecionada === 'orcamentos' ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-700'
                            }`}>
                            {orcamentos.filter(o => o.status === 'PENDENTE').length}
                        </span>
                    </button>
                    <button
                        onClick={() => setAbaSelecionada('manutencoes')}
                        className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${abaSelecionada === 'manutencoes'
                                ? 'bg-green-600 text-white shadow-md'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        🔧 Meus Veículos em Manutenção
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${abaSelecionada === 'manutencoes' ? 'bg-white text-green-600' : 'bg-gray-200 text-gray-700'
                            }`}>
                            {ordensServico.length}
                        </span>
                    </button>
                </div>

                {/* ABA: ORÇAMENTOS PENDENTES */}
                {abaSelecionada === 'orcamentos' && (
                    <div>
                        <div className="mb-6 flex items-center gap-3">
                            <span className="text-4xl">📋</span>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Orçamentos Aguardando Aprovação</h2>
                                <p className="text-sm text-gray-500">Aprove os orçamentos para iniciar a manutenção</p>
                            </div>
                        </div>

                        {orcamentos.filter(o => o.status === 'PENDENTE').length === 0 ? (
                            <div className="bg-white p-12 rounded-lg shadow text-center">
                                <span className="text-6xl mb-4 block">📭</span>
                                <p className="text-gray-400 text-lg">Você não possui orçamentos pendentes no momento.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {orcamentos.filter(o => o.status === 'PENDENTE').map((orc) => (
                                    <div key={orc.id_orcamento} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-600 hover:shadow-lg transition-shadow">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                                                        Orçamento #{orc.id_orcamento}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        Validade: {orc.validade ? new Date(orc.validade).toLocaleDateString('pt-BR') : '--/--'}
                                                    </span>
                                                </div>

                                                <h3 className="text-lg font-bold text-gray-800 mb-2">
                                                    {orc.descricao || "Manutenção Solicitada"}
                                                </h3>

                                                <p className="text-gray-600 mb-3 flex items-center gap-2">
                                                    🚗 {getVeiculoInfo(orc)}
                                                </p>

                                                {parseFloat(orc.valor_total) <= 0 ? (
                                                    <span className="text-sm font-bold text-orange-500 bg-orange-50 px-3 py-1 rounded-full inline-block">
                                                        ⏳ Valor sob análise
                                                    </span>
                                                ) : (
                                                    <div className="bg-blue-50 px-4 py-2 rounded-lg inline-block">
                                                        <p className="text-xs text-blue-600 font-bold">Valor Total</p>
                                                        <span className="text-2xl font-bold text-blue-700">
                                                            R$ {formataValor(orc.valor_total)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => aprovarOrcamento(orc.id_orcamento, orc.status)}
                                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm transition-all transform hover:scale-105 whitespace-nowrap flex items-center gap-2"
                                            >
                                                ✓ APROVAR ORÇAMENTO
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ABA: STATUS DA MANUTENÇÃO */}
                {abaSelecionada === 'manutencoes' && (
                    <div>
                        <div className="mb-6 flex items-center gap-3">
                            <span className="text-4xl">🔧</span>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Status da Manutenção</h2>
                                <p className="text-sm text-gray-500">Acompanhe o andamento dos seus veículos</p>
                            </div>
                        </div>

                        {ordensServico.length === 0 ? (
                            <div className="bg-white p-12 rounded-lg shadow text-center">
                                <span className="text-6xl mb-4 block">🚗</span>
                                <p className="text-gray-400 text-lg">Você não possui veículos em manutenção no momento.</p>
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {ordensServico.map((os) => {
                                    const statusConfig = getStatusConfig(os.status);

                                    return (
                                        <div key={os.id_os} className={`bg-white rounded-lg shadow-lg border-l-4 overflow-hidden hover:shadow-xl transition-shadow ${statusConfig.cor.replace('bg-', 'border-')}`}>
                                            {/* Cabeçalho da OS */}
                                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b flex justify-between items-center">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                                        🔧 OS #{os.numero_os}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                                                        🚗 {os.veiculo_modelo} - {os.veiculo_placa}
                                                    </p>
                                                </div>
                                                <div className="text-right bg-white px-4 py-2 rounded-lg shadow-sm">
                                                    <p className="text-xs text-gray-500">Aberta em</p>
                                                    <p className="text-sm font-bold text-gray-700">
                                                        {new Date(os.data_abertura).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Status Atual */}
                                            <div className={`px-6 py-6 ${statusConfig.cor}`}>
                                                <div className="flex items-center gap-4 mb-3">
                                                    <span className="text-5xl">{statusConfig.icone}</span>
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-wide opacity-75">
                                                            Status Atual
                                                        </p>
                                                        <h4 className="text-2xl font-bold">
                                                            {statusConfig.titulo}
                                                        </h4>
                                                    </div>
                                                </div>

                                                <p className="text-sm opacity-90 ml-16">
                                                    {statusConfig.descricao}
                                                </p>

                                                {/* Informação adicional para status "Pronto" */}
                                                {os.status === 'CONCLUIDA' && (
                                                    <div className="mt-4 bg-white bg-opacity-70 p-4 rounded-lg border border-green-300 ml-16">
                                                        <p className="text-sm font-bold text-green-800 mb-2 flex items-center gap-2">
                                                            📍 Endereço para Retirada:
                                                        </p>
                                                        <p className="text-sm text-gray-700">
                                                            Rua das Oficinas, 123 - Centro<br />
                                                            📞 (11) 1234-5678<br />
                                                            🕒 Seg-Sex: 8h-18h | Sáb: 8h-12h
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Informações do Mecânico */}
                                            <div className="px-6 py-4 bg-gray-50 flex justify-between items-center border-t">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl">👨‍🔧</span>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Mecânico Responsável</p>
                                                        <p className="font-bold text-gray-800">{os.mecanico_nome || 'Não informado'}</p>
                                                    </div>
                                                </div>
                                                {os.data_conclusao && (
                                                    <div className="text-right bg-white px-4 py-2 rounded-lg shadow-sm">
                                                        <p className="text-xs text-gray-500">Concluído em</p>
                                                        <p className="text-sm font-bold text-gray-700">
                                                            {new Date(os.data_conclusao).toLocaleDateString('pt-BR')}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Informações de Contato da Oficina */}
                        <div className="mt-8 bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-600 p-6 rounded-lg shadow-md">
                            <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2 text-lg">
                                📍 Informações da Oficina
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-700">
                                <div className="bg-white p-4 rounded-lg shadow-sm">
                                    <p className="font-bold mb-2 text-blue-700 flex items-center gap-2">
                                        🏢 Endereço:
                                    </p>
                                    <p>Rua das Oficinas, 123 - Centro<br />Campina Grande - PB, 01234-567</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg shadow-sm">
                                    <p className="font-bold mb-2 text-blue-700 flex items-center gap-2">
                                        🕒 Horário de Funcionamento:
                                    </p>
                                    <p>Segunda a Sexta: 8h - 18h<br />Sábado: 8h - 12h</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg shadow-sm">
                                    <p className="font-bold mb-2 text-blue-700 flex items-center gap-2">
                                        📞 Contato:
                                    </p>
                                    <p>📞 (11) 1234-5678<br />📧 contato@oficina.com.br</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default HomeCliente;