import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg('');

    try {
      // Ajuste a URL se seu endpoint de token for diferente (ex: 'token/', 'login/')
      // Geralmente em JWT é 'api/token/' ou customizado
      const response = await api.post('token/', { username, password });

      // Salva o token no localStorage para as próximas requisições
      localStorage.setItem('token', response.data.access);

      // Lógica simples de redirecionamento (Idealmente o backend retornaria o 'tipo' do usuário)
      // Por enquanto, vamos assumir que logou e jogar pro Dashboard
      // No futuro, podemos decodificar o token ou pedir '/me' para saber se é mecânico ou cliente
      navigate('/dashboard-mecanico');

    } catch (err) {
      console.error(err);
      setMsg('Login falhou. Verifique usuário e senha.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Acesso ao Sistema</h2>

        {msg && <div className="bg-red-100 text-red-700 p-2 text-sm rounded mb-4">{msg}</div>}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Login (Email/CPF)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition">
            Entrar
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Não tem conta? <Link to="/cadastro" className="text-blue-600 hover:underline">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;