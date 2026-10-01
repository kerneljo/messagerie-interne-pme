import { useCallback, useState } from 'react'
import { useAuth } from '../AuthContext'
import api from '../api'
import usePolling from '../usePolling'
import ListeConversations from '../components/ListeConversations'
import Discussion from '../components/Discussion'
import NouvelleConversation from '../components/NouvelleConversation'

export default function Messagerie() {
  const { utilisateur, deconnexion } = useAuth()
  const [conversations, setConversations] = useState([])
  const [selection, setSelection] = useState(null)
  const [modal, setModal] = useState(false)

  const charger = useCallback(async () => {
    try {
      const { data } = await api.get('/api/conversations')
      setConversations(data)
    } catch {
      // erreurs reseau ponctuelles ignorees : le prochain cycle reessaie
    }
  }, [])

  usePolling(charger, 5000)

  const courante = conversations.find((c) => c.reference_conversation === selection)

  async function apresCreation(conversation) {
    await charger()
    setSelection(conversation.reference_conversation)
    setModal(false)
  }

  return (
    <div className="app">
      <header className="barre">
        <strong>Messagerie interne</strong>
        <span className="barre-utilisateur">
          {utilisateur.prenom} {utilisateur.nom}
          <small> · {utilisateur.role.libelle} · {utilisateur.service.nom_service}</small>
        </span>
        <button className="btn" onClick={deconnexion}>Se deconnecter</button>
      </header>

      <div className={'corps' + (courante ? ' conv-ouverte' : '')}>
        <aside className="colonne-liste">
          <ListeConversations
            conversations={conversations}
            selection={selection}
            onSelection={setSelection}
            onNouvelle={() => setModal(true)}
          />
        </aside>
        <section className="colonne-discussion">
          {courante ? (
            <Discussion
              key={courante.reference_conversation}
              conversation={courante}
              onLu={charger}
              onRetour={() => setSelection(null)}
            />
          ) : (
            <div className="placeholder">Selectionnez une conversation ou creez-en une nouvelle.</div>
          )}
        </section>
      </div>

      {modal && <NouvelleConversation onFermer={() => setModal(false)} onCreee={apresCreation} />}
    </div>
  )
}
