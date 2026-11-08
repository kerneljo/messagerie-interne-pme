import { useMemo, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Search, Users, MoreVertical, Trash2, AlertTriangle } from 'lucide-react'
import { heureCourte } from '../utils'
import { Avatar } from './ui'

const ETIQUETTES = { GROUPE: 'Groupe', DIFFUSION: 'Diffusion' }

function grouperParPeriode(conversations) {
  const maintenant = new Date()
  const aujourdHui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate())
  const hier = new Date(aujourdHui); hier.setDate(hier.getDate() - 1)
  const il7jours = new Date(aujourdHui); il7jours.setDate(il7jours.getDate() - 7)
  const il30jours = new Date(aujourdHui); il30jours.setDate(il30jours.getDate() - 30)

  const groupes = {
    "Aujourd'hui": [],
    Hier: [],
    'Cette semaine': [],
    'Ce mois': [],
    'Plus ancien': [],
  }

  conversations.forEach((c) => {
    const d = c.derniere_activite ? new Date(c.derniere_activite) : new Date(0)
    const jour = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    if (jour >= aujourdHui) groupes["Aujourd'hui"].push(c)
    else if (jour >= hier) groupes.Hier.push(c)
    else if (jour >= il7jours) groupes['Cette semaine'].push(c)
    else if (jour >= il30jours) groupes['Ce mois'].push(c)
    else groupes['Plus ancien'].push(c)
  })

  return Object.entries(groupes).filter(([, items]) => items.length > 0)
}

