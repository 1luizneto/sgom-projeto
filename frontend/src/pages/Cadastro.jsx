import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function Cadastro() {
  const [formData, setFormData] = useState({
    nome: '',       // Antes era username
    email: '',
    cpf: '',
    telefone: '',   // Novo campo obrigatório no backend
    endereco: '',
    password: '' // Removido pois seu serializer atual não trata senha/login
  });
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(''); // Limpa mensagens anteriores
    try {
      // Envia os dados para o endpoint de mecânicos
      await api.post('mecanicos/', formData);
      alert('Mecânico cadastrado com sucesso!');
      navigate('/');
    } catch (err) {
      console.error("Erro no cadastro:", err.response ? err.response.data : err.message);
      
      // Mostra mensagem mais amigável se possível
      if (err.response && err.response.data) {
        // Pega a primeira mensagem de erro que encontrar
        const firstErrorKey = Object.keys(err.response.data)[0];
        const errorMessage = err.response.data[firstErrorKey];
        setMsg(`Erro em ${firstErrorKey}: ${errorMessage}`);
      } else {
        setMsg('Erro ao cadastrar. Verifique a conexão.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-green-600">Novo Mecânico</h2>
        
        {msg && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{msg}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input 
              name="nome" 
              placeholder="Nome Completo" 
              onChange={handleChange} 
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500" 
              required
            />
          </div>

          <div className="mb-3">
            <input 
              name="cpf" 
              placeholder="CPF (apenas números)" 
              onChange={handleChange} 
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500" 
              required
            />
          </div>

          <div className="mb-3">
            <input 
              name="email" 
              type="email" 
              placeholder="Email" 
              onChange={handleChange} 
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500" 
              required
            />
          </div>

          <div className="mb-3">
            <input 
              name="telefone" 
              placeholder="Telefone" 
              onChange={handleChange} 
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500" 
              required
            />
          </div>
          
          <div className="mb-4">
            <textarea 
              name="endereco" 
              placeholder="Endereço Completo" 
              onChange={handleChange} 
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div className="mb-4">
            <input 
              name="password" 
              type="password"
              placeholder="Senha" 
              onChange={handleChange} 
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 transition duration-300"
          >
            Cadastrar
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          <Link to="/" className="text-green-600 hover:underline">Voltar para Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Cadastro;