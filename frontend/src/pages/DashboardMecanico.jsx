import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function DashboardMecanico() {
  const navigate = useNavigate();

  // --- ESTADOS DE DADOS ---
  const [agendamentos, setAgendamentos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [mecanicos, setMecanicos] = useState([]);
  const [veiculosDoCliente, setVeiculosDoCliente] = useState([]);

  // --- CONTROLE DOS MODAIS ---
  const [mostrarModalVeiculo, setMostrarModalVeiculo] = useState(false);
  const [mostrarModalAgendamento, setMostrarModalAgendamento] = useState(false);
  const [mostrarModalOrcamento, setMostrarModalOrcamento] = useState(false);

  // --- FORMULÁRIOS ---
  const [novoAgendamento, setNovoAgendamento] = useState({ cliente: '', veiculo: '', servico: '', horario_inicio: '', preco: '', mecanico: '' });
  const [novoVeiculo, setNovoVeiculo] = useState({ cliente: '', placa: '', marca: '', modelo: '', cor: '', ano: '', tipo_combustivel: 'FLEX' });

  // Funcao auxiliar para calcular data padrao (hoje + 7 dias)
  const getDataValidadePadrao = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  };

  // --- CORREÇÃO AQUI: Adicionado campo 'validade' ---
  const [novoOrcamento, setNovoOrcamento] = useState({
    cliente: '', veiculo: '', descricao: '', valor_total: '', status: 'PENDENTE',
    validade: getDataValidadePadrao(),  // <--- Valor padrão
    id_agendamento_origem: null
  });

  // 1. Verificação de Token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) api.defaults.headers.Authorization = `Bearer ${token}`;
    else navigate('/');
  }, [navigate]);

  // 2. Carregar Dados ao Abrir
  useEffect(() => { carregarDadosIniciais(); }, []);

  // 3. Efeitos de Formulário (Agendamento)
  useEffect(() => { if (novoAgendamento.cliente) carregarVeiculos(novoAgendamento.cliente); }, [novoAgendamento.cliente]);
  useEffect(() => { if (novoOrcamento.cliente) carregarVeiculos(novoOrcamento.cliente); }, [novoOrcamento.cliente]);

  // Preço automático no agendamento
  useEffect(() => {
    if (novoAgendamento.servico) {
      const s = servicos.find(item => item.id_servico === parseInt(novoAgendamento.servico));
      if (s) setNovoAgendamento(prev => ({ ...prev, preco: s.preco_base }));
    }
  }, [novoAgendamento.servico]);

  const carregarDadosIniciais = async () => {
    try {
      const resp = await Promise.all([
        api.get('agendamentos/'), api.get('servicos/'), api.get('clientes/'), api.get('mecanicos/')
      ]);
      setAgendamentos(resp[0].data);
      setServicos(resp[1].data);
      setClientes(resp[2].data);
      setMecanicos(resp[3].data || []);

      // Auto-select mecanico logado para novos agendamentos
      const user = localStorage.getItem('user_name');
      const eu = resp[3].data?.find(m => m.nome === user || m.user?.username === user);
      if (eu) setNovoAgendamento(prev => ({ ...prev, mecanico: eu.id_mecanico }));
    } catch (err) { if (err.response?.status === 401) navigate('/'); }
  };

  const carregarVeiculos = async (clienteId) => {
    try {
      const resp = await api.get(`veiculos/?cliente=${clienteId}`);
      const lista = Array.isArray(resp.data) ? resp.data : [];
      setVeiculosDoCliente(lista.filter(v => v.cliente === parseInt(clienteId)));
    } catch (err) { console.error(err); }
  };

  // --- AÇÃO: Abrir Modal de OS ---
  const abrirModalOS = (agendamento) => {
    carregarVeiculos(agendamento.cliente);
    setNovoOrcamento({
      cliente: agendamento.cliente,
      veiculo: agendamento.veiculo,
      descricao: `Serviço de ${agendamento.servico_descricao}`,
      valor_total: agendamento.preco || '',
      status: 'PENDENTE',
      validade: getDataValidadePadrao(), // <--- Garante que a data vai preenchida
      id_agendamento_origem: agendamento.id_agendamento
    });
    setMostrarModalOrcamento(true);
  };

  const handeCriaAgendamento = async (e) => {
    e.preventDefault();
    try {
      const mecId = novoAgendamento.mecanico || mecanicos[0]?.id_mecanico;
      const payload = {
        cliente: parseInt(novoAgendamento.cliente),
        veiculo: parseInt(novoAgendamento.veiculo),
        servico: parseInt(novoAgendamento.servico),
        preco: parseFloat(novoAgendamento.preco),
        horario_inicio: new Date(novoAgendamento.horario_inicio).toISOString(),
        status: 'AGENDADO',
        mecanico: parseInt(mecId)
      };
      await api.post('agendamentos/', payload);
      alert('Agendamento criado! Agora gere a OS para o cliente aprovar.');
      setMostrarModalAgendamento(false);
      carregarDadosIniciais();
    } catch (err) { alert('Erro ao agendar.'); }
  };

  const handleCriaOrcamento = async (e) => {
    e.preventDefault();
    try {
      // PROCURA O MECÂNICO LOGADO
      const nomeUser = localStorage.getItem('user_name');
      const eu = mecanicos.find(m => m.nome === nomeUser || (m.user && m.user.username === nomeUser));
      const mecId = eu ? (eu.id_mecanico || eu.id) : (mecanicos[0]?.id_mecanico || mecanicos[0]?.id);

      if (!mecId) { alert("Erro: Mecânico não identificado."); return; }

      // VALIDA E PREPARA O VALOR
      let valorFinal = parseFloat(novoOrcamento.valor_total);
      if (isNaN(valorFinal) || valorFinal <= 0) {
        alert("Por favor, insira um valor total válido para a Mão de Obra/Serviço.");
        return;
      }

      const payload = {
        cliente: parseInt(novoOrcamento.cliente),
        veiculo: parseInt(novoOrcamento.veiculo),
        descricao: novoOrcamento.descricao || "Serviço Mecânico Geral", // Fallback para descrição
        valor_total: valorFinal,
        status: 'PENDENTE',
        validade: novoOrcamento.validade,
        mecanico: parseInt(mecId)
      };

      console.log("Enviando:", payload); // Verifique no console se o valor está correto aqui

      const token = localStorage.getItem('token');
      await api.post('orcamentos/', payload, { headers: { Authorization: `Bearer ${token}` } });

      alert('OS/Orçamento enviado ao cliente com sucesso!');
      setMostrarModalOrcamento(false);
      carregarDadosIniciais();

    } catch (err) {
      console.error(err);
      if (err.response?.data) alert();
      else alert('Erro ao criar OS.');
    }
  };

  const handleCadastraVeiculo = async (e) => {
    e.preventDefault();
    try {
      await api.post('veiculos/', novoVeiculo);
      alert('Veículo cadastrado!');
      setMostrarModalVeiculo(false);
      setNovoVeiculo({ cliente: '', placa: '', marca: '', modelo: '', cor: '', ano: '', tipo_combustivel: 'FLEX' });
    } catch (e) {
      alert('Erro ao cadastrar veículo. Verifique os dados.');
    }
  };

  const handleLogout = () => { localStorage.removeItem('token'); navigate('/'); };
  const hoje = new Date().toLocaleDateString('pt-BR');
  const agendamentosHoje = agendamentos.filter(ag => new Date(ag.horario_inicio).toLocaleDateString('pt-BR') === hoje);
  const agendamentosFuturos = agendamentos.filter(ag => new Date(ag.horario_inicio).toLocaleDateString('pt-BR') !== hoje);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <nav className="bg-white border-b px-6 py-4 flex justify-between shadow-sm sticky top-0 z-10">
        <div><h1 className="text-xl font-bold text-gray-800">Oficina Dashboard</h1></div>
        <div className="flex gap-4">
          {/* CORREÇÃO 1: Adicionado o "+" no texto */}
          <button onClick={() => setMostrarModalVeiculo(true)} className="btn bg-indigo-50 text-indigo-700">+ Veículo</button>

          <button onClick={() => setMostrarModalAgendamento(true)} className="btn bg-blue-600 text-white shadow-lg">+ Novo Agendamento</button>
          <button onClick={handleLogout} className="text-gray-400 font-bold ml-4">Sair</button>
        </div>
      </nav>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        {/* PARTE 1: AGENDA DO DIA */}
        <section>
          <div className="flex items-center mb-6 gap-3"><h2 className="text-2xl font-bold text-gray-800">Agenda de Hoje</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agendamentosHoje.map(ag => (
              <CardAgendamento
                key={ag.id_agendamento}
                agendamento={ag}
                aoClicarGerarOS={() => abrirModalOS(ag)} // Passa a função aqui
              />
            ))}
            {agendamentosHoje.length === 0 && <p className="text-gray-400">Vazio.</p>}
          </div>
        </section>

        {/* PARTE 2: PRÓXIMOS */}
        <section>
          <h3 className="text-lg font-bold text-gray-600 mb-4 border-b pb-2">Próximos Agendamentos</h3>
          <div className="grid grid-cols-1 gap-4">
            {agendamentosFuturos.map(ag => (
              <div key={ag.id_agendamento} className="bg-white p-4 rounded shadow flex justify-between items-center">
                <div>
                  <span className="font-bold">{new Date(ag.horario_inicio).toLocaleString()}</span> - {ag.cliente_nome} ({ag.veiculo_modelo})
                  <div className="text-sm text-blue-600">{ag.servico_descricao}</div>
                </div>
                {/* Botão de gerar OS aqui também */}
                <button onClick={() => abrirModalOS(ag)} className="bg-orange-100 text-orange-700 px-3 py-1 rounded text-sm font-bold hover:bg-orange-200">
                  Gerar OS
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* --- MODAIS --- */}

      {/* MODAL ORÇAMENTO (CORRIGIDO) */}
      {mostrarModalOrcamento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative animate-fade-in">
            <button onClick={() => setMostrarModalOrcamento(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
            <h2 className="text-xl font-bold mb-4 text-orange-600">Gerar Ordem de Serviço (OS)</h2>

            <form onSubmit={handleCriaOrcamento} className="flex flex-col gap-3">
              <label className="lbl">Data de Validade</label>
              <input type="date" className="input-padrao" value={novoOrcamento.validade} onChange={e => setNovoOrcamento({ ...novoOrcamento, validade: e.target.value })} required />

              <label className="lbl">Cliente</label>
              <select className="input-padrao bg-gray-100" value={novoOrcamento.cliente} disabled><option>{clientes.find(c => c.id_cliente === novoOrcamento.cliente)?.nome || 'Cliente'}</option></select>

              <label className="lbl">Veículo</label>
              <select className="input-padrao bg-gray-100" value={novoOrcamento.veiculo} disabled><option>{veiculosDoCliente.find(v => v.id_veiculo === novoOrcamento.veiculo)?.modelo || 'Veículo'}</option></select>

              <label className="lbl">Peças e Detalhes Adicionais</label>
              <textarea className="input-padrao h-24" placeholder="Descreva peças necessárias, mão de obra extra, etc..." value={novoOrcamento.descricao} onChange={e => setNovoOrcamento({ ...novoOrcamento, descricao: e.target.value })} required />

              <label className="lbl">Valor Final da OS (R$)</label>
              <input type="number" step="0.01" className="input-padrao font-bold text-lg border-orange-300" placeholder="0.00" value={novoOrcamento.valor_total} onChange={e => setNovoOrcamento({ ...novoOrcamento, valor_total: e.target.value })} required />

              <button type="submit" className="mt-4 bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 shadow-md">Enviar para Aprovação</button>
            </form>
          </div>
        </div>
      )}

      {/* CORREÇÃO 2: Modal de Veículo Completo e Estável */}
      {mostrarModalVeiculo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg relative animate-fade-in">
            <button onClick={() => setMostrarModalVeiculo(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
            <h2 className="text-xl font-bold mb-4 text-indigo-700">Cadastrar Novo Veículo</h2>

            <form onSubmit={handleCadastraVeiculo} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="lbl">Proprietário</label>
                <select className="input-padrao" value={novoVeiculo.cliente} onChange={e => setNovoVeiculo({ ...novoVeiculo, cliente: e.target.value })} required>
                  <option value="">Selecione...</option>
                  {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="lbl">Placa</label>
                <input className="input-padrao uppercase" placeholder="ABC-1234" value={novoVeiculo.placa} onChange={e => setNovoVeiculo({ ...novoVeiculo, placa: e.target.value.toUpperCase() })} required />
              </div>

              <div>
                <label className="lbl">Marca</label>
                <input className="input-padrao" placeholder="Fiat" value={novoVeiculo.marca} onChange={e => setNovoVeiculo({ ...novoVeiculo, marca: e.target.value })} required />
              </div>

              <div className="col-span-2">
                <label className="lbl">Modelo</label>
                <input className="input-padrao" placeholder="Uno Mille" value={novoVeiculo.modelo} onChange={e => setNovoVeiculo({ ...novoVeiculo, modelo: e.target.value })} required />
              </div>

              <div>
                <label className="lbl">Cor</label>
                <input className="input-padrao" placeholder="Branco" value={novoVeiculo.cor} onChange={e => setNovoVeiculo({ ...novoVeiculo, cor: e.target.value })} required />
              </div>

              <div>
                <label className="lbl">Ano</label>
                <input className="input-padrao" type="number" placeholder="2010" value={novoVeiculo.ano} onChange={e => setNovoVeiculo({ ...novoVeiculo, ano: e.target.value })} required />
              </div>

              <button type="submit" className="col-span-2 bg-indigo-600 text-white font-bold py-3 rounded hover:bg-indigo-700 mt-2">Salvar Veículo</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO AGENDAMENTO (MANTIDO IGUAL) */}
      {mostrarModalAgendamento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded p-6 w-full max-w-md relative">
            <button onClick={() => setMostrarModalAgendamento(false)} className="absolute top-2 right-2">X</button>
            <h3 className="font-bold mb-4">Novo Agendamento</h3>
            <form onSubmit={handeCriaAgendamento} className="grid gap-2">
              <select className="input-padrao" value={novoAgendamento.mecanico} onChange={e => setNovoAgendamento({ ...novoAgendamento, mecanico: e.target.value })} required>{mecanicos.map(m => <option key={m.id_mecanico} value={m.id_mecanico}>{m.nome}</option>)}</select>
              <select className="input-padrao" value={novoAgendamento.cliente} onChange={e => setNovoAgendamento({ ...novoAgendamento, cliente: e.target.value })} required><option value="">Cliente...</option>{clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nome}</option>)}</select>
              <select className="input-padrao" value={novoAgendamento.veiculo} onChange={e => setNovoAgendamento({ ...novoAgendamento, veiculo: e.target.value })} required disabled={!novoAgendamento.cliente}><option value="">Veículo...</option>{veiculosDoCliente.map(v => <option key={v.id_veiculo} value={v.id_veiculo}>{v.modelo}</option>)}</select>
              <select className="input-padrao" value={novoAgendamento.servico} onChange={e => setNovoAgendamento({ ...novoAgendamento, servico: e.target.value })} required><option value="">Serviço...</option>{servicos.map(s => <option key={s.id_servico} value={s.id_servico}>{s.descricao}</option>)}</select>
              <input type="datetime-local" className="input-padrao" value={novoAgendamento.horario_inicio} onChange={e => setNovoAgendamento({ ...novoAgendamento, horario_inicio: e.target.value })} />
              <button className="bg-blue-600 text-white p-2 rounded">Agendar</button>
            </form>
          </div>
        </div>
      )}

      <style>{`.input-padrao { width: 100%; border: 1px solid #ddd; padding: 8px; rounded: 4px; } .btn { padding: 8px 16px; rounded: 6px; font-weight: bold; } .lbl { font-size: 12px; font-weight: bold; color: #666; }`}</style>
    </div>
  );
}

// --- CARD AJUSTADO COM BOTÃO DE GERAR OS ---
function CardAgendamento({ agendamento, aoClicarGerarOS }) {
  const dataFormatada = new Date(agendamento.horario_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const diaMes = new Date(agendamento.horario_inicio).toLocaleDateString([], { day: '2-digit', month: '2-digit' });

  return (
    <div className="bg-white p-4 shadow-md rounded-lg border-l-4 border-blue-500 flex flex-col justify-between h-full hover:shadow-lg transition-shadow">
      <div>
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="text-2xl font-bold text-gray-800">{dataFormatada}</span>
            <span className="text-xs text-gray-400 ml-2 block">{diaMes}</span>
          </div>
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-bold">{agendamento.status}</span>
        </div>
        <div className="mb-3">
          <h4 className="font-bold text-gray-900">{agendamento.cliente_nome}</h4>
          <div className="text-gray-500 text-sm truncate">{agendamento.veiculo_modelo} - {agendamento.veiculo_placa}</div>
        </div>
        <div className="text-sm text-blue-600 font-semibold uppercase mb-4 tracking-wide border-t pt-2 border-gray-100">
          {agendamento.servico_descricao}
        </div>
      </div>

      {/* Botão de Ação PB08 */}
      <button
        onClick={aoClicarGerarOS}
        className="w-full mt-auto bg-orange-50 text-orange-700 border border-orange-200 py-2 rounded font-bold text-sm hover:bg-orange-100 flex items-center justify-center gap-2 transition-colors"
      >
        <span>📝 Gerar OS / Orçamento</span>
      </button>
    </div>
  );
}

export default DashboardMecanico;