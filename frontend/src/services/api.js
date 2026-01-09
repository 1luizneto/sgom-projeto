import axios from 'axios';

const api = axios.create({
    // CORREÇÃO: Certifique-se de que tem 'http://' no início
    baseURL: 'http://127.0.0.1:8000/api/', 
});

export default api;