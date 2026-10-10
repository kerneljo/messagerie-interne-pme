import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import api from './api'

window.Pusher = Pusher

const echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: Number(import.meta.env.VITE_REVERB_PORT) || 80,
  wssPort: Number(import.meta.env.VITE_REVERB_PORT) || 443,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
  enabledTransports: ['ws', 'wss'],

  // L'autorisation d'un canal privé passe par axios : cookie de session et en-tête
  // X-XSRF-TOKEN sont lus à chaque requête (pas une seule fois au chargement du module).
  authorizer: (channel) => ({
    authorize: (socketId, callback) => {
      api
        .post('/api/broadcasting/auth', {
          socket_id: socketId,
          channel_name: channel.name,
        })
        .then((reponse) => callback(false, reponse.data))
        .catch((erreur) => callback(true, erreur))
    },
  }),
})

if (import.meta.env.DEV) {
  window.Echo = echo
}

export default echo
