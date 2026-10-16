import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Menu, MessagesSquare, SquarePen } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { useMessagerie } from '../MessagerieContext'
import ListeConversations from '../components/ListeConversations'
import Discussion from '../components/Discussion'
import NouvelleDiscussion from '../components/NouvelleDiscussion'
import NotificationsMenu from '../components/NotificationsMenu'
import { Chargement, EtatVide, LogoBulles } from '../components/ui'

/* En-tête de la colonne de droite quand aucune discussion n'est ouverte
   (garde la cloche et l'alignement avec l'en-tête de la liste) */
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

  const selection = reference ? Number(reference) : null
  const courante = conversations.find((c) => c.reference_conversation === selection)

  // La fenêtre « Nouvelle discussion » est pilotée par l'adresse (?nouvelle=1) :
  // le bouton de la barre latérale peut l'ouvrir et le bouton Précédent la ferme
  const nouvelleOuverte = new URLSearchParams(search).get('nouvelle') === '1'
  const ouvrirNouvelle = () => navigate({ pathname, search: '?nouvelle=1' })
  const fermerNouvelle = () => navigate({ pathname, search: '' }, { replace: true })

  return (
   <div className="relative flex h-full overflow-hidden bg-creme">
      {/* ===== Colonne de gauche : liste des conversations, pleine hauteur ===== */}
      <section
        className={`${selection ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r border-slate-200 bg-creme md:w-80 lg:w-96`}
      >
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200/70 bg-papier px-4 md:px-5">
          {/* Bouton du menu mobile (la sidebar est cachée sous lg) */}
          <button
            type="button"
            onClick={ouvrirMenu}
            className="rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-900/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-piment-600 lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-xl font-bold text-slate-900">Conversations</h1>

          <button
            type="button"
            onClick={ouvrirNouvelle}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-piment-600"
            aria-label="Nouvelle discussion"
            title="Nouvelle discussion"
          >
            <SquarePen className="size-[18px]" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <ListeConversations
            conversations={conversations}
            selection={selection}
            utilisateur={utilisateur}
            chargement={!pret}
            onSelection={(ref) => navigate(`/conversations/${ref}`)}
          />
        </div>
      </section>

      {/* ===== Colonne de droite : discussion (avec son en-tête) ou état vide ===== */}
      <section className={`${selection ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col bg-creme`}>
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
                  <Link to="/conversations" className="text-blue-600 hover:underline">Retour</Link>
                </EtatVide>
              ) : (
                <div className="m-auto flex max-w-xs flex-col items-center gap-3 p-8 text-center">
                  <LogoBulles className="size-20" />
                  <h2 className="font-display text-2xl font-extrabold text-slate-900">Sélectionnez une conversation</h2>
                  <p className="text-sm leading-relaxed text-slate-500">
                    Choisissez une conversation dans la liste ou démarrez-en une nouvelle.
                  </p>
                  <button
                    type="button"
                    onClick={ouvrirNouvelle}
                    className="mt-2 inline-flex items-center gap-2 rounded-lg bg-piment-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-piment-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-piment-600"
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

      {nouvelleOuverte && (
  <div className="pointer-events-none absolute bottom-0 left-0 right-0 top-16 z-20 overflow-hidden md:left-80 lg:left-96">
    <NouvelleDiscussion onFermer={fermerNouvelle} />
  </div>
  )
}
    </div>
    )}
