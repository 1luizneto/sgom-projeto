import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function HomeCliente() {
    const [orcamentos, setOrcamentos] = useState([]);
    const [ordensServico, setOrdensServico] = useState([]); // <--- NOVO: OSs do cliente
    const [abaSelecionada, setAbaSelecionada] = useState('orcamentos'); // <--- NOVO: Controle de abas
    const navigate = useNavigate();
    const usuarioNome = localStorage.getItem('user_name') || 'Cliente';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.defaults.headers.Authorization = `Bearer ${token}`;
            carregarOrcamentos();
            carregarOrdensServico(); // <--- NOVO
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

    // --- NOVO: Carregar OSs do Cliente (PB16) ---
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
            await api.post(`orcamentos/${id}/aprovar/`); // <--- CORRIGIDO: Usar endpoint aprovar
            alert("Orçamento aprovado com sucesso! A oficina iniciará o trabalho em breve.");
            carregarOrcamentos();
            carregarOrdensServico(); // <--- Recarrega as OSs
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

    // --- NOVO: Função para obter cor e ícone do status (PB16 - TC16) ---
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
        <div className="min-h-screen bg-gray-50 font-sans">
            <nav className="bg-white px-6 py-4 shadow-sm flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800">Minha Oficina</h1>
                <div className="flex items-center gap-4">
                    <span className="text-gray-500 text-sm">Olá, {usuarioNome}</span>
                    <button onClick={handleLogout} className="text-red-500 font-bold text-sm hover:underline">Sair</button>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto p-6">
                {/* NOVO: Sistema de Abas (PB16) */}
                <div className="flex gap-4 mb-6 border-b">
                    <button
                        onClick={() => setAbaSelecionada('orcamentos')}
                        className={`px-4 py-2 font-bold transition-colors ${abaSelecionada === 'orcamentos'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📋 Orçamentos Pendentes ({orcamentos.filter(o => o.status === 'PENDENTE').length})
                    </button>
                    <button
                        onClick={() => setAbaSelecionada('manutencoes')}
                        className={`px-4 py-2 font-bold transition-colors ${abaSelecionada === 'manutencoes'
                                ? 'text-green-600 border-b-2 border-green-600'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        🔧 Meus Veículos em Manutenção ({ordensServico.length})
                    </button>
                </div>

                {/* ABA: ORÇAMENTOS PENDENTES */}
                {abaSelecionada === 'orcamentos' && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-700 mb-6">Orçamentos Aguardando Aprovação</h2>

                        {orcamentos.filter(o => o.status === 'PENDENTE').length === 0 ? (
                            <div className="bg-white p-8 rounded shadow text-center text-gray-400">
                                Você não possui orçamentos pendentes no momento.
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {orcamentos.filter(o => o.status === 'PENDENTE').map((orc) => (
                                    <div key={orc.id_orcamento} className="bg-white p-6 rounded-lg shadow-md border-l-4 flex justify-between items-center border-blue-500">
                                        <div className="flex-1">
                                            <div className="text-xs font-bold text-gray-400 uppercase mb-1">
                                                Orçamento #{orc.id_orcamento}
                                                <span className='ml-2 text-gray-300 font-normal'>Validade: {orc.validade ? new Date(orc.validade).toLocaleDateString() : '--/--'}</span>
                                            </div>

                                            <h3 className="text-lg font-bold text-gray-800">
                                                {orc.descricao || "Manutenção Solicitada"}
                                            </h3>

                                            <p className="text-gray-600 mb-2">{getVeiculoInfo(orc)}</p>

                                            {parseFloat(orc.valor_total) <= 0 ? (
                                                <span className="text-sm font-bold text-orange-500">
                                                    Valor sob análise
                                                </span>
                                            ) : (
                                                <span className="text-2xl font-bold text-blue-600">
                                                    R$ {formataValor(orc.valor_total)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end gap-2 ml-4">
                                            <button
                                                onClick={() => aprovarOrcamento(orc.id_orcamento, orc.status)}
                                                className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 font-bold text-sm transition whitespace-nowrap"
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

                {/* ABA: STATUS DA MANUTENÇÃO (PB16 - TC16) */}
                {abaSelecionada === 'manutencoes' && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-700 mb-6">🔧 Status da Manutenção</h2>

                        {ordensServico.length === 0 ? (
                            <div className="bg-white p-8 rounded shadow text-center text-gray-400">
                                Você não possui veículos em manutenção no momento.
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {ordensServico.map((os) => {
                                    const statusConfig = getStatusConfig(os.status);

                                    return (
                                        <div key={os.id_os} className={`bg-white rounded-lg shadow-lg border-l-4 overflow-hidden ${statusConfig.cor.replace('bg-', 'border-')}`}>
                                            {/* Cabeçalho da OS */}
                                            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-800">
                                                        OS #{os.numero_os}
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        {os.veiculo_modelo} - {os.veiculo_placa}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">Aberta em</p>
                                                    <p className="text-sm font-bold text-gray-700">
                                                        {new Date(os.data_abertura).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Status Atual (TC16 - Cenários 1, 2 e 3) */}
                                            <div className={`px-6 py-6 ${statusConfig.cor}`}>
                                                <div className="flex items-center gap-4 mb-3">
                                                    <span className="text-4xl">{statusConfig.icone}</span>
                                                    <div>
                                                        <p className="text-sm font-bold uppercase tracking-wide opacity-75">
                                                            Status Atual
                                                        </p>
                                                        <h4 className="text-2xl font-bold">
                                                            {statusConfig.titulo}
                                                        </h4>
                                                    </div>
                                                </div>

                                                <p className="text-sm opacity-90">
                                                    {statusConfig.descricao}
                                                </p>

                                                {/* Informação adicional para status "Pronto" (TC16 - Cenário 3) */}
                                                {os.status === 'CONCLUIDA' && (
                                                    <div className="mt-4 bg-white bg-opacity-50 p-4 rounded border border-green-300">
                                                        <p className="text-sm font-bold text-green-800 mb-2">
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
                                            <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
                                                <div>
                                                    <p className="text-xs text-gray-500">Mecânico Responsável</p>
                                                    <p className="font-bold text-gray-800">{os.mecanico_nome || 'Não informado'}</p>
                                                </div>
                                                {os.data_conclusao && (
                                                    <div className="text-right">
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

                        {/* Informações de Contato da Oficina (Critério de Aceitação 3) */}
                        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
                            <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                                📍 Informações da Oficina
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                                <div>
                                    <p className="font-bold mb-1">Endereço:</p>
                                    <p>Rua das Oficinas, 123 - Centro<br />São Paulo - SP, 01234-567</p>
                                </div>
                                <div>
                                    <p className="font-bold mb-1">Horário de Funcionamento:</p>
                                    <p>Segunda a Sexta: 8h - 18h<br />Sábado: 8h - 12h</p>
                                </div>
                                <div>
                                    <p className="font-bold mb-1">Contato:</p>
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