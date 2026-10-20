import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Camera, Check, Crown, LogOut, MoreVertical,
  Settings, Shield, Trash2, UserMinus, UserPlus, X,
} from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'
import { useMessagerie } from '../MessagerieContext'
import { messageErreur } from '../utils'
import { Avatar } from './ui'
import SelecteurDestinataires from './SelecteurDestinataires'
import ConfirmationModal from './ConfirmationModal'

const LONGUEUR_TITRE = 150
const MAX_PHOTO_OCTETS = 5 * 1024 * 1024

// Selon la source (annuaire, conversation ou session), poste et service sont du texte ou des objets
const texteDe = (v, ...cles) => {
  if (typeof v === 'string') return v
  for (const cle of cles) if (v?.[cle]) return v[cle]
  return ''
}
const ligneFonction = (p) =>
  [texteDe(p.poste, 'libelle'), texteDe(p.service, 'nom_service', 'nom')].filter(Boolean).join(' · ')

const initiales = (titre) =>
  (titre || 'G').trim().split(/\s+/).slice(0, 2).map((mot) => mot[0]).join('').toUpperCase()

/* Photo du groupe : image si elle existe, sinon initiales (taille libre, sans dépendre d'Avatar) */
function PhotoGroupe({ titre, url, className = 'size-20 text-2xl' }) {
  if (url) {
    return <img src={url} alt="" className={`${className} rounded-full object-cover`} />
  }
  return (
    <span
      aria-hidden="true"
      className={`${className} grid place-items-center rounded-full bg-mangue-400 font-bold text-lagon-950`}
    >
      {initiales(titre)}
    </span>
  )
}

/* Textes des confirmations (une seule fenêtre réutilisée pour toutes les actions sensibles) */
const CONFIRMATIONS = {
  retirer: (m) => ({
    titre: 'Retirer ce membre ?',
    message: `${m.prenom} ${m.nom} sera retiré(e) du groupe.`,
    texteConfirmer: 'Retirer',
    variant: 'danger',
  }),
  promouvoir: (m) => ({
    titre: 'Nommer administrateur ?',
    message: `${m.prenom} ${m.nom} pourra gérer les membres et les informations du groupe.`,
    texteConfirmer: 'Nommer',
  }),
  quitter: () => ({
    titre: 'Quitter ce groupe ?',
    message: 'Vous ne recevrez plus les messages de ce groupe.',
    texteConfirmer: 'Quitter',
    variant: 'danger',
  }),
  supprimer: () => ({
    titre: 'Supprimer ce groupe ?',
    message: 'Le groupe et tous ses messages seront supprimés définitivement, pour tous les membres.',
    texteConfirmer: 'Supprimer',
    variant: 'danger',
  }),
}

