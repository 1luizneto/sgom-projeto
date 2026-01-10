import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import CadastroUnificado from './pages/CadastroUnificado';
import DashboardMecanico from './pages/DashboardMecanico'; // <--- Importe aqui

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/cadastro" element={<CadastroUnificado />} />
        {/* Nova Rota Protegida */}
        <Route path="/dashboard-mecanico" element={<DashboardMecanico />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;