function SqueletteConversations() {
  return (
    <ul aria-hidden="true" className="space-y-0.5 px-2 pt-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex animate-pulse items-center gap-3 rounded-xl px-3 py-2.5">
          <div className="size-10 shrink-0 rounded-full bg-slate-200/80" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-2/5 rounded bg-slate-200/80" />
            <div className="h-2.5 w-4/5 rounded bg-slate-200/60" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function ListeConversations({
  conversations = [],
  selection = null,
  onSelection = () => {},
  utilisateur,
  chargement = false,
  onSupprimer,
}) {
  const [filtre, setFiltre] = useState('')
  // menuOuvert contient : { reference, top, left }
  const [menuOuvert, setMenuOuvert] = useState(null)
  // conversationASupprimer contient la conversation en attente de confirmation
  const [conversationASupprimer, setConversationASupprimer] = useState(null)

  const menuRef = useRef(null)

  // Fermer le menu si on clique ailleurs
  useEffect(() => {
    const fermer = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOuvert(null)
      }
    }
    if (menuOuvert) {
      document.addEventListener('mousedown', fermer)
      return () => document.removeEventListener('mousedown', fermer)
    }
  }, [menuOuvert])

  const visibles = useMemo(() => {
    const q = filtre.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) => (c.titre || '').toLowerCase().includes(q))
  }, [conversations, filtre])

  const groupes = useMemo(() => grouperParPeriode(visibles), [visibles])

  const afficherSquelette = chargement && conversations.length === 0

  // Ouvre le menu à la position de la souris ou du bouton
  const ouvrirMenu = (e, conversation, estClicDroit = false) => {
    e.preventDefault() // Empêche le menu natif du navigateur sur clic droit
    e.stopPropagation()

    if (menuOuvert?.reference === conversation.reference_conversation && !estClicDroit) {
      setMenuOuvert(null)
      return
    }

    let top, left
    if (estClicDroit) {
      top = e.clientY
      left = e.clientX
    } else {
      const rect = e.currentTarget.getBoundingClientRect()
      top = rect.bottom + 4
      left = rect.right - 208 // 208 = largeur du menu (w-52)
    }

    // S'assurer que le menu reste dans l'écran
    const hauteurMenu = 60
    const largeurMenu = 208
    if (top + hauteurMenu > window.innerHeight) top = top - hauteurMenu - 8
    if (left + largeurMenu > window.innerWidth) left = window.innerWidth - largeurMenu - 8
    if (left < 8) left = 8

    setMenuOuvert({ reference: conversation.reference_conversation, top, left })
  }

  const handleSupprimer = () => {
    if (conversationASupprimer) {
      onSupprimer?.(conversationASupprimer.reference_conversation)
      setConversationASupprimer(null)
    }
  }

  return (
    /* Aucun fond propre : la liste repose directement sur le fond de la page (bg-creme du parent) */
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-3 pb-2 pt-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
            placeholder="Rechercher une conversation…"
            aria-label="Rechercher une conversation"
            className="w-full rounded-xl border border-transparent bg-slate-100 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-500 transition focus:border-indigo-400 focus:bg-papier focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
          />
        </div>
      </div>

      <div className="defilement-fin min-h-0 flex-1 overflow-y-auto">
        {afficherSquelette && <SqueletteConversations />}

        {!afficherSquelette && visibles.length === 0 && (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <MessageSquare className="size-10 text-slate-300" aria-hidden="true" />
            <p className="text-sm text-slate-600">
              {filtre ? 'Aucun résultat pour cette recherche.' : 'Aucune conversation.'}
            </p>
          </div>
        )}

        {groupes.map(([periode, items]) => (
          <section key={periode}>
            <div className="sticky top-0 z-10 bg-creme/90 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur">
              {periode}
            </div>

            <ul className="space-y-0.5 px-2 pb-2">
              {items.map((c) => {
                const apercu = c.dernier_message ?? (c.derniere_activite ? 'Pièce jointe' : 'Aucun message')
                const autre = c.participants?.find((p) => p.matricule !== utilisateur?.matricule)
                const actif = c.reference_conversation === selection
                const estMoi = String(c.dernier_message_expediteur) === String(utilisateur?.matricule)
                const nonLus = c.non_lus > 0

                return (
                  <li
                    key={c.reference_conversation}
                    className="group relative"
                    onContextMenu={(e) => ouvrirMenu(e, c, true)}
                  >
                    <button
                      type="button"
                      onClick={() => onSelection(c.reference_conversation)}
                      aria-current={actif ? 'true' : undefined}
                      className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 ${
                        actif ? 'bg-blue-50' : 'hover:bg-slate-100'
                      }`}
                    >
                      {actif && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-3 left-1 w-1 rounded-full bg-action-600"
                        />
                      )}

                      <Avatar
                        prenom={c.type === 'DIRECT' ? autre?.prenom : c.titre}
                        nom={c.type === 'DIRECT' ? autre?.nom : ''}
                        photoUrl={c.type === 'DIRECT' ? autre?.photo_url : null}
                        taille="md"
                      />

                      <div className="min-w-0 flex-1 pr-6">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-sm ${nonLus ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                            {c.titre}
                          </span>
                          <span className={`shrink-0 text-[11px] ${nonLus ? 'font-semibold text-action-600' : 'text-slate-500'}`}>
                            {heureCourte(c.derniere_activite)}
                          </span>
                        </div>

                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className={`flex min-w-0 items-center gap-1 text-xs ${nonLus ? 'font-medium text-slate-700' : 'text-slate-500'}`}>
                            {ETIQUETTES[c.type] && (
                              <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                {c.type === 'GROUPE' ? <Users className="size-2.5" aria-hidden="true" /> : null}
                                {ETIQUETTES[c.type]}
                              </span>
                            )}
                            {estMoi && c.dernier_message && (
                              <span className="shrink-0 text-slate-500">Vous :</span>
                            )}
                            <span className="truncate">{apercu}</span>
                          </span>

                          {nonLus && (
                            <span
                              className="flex min-w-[20px] shrink-0 items-center justify-center rounded-full bg-action-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
                              aria-label={`${c.non_lus} non lus`}
                            >
                              {c.non_lus > 99 ? '99+' : c.non_lus}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Bouton 3 points : sans pastille, visible au survol */}
                    <button
                      type="button"
                      onClick={(e) => ouvrirMenu(e, c, false)}
                      aria-label="Plus d'options"
                      className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 opacity-0 transition hover:bg-slate-200/70 hover:text-slate-900 focus:opacity-100 group-hover:opacity-100"
                    >
                      <MoreVertical className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* ===== Menu contextuel (clic droit ou bouton 3 points) ===== */}
      {menuOuvert && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[9999] w-52 overflow-hidden rounded-xl border border-slate-200 bg-papier shadow-2xl"
          style={{
            top: menuOuvert.top,
            left: menuOuvert.left,
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const conv = conversations.find((c) => c.reference_conversation === menuOuvert.reference)
              if (conv) {
                setMenuOuvert(null)
                setConversationASupprimer(conv) // Ouvre la modale
              }
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/15"
          >
            <Trash2 className="size-4 shrink-0" aria-hidden="true" />
            Supprimer la conversation
          </button>
        </div>,
        document.body
      )}

      {/* ===== Modale de confirmation personnalisée ===== */}
      <AnimatePresence>
        {conversationASupprimer && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Voile : bg-black (et non slate-900, qui s'inverse en mode sombre) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConversationASupprimer(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            {/* Boîte de dialogue */}
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="titre-suppression"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200/60 bg-papier p-6 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300">
                  <AlertTriangle className="size-6" aria-hidden="true" />
                </div>

                <h3 id="titre-suppression" className="text-lg font-bold text-slate-900">
                  Supprimer la conversation ?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Cette action est irréversible. Tous les messages de cette conversation seront définitivement supprimés pour vous.
                </p>

                <div className="mt-6 flex w-full gap-3">
                  <button
                    type="button"
                    onClick={() => setConversationASupprimer(null)}
                    className="flex-1 rounded-xl border border-slate-200 bg-papier px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSupprimer}
                    className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
