import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function CadastroUnificado() {
  const [tipoUsuario, setTipoUsuario] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formData, setFormData] = useState({});
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  // --- 1. FUNÇÕES LÓGICAS (Definidas antes de serem usadas) ---
  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAvancar = () => {
    if (tipoUsuario) {
      setMsg('');
      setMostrarFormulario(true);
    } else {
      setMsg('Por favor, selecione um tipo de cadastro.');
    }
  };

  const handleVoltar = () => {
    setMostrarFormulario(false);
    setMsg('');
    setFormData({});
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

  // --- 2. RENDERIZAÇÃO DOS CAMPOS ---
  const renderCampos = () => {
    if (tipoUsuario === 'fornecedor') {
      return (
        <>
          <input
            name="nome"
            placeholder="Razão Social / Nome da Empresa"
            onChange={handleChange}
            className="w-full mb-3 px-3 py-2 border rounded"
            required
          />
          <input
            name="cnpj"
            placeholder="CNPJ (00.000.000/0000-00)"
            onChange={handleChange}
            className="w-full mb-3 px-3 py-2 border rounded"
            required
          />
          <input
            name="telefone"
            placeholder="Telefone Comercial"
            onChange={handleChange}
            className="w-full mb-3 px-3 py-2 border rounded"
            required
          />
          <input
            name="email"
            type="email"
            placeholder="Email Comercial (Opcional)"
            onChange={handleChange}
            className="w-full mb-3 px-3 py-2 border rounded"
          />
          <textarea
            name="endereco"
            placeholder="Endereço da Empresa"
            onChange={handleChange}
            className="w-full mb-3 px-3 py-2 border rounded"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Senha de Acesso ao Sistema"
            onChange={handleChange}
            className="w-full mb-4 px-3 py-2 border rounded"
            required
          />
        </>
      );
    }

    // Campos comuns para Cliente/Mecanico/Gerente
    return (
      <>
        <input name="nome" placeholder="Nome Completo" onChange={handleChange} className="w-full mb-3 px-3 py-2 border rounded" required />
        <input name="cpf" placeholder="CPF" onChange={handleChange} className="w-full mb-3 px-3 py-2 border rounded" required />
        <input name="email" type="email" placeholder="Email" onChange={handleChange} className="w-full mb-3 px-3 py-2 border rounded" required />
        <input name="telefone" placeholder="Telefone" onChange={handleChange} className="w-full mb-3 px-3 py-2 border rounded" required />
        <textarea name="endereco" placeholder="Endereço" onChange={handleChange} className="w-full mb-3 px-3 py-2 border rounded" required />
        <input name="password" type="password" placeholder="Crie sua Senha" onChange={handleChange} className="w-full mb-4 px-3 py-2 border rounded" required />
      </>
    );
  };

  // --- 3. RETURN PRINCIPAL ---
  if (!mostrarFormulario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-6 text-gray-700">Novo Cadastro</h2>
          {msg && <div className="bg-yellow-100 text-yellow-700 p-2 rounded mb-4 text-sm">{msg}</div>}
          <div className="mb-6 text-left">
            <label className="block text-gray-700 text-sm font-bold mb-2">Selecione o tipo de conta:</label>
            <select value={tipoUsuario} onChange={(e) => setTipoUsuario(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="" disabled>Selecione uma opção...</option>
              <option value="cliente">Cliente</option>
              <option value="mecanico">Mecânico</option>
              <option value="fornecedor">Fornecedor</option>
              <option value="gerente">Gerente</option>
            </select>
          </div>
          <button onClick={handleAvancar} disabled={!tipoUsuario} className={`w-full font-bold py-2 px-4 rounded transition duration-300 ${tipoUsuario ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>Continuar</button>
          <p className="mt-6"><Link to="/" className="text-blue-600 hover:underline">Já tenho conta (Login)</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md relative">
        <div className="flex items-center mb-6">
          <button onClick={handleVoltar} className="mr-3 p-2 rounded-full hover:bg-gray-100 text-gray-600 transition" title="Voltar">
            <span className="text-xl font-bold">&larr;</span>
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Cadastro de {tipoUsuario.charAt(0).toUpperCase() + tipoUsuario.slice(1)}</h2>
        </div>
        {msg && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-xs break-all">{msg}</div>}
        <form onSubmit={handleSubmit}>
          {renderCampos()}
          <button type="submit" className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 transition duration-300 mt-4">Confirmar Cadastro</button>
        </form>
      </div>
    </div>
  );
}

export default CadastroUnificado;