export default function ParametresGroupe({ conversation, onRetour }) {
  const navigate = useNavigate()
  const { utilisateur } = useAuth()
  const { recharger } = useMessagerie()
  const ref = conversation.reference_conversation

  // Édition des informations
  const [titre, setTitre] = useState(conversation.titre || '')
  const [photo, setPhoto] = useState(null)
  const [apercuPhoto, setApercuPhoto] = useState(null) // URL locale de la photo choisie
  const [modeEdition, setModeEdition] = useState(false)
  const inputPhotoRef = useRef(null)

  // Membres
  const [ajoutOuvert, setAjoutOuvert] = useState(false)
  const [nouveaux, setNouveaux] = useState([])
  const [menuOuvert, setMenuOuvert] = useState(null)

  const [confirmation, setConfirmation] = useState(null) // { type, membre? }
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  /* ---------- Membres : la liste vient toujours de la conversation ---------- */

  // L'API peut ou non inclure l'utilisateur dans `participants` : on l'ajoute au besoin,
  // pour qu'il n'apparaisse jamais en double et que le compte soit juste.
  const membres = useMemo(() => {
    const liste = conversation.participants ?? []
    const base = liste.some((p) => p.matricule === utilisateur.matricule) ? liste : [utilisateur, ...liste]
    const rang = (p) => (p.matricule === conversation.matricule_createur ? 0 : p.role === 'ADMIN' ? 1 : 2)
    return [...base].sort(
      (a, b) =>
        rang(a) - rang(b) || `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`),
    )
  }, [conversation.participants, conversation.matricule_createur, utilisateur])

  const moi = membres.find((p) => p.matricule === utilisateur.matricule)
  const estCreateur = conversation.matricule_createur === utilisateur.matricule
  const estAdminGroupe = moi?.role === 'ADMIN'
  const peutModifier = estCreateur || estAdminGroupe

  // Vérifié aussi côté serveur : ici on masque seulement ce qui serait refusé
  const peutRetirer = (m) =>
    m.matricule !== utilisateur.matricule &&
    m.matricule !== conversation.matricule_createur &&
    (estCreateur || (estAdminGroupe && m.role !== 'ADMIN'))
  const peutPromouvoir = (m) =>
    estCreateur && m.matricule !== utilisateur.matricule && m.role !== 'ADMIN'

  const titreNettoye = titre.trim()
  const titreChange = titreNettoye !== (conversation.titre || '').trim()
  const aDesChangements = titreChange || photo !== null
  const urlPhoto = apercuPhoto ?? conversation.photo_url ?? null

  // Libère l'URL locale quand la photo change ou quand on quitte la page
  useEffect(
    () => () => {
      if (apercuPhoto) URL.revokeObjectURL(apercuPhoto)
    },
    [apercuPhoto],
  )

  // Échap : ferme la fenêtre d'ajout ou le menu ouvert
  useEffect(() => {
    function surTouche(e) {
      if (e.key !== 'Escape') return
      if (ajoutOuvert) fermerAjout()
      else if (menuOuvert) setMenuOuvert(null)
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ajoutOuvert, menuOuvert])

  // Un échec de rafraîchissement ne doit pas masquer le résultat de l'action
  async function rafraichir() {
    try {
      await recharger()
    } catch {
      /* la liste se mettra à jour au prochain cycle */
    }
  }

  /* ---------- Informations du groupe ---------- */

  function annulerEdition() {
    setTitre(conversation.titre || '')
    setPhoto(null)
    setApercuPhoto(null)
    setModeEdition(false)
    setErreur('')
  }

  function choisirPhoto(e) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    if (!fichier.type.startsWith('image/')) {
      setErreur('Choisissez une image (JPG, PNG, WebP…).')
      return
    }
    if (fichier.size > MAX_PHOTO_OCTETS) {
      setErreur('La photo dépasse 5 Mo.')
      return
    }
    setErreur('')
    setPhoto(fichier)
    setApercuPhoto(URL.createObjectURL(fichier))
  }

  async function enregistrerInfos() {
    if (!aDesChangements || titreNettoye === '' || enCours) return
    setEnCours(true)
    setErreur('')

    try {
      const donnees = new FormData()
      // Laravel ne lit pas un formulaire multipart envoyé en PATCH : on envoie un POST
      // avec _method=PATCH (sinon le titre et la photo arrivent vides côté serveur)
      donnees.append('_method', 'PATCH')
      if (titreChange) donnees.append('titre', titreNettoye)
      if (photo) donnees.append('photo', photo)
      await api.post(`/api/conversations/${ref}`, donnees)
      await rafraichir()
      setModeEdition(false)
      setPhoto(null)
      setApercuPhoto(null)
    } catch (err) {
      setErreur(messageErreur(err))
    } finally {
      setEnCours(false)
    }
  }

  /* ---------- Membres ---------- */

  function fermerAjout() {
    setAjoutOuvert(false)
    setNouveaux([])
  }

  async function ajouterMembres() {
    if (nouveaux.length === 0 || enCours) return
    setEnCours(true)
    setErreur('')

    try {
      await api.post(`/api/conversations/${ref}/participants`, {
        matricules: nouveaux.map((p) => p.matricule),
      })
      await rafraichir()
      fermerAjout()
    } catch (err) {
      setErreur(messageErreur(err))
    } finally {
      setEnCours(false)
    }
  }

  // Actions sensibles : une seule fenêtre de confirmation, au lieu de window.confirm
  async function confirmer() {
    if (!confirmation || enCours) return
    const { type, membre } = confirmation
    setEnCours(true)
    setErreur('')

    try {
      if (type === 'retirer') {
        await api.delete(`/api/conversations/${ref}/participants/${membre.matricule}`)
      } else if (type === 'promouvoir') {
        await api.patch(`/api/conversations/${ref}/participants/${membre.matricule}`, { role: 'ADMIN' })
      } else if (type === 'quitter') {
        await api.delete(`/api/conversations/${ref}/participants/moi`)
      } else if (type === 'supprimer') {
        await api.delete(`/api/conversations/${ref}`)
      }

      await rafraichir()
      setConfirmation(null)
      if (type === 'quitter' || type === 'supprimer') navigate('/conversations')
    } catch (err) {
      setErreur(messageErreur(err))
      setConfirmation(null)
    } finally {
      setEnCours(false)
    }
  }

  const configConfirmation = confirmation
    ? CONFIRMATIONS[confirmation.type](confirmation.membre)
    : null

  /* ---------- Rendu ---------- */

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-50">
      {/* ===== En-tête : même hauteur que les autres écrans ===== */}
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/70 bg-papier/90 px-4 backdrop-blur-xl md:px-6">
        <button
          type="button"
          onClick={onRetour}
          aria-label="Retour à la conversation"
          title="Retour"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-900/5 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <ArrowLeft className="size-[18px]" />
        </button>
        <h1 className="min-w-0 flex-1 truncate font-semibold text-slate-900">Paramètres du groupe</h1>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6 md:px-6 md:py-8">
        {erreur && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {erreur}
          </p>
        )}

        {/* --- Identité du groupe --- */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6" aria-label="Informations du groupe">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="relative shrink-0">
              <PhotoGroupe titre={titre || conversation.titre} url={urlPhoto} />
              {modeEdition && peutModifier && (
                <>
                  <button
                    type="button"
                    onClick={() => inputPhotoRef.current?.click()}
                    className="absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full bg-piment-600 text-white shadow-md transition hover:bg-piment-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-piment-600"
                    aria-label="Changer la photo du groupe"
                  >
                    <Camera className="size-4" />
                  </button>
                  <input
                    ref={inputPhotoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={choisirPhoto}
                  />
                </>
              )}
            </div>

            <div className="min-w-0 flex-1">
              {modeEdition && peutModifier ? (
                <>
                  <label htmlFor="titre-groupe" className="sr-only">
                    Nom du groupe
                  </label>
                  <input
                    id="titre-groupe"
                    type="text"
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent?.isComposing) enregistrerInfos()
                    }}
                    maxLength={LONGUEUR_TITRE}
                    autoComplete="off"
                    placeholder="Nom du groupe"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-xl font-bold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
                  />
                  {titreNettoye === '' && (
                    <p className="mt-1 text-xs text-slate-500">Le nom du groupe ne peut pas être vide.</p>
                  )}
                </>
              ) : (
                <h2 className="truncate text-xl font-bold text-slate-900">
                  {conversation.titre || 'Groupe sans nom'}
                </h2>
              )}
              <p className="mt-1 text-sm text-slate-500">
                {membres.length} membre{membres.length > 1 ? 's' : ''}
              </p>
            </div>

            {peutModifier && (
              <div className="flex shrink-0 gap-2">
                {modeEdition ? (
                  <>
                    <button
                      type="button"
                      onClick={annulerEdition}
                      disabled={enCours}
                      className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={enregistrerInfos}
                      disabled={!aDesChangements || titreNettoye === '' || enCours}
                      className="inline-flex items-center gap-2 rounded-full bg-piment-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-piment-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {enCours ? (
                        <span
                          className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none"
                          aria-hidden="true"
                        />
                      ) : (
                        <Check className="size-4" aria-hidden="true" />
                      )}
                      Enregistrer
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setModeEdition(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Settings className="size-4" aria-hidden="true" />
                    Modifier
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* --- Membres --- */}
        <section className="rounded-3xl border border-slate-200 bg-white" aria-label="Membres du groupe">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Membres ({membres.length})
            </h2>
            <button
              type="button"
              onClick={() => setAjoutOuvert(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              <UserPlus className="size-3.5" aria-hidden="true" />
              Ajouter
            </button>
          </div>

          <ul className="divide-y divide-slate-100">
            {membres.map((m) => {
              const estMoi = m.matricule === utilisateur.matricule
              const createur = m.matricule === conversation.matricule_createur
              const admin = m.role === 'ADMIN'
              const peutAgir = peutRetirer(m) || peutPromouvoir(m)
              const fonction = ligneFonction(m)

              return (
                <li key={m.matricule} className="flex items-center gap-3 px-6 py-3">
                  <Avatar prenom={m.prenom} nom={m.nom} photoUrl={m.photo_url} taille="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {m.prenom} {m.nom}
                      {estMoi && <span className="ml-1.5 text-slate-500">(Vous)</span>}
                    </p>
                    {fonction && <p className="truncate text-xs text-slate-500">{fonction}</p>}
                  </div>

                  {createur ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                      <Crown className="size-3" aria-hidden="true" />
                      Créateur
                    </span>
                  ) : (
                    admin && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-lagon-800/10 px-2.5 py-0.5 text-[11px] font-semibold text-lagon-800">
                        <Shield className="size-3" aria-hidden="true" />
                        Admin
                      </span>
                    )
                  )}

                  {peutAgir && (
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setMenuOuvert(menuOuvert === m.matricule ? null : m.matricule)}
                        className="flex size-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                        aria-label={`Actions pour ${m.prenom} ${m.nom}`}
                        aria-haspopup="menu"
                        aria-expanded={menuOuvert === m.matricule}
                      >
                        <MoreVertical className="size-4" />
                      </button>

                      {menuOuvert === m.matricule && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setMenuOuvert(null)} aria-hidden="true" />
                          <div
                            role="menu"
                            className="absolute right-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                          >
                            {peutPromouvoir(m) && (
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setMenuOuvert(null)
                                  setConfirmation({ type: 'promouvoir', membre: m })
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                              >
                                <Shield className="size-4 text-lagon-800" aria-hidden="true" />
                                Nommer administrateur
                              </button>
                            )}
                            {peutRetirer(m) && (
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setMenuOuvert(null)
                                  setConfirmation({ type: 'retirer', membre: m })
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
                              >
                                <UserMinus className="size-4" aria-hidden="true" />
                                Retirer du groupe
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        {/* --- Zone sensible --- */}
        <div className="space-y-2">
          {!estCreateur && (
            <button
              type="button"
              onClick={() => setConfirmation({ type: 'quitter' })}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut className="size-4 text-slate-500" aria-hidden="true" />
              Quitter le groupe
            </button>
          )}

          {estCreateur && (
            <button
              type="button"
              onClick={() => setConfirmation({ type: 'supprimer' })}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Supprimer le groupe
            </button>
          )}
        </div>
      </div>

      {/* ===== Fenêtre : ajouter des membres ===== */}
      {ajoutOuvert && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
          onClick={fermerAjout}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-ajout-membres"
            className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 id="titre-ajout-membres" className="text-lg font-bold text-slate-900">
                Ajouter des membres
              </h3>
              <button
                type="button"
                onClick={fermerAjout}
                className="flex size-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
                aria-label="Fermer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Les membres actuels ne peuvent pas être ajoutés une seconde fois,
                même si le sélecteur ne gère pas la prop « exclure » */}
            <SelecteurDestinataires
              choisis={nouveaux}
              onChange={(liste) => {
                const exclus = new Set(membres.map((m) => m.matricule))
                setNouveaux(liste.filter((p) => !exclus.has(p.matricule)))
              }}
              exclure={membres.map((m) => m.matricule)}
            />

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={fermerAjout}
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={ajouterMembres}
                disabled={nouveaux.length === 0 || enCours}
                className="inline-flex items-center gap-2 rounded-full bg-piment-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-piment-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enCours && (
                  <span
                    className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                )}
                Ajouter{nouveaux.length > 0 && ` (${nouveaux.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        ouvert={Boolean(configConfirmation)}
        onFermer={() => setConfirmation(null)}
        onConfirmer={confirmer}
        texteAnnuler="Annuler"
        enCours={enCours}
        {...(configConfirmation ?? {})}
      />
    </div>
  )
}
