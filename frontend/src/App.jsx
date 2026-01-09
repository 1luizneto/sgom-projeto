import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import CadastroUnificado from './pages/CadastroUnificado'; // Nova tela única

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        {/* Rota única para todos os cadastros */}
        <Route path="/cadastro" element={<CadastroUnificado />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;