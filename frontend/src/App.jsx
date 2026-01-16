import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardMecanico from './pages/DashboardMecanico';
import CadastroUnificado from './pages/CadastroUnificado';
import HomeCliente from './pages/HomeCliente';
import DashboardFornecedor from './pages/DashboardFornecedor';
import DashboardAdmin from './pages/DashboardAdmin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Rota exclusiva do Mecânico */}
        <Route path="/dashboard" element={<DashboardMecanico />} />
        
        {/* Rota do Cliente */}
        <Route path="/home" element={<HomeCliente />} />

        {/* Rota do Cadastro */}
        <Route path="/cadastro" element={<CadastroUnificado />} />

        <Route path="/fornecedor" element={<DashboardFornecedor />} />
        <Route path="/dashboard-admin" element={<DashboardAdmin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;