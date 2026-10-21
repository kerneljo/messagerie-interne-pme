import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Info, MessageSquare, Users, X } from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'
import { useMessagerie } from '../MessagerieContext'
import { messageErreur } from '../utils'
import { Avatar } from './ui'
import SelecteurDestinataires from './SelecteurDestinataires'
import ZoneSaisie from './ZoneSaisie'
import Bulle, { BulleAnimee } from './Bulle'
import FondDiscussion from './FondDiscussion'
import { avecAccuse, EtiquetteCategorie } from './SuiviMessage'

const LONGUEUR_TITRE = 150
const AUCUNE_ACTION = () => {}

/* ------------------------------------------------------------------
   Politique d'envoi : à aligner avec la validation côté serveur
   (le contrôle ici améliore l'expérience, il ne remplace pas celui du serveur)
   ------------------------------------------------------------------ */
const ROLES_SANS_LIMITE = ['Administrateur', 'Manager']
const LIMITE_DIFFUSION_DEFAUT = 10 // destinataires max pour les autres rôles
const SEUIL_ALERTE_DIFFUSION = 15 // au-delà : l'envoi est signalé comme large diffusion
const NB_RECENTS = 6

// Type de discussion : un message (direct ou individuel) ou un groupe
const ONGLETS = [
  { groupe: false, libelle: 'Message', icone: MessageSquare },
  { groupe: true, libelle: 'Nouveau groupe', icone: Users },
]

/* ------------------------------------------------------------------
   Brouillon : gardé dans sessionStorage (effacé à la fermeture de l'onglet,
   donc rien ne reste sur un poste partagé). Les fichiers ne sont pas conservés.
   ------------------------------------------------------------------ */
const cleBrouillon = (matricule) => `nouvelle-discussion:brouillon:${matricule}`

function lireBrouillon(cle) {
  try {
    const brut = sessionStorage.getItem(cle)
    return brut ? JSON.parse(brut) : null
  } catch {
    return null
  }
}

function supprimerBrouillon(cle) {
  try {
    sessionStorage.removeItem(cle)
  } catch {
    /* stockage indisponible : on ignore */
  }
}

function ecrireBrouillon(cle, etat) {
  const vide = etat.choisis.length === 0 && !etat.texte.trim() && !etat.titre.trim()
  // Après un envoi partiellement réussi, un brouillon risquerait de provoquer des doublons
  if (vide || etat.reprise) return supprimerBrouillon(cle)
  try {
    const { choisis, creerGroupe, titre, texte, categorie, echeance } = etat
    sessionStorage.setItem(cle, JSON.stringify({ choisis, creerGroupe, titre, texte, categorie, echeance }))
  } catch {
    /* stockage plein ou indisponible : on ignore */
  }
}

/* Bandeau d'information : conversation déjà existante */
function BandeauExistante({ children, onOuvrir }) {
  return (
    <div
      role="status"
      className="mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm ring-1 ring-black/5 backdrop-blur-md"
    >
      <Info className="size-4 shrink-0 text-indigo-600" aria-hidden="true" />
      <p className="min-w-0 flex-1">{children}</p>
      <button
        type="button"
        onClick={onOuvrir}
        className="shrink-0 rounded-full bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Ouvrir
      </button>
    </div>
  )
}

