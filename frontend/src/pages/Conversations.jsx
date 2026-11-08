import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Menu, MessagesSquare, SquarePen, X } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { useMessagerie } from '../MessagerieContext'
import ListeConversations from '../components/ListeConversations'
import Discussion from '../components/Discussion'
import NouvelleDiscussion from '../components/NouvelleDiscussion'
import NotificationsMenu from '../components/NotificationsMenu'
import { Chargement, EtatVide, LogoBulles } from '../components/ui'
import api from '../api'

const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-600'

/* En-tête de la colonne de droite quand aucune discussion n'est ouverte */
function EnteteVide() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-end border-b border-slate-200/70 bg-papier px-4 md:px-6">
      <NotificationsMenu />
    </header>
  )
}

export default function Conversations() {
  const { reference } = useParams()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const { utilisateur } = useAuth()
  const { conversations, recharger, pret } = useMessagerie()
  const contexte = useOutletContext()
  const ouvrirMenu = contexte?.ouvrirMenu
  const [erreur, setErreur] = useState('')

  const selection = reference ? Number(reference) : null
  const courante = conversations.find((c) => c.reference_conversation === selection)
  const totalNonLus = conversations.reduce((somme, c) => somme + (c.non_lus || 0), 0)

  // La fenêtre « Nouvelle discussion » est pilotée par l'adresse (?nouvelle=1)
  const nouvelleOuverte = new URLSearchParams(search).get('nouvelle') === '1'
  const ouvrirNouvelle = () => navigate({ pathname, search: '?nouvelle=1' })
  const fermerNouvelle = () => navigate({ pathname, search: '' }, { replace: true })

  // Le message d'erreur disparaît tout seul après quelques secondes
  useEffect(() => {
    if (!erreur) return undefined
    const minuteur = setTimeout(() => setErreur(''), 6000)
    return () => clearTimeout(minuteur)
  }, [erreur])

  const supprimerConversation = async (referenceConversation) => {
    try {
      // La suppression ne retire que l'utilisateur de la conversation
      await api.delete(`/api/conversations/${referenceConversation}/moi`)

      // Si c'était la conversation sélectionnée, on retourne à l'accueil
      if (selection === referenceConversation) {
        navigate('/conversations')
      }

      // On recharge la liste depuis le backend
      await recharger()
    } catch {
      setErreur('Impossible de supprimer la conversation. Veuillez réessayer.')
    }
  }

  return (
    <div className="relative flex h-full overflow-hidden bg-creme">
      {/* ===== Colonne de gauche : liste des conversations ===== */}
      <section
        aria-label="Liste des conversations"
        className={`${selection ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r border-slate-200 bg-creme md:w-80 lg:w-96`}
      >
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200/70 bg-papier px-4 md:px-5">
          <button
            type="button"
            onClick={ouvrirMenu}
            className={`rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-900/5 lg:hidden ${FOCUS}`}
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          <h1 className="flex min-w-0 flex-1 items-center gap-2 text-xl font-bold text-slate-900">
            <span className="truncate">Conversations</span>
            {totalNonLus > 0 && (
              <span
                className="shrink-0 rounded-full bg-[#D9461A] px-2 py-0.5 text-xs font-bold text-white"
                aria-label={`${totalNonLus} message${totalNonLus > 1 ? 's' : ''} non lu${totalNonLus > 1 ? 's' : ''}`}
              >
                {totalNonLus > 99 ? '99+' : totalNonLus}
              </span>
            )}
          </h1>

          <button
            type="button"
            onClick={ouvrirNouvelle}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-action-600 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-action-700 ${FOCUS}`}
            aria-label="Nouvelle discussion"
            title="Nouvelle discussion"
          >
            <SquarePen className="size-4" aria-hidden="true" />
            Nouvelle
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <ListeConversations
            conversations={conversations}
            selection={selection}
            utilisateur={utilisateur}
            chargement={!pret}
            onSelection={(ref) => navigate(`/conversations/${ref}`)}
            onSupprimer={supprimerConversation}
          />
        </div>
      </section>

      {/* ===== Colonne de droite : discussion ou état vide ===== */}
      <section
        aria-label="Discussion"
        className={`${selection ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col bg-creme`}
      >
        {courante ? (
          <Discussion
            key={courante.reference_conversation}
            conversation={courante}
            onLu={recharger}
            onRetour={() => navigate('/conversations')}
          />
        ) : (
          <>
            <EnteteVide />
            <div className="flex min-h-0 flex-1 overflow-y-auto">
              {selection && !pret ? (
                <Chargement />
              ) : selection ? (
                <EtatVide icone={MessagesSquare} titre="Conversation introuvable">
                  Elle n'existe pas ou vous n'en faites pas partie.{' '}
                  <Link to="/conversations" className="font-semibold text-blue-600 hover:underline">
                    Retour
                  </Link>
                </EtatVide>
              ) : (
                <div className="m-auto flex w-full max-w-sm flex-col items-center gap-3 p-8 text-center">
                  <LogoBulles className="size-20" />
                  <h2 className="font-display text-2xl font-extrabold text-slate-900">
                    Sélectionnez une conversation
                  </h2>
                  <p className="text-sm leading-relaxed text-slate-600">
                    Choisissez une conversation dans la liste ou démarrez-en une nouvelle.
                  </p>
                  <button
                    type="button"
                    onClick={ouvrirNouvelle}
                    className={`mt-2 inline-flex items-center gap-2 rounded-lg bg-action-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-action-700 ${FOCUS}`}
                  >
                    <SquarePen className="size-4" aria-hidden="true" />
                    Nouvelle discussion
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* ===== Bandeau d'erreur (remplace alert) ===== */}
      {erreur && (
        <div
          role="alert"
          className="absolute left-4 right-4 top-20 z-30 mx-auto flex max-w-md items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-lg dark:border-red-500/30 dark:bg-red-950 dark:text-red-300 md:left-auto md:right-6 md:mx-0"
        >
          <p className="min-w-0 flex-1">{erreur}</p>
          <button
            type="button"
            onClick={() => setErreur('')}
            className="shrink-0 rounded-md p-0.5 text-red-700 transition hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-red-600 dark:text-red-300 dark:hover:bg-red-500/20"
            aria-label="Fermer le message"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {nouvelleOuverte && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 top-16 z-20 overflow-hidden md:left-80 lg:left-96">
          <NouvelleDiscussion onFermer={fermerNouvelle} />
        </div>
      )}
    </div>
  )
}
