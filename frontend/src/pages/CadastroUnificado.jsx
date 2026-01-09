import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function CadastroUnificado() {
  // Estado para armazenar o tipo selecionado no dropdown
  const [tipoUsuario, setTipoUsuario] = useState('');

  // Estado para controlar se mostra o formulário ou a seleção
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [formData, setFormData] = useState({});
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  // Função para avançar para o formulário
  const handleAvancar = () => {
    if (tipoUsuario) {
      setMsg(''); // Limpa mensagens antigas
      setMostrarFormulario(true);
    } else {
      setMsg('Por favor, selecione um tipo de cadastro.');
    }
  };

  // Função para voltar para o dropdown
  const handleVoltar = () => {
    setMostrarFormulario(false);
    setMsg('');
    setFormData({}); // Opcional: limpar dados se quiser resetar o form
  };

  const getCampos = () => {
    // Campos comuns (quase todos têm)
    const comum = (
      <>
        <input name="nome" placeholder="Nome Completo" onChange={handleChange} className="w-full mb-3 px-3 py-2 border rounded" required />
        <input name="cpf" placeholder="CPF" onChange={handleChange} className="w-full mb-3 px-3 py-2 border rounded" required />
        <input name="email" type="email" placeholder="Email" onChange={handleChange} className="w-full mb-3 px-3 py-2 border rounded" required />
        <input name="telefone" placeholder="Telefone" onChange={handleChange} className="w-full mb-3 px-3 py-2 border rounded" required />
        <textarea name="endereco" placeholder="Endereço" onChange={handleChange} className="w-full mb-3 px-3 py-2 border rounded" required />
        <input name="password" type="password" placeholder="Crie sua Senha" onChange={handleChange} className="w-full mb-4 px-3 py-2 border rounded" required />
      </>
    );

    switch (tipoUsuario) {
      case 'fornecedor':
        return (
          <>
            <input name="nome_fantasia" placeholder="Nome Fantasia" onChange={handleChange} className="w-full mb-3 px-3 py-2 border rounded" required />
            <input name="cnpj" placeholder="CNPJ" onChange={handleChange} className="w-full mb-3 px-3 py-2 border rounded" required />
            <input name="email" type="email" placeholder="Email Comercial" onChange={handleChange} className="w-full mb-3 px-3 py-2 border rounded" required />
            <input name="telefone" placeholder="Telefone Comercial" onChange={handleChange} className="w-full mb-3 px-3 py-2 border rounded" required />
            <textarea name="endereco" placeholder="Endereço da Empresa" onChange={handleChange} className="w-full mb-3 px-3 py-2 border rounded" required />
            <input name="password" type="password" placeholder="Senha de Acesso" onChange={handleChange} className="w-full mb-4 px-3 py-2 border rounded" required />
          </>
        );
      case 'gerente':
        return comum;
      default:
        return comum;
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');

    let endpoint = '';
    if (tipoUsuario === 'mecanico') endpoint = 'mecanicos/';
    else if (tipoUsuario === 'cliente') endpoint = 'clientes/';
    else if (tipoUsuario === 'fornecedor') endpoint = 'fornecedores/';
    else if (tipoUsuario === 'gerente') endpoint = 'gerentes/';

    if (!endpoint) return;

    try {
      await api.post(endpoint, formData);
      alert(`${tipoUsuario.charAt(0).toUpperCase() + tipoUsuario.slice(1)} cadastrado com sucesso!`);
      navigate('/');
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        setMsg(`Erro: ${JSON.stringify(err.response.data)}`);
      } else {
        setMsg('Erro ao cadastrar.');
      }
    }
  };

  // --- RENDERIZAÇÃO ---

  // FASE 1: Seleção do Tipo (Dropdown)
  if (!mostrarFormulario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-6 text-gray-700">Novo Cadastro</h2>

          {msg && <div className="bg-yellow-100 text-yellow-700 p-2 rounded mb-4 text-sm">{msg}</div>}

          <div className="mb-6 text-left">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Selecione o tipo de conta:
            </label>
            <select
              value={tipoUsuario}
              onChange={(e) => setTipoUsuario(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="" disabled>Selecione uma opção...</option>
              <option value="cliente">Cliente</option>
              <option value="mecanico">Mecânico</option>
              <option value="fornecedor">Fornecedor</option>
              <option value="gerente">Gerente</option>
            </select>
          </div>

          <button
            onClick={handleAvancar}
            disabled={!tipoUsuario}
            className={`w-full font-bold py-2 px-4 rounded transition duration-300 ${tipoUsuario
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
          >
            Continuar
          </button>

          <p className="mt-6">
            <Link to="/" className="text-blue-600 hover:underline">Já tenho conta (Login)</Link>
          </p>
        </div>
      </div>
    );
  }

  // FASE 2: Formulário de Cadastro
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md relative">

        {/* Header com Botão Voltar */}
        <div className="flex items-center mb-6">
          <button
            onClick={handleVoltar}
            className="mr-3 p-2 rounded-full hover:bg-gray-100 text-gray-600 transition"
            title="Voltar para seleção"
          >
            {/* Ícone de Seta (SVG) */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Cadastro de {tipoUsuario.charAt(0).toUpperCase() + tipoUsuario.slice(1)}
          </h2>
        </div>

        {msg && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-xs break-all">{msg}</div>}

        <form onSubmit={handleSubmit}>
          {getCampos()}

          <button type="submit" className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 transition duration-300 mt-2">
            Confirmar Cadastro
          </button>
        </form>
      </div>
    </div>
  );
}

export default CadastroUnificado;