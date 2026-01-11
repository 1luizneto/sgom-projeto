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
  const [mostrarModalChecklist, setMostrarModalChecklist] = useState(false); // <--- NOVO

  // --- FORMULÁRIOS ---
  const [novoAgendamento, setNovoAgendamento] = useState({ cliente: '', veiculo: '', servico: '', horario_inicio: '', preco: '', mecanico: '' });
  const [novoVeiculo, setNovoVeiculo] = useState({ cliente: '', placa: '', marca: '', modelo: '', cor: '', ano: '', tipo_combustivel: 'FLEX' });

  const getDataValidadePadrao = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  };

  const [novoOrcamento, setNovoOrcamento] = useState({
    cliente: '', veiculo: '', descricao: '', valor_total: '', status: 'PENDENTE',
    validade: getDataValidadePadrao(),
    id_agendamento_origem: null
  });

  // --- NOVO: Estado do Check List ---
  const [novoChecklist, setNovoChecklist] = useState({
    os: null, // Será preenchido ao abrir modal (precisa de OS criada)
    nivel_combustivel: '',
    avarias_lataria: '',
    pneus_estado: 'Bom estado',
    possivel_defeito: '',
    observacoes: ''
  });

  const [osAtual, setOsAtual] = useState(null); // Para vincular o checklist

  // 1. Verificação de Token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) api.defaults.headers.Authorization = `Bearer ${token}`;
    else navigate('/');
  }, [navigate]);

  // 2. Carregar Dados ao Abrir
  useEffect(() => { carregarDadosIniciais(); }, []);
  useEffect(() => { if (novoAgendamento.cliente) carregarVeiculos(novoAgendamento.cliente); }, [novoAgendamento.cliente]);
  useEffect(() => { if (novoOrcamento.cliente) carregarVeiculos(novoOrcamento.cliente); }, [novoOrcamento.cliente]);

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

  const abrirModalOS = (agendamento) => {
    carregarVeiculos(agendamento.cliente);
    setNovoOrcamento({
      cliente: agendamento.cliente,
      veiculo: agendamento.veiculo,
      descricao: `Serviço de ${agendamento.servico_descricao}`,
      valor_total: agendamento.preco || '',
      status: 'PENDENTE',
      validade: getDataValidadePadrao(),
      id_agendamento_origem: agendamento.id_agendamento
    });
    setMostrarModalOrcamento(true);
  };

  // --- NOVO: Abrir Modal de Check List ---
  const abrirModalChecklist = async (agendamento) => {
    // Primeiro verifica se já existe uma OS para este agendamento
    // Se não, cria uma OS temporária (ou você pode criar só após salvar o checklist)
    // Vamos simplificar: o checklist precisa de uma OS, então vamos criar a OS automaticamente

    try {
      // Cria a OS primeiro (se não existir)
      const ano = new Date().getFullYear();
      const numeroOS = `OS-${ano}-${agendamento.id_agendamento}`;

      const mecId = mecanicos.find(m => m.nome === localStorage.getItem('user_name'))?.id_mecanico || mecanicos[0]?.id_mecanico;

      const osPayload = {
        numero_os: numeroOS,
        veiculo: agendamento.veiculo,
        mecanico_responsavel: mecId,
        status: 'EM_ANDAMENTO'
      };

      const osResponse = await api.post('ordens-servico/', osPayload);
      const osId = osResponse.data.id_os;

      setOsAtual(osId);
      setNovoChecklist({
        os: osId,
        nivel_combustivel: '',
        avarias_lataria: '',
        pneus_estado: 'Bom estado',
        possivel_defeito: '',
        observacoes: ''
      });

      setMostrarModalChecklist(true);

    } catch (err) {
      console.error(err);
      alert('Erro ao preparar Check List. Verifique se a OS já existe.');
    }
  };

  const handleSalvarChecklist = async (e) => {
    e.preventDefault();

    // TC13 - Cenário 2: Validação de campos obrigatórios
    if (!novoChecklist.possivel_defeito.trim()) {
      alert("É necessário informar o defeito relatado.");
      return;
    }

    if (!novoChecklist.nivel_combustivel && !novoChecklist.avarias_lataria && !novoChecklist.pneus_estado) {
      alert("É necessário informar o estado do veículo (combustível, avarias ou pneus).");
      return;
    }

    try {
      const mecId = mecanicos.find(m => m.nome === localStorage.getItem('user_name'))?.id_mecanico || mecanicos[0]?.id_mecanico;

      const payload = {
        ...novoChecklist,
        mecanico: mecId,
        data_criacao: new Date().toISOString()
      };

      await api.post('checklists/', payload);
      alert('Check List de entrada salvo com sucesso!'); // TC13 - Cenário 1
      setMostrarModalChecklist(false);
      carregarDadosIniciais();

    } catch (err) {
      console.error(err);
      if (err.response?.data) {
        alert(`Erro: ${JSON.stringify(err.response.data)}`);
      } else {
        alert('Erro ao salvar Check List.');
      }
    }
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
      const nomeUser = localStorage.getItem('user_name');
      const eu = mecanicos.find(m => m.nome === nomeUser || (m.user && m.user.username === nomeUser));
      const mecId = eu ? (eu.id_mecanico || eu.id) : (mecanicos[0]?.id_mecanico || mecanicos[0]?.id);

      if (!mecId) { alert("Erro: Mecânico não identificado."); return; }

      let valorFinal = parseFloat(novoOrcamento.valor_total);
      if (isNaN(valorFinal) || valorFinal <= 0) {
        alert("Por favor, insira um valor total válido.");
        return;
      }

      const payload = {
        cliente: parseInt(novoOrcamento.cliente),
        veiculo: parseInt(novoOrcamento.veiculo),
        descricao: novoOrcamento.descricao || "Serviço Mecânico Geral",
        valor_total: valorFinal,
        status: 'PENDENTE',
        validade: novoOrcamento.validade,
        mecanico: parseInt(mecId)
      };

      await api.post('orcamentos/', payload);
      alert('OS/Orçamento enviado ao cliente com sucesso!');
      setMostrarModalOrcamento(false);
      carregarDadosIniciais();

    } catch (err) {
      console.error(err);
      alert('Erro ao criar OS.');
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
      alert('Erro ao cadastrar veículo.');
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
          <button onClick={() => setMostrarModalVeiculo(true)} className="btn bg-indigo-50 text-indigo-700">+ Veículo</button>
          <button onClick={() => setMostrarModalAgendamento(true)} className="btn bg-blue-600 text-white shadow-lg">+ Novo Agendamento</button>
          <button onClick={handleLogout} className="text-gray-400 font-bold ml-4">Sair</button>
        </div>
      </nav>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        <section>
          <div className="flex items-center mb-6 gap-3"><h2 className="text-2xl font-bold text-gray-800">Agenda de Hoje</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agendamentosHoje.map(ag => (
              <CardAgendamento
                key={ag.id_agendamento}
                agendamento={ag}
                aoClicarGerarOS={() => abrirModalOS(ag)}
                aoClicarChecklist={() => abrirModalChecklist(ag)} // <--- NOVO
              />
            ))}
            {agendamentosHoje.length === 0 && <p className="text-gray-400">Vazio.</p>}
          </div>
        </section>

        <section>
          <h3 className="text-lg font-bold text-gray-600 mb-4 border-b pb-2">Próximos Agendamentos</h3>
          <div className="grid grid-cols-1 gap-4">
            {agendamentosFuturos.map(ag => (
              <div key={ag.id_agendamento} className="bg-white p-4 rounded shadow flex justify-between items-center">
                <div>
                  <span className="font-bold">{new Date(ag.horario_inicio).toLocaleString()}</span> - {ag.cliente_nome} ({ag.veiculo_modelo})
                  <div className="text-sm text-blue-600">{ag.servico_descricao}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => abrirModalChecklist(ag)} className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-sm font-bold hover:bg-purple-200">Check List</button>
                  <button onClick={() => abrirModalOS(ag)} className="bg-orange-100 text-orange-700 px-3 py-1 rounded text-sm font-bold hover:bg-orange-200">Gerar OS</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* --- MODAIS --- */}

      {/* MODAL CHECK LIST (NOVO) - PB13 */}
      {mostrarModalChecklist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setMostrarModalChecklist(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            <h2 className="text-2xl font-bold mb-4 text-purple-700">📋 Check List de Entrada do Veículo</h2>

            <form onSubmit={handleSalvarChecklist} className="flex flex-col gap-4">
              {/* ESTADO ATUAL DO VEÍCULO */}
              <div className="bg-gray-50 p-4 rounded border">
                <h3 className="font-bold text-gray-700 mb-3">Estado Atual do Veículo</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold text-gray-600">Nível de Combustível *</label>
                    <select
                      className="w-full p-2 border rounded mt-1"
                      value={novoChecklist.nivel_combustivel}
                      onChange={e => setNovoChecklist({ ...novoChecklist, nivel_combustivel: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      <option value="Vazio">Vazio (Reserva)</option>
                      <option value="1/4">1/4 (25%)</option>
                      <option value="1/2">1/2 (50%)</option>
                      <option value="3/4">3/4 (75%)</option>
                      <option value="Cheio">Cheio (100%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-gray-600">Estado dos Pneus *</label>
                    <select
                      className="w-full p-2 border rounded mt-1"
                      value={novoChecklist.pneus_estado}
                      onChange={e => setNovoChecklist({ ...novoChecklist, pneus_estado: e.target.value })}
                    >
                      <option value="Bom estado">Bom estado</option>
                      <option value="Desgaste médio">Desgaste médio</option>
                      <option value="Desgaste avançado">Desgaste avançado</option>
                      <option value="Necessita troca urgente">Necessita troca urgente</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="text-sm font-bold text-gray-600">Avarias Visuais (Lataria, Vidros, etc.)</label>
                  <textarea
                    className="w-full p-2 border rounded mt-1 h-20"
                    placeholder="Ex: Amassado porta traseira esquerda, farol direito trincado..."
                    value={novoChecklist.avarias_lataria}
                    onChange={e => setNovoChecklist({ ...novoChecklist, avarias_lataria: e.target.value })}
                  />
                </div>
              </div>

              {/* DIAGNÓSTICO INICIAL */}
              <div className="bg-red-50 p-4 rounded border border-red-200">
                <h3 className="font-bold text-red-800 mb-2">Defeito Relatado pelo Cliente *</h3>
                <textarea
                  className="w-full p-2 border rounded h-24"
                  placeholder="Descreva o problema relatado pelo cliente..."
                  value={novoChecklist.possivel_defeito}
                  onChange={e => setNovoChecklist({ ...novoChecklist, possivel_defeito: e.target.value })}
                  required
                />
              </div>

              {/* OBSERVAÇÕES ADICIONAIS */}
              <div>
                <label className="text-sm font-bold text-gray-600">Observações Adicionais</label>
                <textarea
                  className="w-full p-2 border rounded mt-1 h-16"
                  placeholder="Outras informações relevantes..."
                  value={novoChecklist.observacoes}
                  onChange={e => setNovoChecklist({ ...novoChecklist, observacoes: e.target.value })}
                />
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setMostrarModalChecklist(false)}
                  className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 shadow-md"
                >
                  ✅ Salvar Check List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ORÇAMENTO (Mantido igual) */}
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
              <textarea className="input-padrao h-24" placeholder="Descreva peças necessárias..." value={novoOrcamento.descricao} onChange={e => setNovoOrcamento({ ...novoOrcamento, descricao: e.target.value })} required />
              <label className="lbl">Valor Final da OS (R$)</label>
              <input type="number" step="0.01" className="input-padrao font-bold text-lg border-orange-300" placeholder="0.00" value={novoOrcamento.valor_total} onChange={e => setNovoOrcamento({ ...novoOrcamento, valor_total: e.target.value })} required />
              <button type="submit" className="mt-4 bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 shadow-md">Enviar para Aprovação</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VEÍCULO (Mantido igual) */}
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
              <div><label className="lbl">Placa</label><input className="input-padrao uppercase" placeholder="ABC-1234" value={novoVeiculo.placa} onChange={e => setNovoVeiculo({ ...novoVeiculo, placa: e.target.value.toUpperCase() })} required /></div>
              <div><label className="lbl">Marca</label><input className="input-padrao" placeholder="Fiat" value={novoVeiculo.marca} onChange={e => setNovoVeiculo({ ...novoVeiculo, marca: e.target.value })} required /></div>
              <div className="col-span-2"><label className="lbl">Modelo</label><input className="input-padrao" placeholder="Uno Mille" value={novoVeiculo.modelo} onChange={e => setNovoVeiculo({ ...novoVeiculo, modelo: e.target.value })} required /></div>
              <div><label className="lbl">Cor</label><input className="input-padrao" placeholder="Branco" value={novoVeiculo.cor} onChange={e => setNovoVeiculo({ ...novoVeiculo, cor: e.target.value })} required /></div>
              <div><label className="lbl">Ano</label><input className="input-padrao" type="number" placeholder="2010" value={novoVeiculo.ano} onChange={e => setNovoVeiculo({ ...novoVeiculo, ano: e.target.value })} required /></div>
              <button type="submit" className="col-span-2 bg-indigo-600 text-white font-bold py-3 rounded hover:bg-indigo-700 mt-2">Salvar Veículo</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO AGENDAMENTO - MELHORADO */}
      {mostrarModalAgendamento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg relative animate-fade-in">
            <button
              onClick={() => setMostrarModalAgendamento(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-6 text-blue-700">📅 Novo Agendamento</h2>

            <form onSubmit={handeCriaAgendamento} className="flex flex-col gap-4">
              {/* Mecânico Responsável */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Mecânico Responsável *
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={novoAgendamento.mecanico}
                  onChange={e => setNovoAgendamento({ ...novoAgendamento, mecanico: e.target.value })}
                  required
                >
                  <option value="">Selecione o mecânico...</option>
                  {mecanicos.map(m => (
                    <option key={m.id_mecanico} value={m.id_mecanico}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Cliente *
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={novoAgendamento.cliente}
                  onChange={e => setNovoAgendamento({ ...novoAgendamento, cliente: e.target.value })}
                  required
                >
                  <option value="">Selecione o cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Veículo */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Veículo *
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={novoAgendamento.veiculo}
                  onChange={e => setNovoAgendamento({ ...novoAgendamento, veiculo: e.target.value })}
                  required
                  disabled={!novoAgendamento.cliente}
                >
                  <option value="">
                    {novoAgendamento.cliente ? 'Selecione o veículo...' : 'Primeiro selecione um cliente'}
                  </option>
                  {veiculosDoCliente.map(v => (
                    <option key={v.id_veiculo} value={v.id_veiculo}>
                      {v.modelo} - {v.placa} ({v.marca})
                    </option>
                  ))}
                </select>
                {novoAgendamento.cliente && veiculosDoCliente.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ Este cliente não possui veículos cadastrados.
                  </p>
                )}
              </div>

              {/* Serviço */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Serviço a Realizar *
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={novoAgendamento.servico}
                  onChange={e => setNovoAgendamento({ ...novoAgendamento, servico: e.target.value })}
                  required
                >
                  <option value="">Selecione o serviço...</option>
                  {servicos.length > 0 ? (
                    servicos.map(s => (
                      <option key={s.id_servico} value={s.id_servico}>
                        {s.descricao} - R$ {parseFloat(s.preco_base).toFixed(2)}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>Nenhum serviço disponível</option>
                  )}
                </select>
                {servicos.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ Nenhum serviço cadastrado no sistema. Cadastre serviços primeiro!
                  </p>
                )}
              </div>

              {/* Data e Hora */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Data e Hora do Agendamento *
                </label>
                <input
                  type="datetime-local"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={novoAgendamento.horario_inicio}
                  onChange={e => setNovoAgendamento({ ...novoAgendamento, horario_inicio: e.target.value })}
                  required
                  min={new Date().toISOString().slice(0, 16)} // Não permite agendar no passado
                />
              </div>

              {/* Valor Estimado (auto-preenchido) */}
              {novoAgendamento.preco && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700">Valor Estimado:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      R$ {parseFloat(novoAgendamento.preco).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    *Valor base do serviço. Pode ser ajustado na OS final.
                  </p>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setMostrarModalAgendamento(false)}
                  className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 shadow-md transition-colors"
                >
                  📅 Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`.input-padrao { width: 100%; border: 1px solid #ddd; padding: 8px; rounded: 4px; } .btn { padding: 8px 16px; rounded: 6px; font-weight: bold; } .lbl { font-size: 12px; font-weight: bold; color: #666; }`}</style>
    </div>
  );
}

// --- CARD AJUSTADO COM BOTÃO DE CHECK LIST ---
function CardAgendamento({ agendamento, aoClicarGerarOS, aoClicarChecklist }) {
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

      {/* Botões de Ação */}
      <div className="flex flex-col gap-2">
        <button
          onClick={aoClicarChecklist}
          className="w-full bg-purple-50 text-purple-700 border border-purple-200 py-2 rounded font-bold text-sm hover:bg-purple-100 transition-colors"
        >
          📋 Check List de Entrada
        </button>
        <button
          onClick={aoClicarGerarOS}
          className="w-full bg-orange-50 text-orange-700 border border-orange-200 py-2 rounded font-bold text-sm hover:bg-orange-100 transition-colors"
        >
          📝 Gerar OS / Orçamento
        </button>
      </div>
    </div>
  );
}

export default DashboardMecanico;