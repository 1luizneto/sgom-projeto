import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function DashboardMecanico() {
  const navigate = useNavigate();

  // --- ESTADOS DE DADOS ---
  const [agendamentos, setAgendamentos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [mecanicos, setMecanicos] = useState([]); // Lista para encontrar seu ID
  const [veiculosDoCliente, setVeiculosDoCliente] = useState([]);

  // --- CONTROLE DOS MODAIS ---
  const [mostrarModalVeiculo, setMostrarModalVeiculo] = useState(false);
  const [mostrarModalAgendamento, setMostrarModalAgendamento] = useState(false);

  // --- FORMULÁRIOS ---
  // O campo 'mecanico' começa vazio, mas será preenchido automaticamente
  const [novoAgendamento, setNovoAgendamento] = useState({ cliente: '', veiculo: '', servico: '', horario_inicio: '', preco: '', mecanico: '' });
  const [novoVeiculo, setNovoVeiculo] = useState({ cliente: '', placa: '', marca: '', modelo: '', cor: '', ano: '', tipo_combustivel: 'FLEX' });

  // 1. Verificação de Token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.Authorization = `Bearer ${token}`;
    } else {
      navigate('/');
    }
  }, [navigate]);

  // 2. Carregar Dados ao Abrir
  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  // 3. Efeitos de Formulário
  useEffect(() => {
    if (novoAgendamento.cliente) carregarVeiculos(novoAgendamento.cliente);
    else setVeiculosDoCliente([]);
  }, [novoAgendamento.cliente]);

  useEffect(() => {
    if (novoAgendamento.servico) {
      const s = servicos.find(item => item.id_servico === parseInt(novoAgendamento.servico));
      if (s) setNovoAgendamento(prev => ({ ...prev, preco: s.preco_base }));
    }
  }, [novoAgendamento.servico]);

  const carregarDadosIniciais = async () => {
    try {
      // Baixamos tudo, INCLUSIVE OS MECÂNICOS
      const [respAgendamentos, respServicos, respClientes, respMecanicos] = await Promise.all([
        api.get('agendamentos/'),
        api.get('servicos/'),
        api.get('clientes/'),
        api.get('mecanicos/') // Busca a lista real do banco
      ]);

      setAgendamentos(respAgendamentos.data);
      setServicos(respServicos.data);
      setClientes(respClientes.data);

      const listaMecanicos = respMecanicos.data || [];
      setMecanicos(listaMecanicos);

      // --- AUTO-SELEÇÃO DO MECÂNICO ---
      // Tenta encontrar o mecânico atual comparando o nome do login com a lista
      const nomeUsuarioLogado = localStorage.getItem('user_name');

      let meuId = '';
      if (listaMecanicos.length > 0) {
        // Tenta achar pelo nome
        const eu = listaMecanicos.find(m => m.nome === nomeUsuarioLogado || (m.user && m.user.username === nomeUsuarioLogado));

        if (eu) {
          meuId = eu.id_mecanico; // Achou você!
          console.log(`Mecânico identificado: ${eu.nome} (ID: ${meuId})`);
        } else {
          // Se não achar pelo nome, pega o PRIMEIRO da lista para não dar erro
          meuId = listaMecanicos[0].id_mecanico;
          console.log(`Usuário não vinculado. Usando primeiro mecânico da lista (ID: ${meuId})`);
        }
      }

      // Já deixa preenchido no formulário
      setNovoAgendamento(prev => ({ ...prev, mecanico: meuId }));

    } catch (err) {
      console.error("ERRO AO CARREGAR:", err);
      // Ignora erro 404 de mecânicos, mas redireciona se for token inválido
      if (err.response?.status === 401) navigate('/');
    }
  };

  const carregarVeiculos = async (clienteId) => {
    try {
      const resp = await api.get(`veiculos/?cliente=${clienteId}`);
      const lista = Array.isArray(resp.data) ? resp.data : [];
      setVeiculosDoCliente(lista.filter(v => v.cliente === parseInt(clienteId)));
    } catch (err) { console.error(err); }
  };

  const handleCadastraVeiculo = async (e) => {
    e.preventDefault();
    try {
      await api.post('veiculos/', novoVeiculo);
      alert('Veículo cadastrado!');
      setMostrarModalVeiculo(false);
      setNovoVeiculo({ cliente: '', placa: '', marca: '', modelo: '', cor: '', ano: '', tipo_combustivel: 'FLEX' });
      if (novoAgendamento.cliente === novoVeiculo.cliente) carregarVeiculos(novoVeiculo.cliente);
    } catch (err) { alert('Erro ao cadastrar veículo.'); }
  };

  const handeCriaAgendamento = async (e) => {
    e.preventDefault();
    try {
      const dataFormatada = new Date(novoAgendamento.horario_inicio).toISOString();

      // Garante que temos um ID de mecânico, nem que seja o primeiro da lista
      let mecanicoFinal = novoAgendamento.mecanico;
      if (!mecanicoFinal && mecanicos.length > 0) {
        mecanicoFinal = mecanicos[0].id_mecanico;
      }

      const payload = {
        cliente: parseInt(novoAgendamento.cliente),
        veiculo: parseInt(novoAgendamento.veiculo),
        servico: parseInt(novoAgendamento.servico),
        preco: parseFloat(novoAgendamento.preco),
        horario_inicio: dataFormatada,
        status: 'AGENDADO',
        mecanico: parseInt(mecanicoFinal) // Envia o ID real encontrado no banco
      };

      console.log("Enviando payload:", payload);

      await api.post('agendamentos/', payload);

      alert('Agendamento criado com sucesso!');
      setMostrarModalAgendamento(false);
      carregarDadosIniciais(); // Recarrega para ver na lista

      // Reseta form, mas mantém o mecânico selecionado
      setNovoAgendamento(prev => ({
        cliente: '', veiculo: '', servico: '', horario_inicio: '', preco: '',
        mecanico: mecanicoFinal
      }));

    } catch (err) {
      console.error("Erro ao agendar:", err);
      if (err.response && err.response.data) {
        const mensagens = JSON.stringify(err.response.data, null, 2);
        alert(`O servidor recusou:\n${mensagens}`);
      } else {
        alert('Erro ao conectar com o servidor.');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const hoje = new Date().toLocaleDateString('pt-BR');
  const agendamentosHoje = agendamentos.filter(ag =>
    new Date(ag.horario_inicio).toLocaleDateString('pt-BR') === hoje
  );
  const agendamentosFuturos = agendamentos.filter(ag =>
    new Date(ag.horario_inicio).toLocaleDateString('pt-BR') !== hoje
  );

  // --- COMPONENTE VISUAL ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">

      {/* HEADER DE AÇÃO RÁPIDA */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Oficina Dashboard</h1>
          <p className="text-sm text-gray-500">Bem-vindo, Mecânico</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setMostrarModalVeiculo(true)}
            className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-100 transition-colors"
          >
            <span>+ Veículo</span>
          </button>

          <button
            onClick={() => setMostrarModalAgendamento(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
          >
            <span>+ Novo Serviço</span>
          </button>

          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 font-bold ml-4">
            Sair
          </button>
        </div>
      </nav>

      {/* CORPO PRINCIPAL - AGENDA */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">

        {/* AGENDA DE HOJE (DESTAQUE) */}
        <section>
          <div className="flex items-center mb-6 gap-3">
            <h2 className="text-2xl font-bold text-gray-800">Agenda de Hoje</h2>
          </div>

          {agendamentosHoje.length === 0 ? (
            <div className="bg-white p-10 rounded-xl shadow-sm text-center border border-dashed border-gray-300">
              <p className="text-gray-400 text-lg">Nenhum serviço hoje.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agendamentosHoje.map(ag => (
                <CardAgendamento key={ag.id_agendamento} agendamento={ag} />
              ))}
            </div>
          )}
        </section>

        {/* PRÓXIMOS DIAS */}
        <section className="mt-8">
          <h3 className="text-lg font-bold text-gray-600 mb-4 border-b pb-2">Próximos Agendamentos</h3>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            {/* Tabela simplificada para o exemplo */}
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr><th className="p-4">Data</th><th className="p-4">Cliente / Veículo</th><th className="p-4">Serviço</th><th className="p-4">Status</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {agendamentosFuturos.map(ag => (
                  <tr key={ag.id_agendamento} className="hover:bg-gray-50">
                    <td className="p-4">{new Date(ag.horario_inicio).toLocaleString()}</td>
                    <td className="p-4">{ag.cliente_nome} - {ag.veiculo_modelo}</td>
                    <td className="p-4">{ag.servico_descricao}</td>
                    <td className="p-4"><BadgeStatus status={ag.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* --- MODAIS (POPUPS) --- */}

      {/* MODAL NOVO VEÍCULO */}
      {mostrarModalVeiculo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl relative">
            <button onClick={() => setMostrarModalVeiculo(false)} className="absolute top-4 right-4 text-gray-400">✕</button>
            <h2 className="font-bold mb-4">Novo Veículo</h2>
            <form onSubmit={handleCadastraVeiculo} className="grid grid-cols-2 gap-4">
              {/* FORMULÁRIO DE VEICULO (MANTIDO) */}
              <div className="col-span-2"><label>Proprietário</label><select className="input-padrao" value={novoVeiculo.cliente} onChange={e => setNovoVeiculo({ ...novoVeiculo, cliente: e.target.value })} required><option value="">Selecione...</option>{clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nome}</option>)}</select></div>
              <input className="input-padrao" placeholder="Placa" value={novoVeiculo.placa} onChange={e => setNovoVeiculo({ ...novoVeiculo, placa: e.target.value.toUpperCase() })} required />
              <input className="input-padrao" placeholder="Marca" value={novoVeiculo.marca} onChange={e => setNovoVeiculo({ ...novoVeiculo, marca: e.target.value })} required />
              <input className="input-padrao" placeholder="Modelo" value={novoVeiculo.modelo} onChange={e => setNovoVeiculo({ ...novoVeiculo, modelo: e.target.value })} required />
              <input className="input-padrao" placeholder="Cor" value={novoVeiculo.cor} onChange={e => setNovoVeiculo({ ...novoVeiculo, cor: e.target.value })} required />
              <input className="input-padrao" placeholder="Ano" type="number" value={novoVeiculo.ano} onChange={e => setNovoVeiculo({ ...novoVeiculo, ano: e.target.value })} required />
              <button type="submit" className="col-span-2 bg-indigo-600 text-white font-bold py-3 rounded">Salvar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO SERVIÇO */}
      {mostrarModalAgendamento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
            <button onClick={() => setMostrarModalAgendamento(false)} className="absolute top-4 right-4 text-gray-400">✕</button>
            <h2 className="text-xl font-bold mb-4 text-blue-700">Novo Agendamento</h2>
            <form onSubmit={handeCriaAgendamento} className="flex flex-col gap-3">

              {/* SELEÇÃO DO MECÂNICO (AUTOMÁTICA OU MANUAL) */}
              <label className="text-xs font-bold text-gray-500">Mecânico (Pré-selecionado)</label>
              <select className="input-padrao bg-gray-50" value={novoAgendamento.mecanico} onChange={e => setNovoAgendamento({ ...novoAgendamento, mecanico: e.target.value })} required>
                {mecanicos.length === 0 && <option value="">Carregando mecânicos...</option>}
                {mecanicos.map(m => <option key={m.id_mecanico} value={m.id_mecanico}>{m.nome}</option>)}
              </select>

              <label className="text-xs font-bold text-gray-500">Cliente</label>
              <select className="input-padrao" value={novoAgendamento.cliente} onChange={e => setNovoAgendamento({ ...novoAgendamento, cliente: e.target.value })} required><option value="">Selecione...</option>{clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nome}</option>)}</select>

              <label className="text-xs font-bold text-gray-500">Veículo</label>
              <select className="input-padrao" value={novoAgendamento.veiculo} onChange={e => setNovoAgendamento({ ...novoAgendamento, veiculo: e.target.value })} required disabled={!novoAgendamento.cliente}><option value="">Selecione...</option>{veiculosDoCliente.map(v => <option key={v.id_veiculo} value={v.id_veiculo}>{v.modelo} - {v.placa}</option>)}</select>

              <label className="text-xs font-bold text-gray-500">Serviço</label>
              <select className="input-padrao" value={novoAgendamento.servico} onChange={e => setNovoAgendamento({ ...novoAgendamento, servico: e.target.value })} required><option value="">Selecione...</option>{servicos.map(s => <option key={s.id_servico} value={s.id_servico}>{s.descricao} (R$ {s.preco_base})</option>)}</select>

              <label className="text-xs font-bold text-gray-500">Preço (R$)</label>
              <input type="number" step="0.01" className="input-padrao" value={novoAgendamento.preco} onChange={e => setNovoAgendamento({ ...novoAgendamento, preco: e.target.value })} required />

              <label className="text-xs font-bold text-gray-500">Data/Hora</label>
              <input type="datetime-local" className="input-padrao" value={novoAgendamento.horario_inicio} onChange={e => setNovoAgendamento({ ...novoAgendamento, horario_inicio: e.target.value })} required />

              <button type="submit" className="mt-4 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700">Agendar Serviço</button>
            </form>
          </div>
        </div>
      )}
      <style>{`.input-padrao { width: 100%; border: 1px solid #e5e7eb; padding: 0.75rem; border-radius: 0.5rem; outline: none; }`}</style>
    </div>
  );
}

// Cards Simplificados (Melhorados para evitar erro de Data e Cor)
function CardAgendamento({ agendamento }) {
  // Tratamento para não quebrar se a data vier vazia
  const dataFormatada = agendamento.horario_inicio 
    ? new Date(agendamento.horario_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) 
    : 'Sem data';

  return (
    <div className="bg-white p-4 shadow mb-2 rounded border-l-4 border-blue-500 flex flex-col gap-1">
        <div className="flex justify-between">
            <span className="font-bold text-gray-800">{dataFormatada}</span>
            <BadgeStatus status={agendamento.status} />
        </div>
        <div className="text-gray-900 font-medium">
            {agendamento.cliente_nome} <span className="text-gray-400">|</span> {agendamento.veiculo_modelo}
        </div>
        <div className="text-sm text-blue-600 font-semibold uppercase">
            {agendamento.servico_descricao}
        </div>
    </div>
  );
}

function BadgeStatus({ status }) {
  // AQUI ESTAVA O ERRO: A variável 'cores' precisava ser definida
  const cores = { 
    'AGENDADO': 'bg-yellow-100 text-yellow-800', 
    'CONCLUIDO': 'bg-green-100 text-green-800', 
    'CANCELADO': 'bg-red-100 text-red-800',
    'ANDAMENTO': 'bg-blue-100 text-blue-800' 
  };
  
  // Se o status não tiver cor (undefined), usa cinza para não quebrar a tela branca
  const classeCor = cores[status] || 'bg-gray-100 text-gray-600';

  return <span className={`px-2 py-1 rounded text-xs font-bold ${classeCor}`}>{status}</span>;
}

export default DashboardMecanico;