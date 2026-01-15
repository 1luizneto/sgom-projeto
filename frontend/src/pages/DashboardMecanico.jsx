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
  const [produtos, setProdutos] = useState([]);
  const [notificacoes, setNotificacoes] = useState([]);
  const [ordensServico, setOrdensServico] = useState([]);
  const [checklists, setChecklists] = useState([]); // <--- ADICIONAR NOVO ESTADO
  const [orcamentos, setOrcamentos] = useState([]); // ADICIONAR NOVO ESTADO para armazenar orçamentos

  // --- CONTROLE DOS MODAIS ---
  const [mostrarModalVeiculo, setMostrarModalVeiculo] = useState(false);
  const [mostrarModalAgendamento, setMostrarModalAgendamento] = useState(false);
  const [mostrarModalOrcamento, setMostrarModalOrcamento] = useState(false);
  const [mostrarModalChecklist, setMostrarModalChecklist] = useState(false);
  const [mostrarModalVendaBalcao, setMostrarModalVendaBalcao] = useState(false);
  const [mostrarModalEstoque, setMostrarModalEstoque] = useState(false);
  const [mostrarModalCancelamento, setMostrarModalCancelamento] = useState(false);
  const [mostrarModalOS, setMostrarModalOS] = useState(false); // ADICIONAR NOVO ESTADO

  // --- NOVO: Controle de fluxo ---
  const [agendamentoAtual, setAgendamentoAtual] = useState(null);
  const [checklistCriado, setChecklistCriado] = useState(null);
  const [etapaFluxo, setEtapaFluxo] = useState(''); // 'checklist', 'orcamento', 'aguardando_aprovacao'

  const [agendamentoParaCancelar, setAgendamentoParaCancelar] = useState(null);
  const [filtroEstoqueBaixo, setFiltroEstoqueBaixo] = useState(false);

  // --- FORMULÁRIOS ---
  const [novoAgendamento, setNovoAgendamento] = useState({ cliente: '', veiculo: '', servico: '', horario_inicio: '', preco: '', mecanico: '' });
  const [novoVeiculo, setNovoVeiculo] = useState({ cliente: '', placa: '', marca: '', modelo: '', cor: '', ano: '', tipo_combustivel: 'FLEX' });

  const getDataValidadePadrao = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  };

  const [novoOrcamento, setNovoOrcamento] = useState({
    cliente: '',
    veiculo: '',
    descricao: '',
    status: 'PENDENTE',
    validade: getDataValidadePadrao(),
    agendamento: null,
    checklist: null
  });

  const [novoChecklist, setNovoChecklist] = useState({
    agendamento: null,
    nivel_combustivel: '',
    avarias_lataria: '',
    pneus_estado: 'Bom estado',
    possivel_defeito: '',
    observacoes: ''
  });

  // --- NOVO: Itens do orçamento (peças/produtos) ---
  const [itensOrcamento, setItensOrcamento] = useState([]);
  const [produtoOrcamento, setProdutoOrcamento] = useState('');
  const [quantidadeOrcamento, setQuantidadeOrcamento] = useState(1);

  const [carrinhoVenda, setCarrinhoVenda] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [quantidadeVenda, setQuantidadeVenda] = useState(1);
  const [buscaProduto, setBuscaProduto] = useState('');

  // --- USE EFFECTS ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) api.defaults.headers.Authorization = `Bearer ${token}`;
    else navigate('/');
  }, [navigate]);

  useEffect(() => { carregarDadosIniciais(); }, []);
  useEffect(() => { if (novoAgendamento.cliente) carregarVeiculos(novoAgendamento.cliente); }, [novoAgendamento.cliente]);
  useEffect(() => { if (novoOrcamento.cliente) carregarVeiculos(novoOrcamento.cliente); }, [novoOrcamento.cliente]);

  useEffect(() => {
    if (novoAgendamento.servico) {
      const s = servicos.find(item => item.id_servico === parseInt(novoAgendamento.servico));
      if (s) setNovoAgendamento(prev => ({ ...prev, preco: s.preco_base }));
    }
  }, [novoAgendamento.servico, servicos]);

  useEffect(() => {
    if (mecanicos.length > 0) {
      const user = localStorage.getItem('user_name');
      const eu = mecanicos.find(m => m.nome === user || m.user?.username === user);
      if (eu) {
        setNovoAgendamento(prev => ({ ...prev, mecanico: eu.id_mecanico }));
      }
    }
  }, [mecanicos]);

  // --- CARREGAR DADOS ---
  const carregarDadosIniciais = async () => {
    try {
      // 1. Primeiro, identificar qual mecânico está logado
      const userName = localStorage.getItem('user_name');
      const userId = localStorage.getItem('user_id');

      // 2. Buscar todos os mecânicos para encontrar o ID do logado
      const mecanicosResp = await api.get('mecanicos/');
      const mecanicoLogado = mecanicosResp.data.find(m =>
        m.nome === userName || m.user === parseInt(userId)
      );

      console.log('👤 Mecânico logado:', mecanicoLogado);

      if (!mecanicoLogado) {
        alert('❌ Erro: Perfil de mecânico não encontrado!');
        navigate('/');
        return;
      }

      // 3. Carregar APENAS os agendamentos deste mecânico
      const resp = await Promise.all([
        api.get(`agendamentos/?mecanico=${mecanicoLogado.id_mecanico}`), // <--- FILTRO AQUI
        api.get('servicos/'),
        api.get('clientes/'),
        api.get('produtos/'),
        api.get('notificacoes/?nao_lidas=true').catch(() => ({ data: [] })),
        api.get('ordens-servico/').catch(err => {
          console.error('❌ Erro ao carregar OS:', err);
          return { data: [] };
        }),
        api.get('checklists/').catch(() => ({ data: [] })),
        api.get('orcamentos/').catch(() => ({ data: [] }))
      ]);

      console.log('📦 DADOS CARREGADOS:');
      console.log('Agendamentos do mecânico:', resp[0].data);
      console.log('Ordens de Serviço:', resp[5].data);
      console.log('Orçamentos:', resp[7].data);
      console.log('Checklists:', resp[6].data);

      setAgendamentos(resp[0].data);
      setServicos(resp[1].data);
      setClientes(resp[2].data);
      setMecanicos(mecanicosResp.data);
      setProdutos(resp[3].data || []);
      setNotificacoes(resp[4].data || []);
      setOrdensServico(resp[5].data || []);
      setChecklists(resp[6].data || []);
      setOrcamentos(resp[7].data || []);
    } catch (err) {
      console.error('❌ Erro ao carregar dados:', err);
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

  // --- NOVO FLUXO: Iniciar Atendimento ---
  const iniciarFluxoAtendimento = (agendamento) => {
    setAgendamentoAtual(agendamento);
    setEtapaFluxo('checklist');

    setNovoChecklist({
      agendamento: agendamento.id_agendamento,
      nivel_combustivel: '',
      avarias_lataria: '',
      pneus_estado: 'Bom estado',
      possivel_defeito: '',
      observacoes: ''
    });

    setMostrarModalChecklist(true);
  };

  // --- ETAPA 1: Salvar Checklist ---
  const handleSalvarChecklist = async (e) => {
    e.preventDefault();

    if (!novoChecklist.possivel_defeito.trim()) {
      alert("É necessário informar o defeito relatado.");
      return;
    }

    try {
      const mecId = mecanicos.find(m => m.nome === localStorage.getItem('user_name'))?.id_mecanico || mecanicos[0]?.id_mecanico;

      const payload = {
        agendamento: agendamentoAtual.id_agendamento,
        mecanico: mecId,
        nivel_combustivel: novoChecklist.nivel_combustivel,
        avarias_lataria: novoChecklist.avarias_lataria,
        pneus_estado: novoChecklist.pneus_estado,
        possivel_defeito: novoChecklist.possivel_defeito,
        observacoes: novoChecklist.observacoes
      };

      const response = await api.post('checklists/', payload);

      alert('✅ Check List salvo! Agora crie o orçamento com as peças necessárias.');

      setChecklistCriado(response.data);
      setMostrarModalChecklist(false);

      // AVANÇAR PARA PRÓXIMA ETAPA
      setTimeout(() => {
        abrirModalOrcamentoAposChecklist();
      }, 500);

    } catch (err) {
      console.error(err);
      alert(err.response?.data ? `Erro: ${JSON.stringify(err.response.data)}` : 'Erro ao salvar Check List.');
    }
  };

  // --- ETAPA 2: Abrir modal de orçamento ---
  const abrirModalOrcamentoAposChecklist = () => {
    if (!agendamentoAtual || !checklistCriado) return;

    carregarVeiculos(agendamentoAtual.cliente);

    setNovoOrcamento({
      cliente: agendamentoAtual.cliente,
      veiculo: agendamentoAtual.veiculo,
      descricao: `Serviço: ${agendamentoAtual.servico_descricao}\n\nDefeito Relatado: ${checklistCriado.possivel_defeito}`,
      status: 'PENDENTE',
      validade: getDataValidadePadrao(),
      agendamento: agendamentoAtual.id_agendamento,
      checklist: checklistCriado.id_checklist
    });

    setItensOrcamento([{
      produto: null,
      produto_nome: agendamentoAtual.servico_descricao,
      quantidade: 1,
      valor_unitario: parseFloat(agendamentoAtual.preco || 0),
      tipo: 'servico'
    }]);

    setEtapaFluxo('orcamento');
    setMostrarModalOrcamento(true);
  };

  // --- ADICIONAR PEÇA AO ORÇAMENTO ---
  const adicionarItemOrcamento = () => {
    if (!produtoOrcamento) {
      alert('Selecione um produto/peça');
      return;
    }

    const produto = produtos.find(p => p.id_produto === parseInt(produtoOrcamento));
    if (!produto) return;

    if (quantidadeOrcamento > produto.estoque_atual) {
      alert(`Estoque insuficiente! Disponível: ${produto.estoque_atual}`);
      return;
    }

    const itemExistente = itensOrcamento.find(i => i.produto === produto.id_produto);

    if (itemExistente) {
      setItensOrcamento(itensOrcamento.map(i =>
        i.produto === produto.id_produto
          ? { ...i, quantidade: i.quantidade + quantidadeOrcamento }
          : i
      ));
    } else {
      setItensOrcamento([...itensOrcamento, {
        produto: produto.id_produto,
        produto_nome: produto.nome,
        quantidade: quantidadeOrcamento,
        valor_unitario: parseFloat(produto.preco_venda),
        tipo: 'produto'
      }]);
    }

    setProdutoOrcamento('');
    setQuantidadeOrcamento(1);
  };

  const removerItemOrcamento = (index) => {
    setItensOrcamento(itensOrcamento.filter((_, i) => i !== index));
  };

  const calcularTotalOrcamento = () => {
    return itensOrcamento.reduce((sum, item) => sum + (item.quantidade * item.valor_unitario), 0);
  };

  // --- ETAPA 3: Criar Orçamento ---
  const handleCriaOrcamento = async (e) => {
    e.preventDefault();

    if (itensOrcamento.length === 0) {
      alert('Adicione pelo menos um item ao orçamento!');
      return;
    }

    try {
      const nomeUser = localStorage.getItem('user_name');
      const eu = mecanicos.find(m => m.nome === nomeUser || (m.user && m.user.username === nomeUser));
      const mecId = eu ? (eu.id_mecanico || eu.id) : (mecanicos[0]?.id_mecanico || mecanicos[0]?.id);

      if (!mecId) {
        alert("Erro: Mecânico não identificado.");
        return;
      }

      const payload = {
        cliente: parseInt(novoOrcamento.cliente),
        veiculo: parseInt(novoOrcamento.veiculo),
        descricao: novoOrcamento.descricao || "Serviço Mecânico Geral",
        status: 'PENDENTE',
        validade: novoOrcamento.validade,
        mecanico: parseInt(mecId),
        agendamento: novoOrcamento.agendamento,
        checklist: novoOrcamento.checklist
      };

      console.log('📤 Criando orçamento:', payload);

      const response = await api.post('orcamentos/', payload);
      const orcamentoId = response.data.id_orcamento;

      // Adicionar itens ao orçamento
      for (const item of itensOrcamento) {
        if (item.produto) {
          await api.post('itens-movimentacao/', {
            orcamento: orcamentoId,
            produto: item.produto,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario
          });
        }
      }

      alert(`✅ Orçamento #${orcamentoId} enviado ao cliente!\n\n💰 Valor Total: R$ ${calcularTotalOrcamento().toFixed(2)}\n\n⏳ Aguardando aprovação do cliente para iniciar o serviço.`);

      setMostrarModalOrcamento(false);
      setEtapaFluxo('aguardando_aprovacao');
      setAgendamentoAtual(null);
      setChecklistCriado(null);
      setItensOrcamento([]);

      carregarDadosIniciais();
    } catch (err) {
      console.error(err);
      alert('Erro ao criar orçamento: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    }
  };

  // --- FUNÇÕES EXISTENTES (mantidas iguais) ---
  const solicitarCancelamento = (agendamento) => {
    setAgendamentoParaCancelar(agendamento);
    setMostrarModalCancelamento(true);
  };

  const confirmarCancelamento = async () => {
    if (!agendamentoParaCancelar) return;
    try {
      await api.delete(`agendamentos/${agendamentoParaCancelar.id_agendamento}/`);
      alert('Agendamento cancelado com sucesso!');
      setMostrarModalCancelamento(false);
      setAgendamentoParaCancelar(null);
      carregarDadosIniciais();
    } catch (err) {
      console.error('Erro ao cancelar agendamento:', err);
      alert('Erro ao cancelar agendamento.');
    }
  };

  const handeCriaAgendamento = async (e) => {
    e.preventDefault();
    try {
      const mecId = novoAgendamento.mecanico || mecanicos[0]?.id_mecanico;

      if (!novoAgendamento.cliente || !novoAgendamento.veiculo || !novoAgendamento.servico || !novoAgendamento.horario_inicio || !mecId) {
        alert('Preencha todos os campos!');
        return;
      }

      const servicoSelecionado = servicos.find(s => s.id_servico === parseInt(novoAgendamento.servico));
      const [dataStr, horaStr] = novoAgendamento.horario_inicio.split('T');
      const [ano, mes, dia] = dataStr.split('-').map(Number);
      const [hora, minuto] = horaStr.split(':').map(Number);

      const dataInicio = new Date(ano, mes - 1, dia, hora, minuto, 0);
      let dataFim = new Date(dataInicio);

      if (servicoSelecionado?.tempo_estimado) {
        const tempoMatch = servicoSelecionado.tempo_estimado.match(/(\d+\.?\d*)/);
        if (tempoMatch) {
          const horas = parseFloat(tempoMatch[1]);
          dataFim.setHours(dataFim.getHours() + Math.floor(horas));
          dataFim.setMinutes(dataFim.getMinutes() + Math.round((horas % 1) * 60));
        } else {
          dataFim.setHours(dataFim.getHours() + 1);
        }
      } else {
        dataFim.setHours(dataFim.getHours() + 1);
      }

      const formatarDataLocal = (data) => {
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const dia = String(data.getDate()).padStart(2, '0');
        const hora = String(data.getHours()).padStart(2, '0');
        const minuto = String(data.getMinutes()).padStart(2, '0');
        const segundo = String(data.getSeconds()).padStart(2, '0');
        return `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}`;
      };

      const payload = {
        cliente: parseInt(novoAgendamento.cliente),
        veiculo: parseInt(novoAgendamento.veiculo),
        servico: parseInt(novoAgendamento.servico),
        preco: parseFloat(novoAgendamento.preco) || 0,
        horario_inicio: formatarDataLocal(dataInicio),
        horario_fim: formatarDataLocal(dataFim),
        status: 'AGENDADO',
        mecanico: parseInt(mecId)
      };

      await api.post('agendamentos/', payload);

      alert(`Agendamento criado com sucesso!\n\n⏰ Início: ${dataInicio.toLocaleString('pt-BR')}\n⏱️ Fim: ${dataFim.toLocaleString('pt-BR')}\n📅 Duração: ${servicoSelecionado?.tempo_estimado || '1h'}`);

      setMostrarModalAgendamento(false);
      setNovoAgendamento({ cliente: '', veiculo: '', servico: '', horario_inicio: '', preco: '', mecanico: mecId });
      carregarDadosIniciais();
    } catch (err) {
      console.error('❌ Erro completo:', err);
      alert(`Erro ao criar agendamento:\n\n${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
    }
  };

  const handleCadastraVeiculo = async (e) => {
    e.preventDefault();
    try {
      await api.post('veiculos/', novoVeiculo);
      alert('Veículo cadastrado!');
      setMostrarModalVeiculo(false);
      setNovoVeiculo({ cliente: '', placa: '', marca: '', modelo: '', cor: '', ano: '', tipo_combustivel: 'FLEX' });
    } catch (e) { alert('Erro ao cadastrar veículo.'); }
  };

  // --- VENDA BALCÃO (mantido igual) ---
  const abrirModalVendaBalcao = () => {
    setCarrinhoVenda([]);
    setProdutoSelecionado('');
    setQuantidadeVenda(1);
    setBuscaProduto('');
    setMostrarModalVendaBalcao(true);
  };

  const adicionarProdutoCarrinho = () => {
    if (!produtoSelecionado) { alert('Selecione um produto.'); return; }
    const produto = produtos.find(p => p.id_produto === parseInt(produtoSelecionado));
    if (!produto) { alert('Produto não encontrado.'); return; }
    if (quantidadeVenda > produto.estoque_atual) { alert(`Quantidade solicitada superior ao estoque disponível (Atual: ${produto.estoque_atual})`); return; }

    const itemExistente = carrinhoVenda.find(item => item.produto.id_produto === produto.id_produto);
    if (itemExistente) {
      const novaQtd = itemExistente.quantidade + quantidadeVenda;
      if (novaQtd > produto.estoque_atual) { alert(`Quantidade total no carrinho (${novaQtd}) superior ao estoque disponível (${produto.estoque_atual})`); return; }
      setCarrinhoVenda(carrinhoVenda.map(item => item.produto.id_produto === produto.id_produto ? { ...item, quantidade: novaQtd } : item));
    } else {
      setCarrinhoVenda([...carrinhoVenda, { produto, quantidade: quantidadeVenda }]);
    }

    setProdutoSelecionado('');
    setQuantidadeVenda(1);
  };

  const removerDoCarrinho = (idProduto) => {
    setCarrinhoVenda(carrinhoVenda.filter(item => item.produto.id_produto !== idProduto));
  };

  const calcularTotal = () => {
    return carrinhoVenda.reduce((total, item) => total + (parseFloat(item.produto.preco_venda) * item.quantidade), 0).toFixed(2);
  };

  const finalizarVenda = async () => {
    if (carrinhoVenda.length === 0) { alert('Adicione pelo menos um produto ao carrinho.'); return; }
    try {
      const payload = {
        itens: carrinhoVenda.map(item => ({
          produto: item.produto.id_produto,
          quantidade: item.quantidade,
          valor_unitario: parseFloat(item.produto.preco_venda)
        }))
      };
      await api.post('vendas/', payload);
      alert('Venda realizada com sucesso!');
      setMostrarModalVendaBalcao(false);
      carregarDadosIniciais();
    } catch (err) {
      console.error('Erro completo:', err);
      alert(`Erro ao finalizar venda:\n\n${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
    }
  };

  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(buscaProduto.toLowerCase()) ||
    p.descricao?.toLowerCase().includes(buscaProduto.toLowerCase())
  );

  const abrirModalEstoque = () => {
    setFiltroEstoqueBaixo(false);
    setMostrarModalEstoque(true);
  };

  const marcarNotificacaoLida = async (idNotificacao) => {
    try {
      await api.post(`notificacoes/${idNotificacao}/marcar_lida/`);
      setNotificacoes(notificacoes.filter(n => n.id_notificacao !== idNotificacao));
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
    }
  };

  const produtosFiltradosEstoque = filtroEstoqueBaixo
    ? produtos.filter(p => p.estoque_atual < p.estoque_minimo)
    : produtos;

  const produtosEstoqueBaixo = produtos.filter(p => p.estoque_atual < p.estoque_minimo);

  const handleLogout = () => { localStorage.removeItem('token'); navigate('/'); };
  const hoje = new Date().toLocaleDateString('pt-BR');

  // CORRIGIR OS FILTROS:
  const agendamentosHoje = agendamentos.filter(ag =>
    new Date(ag.horario_inicio).toLocaleDateString('pt-BR') === hoje &&
    ag.status !== 'CONCLUIDO' &&
    ag.status !== 'CANCELADO'
  );

  const agendamentosFuturos = agendamentos.filter(ag => {
    const dataAgendamento = new Date(ag.horario_inicio).toLocaleDateString('pt-BR');
    return dataAgendamento !== hoje &&
      ag.status !== 'CONCLUIDO' &&
      ag.status !== 'CANCELADO';
  });

  const agendamentosConcluidos = agendamentos.filter(ag =>
    ag.status === 'CONCLUIDO'
  );

  // NOVAS FUNÇÕES
  const agendamentoTemChecklist = (idAgendamento) => {
    return checklists.find(c => c.agendamento === idAgendamento);
  };

  const agendamentoTemOrcamento = (idAgendamento) => {
    return orcamentos.find(o => o.agendamento === idAgendamento);
  };

  const abrirOrcamentoDireto = (agendamento) => {
    const checklistExistente = agendamentoTemChecklist(agendamento.id_agendamento);

    if (!checklistExistente) {
      alert('Erro: Checklist não encontrado!');
      return;
    }

    setAgendamentoAtual(agendamento);
    setChecklistCriado(checklistExistente);
    abrirModalOrcamentoAposChecklist();
  };

  // NOVAS FUNÇÕES: ORDEM DE SERVIÇO
  const [osAtual, setOsAtual] = useState(null);
  const [novoStatusOS, setNovoStatusOS] = useState('');
  const [observacoesOS, setObservacoesOS] = useState('');
  const [mostrarConfirmacaoConclusao, setMostrarConfirmacaoConclusao] = useState(false);

  // MODIFICAR a função iniciarServico para apenas abrir a OS existente
  const iniciarServico = async (agendamento, orcamento) => {
    try {
      console.log('🔍 Buscando OS para orçamento:', orcamento);
      console.log('📋 Ordens de Serviço disponíveis:', ordensServico);

      // Buscar a OS que foi criada automaticamente quando o orçamento foi aprovado
      const osExistente = ordensServico.find(os => {
        console.log(`Comparando OS #${os.id_os}: os.orcamento=${os.orcamento} com orcamento.id_orcamento=${orcamento?.id_orcamento}`);
        return os.orcamento === orcamento?.id_orcamento;
      });

      console.log('✅ OS encontrada:', osExistente);

      if (!osExistente) {
        console.error('❌ OS não encontrada!');
        console.error('Orçamento procurado:', orcamento);
        console.error('Todas as OS:', ordensServico);

        alert(`❌ Erro: Ordem de Serviço não encontrada!\n\nOrçamento: #${orcamento?.id_orcamento}\nVerifique se o orçamento foi aprovado corretamente.`);
        return;
      }

      // Abrir modal para atualizar status da OS
      setOsAtual(osExistente);
      setNovoStatusOS(osExistente.status);
      setObservacoesOS('');
      setMostrarModalOS(true);

    } catch (err) {
      console.error('❌ Erro completo:', err);
      alert('Erro ao carregar ordem de serviço: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    }
  };

  const atualizarStatusOS = async (e) => {
    e.preventDefault();

    if (!osAtual) return;

    // Se o status for CONCLUIDO, mostrar confirmação
    if (novoStatusOS === 'CONCLUIDA') {
      setMostrarConfirmacaoConclusao(true);
      return;
    }

    try {
      const payload = {
        status: novoStatusOS
      };

      await api.patch(`ordens-servico/${osAtual.id_os}/`, payload);

      alert('✅ Status atualizado com sucesso!');

      setMostrarModalOS(false);
      carregarDadosIniciais();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    }
  };

  const confirmarConclusao = async () => {
    try {
      console.log('🔧 Concluindo OS:', osAtual);

      // 1. Atualizar status da OS
      const responseOS = await api.patch(`ordens-servico/${osAtual.id_os}/`, {
        status: 'CONCLUIDA',
        data_conclusao: new Date().toISOString()
      });

      console.log('✅ OS atualizada:', responseOS.data);

      // 2. Buscar o agendamento vinculado
      const orcamento = orcamentos.find(orc => orc.id_orcamento === osAtual.orcamento);

      if (!orcamento) {
        console.error('❌ Orçamento não encontrado para esta OS');
        alert('⚠️ OS concluída, mas não foi possível atualizar o agendamento.');
        setMostrarConfirmacaoConclusao(false);
        setMostrarModalOS(false);
        carregarDadosIniciais();
        return;
      }

      const agendamento = agendamentos.find(ag => ag.id_agendamento === orcamento.agendamento);

      if (!agendamento) {
        console.error('❌ Agendamento não encontrado');
        alert('⚠️ OS concluída, mas não foi possível atualizar o agendamento.');
        setMostrarConfirmacaoConclusao(false);
        setMostrarModalOS(false);
        carregarDadosIniciais();
        return;
      }

      console.log('📋 Atualizando agendamento:', agendamento.id_agendamento);

      // 3. Atualizar status do agendamento (PATCH parcial)
      const responseAgendamento = await api.patch(`agendamentos/${agendamento.id_agendamento}/`, {
        status: 'CONCLUIDO'
      });

      console.log('✅ Agendamento atualizado:', responseAgendamento.data);

      alert('🎉 Serviço concluído com sucesso!\n\nO agendamento foi finalizado e movido para o histórico.');

      setMostrarConfirmacaoConclusao(false);
      setMostrarModalOS(false);
      carregarDadosIniciais();

    } catch (err) {
      console.error('❌ Erro ao concluir serviço:', err);
      console.error('Response data:', err.response?.data);

      alert('Erro ao concluir serviço: ' +
        (err.response?.data
          ? JSON.stringify(err.response.data)
          : err.message));
    }
  };

  // FILTRAR AGENDAMENTOS CONCLUÍDOS
  //const agendamentosConcluidos = agendamentos.filter(ag => ag.status === 'CONCLUIDO');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* NAVBAR */}
      <nav className="bg-blue-800 text-white px-6 py-4 flex justify-between shadow-lg sticky top-0 z-10">
        <h1 className="text-2xl font-bold">🛠️ Oficina Dashboard</h1>
        <div className="flex gap-4 items-center">
          {notificacoes.length > 0 && (
            <button onClick={abrirModalEstoque} className="bg-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-700 flex items-center gap-2">
              🔔 Alertas
              <span className="bg-white text-red-600 text-xs rounded-full px-2 py-1">{notificacoes.length}</span>
            </button>
          )}
          <button onClick={() => setMostrarModalVeiculo(true)} className="bg-indigo-600 px-4 py-2 rounded font-bold hover:bg-indigo-700">+ Veículo</button>
          <button onClick={() => setMostrarModalAgendamento(true)} className="bg-blue-600 px-4 py-2 rounded font-bold hover:bg-blue-700">+ Novo Agendamento</button>
          <button onClick={abrirModalVendaBalcao} className="bg-green-600 px-4 py-2 rounded font-bold hover:bg-green-700">💰 Venda Balcão</button>
          <button onClick={abrirModalEstoque} className="bg-orange-600 px-4 py-2 rounded font-bold hover:bg-orange-700">
            📦 Estoque
            {produtosEstoqueBaixo.length > 0 && <span className="ml-2 bg-white text-orange-600 text-xs rounded-full px-2">{produtosEstoqueBaixo.length}</span>}
          </button>
          <button onClick={handleLogout} className="text-gray-300 font-bold">Sair</button>
        </div>
      </nav>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        {/* ALERTAS DE ESTOQUE */}
        {notificacoes.length > 0 && (
          <section className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                🔔 Alertas de Estoque Baixo ({notificacoes.length})
              </h3>
            </div>
            <div className="space-y-2">
              {notificacoes.slice(0, 3).map(notif => (
                <div key={notif.id_notificacao} className="bg-white p-3 rounded border border-red-200 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-red-700">{notif.mensagem}</p>
                    <p className="text-sm text-gray-500">{new Date(notif.data_criacao).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => marcarNotificacaoLida(notif.id_notificacao)} className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300">Dispensar</button>
                    <button onClick={() => { setMostrarModalEstoque(true); marcarNotificacaoLida(notif.id_notificacao); }} className="text-sm bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700">Ver Estoque</button>
                  </div>
                </div>
              ))}
            </div>
            {notificacoes.length > 3 && (
              <button onClick={abrirModalEstoque} className="mt-3 text-sm text-red-700 font-bold hover:underline">Ver todas ({notificacoes.length})</button>
            )}
          </section>
        )}

        {/* AGENDA DE HOJE */}
        <section>
          <div className="flex items-center mb-6 gap-3">
            <h2 className="text-2xl font-bold text-gray-800">📅 Agenda de Hoje</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agendamentosHoje.map(ag => {
              const temChecklist = agendamentoTemChecklist(ag.id_agendamento);
              const temOrcamento = agendamentoTemOrcamento(ag.id_agendamento);

              return (
                <CardAgendamentoNovo
                  key={ag.id_agendamento}
                  agendamento={ag}
                  aoIniciarAtendimento={() => iniciarFluxoAtendimento(ag)}
                  aoAbrirOrcamento={() => abrirOrcamentoDireto(ag)}
                  aoIniciarServico={() => iniciarServico(ag, temOrcamento)} // <--- ADICIONAR
                  aoClicarCancelar={() => solicitarCancelamento(ag)}
                  temChecklist={!!temChecklist}
                  orcamento={temOrcamento}
                />
              );
            })}
            {agendamentosHoje.length === 0 && <p className="text-gray-400">Sem agendamentos para hoje.</p>}
          </div>
        </section>

        {/* PRÓXIMOS AGENDAMENTOS */}
        <section>
          <h3 className="text-lg font-bold text-gray-600 mb-4 border-b pb-2">📆 Próximos Agendamentos</h3>
          <div className="grid grid-cols-1 gap-4">
            {agendamentosFuturos.map(ag => {
              const inicio = new Date(ag.horario_inicio);
              const fim = ag.horario_fim ? new Date(ag.horario_fim) : null;
              return (
                <div key={ag.id_agendamento} className="bg-white p-4 rounded shadow flex justify-between items-center">
                  <div>
                    <span className="font-bold">
                      {inicio.toLocaleString('pt-BR')}
                      {fim && ` - ${fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                    </span>
                    {' '}- {ag.cliente_nome} ({ag.veiculo_modelo})
                    <div className="text-sm text-blue-600">{ag.servico_descricao}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => solicitarCancelamento(ag)} className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm font-bold hover:bg-red-200">Cancelar</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SERVIÇOS FINALIZADOS */}
        <section>
          <h3 className="text-lg font-bold text-gray-600 mb-4 border-b pb-2">✅ Histórico de Serviços Finalizados</h3>
          <div className="grid grid-cols-1 gap-4">
            {agendamentosConcluidos.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nenhum serviço finalizado ainda.</p>
            ) : (
              agendamentosConcluidos.map(ag => {
                const orcamento = orcamentos.find(o => o.agendamento === ag.id_agendamento);
                const os = ordensServico.find(os => os.orcamento === orcamento?.id_orcamento);

                return (
                  <div key={ag.id_agendamento} className="bg-white p-4 rounded shadow border-l-4 border-green-500">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-gray-800">{ag.cliente_nome}</h4>
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold">✅ CONCLUÍDO</span>
                        </div>
                        <p className="text-sm text-gray-600">{ag.veiculo_modelo} - {ag.veiculo_placa}</p>
                        <p className="text-sm text-blue-600 font-bold mt-1">{ag.servico_descricao}</p>

                        {os && (
                          <div className="mt-3 bg-gray-50 p-3 rounded border">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-gray-500">Início</p>
                                <p className="font-bold">{new Date(os.data_inicio).toLocaleDateString('pt-BR')}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Conclusão</p>
                                <p className="font-bold">{os.data_conclusao ? new Date(os.data_conclusao).toLocaleDateString('pt-BR') : 'N/A'}</p>
                              </div>
                            </div>
                            {orcamento && (
                              <div className="mt-2 pt-2 border-t">
                                <p className="text-xs text-gray-500">Valor Total</p>
                                <p className="text-lg font-bold text-green-600">R$ {parseFloat(orcamento.valor_total || 0).toFixed(2)}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* MODAIS */}
      {mostrarModalCancelamento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-red-700">⚠️ Confirmar Cancelamento</h2>

            {agendamentoParaCancelar && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6 border-l-4 border-red-500">
                <p className="font-bold text-gray-800 mb-2">{agendamentoParaCancelar.cliente_nome}</p>
                <p className="text-sm text-gray-600">{agendamentoParaCancelar.veiculo_modelo} - {agendamentoParaCancelar.veiculo_placa}</p>
                <p className="text-sm text-gray-600 mt-1">📅 {new Date(agendamentoParaCancelar.horario_inicio).toLocaleString('pt-BR')}</p>
                <p className="text-sm text-blue-600 font-bold mt-2">{agendamentoParaCancelar.servico_descricao}</p>
              </div>
            )}

            <p className="text-gray-700 mb-6">
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMostrarModalCancelamento(false);
                  setAgendamentoParaCancelar(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300"
              >
                Não, Manter
              </button>
              <button
                onClick={confirmarCancelamento}
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE MONITORAMENTO DE ESTOQUE (PB12) */}
      {mostrarModalEstoque && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-5xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setMostrarModalEstoque(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            <h2 className="text-2xl font-bold mb-6 text-orange-700">📦 Monitoramento de Estoque</h2>

            <div className="flex gap-4 mb-6">
              <button onClick={() => setFiltroEstoqueBaixo(false)} className={`px-4 py-2 rounded-lg font-bold ${!filtroEstoqueBaixo ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                Todos os Produtos ({produtos.length})
              </button>
              <button onClick={() => setFiltroEstoqueBaixo(true)} className={`px-4 py-2 rounded-lg font-bold ${filtroEstoqueBaixo ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                🔴 Estoque Baixo ({produtosEstoqueBaixo.length})
              </button>
            </div>

            <div className="space-y-3">
              {produtosFiltradosEstoque.length === 0 ? (
                <p className="text-gray-400 text-center py-8">{filtroEstoqueBaixo ? '✅ Nenhum produto com estoque baixo' : 'Nenhum produto cadastrado'}</p>
              ) : (
                produtosFiltradosEstoque.map(produto => {
                  const estoqueBaixo = produto.estoque_atual < produto.estoque_minimo;
                  const percentualEstoque = (produto.estoque_atual / produto.estoque_minimo) * 100;

                  return (
                    <div key={produto.id_produto} className={`p-4 rounded-lg border-2 ${estoqueBaixo ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-800">{produto.nome}</h3>
                            {estoqueBaixo && <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-bold">⚠️ ESTOQUE BAIXO</span>}
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{produto.descricao || 'Sem descrição'}</p>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">Estoque Atual</p>
                              <p className={`text-2xl font-bold ${estoqueBaixo ? 'text-red-600' : 'text-green-600'}`}>{produto.estoque_atual} un.</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Estoque Mínimo</p>
                              <p className="text-lg font-bold text-gray-700">{produto.estoque_minimo} un.</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Fornecedor</p>
                              <p className="text-sm font-bold text-gray-700">{produto.fornecedor_nome || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div className={`h-3 rounded-full transition-all ${estoqueBaixo ? 'bg-red-600' : 'bg-green-600'}`} style={{ width: `${Math.min(percentualEstoque, 100)}%` }} />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{percentualEstoque.toFixed(0)}% do estoque mínimo</p>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-xs text-gray-500">Preço Venda</p>
                          <p className="text-lg font-bold text-green-600">R$ {parseFloat(produto.preco_venda).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 pt-4 border-t">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total de Produtos</p>
                  <p className="text-3xl font-bold text-blue-600">{produtos.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Estoque OK</p>
                  <p className="text-3xl font-bold text-green-600">{produtos.length - produtosEstoqueBaixo.length}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Estoque Baixo</p>
                  <p className="text-3xl font-bold text-red-600">{produtosEstoqueBaixo.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VENDA BALCÃO - NOVO (PB07) */}
      {mostrarModalVendaBalcao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setMostrarModalVendaBalcao(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">✕</button>

            <h2 className="text-2xl font-bold mb-6 text-green-700">💰 Venda Balcão</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PAINEL ESQUERDO: Adicionar Produtos */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="font-bold text-gray-700 mb-4">Adicionar Produto</h3>

                <input
                  type="text"
                  placeholder="🔍 Buscar produto por nome..."
                  className="w-full p-3 border rounded-lg mb-3"
                  value={buscaProduto}
                  onChange={e => setBuscaProduto(e.target.value)}
                />

                <select
                  className="w-full p-3 border rounded-lg mb-3"
                  value={produtoSelecionado}
                  onChange={e => setProdutoSelecionado(e.target.value)}
                >
                  <option value="">Selecione o produto...</option>
                  {produtosFiltrados.map(p => (
                    <option key={p.id_produto} value={p.id_produto}>
                      {p.nome} - R$ {parseFloat(p.preco_venda).toFixed(2)} (Estoque: {p.estoque_atual})
                    </option>
                  ))}
                </select>

                <div className="flex gap-3 mb-4">
                  <div className="flex-1">
                    <label className="text-sm font-bold text-gray-600">Quantidade</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full p-3 border rounded-lg mt-1"
                      value={quantidadeVenda}
                      onChange={e => setQuantidadeVenda(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={adicionarProdutoCarrinho}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>

                {produtoSelecionado && produtos.find(p => p.id_produto === parseInt(produtoSelecionado)) && (
                  <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm">
                    <p><strong>Produto:</strong> {produtos.find(p => p.id_produto === parseInt(produtoSelecionado)).nome}</p>
                    <p><strong>Estoque Disponível:</strong> {produtos.find(p => p.id_produto === parseInt(produtoSelecionado)).estoque_atual} un.</p>
                    <p><strong>Preço Unitário:</strong> R$ {parseFloat(produtos.find(p => p.id_produto === parseInt(produtoSelecionado)).preco_venda).toFixed(2)}</p>
                  </div>
                )}
              </div>

              {/* PAINEL DIREITO: Carrinho */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-bold text-gray-700 mb-4">🛒 Carrinho ({carrinhoVenda.length} itens)</h3>

                {carrinhoVenda.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Carrinho vazio</p>
                ) : (
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {carrinhoVenda.map(item => (
                      <div key={item.produto.id_produto} className="flex justify-between items-center bg-gray-50 p-3 rounded border">
                        <div className="flex-1">
                          <p className="font-bold text-gray-800">{item.produto.nome}</p>
                          <p className="text-sm text-gray-600">
                            {item.quantidade} x R$ {parseFloat(item.produto.preco_venda).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-green-600">
                            R$ {(parseFloat(item.produto.preco_venda) * item.quantidade).toFixed(2)}
                          </span>
                          <button
                            onClick={() => removerDoCarrinho(item.produto.id_produto)}
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold text-gray-700">TOTAL:</span>
                    <span className="text-3xl font-bold text-green-600">R$ {calcularTotal()}</span>
                  </div>

                  <button
                    onClick={finalizarVenda}
                    disabled={carrinhoVenda.length === 0}
                    className="w-full bg-green-600 text-white font-bold py-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg"
                  >
                    ✅ Finalizar Venda
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* MODAL ORÇAMENTO COMPLETO - COM ADIÇÃO DE PEÇAS */}
      {mostrarModalOrcamento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setMostrarModalOrcamento(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">✕</button>

            <h2 className="text-2xl font-bold mb-6 text-orange-700">📝 Criar Orçamento</h2>

            <form onSubmit={handleCriaOrcamento} className="flex flex-col gap-6">
              {/* INFORMAÇÕES DO AGENDAMENTO */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-bold text-blue-800 mb-3">📋 Informações do Agendamento</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Cliente</p>
                    <p className="font-bold text-gray-800">{clientes.find(c => c.id_cliente === novoOrcamento.cliente)?.nome || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Veículo</p>
                    <p className="font-bold text-gray-800">{veiculosDoCliente.find(v => v.id_veiculo === novoOrcamento.veiculo)?.modelo || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Defeito Relatado</p>
                    <p className="text-gray-700">{checklistCriado?.possivel_defeito || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* ITENS DO ORÇAMENTO */}
              <div className="border rounded-lg p-4">
                <h3 className="font-bold text-gray-700 mb-4">🔧 Itens do Orçamento</h3>

                {/* LISTA DE ITENS */}
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  {itensOrcamento.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">Nenhum item adicionado</p>
                  ) : (
                    itensOrcamento.map((item, index) => (
                      <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded border">
                        <div className="flex-1">
                          <p className="font-bold text-gray-800">
                            {item.tipo === 'servico' ? '🔧' : '🔩'} {item.produto_nome}
                          </p>
                          <p className="text-sm text-gray-600">
                            {item.quantidade} x R$ {item.valor_unitario.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-green-600">
                            R$ {(item.quantidade * item.valor_unitario).toFixed(2)}
                          </span>
                          {item.tipo === 'produto' && (
                            <button
                              type="button"
                              onClick={() => removerItemOrcamento(index)}
                              className="text-red-500 hover:text-red-700 font-bold"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* ADICIONAR PEÇA/PRODUTO */}
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="font-bold text-orange-800 mb-3">➕ Adicionar Peça/Produto</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <select
                        className="w-full p-2 border rounded"
                        value={produtoOrcamento}
                        onChange={e => setProdutoOrcamento(e.target.value)}
                      >
                        <option value="">Selecione uma peça...</option>
                        {produtos.map(p => (
                          <option key={p.id_produto} value={p.id_produto}>
                            {p.nome} - R$ {parseFloat(p.preco_venda).toFixed(2)} (Estoque: {p.estoque_atual})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-2 border rounded"
                        placeholder="Qtd"
                        value={quantidadeOrcamento}
                        onChange={e => setQuantidadeOrcamento(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={adicionarItemOrcamento}
                    className="w-full bg-orange-600 text-white font-bold py-2 rounded mt-3 hover:bg-orange-700"
                  >
                    ➕ Adicionar Peça
                  </button>
                </div>
              </div>

              {/* DESCRIÇÃO ADICIONAL */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Observações / Detalhes do Serviço
                </label>
                <textarea
                  className="w-full p-3 border rounded-lg h-24"
                  placeholder="Adicione observações adicionais sobre o serviço..."
                  value={novoOrcamento.descricao}
                  onChange={e => setNovoOrcamento({ ...novoOrcamento, descricao: e.target.value })}
                />
              </div>

              {/* VALIDADE */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Data de Validade do Orçamento
                </label>
                <input
                  type="date"
                  className="w-full p-3 border rounded-lg"
                  value={novoOrcamento.validade}
                  onChange={e => setNovoOrcamento({ ...novoOrcamento, validade: e.target.value })}
                  required
                />
              </div>

              {/* TOTAL */}
              <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Valor Total do Orçamento</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {itensOrcamento.filter(i => i.tipo === 'servico').length} serviço(s) + {itensOrcamento.filter(i => i.tipo === 'produto').length} peça(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-bold text-green-600">
                      R$ {calcularTotalOrcamento().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* BOTÕES */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMostrarModalOrcamento(false)}
                  className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 shadow-md"
                  disabled={itensOrcamento.length === 0}
                >
                  📤 Enviar Orçamento ao Cliente
                </button>
              </div>
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
              {/* Mecânico Responsável - TRAVADO */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Mecânico Responsável
                </label>
                <div className="w-full p-3 bg-blue-50 border-2 border-blue-300 rounded-lg font-bold text-blue-800">
                  {mecanicos.find(m => m.id_mecanico === parseInt(novoAgendamento.mecanico))?.nome || 'Carregando...'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  ✓ Você está criando este agendamento
                </p>
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
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              {/* Valor Estimado */}
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

      {/* MODAL ATUALIZAR STATUS DA OS */}
      {mostrarModalOS && osAtual && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl relative">
            <button onClick={() => setMostrarModalOS(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">✕</button>

            <h2 className="text-2xl font-bold mb-6 text-blue-700">🔧 Ordem de Serviço #{osAtual.id_os}</h2>

            <form onSubmit={atualizarStatusOS} className="flex flex-col gap-6">
              {/* INFORMAÇÕES DA OS */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-bold text-blue-800 mb-3">Informações do Serviço</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Status Atual</p>
                    <p className="font-bold text-gray-800">
                      {osAtual.status === 'AGUARDANDO_INICIO' ? '⏸️ Aguardando Início' : osAtual.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Data de Criação</p>
                    <p className="font-bold text-gray-800">{new Date(osAtual.data_inicio).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </div>

              {/* ATUALIZAR STATUS */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Atualizar Status *
                </label>
                <select
                  className="w-full p-3 border rounded-lg"
                  value={novoStatusOS}
                  onChange={e => setNovoStatusOS(e.target.value)}
                  required
                >
                  <option value="AGUARDANDO_INICIO">⏸️ Aguardando Início</option>
                  <option value="EM_ANDAMENTO">🔄 Em Andamento</option>
                  <option value="AGUARDANDO_PECAS">⏳ Aguardando Peça</option>
                  <option value="CONCLUIDA">✅ Concluído</option>
                  <option value="CANCELADA">❌ Cancelado</option>
                </select>
              </div>

              {/* OBSERVAÇÕES */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Observações sobre a Atualização
                </label>
                <textarea
                  className="w-full p-3 border rounded-lg h-24"
                  placeholder="Ex: Iniciando diagnóstico do motor..."
                  value={observacoesOS}
                  onChange={e => setObservacoesOS(e.target.value)}
                />
              </div>

              {/* BOTÕES */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMostrarModalOS(false)}
                  className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700"
                >
                  {novoStatusOS === 'CONCLUIDA' ? '✅ Finalizar Serviço' : '🔄 Atualizar Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO DE CONCLUSÃO */}
      {mostrarConfirmacaoConclusao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-green-700">🎉 Confirmar Conclusão do Serviço</h2>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Atenção:</strong> Ao confirmar, o serviço será marcado como <strong>CONCLUIDO</strong> e o agendamento será finalizado.
              </p>
            </div>

            <p className="text-gray-700 mb-6">
              Tem certeza que deseja finalizar este serviço?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setMostrarConfirmacaoConclusao(false)}
                className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarConclusao}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700"
              >
                ✅ Sim, Finalizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTANTE DOS MODAIS (manter iguais) */}
      {/* ... */}
    </div>
  );
}

function CardAgendamento({ agendamento, aoClicarGerarOS, aoClicarChecklist, aoClicarCancelar }) {
  const dataInicio = new Date(agendamento.horario_inicio);
  const dataFim = agendamento.horario_fim ? new Date(agendamento.horario_fim) : null;

  const horaInicio = dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const horaFim = dataFim ? dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '?';
  const diaMes = dataInicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return (
    <div className="bg-white p-4 shadow-md rounded-lg border-l-4 border-blue-500 flex flex-col justify-between h-full hover:shadow-lg transition-shadow">
      <div>
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="text-2xl font-bold text-gray-800">{horaInicio}</span>
            {dataFim && (
              <span className="text-sm text-gray-500 ml-1">até {horaFim}</span>
            )}
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

      <div className="flex flex-col gap-2">
        <button onClick={aoClicarChecklist} className="w-full bg-purple-50 text-purple-700 border border-purple-200 py-2 rounded font-bold text-sm hover:bg-purple-100 transition-colors">
          📋 Check List de Entrada
        </button>
        <button onClick={aoClicarGerarOS} className="w-full bg-orange-50 text-orange-700 border border-orange-200 py-2 rounded font-bold text-sm hover:bg-orange-100 transition-colors">
          📝 Gerar OS / Orçamento
        </button>
        <button onClick={aoClicarCancelar} className="w-full bg-red-50 text-red-700 border border-red-200 py-2 rounded font-bold text-sm hover:bg-red-100 transition-colors">
          ❌ Cancelar Agendamento
        </button>
      </div>
    </div>
  );
}

function CardAgendamentoNovo({ agendamento, aoIniciarAtendimento, aoAbrirOrcamento, aoIniciarServico, aoClicarCancelar, temChecklist, orcamento }) {
  const dataInicio = new Date(agendamento.horario_inicio);
  const dataFim = agendamento.horario_fim ? new Date(agendamento.horario_fim) : null;

  const horaInicio = dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const horaFim = dataFim ? dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '?';
  const diaMes = dataInicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  // ✅ ADICIONAR VERIFICAÇÃO DE STATUS CONCLUIDO
  const estaConcluido = agendamento.status === 'CONCLUIDO';

  const statusFluxo = estaConcluido
    ? 'CONCLUIDO'  // <--- NOVO
    : orcamento
      ? orcamento.status
      : (temChecklist ? 'CHECKLIST_FEITO' : 'AGUARDANDO_CHECKLIST');

  return (
    <div className={`bg-white p-4 shadow-md rounded-lg border-l-4 ${estaConcluido ? 'border-green-500' : 'border-blue-500'} flex flex-col justify-between h-full hover:shadow-lg transition-shadow`}>
      <div>
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="text-2xl font-bold text-gray-800">{horaInicio}</span>
            {dataFim && (
              <span className="text-sm text-gray-500 ml-1">até {horaFim}</span>
            )}
            <span className="text-xs text-gray-400 ml-2 block">{diaMes}</span>
          </div>
          <span className={`text-xs px-2 py-1 rounded font-bold ${estaConcluido
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-600'
            }`}>
            {estaConcluido ? '✅ CONCLUÍDO' : agendamento.status}
          </span>
        </div>
        <div className="mb-3">
          <h4 className="font-bold text-gray-900">{agendamento.cliente_nome}</h4>
          <div className="text-gray-500 text-sm truncate">{agendamento.veiculo_modelo} - {agendamento.veiculo_placa}</div>
        </div>
        <div className="text-sm text-blue-600 font-semibold uppercase mb-4 tracking-wide border-t pt-2 border-gray-100">
          {agendamento.servico_descricao}
        </div>

        {/* INDICADORES DE STATUS */}
        {!estaConcluido && ( // <--- SÓ MOSTRAR SE NÃO ESTIVER CONCLUÍDO
          <div className="space-y-2 mb-4">
            {/* Checklist */}
            {temChecklist && (
              <div className="bg-green-50 border border-green-200 rounded p-2 flex items-center gap-2">
                <span className="text-green-600">✅</span>
                <p className="text-xs text-green-700 font-bold">Check List Preenchido</p>
              </div>
            )}

            {/* Orçamento */}
            {orcamento && (
              <div className={`border rounded p-2 flex items-center gap-2 ${orcamento.status === 'PENDENTE'
                ? 'bg-yellow-50 border-yellow-200'
                : orcamento.status === 'APROVADO'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
                }`}>
                <span className={
                  orcamento.status === 'PENDENTE'
                    ? 'text-yellow-600'
                    : orcamento.status === 'APROVADO'
                      ? 'text-green-600'
                      : 'text-red-600'
                }>
                  {orcamento.status === 'PENDENTE' ? '⏳' : orcamento.status === 'APROVADO' ? '✅' : '❌'}
                </span>
                <div className="flex-1">
                  <p className={`text-xs font-bold ${orcamento.status === 'PENDENTE'
                    ? 'text-yellow-700'
                    : orcamento.status === 'APROVADO'
                      ? 'text-green-700'
                      : 'text-red-700'
                    }`}>
                    {orcamento.status === 'PENDENTE'
                      ? `Orçamento #${orcamento.id_orcamento} - Aguardando Cliente`
                      : orcamento.status === 'APROVADO'
                        ? `Orçamento #${orcamento.id_orcamento} - Aprovado`
                        : `Orçamento #${orcamento.id_orcamento} - Rejeitado`
                    }
                  </p>
                  {orcamento.status === 'PENDENTE' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Valor: R$ {parseFloat(orcamento.valor_total || 0).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {/* ✅ ADICIONAR CASO CONCLUÍDO */}
        {statusFluxo === 'CONCLUIDO' && (
          <div className="w-full bg-green-100 border-2 border-green-400 text-green-800 py-3 rounded-lg font-bold text-sm text-center">
            🎉 Serviço Concluído
          </div>
        )}

        {statusFluxo === 'AGUARDANDO_CHECKLIST' && !estaConcluido && (
          <button
            onClick={aoIniciarAtendimento}
            className="w-full bg-green-50 text-green-700 border border-green-200 py-2 rounded font-bold text-sm hover:bg-green-100 transition-colors"
          >
            🚀 Iniciar Atendimento
          </button>
        )}

        {statusFluxo === 'CHECKLIST_FEITO' && !estaConcluido && (
          <button
            onClick={aoAbrirOrcamento}
            className="w-full bg-orange-50 text-orange-700 border border-orange-200 py-2 rounded font-bold text-sm hover:bg-orange-100 transition-colors"
          >
            📝 Gerar Orçamento
          </button>
        )}

        {statusFluxo === 'PENDENTE' && !estaConcluido && (
          <div className="w-full bg-yellow-50 text-yellow-700 border border-yellow-200 py-2 rounded font-bold text-sm text-center">
            ⏳ Aguardando Aprovação
          </div>
        )}

        {statusFluxo === 'APROVADO' && !estaConcluido && (
          <button
            onClick={aoIniciarServico}
            className="w-full bg-blue-50 text-blue-700 border border-blue-200 py-2 rounded font-bold text-sm hover:bg-blue-100 transition-colors"
          >
            🔧 Iniciar Serviço
          </button>
        )}

        {statusFluxo === 'REJEITADO' && !estaConcluido && (
          <button
            onClick={aoAbrirOrcamento}
            className="w-full bg-orange-50 text-orange-700 border border-orange-200 py-2 rounded font-bold text-sm hover:bg-orange-100 transition-colors"
          >
            📝 Criar Novo Orçamento
          </button>
        )}

        {!estaConcluido && ( // <--- SÓ PERMITIR CANCELAR SE NÃO ESTIVER CONCLUÍDO
          <button
            onClick={aoClicarCancelar}
            className="w-full bg-red-50 text-red-700 border border-red-200 py-2 rounded font-bold text-sm hover:bg-red-100 transition-colors"
          >
            ❌ Cancelar Agendamento
          </button>
        )}
      </div>
    </div>
  );
}

export default DashboardMecanico;