export default function NouvelleDiscussion({ onFermer }) {
  const navigate = useNavigate()
  const { search } = useLocation()
  const { utilisateur } = useAuth()
  const { conversations, recharger } = useMessagerie()

  const cle = cleBrouillon(utilisateur.matricule)
  const [brouillon] = useState(() => lireBrouillon(cle))
  const [brouillonRestaure, setBrouillonRestaure] = useState(Boolean(brouillon))

  const [choisis, setChoisis] = useState(brouillon?.choisis ?? [])
  const [creerGroupe, setCreerGroupe] = useState(
    () => new URLSearchParams(search).get('mode') === 'groupe' || (brouillon?.creerGroupe ?? false),
  )
  const [titre, setTitre] = useState(brouillon?.titre ?? '')

  // Message (même modèle que dans Discussion)
  const [texte, setTexte] = useState(brouillon?.texte ?? '')
  const [fichiers, setFichiers] = useState([])
  const [categorie, setCategorie] = useState(brouillon?.categorie ?? 'NORMAL')
  const [echeance, setEcheance] = useState(brouillon?.echeance ?? '')

  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [visible, setVisible] = useState(false)

  // Conversations déjà créées dont l'envoi du message a échoué :
  // un nouvel essai renvoie le message sans recréer les conversations (pas de doublons)
  const [reprise, setReprise] = useState(null) // { toutes: [ref], echouees: [ref] }

  // Ajout d'un service entier
  const [services, setServices] = useState([])
  const [ajoutService, setAjoutService] = useState({ chargement: false, notice: '' })

  const panneauRef = useRef(null)
  const inputTitreRef = useRef(null)
  const fermerRef = useRef(null)
  const fermetureRef = useRef(false)
  const termineRef = useRef(false)
  const etatRef = useRef(null)

  const nb = choisis.length
  const estGroupe = creerGroupe
  const estDirect = !estGroupe && nb === 1
  const estDiffusion = !estGroupe && nb >= 2
  const contenu = texte.trim()
  const aUnMessage = contenu !== '' || fichiers.length > 0
  const titreNettoye = titre.trim()
  const verrouille = envoi || reprise !== null

  // Limite de diffusion selon le rôle
  const limiteDiffusion = ROLES_SANS_LIMITE.includes(utilisateur?.role?.libelle)
    ? Infinity
    : LIMITE_DIFFUSION_DEFAUT
  const depasseLimite = estDiffusion && nb > limiteDiffusion
  const largeDiffusion = estDiffusion && !depasseLimite && nb >= SEUIL_ALERTE_DIFFUSION

  const pret = estGroupe
    ? nb >= 2 && titreNettoye !== ''
    : nb >= 1 && (estDiffusion ? aUnMessage && !depasseLimite : true)

  const manque = estGroupe
    ? titreNettoye === '' && nb < 2
      ? 'Donnez un nom au groupe et ajoutez au moins deux personnes'
      : titreNettoye === ''
        ? 'Donnez un nom au groupe'
        : nb < 2
          ? nb === 0
            ? 'Ajoutez au moins deux personnes dans « À »'
            : 'Ajoutez encore une personne : un groupe compte au moins trois personnes, vous compris'
          : ''
    : nb === 0
      ? 'Choisissez au moins un destinataire'
      : depasseLimite
        ? `Votre rôle permet de diffuser à ${limiteDiffusion} personnes au maximum`
        : estDiffusion && !aUnMessage
          ? 'Écrivez un message ou joignez un fichier'
          : ''

  const nomUnique = choisis[0] ? `${choisis[0].prenom ?? ''} ${choisis[0].nom ?? ''}`.trim() : ''
  const resume = estDirect
    ? `Conversation privée${nomUnique ? ` avec ${nomUnique}` : ''}`
    : estGroupe
      ? `Groupe de ${nb + 1} personnes, vous inclus`
      : estDiffusion
        ? largeDiffusion
          ? `Envoi à ${nb} personnes : relisez votre message avant l'envoi`
          : `Envoi individuel : ${nb} conversations privées, une par personne`
        : ''

  const libelleEnvoi = reprise
    ? `Renvoyer à ${reprise.echouees.length} personne${reprise.echouees.length > 1 ? 's' : ''}`
    : estGroupe
      ? 'Créer le groupe'
      : estDiffusion
        ? `Envoyer à ${nb} personnes`
        : estDirect && !aUnMessage
          ? 'Ouvrir la conversation'
          : 'Envoyer'

  // Conversation déjà existante avec les mêmes personnes
  const existante = useMemo(() => {
    if (estDirect) {
      const cible = choisis[0].matricule
      return (
        conversations.find(
          (c) => c.type === 'DIRECT' && c.participants?.some((p) => p.matricule === cible),
        ) ?? null
      )
    }
    if (estGroupe && nb >= 2) {
      const ids = new Set([utilisateur.matricule, ...choisis.map((p) => p.matricule)])
      return (
        conversations.find(
          (c) =>
            c.type !== 'DIRECT' &&
            c.type !== 'DIFFUSION' &&
            c.participants?.length === ids.size &&
            c.participants.every((p) => ids.has(p.matricule)),
        ) ?? null
      )
    }
    return null
  }, [conversations, choisis, estDirect, estGroupe, utilisateur.matricule])

  // Collègues récents : interlocuteurs de vos conversations directes, les plus récentes d'abord
  const recents = useMemo(() => {
    const deja = new Set(choisis.map((p) => p.matricule))
    const vus = new Set()
    const liste = []
    for (const c of conversations) {
      if (c.type !== 'DIRECT') continue
      const autre = c.participants?.find((p) => p.matricule !== utilisateur.matricule)
      if (!autre || vus.has(autre.matricule)) continue
      vus.add(autre.matricule)
      if (!deja.has(autre.matricule)) liste.push(autre)
      if (liste.length >= NB_RECENTS) break
    }
    return liste
  }, [conversations, choisis, utilisateur.matricule])

  // Aperçu du message (discussions normales)
  const afficherApercu = contenu !== ''
  const messageApercu = {
    reference_message: 0,
    contenu: texte,
    date_envoi: new Date().toISOString(),
    date_modification: null,
    nb_lecteurs: 0,
    expediteur: utilisateur,
    reactions: [],
    fichiers: [],
    categorie,
    echeance: echeance ? new Date(echeance).toISOString() : null,
  }
  const conversationApercu = {
    type: estDirect ? 'DIRECT' : 'DIFFUSION',
    participants: [utilisateur, ...choisis],
  }
  const etiquette = categorie !== 'NORMAL'

  // Dernier état connu, pour sauvegarder le brouillon à la fermeture
  etatRef.current = { choisis, creerGroupe, titre, texte, categorie, echeance, reprise: reprise !== null }

  /* ---------- Cycle de vie ---------- */

  // Animation d'ouverture
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (visible) panneauRef.current?.focus({ preventScroll: true })
  }, [visible])

  // Le brouillon est sauvegardé à la fermeture, quelle qu'en soit la cause
  // (clic extérieur, Échap, changement de conversation…), sauf après un envoi réussi
  useEffect(
    () => () => {
      if (!termineRef.current) ecrireBrouillon(cle, etatRef.current)
    },
    [cle],
  )

  // Liste des services (pour ajouter un service entier)
  useEffect(() => {
    let annule = false
    api
      .get('/api/annuaire/services')
      .then(({ data }) => !annule && setServices(data || []))
      .catch(() => !annule && setServices([]))
    return () => {
      annule = true
    }
  }, [])

  // Le bouton « Nouveau groupe » de la liste ouvre le panneau directement en mode groupe
  useEffect(() => {
    if (new URLSearchParams(search).get('mode') === 'groupe') setCreerGroupe(true)
  }, [search])

  // Focus sur le nom quand on passe en mode groupe
  useEffect(() => {
    if (estGroupe) inputTitreRef.current?.focus({ preventScroll: true })
  }, [estGroupe])

  // La notice d'ajout de service disparaît d'elle-même
  useEffect(() => {
    if (!ajoutService.notice) return
    const t = setTimeout(() => setAjoutService((a) => ({ ...a, notice: '' })), 4000)
    return () => clearTimeout(t)
  }, [ajoutService.notice])

  function fermer() {
    if (envoi || fermetureRef.current) return
    fermetureRef.current = true
    setVisible(false)
    setTimeout(() => onFermer(), 300)
  }
  fermerRef.current = fermer

  // Échap et clic en dehors du panneau ferment le panneau (le brouillon est conservé)
  useEffect(() => {
    function surTouche(e) {
      if (e.key === 'Escape' && !e.defaultPrevented) fermerRef.current?.()
    }

    function surClicExterieur(e) {
      const panneau = panneauRef.current
      if (!panneau || panneau.contains(e.target)) return
      // Ne pas fermer pour : menus et listes (souvent affichés dans un portail),
      // sélecteur d'emojis, et boutons « Nouvelle discussion » qui rouvrent le panneau
      const ignore = e.target.closest?.(
        '[role="menu"], [role="listbox"], [role="option"], [data-ignorer-clic-exterieur], ' +
          '[aria-label="Nouvelle discussion"], a[href*="nouvelle=1"]',
      )
      if (ignore) return
      fermerRef.current?.()
    }

    document.addEventListener('keydown', surTouche)
    document.addEventListener('pointerdown', surClicExterieur)
    return () => {
      document.removeEventListener('keydown', surTouche)
      document.removeEventListener('pointerdown', surClicExterieur)
    }
  }, [])

  /* ---------- Actions ---------- */

  function ajouterContact(p) {
    setChoisis((actuels) => (actuels.some((x) => x.matricule === p.matricule) ? actuels : [...actuels, p]))
  }

  async function ajouterService(code) {
    if (!code) return
    const nomService =
      services.find((s) => String(s.code_service) === String(code))?.nom_service ?? 'ce service'
    setAjoutService({ chargement: true, notice: '' })
    try {
      const { data } = await api.get('/api/annuaire', { params: { code_service: code, limite: 200 } })
      let ajoutes = 0
      setChoisis((actuels) => {
        const ids = new Set(actuels.map((p) => p.matricule))
        const nouveaux = (data || []).filter((p) => !ids.has(p.matricule))
        ajoutes = nouveaux.length
        return [...actuels, ...nouveaux]
      })
      setAjoutService({
        chargement: false,
        notice:
          ajoutes > 0
            ? `${ajoutes} personne${ajoutes > 1 ? 's' : ''} ajoutée${ajoutes > 1 ? 's' : ''} depuis « ${nomService} »`
            : `Tout le service « ${nomService} » est déjà sélectionné`,
      })
    } catch (err) {
      setAjoutService({ chargement: false, notice: messageErreur(err) })
    }
  }

  function reinitialiser() {
    setChoisis([])
    setCreerGroupe(false)
    setTitre('')
    setTexte('')
    setFichiers([])
    setCategorie('NORMAL')
    setEcheance('')
    setErreur('')
    setBrouillonRestaure(false)
    supprimerBrouillon(cle)
  }

  function ouvrirExistante() {
    if (!existante) return
    termineRef.current = true
    supprimerBrouillon(cle)
    navigate(`/conversations/${existante.reference_conversation}`)
  }

  function construireMessage() {
    const donnees = new FormData()
    if (contenu) donnees.append('contenu', contenu)
    if (categorie !== 'NORMAL') donnees.append('categorie', categorie)
    if (avecAccuse(categorie) && echeance) {
      donnees.append('echeance', new Date(echeance).toISOString())
    }
    fichiers.forEach((f) => donnees.append('fichiers[]', f))
    return donnees
  }

  // Un échec de rafraîchissement de la liste ne doit pas bloquer la suite
  async function rafraichir() {
    try {
      await recharger()
    } catch {
      /* la liste se mettra à jour au prochain cycle */
    }
  }

  async function creer(e) {
    e?.preventDefault?.()
    if (!pret || envoi) return

    setEnvoi(true)
    setErreur('')

    try {
      let toutes
      let aEnvoyer

      if (reprise) {
        // Nouvel essai : on ne recrée rien, on renvoie seulement aux échecs
        toutes = reprise.toutes
        aEnvoyer = reprise.echouees
      } else {
        const { data } = await api.post('/api/conversations/creer', {
          participants: choisis.map((p) => p.matricule),
          creer_groupe: estGroupe,
          titre: estGroupe ? titreNettoye : null,
        })

        toutes =
          data.type === 'DIFFUSION'
            ? data.conversations.map((c) => c.reference_conversation)
            : [data.conversation.reference_conversation]
        aEnvoyer = toutes

        // Mémorisé tout de suite : si la suite échoue, un nouvel essai ne crée pas de doublons
        setReprise({ toutes, echouees: toutes })
      }

      // Envoi du message uniquement si ce n'est pas un groupe
      if (aUnMessage && !estGroupe) {
        const resultats = await Promise.allSettled(
          aEnvoyer.map((ref) => api.post(`/api/conversations/${ref}/messages`, construireMessage())),
        )
        const echouees = aEnvoyer.filter((_, i) => resultats[i].status === 'rejected')

        if (echouees.length > 0) {
          const premiereErreur = resultats.find((r) => r.status === 'rejected')
          setReprise({ toutes, echouees })
          await rafraichir()
          setErreur(
            `Le message n'a pas pu être envoyé à ${echouees.length} destinataire${
              echouees.length > 1 ? 's' : ''
            }. ${messageErreur(premiereErreur.reason)} Vous pouvez réessayer.`,
          )
          setEnvoi(false)
          return
        }
      }

      // Succès : le brouillon n'a plus lieu d'être
      termineRef.current = true
      supprimerBrouillon(cle)
      await rafraichir()
      navigate(`/conversations/${toutes[0]}`)
    } catch (err) {
      setErreur(messageErreur(err))
      setEnvoi(false)
    }
  }

  return (
    <div
      ref={panneauRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="false"
      aria-labelledby="titre-nouvelle-discussion"
      className={`pointer-events-auto absolute inset-y-0 right-0 isolate flex w-full flex-col overflow-hidden border-l border-slate-200 bg-slate-50 shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.15)] outline-none transition-transform duration-300 ease-out motion-reduce:transition-none ${
        visible ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <h2 id="titre-nouvelle-discussion" className="sr-only">
        Nouvelle discussion
      </h2>

      {/* Fond : conversation pour les messages, neutre pour le formulaire de groupe (fondu entre les deux) */}
      <FondDiscussion
        className={`pointer-events-none absolute inset-0 -z-10 size-full transition-opacity duration-300 motion-reduce:transition-none ${
          estGroupe ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-0 -z-10 bg-slate-50 transition-opacity duration-300 motion-reduce:transition-none ${
          estGroupe ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* ===== En-tête : type de discussion, destinataires, ajout rapide ===== */}
      <div className="relative z-20 shrink-0 border-b border-slate-200/70 bg-papier/90 py-3 pl-4 pr-16 backdrop-blur-xl md:pl-6">
        <button
          type="button"
          onClick={fermer}
          disabled={envoi}
          aria-label="Fermer"
          title="Fermer (Échap)"
          className="absolute right-4 top-3 flex size-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-900/5 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 md:right-6"
        >
          <X className="size-[18px]" />
        </button>

        <fieldset disabled={verrouille} className="m-0 min-w-0 border-0 p-0">
          {/* Type de discussion : « Nouveau groupe » est visible dès l'ouverture */}
          <div
            role="radiogroup"
            aria-label="Type de discussion"
            className="mb-3 inline-flex max-w-full gap-1 rounded-xl bg-slate-200/70 p-1"
          >
            {ONGLETS.map((o) => {
              const actif = creerGroupe === o.groupe
              const Icone = o.icone
              return (
                <label
                  key={o.libelle}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-indigo-500/40 ${
                    actif
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <input
                    type="radio"
                    name="type-discussion"
                    checked={actif}
                    onChange={() => {
                      setCreerGroupe(o.groupe)
                      if (!o.groupe) setTitre('')
                    }}
                    className="sr-only"
                  />
                  <Icone className="size-4" aria-hidden="true" />
                  {o.libelle}
                </label>
              )
            })}
          </div>

          <div className="grid grid-cols-1 items-start gap-x-3 gap-y-3 sm:grid-cols-[4.25rem_minmax(0,1fr)]">

            {/* Destinataires */}
            <span
              id="libelle-destinataires"
              className="hidden pt-3 text-xs font-semibold uppercase tracking-wider text-slate-600 sm:block"
            >
              À
            </span>
            <div className="min-w-0" role="group" aria-labelledby="libelle-destinataires">
              <SelecteurDestinataires choisis={choisis} onChange={setChoisis} />
            </div>

            {/* Ajout rapide : récents et service entier, même hauteur */}
            {(recents.length > 0 || services.length > 0) && (
              <>
                <span className="hidden pt-2 text-xs font-semibold uppercase tracking-wider text-slate-600 sm:block">
                  Ajouter
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {recents.map((p) => (
                      <button
                        key={p.matricule}
                        type="button"
                        onClick={() => ajouterContact(p)}
                        title={`Ajouter ${p.prenom ?? ''} ${p.nom ?? ''}`}
                        className="inline-flex h-8 items-center gap-2 rounded-full border border-slate-300 bg-white pl-1 pr-3 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600"
                      >
                        <Avatar prenom={p.prenom} nom={p.nom} photoUrl={p.photo_url} taille="sm" />
                        {p.prenom}
                      </button>
                    ))}

                    {recents.length > 0 && services.length > 0 && (
                      <span className="mx-1 h-5 w-px bg-slate-300" aria-hidden="true" />
                    )}

                    {services.length > 0 && (
                      <>
                        <label htmlFor="ajout-service" className="sr-only">
                          Ajouter tout un service
                        </label>
                        <select
                          id="ajout-service"
                          value=""
                          onChange={(e) => ajouterService(e.target.value)}
                          disabled={ajoutService.chargement}
                          className="h-8 rounded-full border border-slate-300 bg-white pl-3.5 pr-8 text-xs font-medium text-slate-700 transition hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 disabled:opacity-60"
                        >
                          <option value="">
                            {ajoutService.chargement ? 'Ajout en cours…' : 'Un service entier…'}
                          </option>
                          {services.map((s) => (
                            <option key={s.code_service} value={s.code_service}>
                              {s.nom_service} ({s.nb_utilisateurs})
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>

                  {ajoutService.notice && (
                    <p className="mt-2 text-xs text-slate-600" role="status">
                      {ajoutService.notice}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Plusieurs destinataires en mode message : on propose le groupe */}
            {!estGroupe && nb >= 2 && (
              <>
                <span className="hidden sm:block" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-slate-600" aria-live="polite">
                  Chaque personne recevra le message dans sa propre conversation privée.{' '}
                  <button
                    type="button"
                    onClick={() => setCreerGroupe(true)}
                    className="font-semibold text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-600"
                  >
                    Créer plutôt un groupe
                  </button>
                </p>
              </>
            )}
          </div>
        </fieldset>
      </div>

      {/* ===== Zone centrale ===== */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-3 md:px-6">
        {brouillonRestaure && (
          <div
            role="status"
            className="mx-auto mb-3 flex w-full max-w-md items-center justify-between gap-3 rounded-full bg-white/85 px-4 py-2 text-xs text-slate-600 shadow-sm ring-1 ring-black/5 backdrop-blur-md"
          >
            <span>Brouillon restauré (les fichiers joints ne sont pas conservés)</span>
            <button
              type="button"
              onClick={reinitialiser}
              className="shrink-0 font-semibold text-slate-800 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-600"
            >
              Effacer
            </button>
          </div>
        )}

        {estGroupe ? (
          /* --- Mode groupe : formulaire centré --- */
          <div className="mx-auto my-auto w-full max-w-xl space-y-5 py-6">
            <div className="text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                <Users className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-lg font-bold text-slate-900">Nouveau groupe</h3>
              <p className="mt-1 text-sm text-slate-600">
                Une discussion commune : chacun voit les échanges et répond dans le même fil.
              </p>
            </div>

            {existante && (
              <BandeauExistante onOuvrir={ouvrirExistante}>
                Un groupe avec les mêmes participants existe déjà : « {existante.titre} ».
              </BandeauExistante>
            )}

            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <label htmlFor="nom-groupe" className="text-sm font-semibold text-slate-700">
                  Nom du groupe
                </label>
                {titre.length > LONGUEUR_TITRE * 0.8 && (
                  <span className="text-xs text-slate-500">
                    {titre.length}/{LONGUEUR_TITRE}
                  </span>
                )}
              </div>
              <input
                ref={inputTitreRef}
                id="nom-groupe"
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent?.isComposing) creer(e)
                }}
                maxLength={LONGUEUR_TITRE}
                autoComplete="off"
                disabled={verrouille}
                aria-describedby="aide-nom-groupe"
                placeholder="Ex. : Projet de migration, Équipe Marketing…"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 disabled:opacity-60"
              />
              <p id="aide-nom-groupe" className="mt-2 text-xs text-slate-500">
                Ce nom sera visible par tous les participants.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 pt-1">
              {erreur && (
                <p className="text-center text-sm text-red-600" role="alert">
                  {erreur}
                </p>
              )}
              <p className="text-center text-sm text-slate-600" aria-live="polite">
                {manque || resume}
              </p>
              <button
                type="button"
                onClick={creer}
                disabled={!pret || envoi}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-action-600 px-10 py-3.5 text-base font-semibold text-white shadow-lg shadow-action-600/25 transition hover:bg-action-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {envoi ? (
                  <>
                    <span
                      className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                    Création…
                  </>
                ) : (
                  <>
                    <Users className="size-5" aria-hidden="true" />
                    Créer le groupe
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* --- Mode normal : état, doublon éventuel et aperçu du message --- */
          <>
            <div className="sticky top-0 z-10 flex justify-center pb-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium shadow-sm backdrop-blur-md ${
                  depasseLimite || largeDiffusion
                    ? 'bg-amber-100/90 text-amber-900'
                    : 'bg-white/80 text-slate-600'
                }`}
                aria-live="polite"
              >
                {manque || resume}
              </span>
            </div>

            {estDirect && existante && (
              <div className="mt-2">
                <BandeauExistante onOuvrir={ouvrirExistante}>
                  Vous avez déjà une conversation avec {nomUnique || 'cette personne'}.
                </BandeauExistante>
              </div>
            )}

            <div
              className="mt-auto pt-4"
              aria-hidden="true"
              ref={(el) => {
                if (el) el.setAttribute('inert', '')
              }}
            >
              <AnimatePresence>
                {afficherApercu && (
                  <BulleAnimee key="apercu">
                    {etiquette && (
                      <div className="mb-1 flex justify-end">
                        <EtiquetteCategorie message={messageApercu} moi />
                      </div>
                    )}
                    <Bulle
                      m={messageApercu}
                      moi
                      conversation={conversationApercu}
                      premierDuGroupe
                      onRepondre={AUCUNE_ACTION}
                      onModifier={AUCUNE_ACTION}
                      onSupprimer={AUCUNE_ACTION}
                      onReagir={AUCUNE_ACTION}
                      onOuvrirEmoji={AUCUNE_ACTION}
                    />
                  </BulleAnimee>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* ===== Zone de saisie (hors mode groupe) ===== */}
      {!estGroupe && (
        <footer className="relative z-10 shrink-0 px-4 pb-6 pt-2 md:px-6">
          <div className="mx-auto w-full max-w-3xl">
            {erreur && (
              <p className="mb-2 text-center text-sm text-red-600" role="alert">
                {erreur}
              </p>
            )}

            <ZoneSaisie
              texte={texte}
              onTexte={setTexte}
              fichiers={fichiers}
              onFichiers={setFichiers}
              categorie={categorie}
              onCategorie={setCategorie}
              echeance={echeance}
              onEcheance={setEcheance}
              onEnvoyer={creer}
              onErreur={setErreur}
              peutEnvoyer={pret}
              envoiSansContenu={estDirect}
              libelleEnvoi={libelleEnvoi}
              envoi={envoi}
              ariaLabel="Message"
              placeholder={
                estDiffusion
                  ? 'Écrivez un message pour chaque destinataire… '
                  : 'Écrivez un message… '
              }
            />
          </div>
        </footer>
      )}
    </div>
  )
}
