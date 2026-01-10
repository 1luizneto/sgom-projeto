import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function DashboardMecanico() {
  const [servicos, setServicos] = useState([]);
  const [novoServico, setNovoServico] = useState({ descricao: '', preco_base: '' });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  //
  // Buscar serviços carregados ao abrir a tela 
  useEffect(() => {
    carregarServicos();
  }, []);

  const carregarServicos = async () => {
    try {
      // Ajuste o endpoint conforme configurado no backend (urls.py da oficina)
      const response = await api.get('servicos/');
      setServicos(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Erro ao buscar serviços:", err);
      setLoading(false);
      // Se der erro de autenticação (401), volta pro login
      if (err.response && err.response.status === 401) {
        navigate('/');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Envia o novo serviço para o backend
      await api.post('servicos/', novoServico);
      alert('Serviço adicionado com sucesso!');
      setNovoServico({ descricao: '', preco_base: '' }); // Limpa o form
      carregarServicos(); // Recarrega a lista
    } catch (err) {
      console.error("Erro ao criar serviço:", err);
      alert('Erro ao cadastrar serviço.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar do Mecânico */}
      <nav className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold">Painel do Mecânico</h1>
        <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-sm font-bold">
          Sair
        </button>
      </nav>

      <div className="container mx-auto p-6">

        {/* Formulário de Cadastro de Serviço (PB06) */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-lg font-bold mb-4 text-gray-700">Adicionar Serviço Realizado</h2>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-600 mb-1">Descrição do Serviço</label>
              <input
                type="text"
                placeholder="Ex: Troca de Pastilha de Freio"
                value={novoServico.descricao}
                onChange={(e) => setNovoServico({ ...novoServico, descricao: e.target.value })}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="w-full md:w-40">
              <label className="block text-sm font-bold text-gray-600 mb-1">Preço (R$)</label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={novoServico.preco_base}
                onChange={(e) => setNovoServico({ ...novoServico, preco_base: e.target.value })}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="bg-green-600 text-white font-bold py-2 px-6 rounded hover:bg-green-700 h-10 w-full md:w-auto">
                Adicionar
              </button>
            </div>
          </form>
        </div>

        {/* Lista de Serviços (Para verificação) */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-200 p-4 border-b">
            <h2 className="text-lg font-bold text-gray-700">Histórico de Serviços</h2>
          </div>

          {loading ? (
            <p className="p-4 text-center">Carregando...</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm uppercase">
                  <th className="p-4 border-b">ID</th>
                  <th className="p-4 border-b">Descrição</th>
                  <th className="p-4 border-b">Preço</th>
                  <th className="p-4 border-b text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {servicos.length > 0 ? (
                  servicos.map((servico) => (
                    <tr key={servico.id} className="hover:bg-gray-50 border-b">
                      <td className="p-4 text-gray-500">#{servico.id}</td>
                      <td className="p-4 font-medium">{servico.descricao}</td>
                      <td className="p-4 text-green-600 font-bold">
                        R$ {parseFloat(servico.preco_base).toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                          Cadastrado
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-6 text-center text-gray-500">
                      Nenhum serviço cadastrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

export default DashboardMecanico;