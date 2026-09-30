import axios from 'axios'

// Meme origine que la page (le proxy Vite redirige /api et /sanctum vers Laravel)
const api = axios.create({
  baseURL: '/',
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

export default api
