import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Login() {
  const [username, setUsername] = useState(''); // O Django espera 'username' no JSON
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // Essa variável faltava antes
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Limpa erros antigos

    try {
      // Envia os dados para o backend
      const response = await api.post('token/', {
        username: username,
        password: password
      });

      // Extrai os dados da resposta
      const { access, refresh, is_mecanico, user_name, is_cliente, is_admin } = response.data;

      // Salva no LocalStorage
      localStorage.setItem('token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user_name', user_name || username);

      // Configura o cabeçalho padrão para as próximas requisições
      api.defaults.headers.Authorization = `Bearer ${access}`;

      // --- REDIRECIONAMENTO INTELIGENTE ---
      if (is_mecanico) {
        console.log("Login: Mecânico detectado.");
        navigate('/dashboard');
      } else if (is_cliente) {
        console.log("Login: Cliente detectado.");
        navigate('/home');
      }
      else if (is_admin) {
        console.log("Login: Admin detectado.");
        navigate('/dashboard-admin');
      }
      else {
        navigate('/fornecedor');
      }

    } catch (err) {
      console.error("Erro no login:", err);
      if (err.response && err.response.status === 401) {
        setError('Usuário ou senha incorretos.');
      } else {
        setError('Erro ao conectar ao servidor. Tente novamente.');
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded shadow-md">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
          Entrar na Oficina
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-gray-700">
              E-mail ou CPF
            </label>
            <input
              type="text"
              className="w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Digite seu e-mail"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-bold text-gray-700">
              Senha
            </label>
            <input
              type="password"
              className="w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="w-full rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Entrar
            </button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <a href="/cadastro" className="text-sm text-blue-600 hover:underline">
            Não tem conta? Cadastre-se
          </a>
        </div>
      </div>
    </div>
  );
}

export default Login;