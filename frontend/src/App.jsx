import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardMecanico from './pages/DashboardMecanico';
import CadastroUnificado from './pages/CadastroUnificado';

// Crie uma Home simples ou importe se tiver
const HomeCliente = () => <div className="p-10"><h1>Área do Cliente (Em desenvolvimento)</h1></div>; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Rota exclusiva do Mecânico */}
        <Route path="/dashboard" element={<DashboardMecanico />} />
        
        {/* Rota do Cliente */}
        <Route path="/home" element={<HomeCliente />} />

        {/* Rota do Cadastri */}
        <Route path="/cadastro" element={<CadastroUnificado />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;