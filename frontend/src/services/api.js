import axios from 'axios';

const api = axios.create({
  // Garanta que a porta é a mesma do seu backend (8000)
  baseURL: 'http://127.0.0.1:8000/api/',
});

// INTERCEPTOR DE REQUISIÇÃO
// Antes de enviar qualquer pedido ao backend, esse código roda:
api.interceptors.request.use((config) => {
  // 1. Pega o token salvo no login
  const token = localStorage.getItem('token');
  
  // 2. Se o token existir, adiciona o cabeçalho Authorization
  if (token) {
    // O padrão JWT é "Bearer <token>"
    config.headers.Authorization = `Bearer ${token}`; 

    // Se a requisição for para criar serviços, garantir que é JSON
    // (Opcional, mas ajuda a evitar erros 415)
    // if (!config.headers['Content-Type']) {
    //    config.headers['Content-Type'] = 'application/json';
    // }
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;