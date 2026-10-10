import { Link, useNavigate, useParams } from 'react-router-dom'
import { MessageSquare, MessagesSquare, Paperclip, SendHorizontal, Users } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { useMessagerie } from '../MessagerieContext'
import ListeConversations from '../components/ListeConversations'
import Discussion from '../components/Discussion'
import { Chargement, EtatVide } from '../components/ui'

export default function Conversations() {
  const { reference } = useParams()
  const navigate = useNavigate()
  const { utilisateur } = useAuth()
  const { conversations, recharger, pret } = useMessagerie()

  const selection = reference ? Number(reference) : null
  const courante = conversations.find((c) => c.reference_conversation === selection)

  return (
    <div className="flex h-full bg-white">
      <section
        className={`${selection ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r border-slate-200 md:w-80 lg:w-96`}
      >
        <ListeConversations
          conversations={conversations}
          selection={selection}
          utilisateur={utilisateur}
          onSelection={(ref) => navigate(`/conversations/${ref}`)}
          onNouvelle={() => navigate('/envoyer')}
          onNouveauGroupe={() => navigate('/conversations/nouveau-groupe')}
        />
      </section>

      <section className={`${selection ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>
        {courante ? (
          <Discussion
            key={courante.reference_conversation}
            conversation={courante}
            onLu={recharger}
            onRetour={() => navigate('/conversations')}
          />
        ) : selection && !pret ? (
          <Chargement />
        ) : selection ? (
          <EtatVide icone={MessagesSquare} titre="Conversation introuvable">
            Elle n'existe pas ou vous n'en faites pas partie.{' '}
            <Link to="/conversations" className="text-blue-600 hover:underline">Retour</Link>
          </EtatVide>
        ) : (
          <div className="m-auto">
            <EtatVide icone={MessagesSquare} titre="Sélectionnez une conversation">
              Choisissez une conversation dans la liste ou envoyez un nouveau message.
            </EtatVide>
          </div>
        )}
      </section>
    </div>
  )
}
