import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
});

// Interceptor para adicionar token dinamicamente
api.interceptors.request.use((config) => {
  const rotasPublicas = ['/mecanicos/', '/clientes/', '/fornecedores/', '/token/', '/token/refresh/'];
  const ehRotaPublica = rotasPublicas.some(rota => config.url?.includes(rota));

  if (!ehRotaPublica) {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor para renovar token expirado
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se erro 401 e não é a rota de token
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/token/')) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');

        if (refreshToken) {
          // Tenta renovar o token
          const response = await axios.post('http://127.0.0.1:8000/api/token/refresh/', {
            refresh: refreshToken
          });

          const newToken = response.data.access;
          localStorage.setItem('token', newToken);

          // Refaz a requisição com o novo token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Se falhar, desloga o usuário
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);

export default api;