import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { MessageSquarePlus, Users, X } from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'
import { useMessagerie } from '../MessagerieContext'
import { messageErreur } from '../utils'
import { Avatar } from './ui'
import SelecteurDestinataires from './SelecteurDestinataires'
import ZoneSaisie from './ZoneSaisie'
import Bulle, { BulleAnimee } from './Bulle'
import FondDiscussion from './FondDiscussion'
import NotificationsMenu from './NotificationsMenu'
import { avecAccuse, EtiquetteCategorie } from './SuiviMessage'

const LONGUEUR_TITRE = 150
const AUCUNE_ACTION = () => {}

export default function NouvelleDiscussion({ onFermer }) {
  const navigate = useNavigate()
  const { utilisateur } = useAuth()
  const { recharger } = useMessagerie()

  const [choisis, setChoisis] = useState([])
  const [creerGroupe, setCreerGroupe] = useState(false)
  const [titre, setTitre] = useState('')

  // Message (même modèle que dans Discussion)
  const [texte, setTexte] = useState('')
  const [fichiers, setFichiers] = useState([])
  const [categorie, setCategorie] = useState('NORMAL')
  const [echeance, setEcheance] = useState('')

  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [visible, setVisible] = useState(false)
  const panneauRef = useRef(null)
  const inputTitreRef = useRef(null)

  const nb = choisis.length
  const estDirect = nb === 1
  const estGroupe = creerGroupe && nb >= 2
  const estDiffusion = nb >= 2 && !estGroupe
  const contenu = texte.trim()
  const aUnMessage = contenu !== '' || fichiers.length > 0
  const titreNettoye = titre.trim()

  const pret =
    nb >= 1 && (estGroupe ? titreNettoye !== '' : estDiffusion ? aUnMessage : true)

  const manque =
    nb === 0
      ? 'Choisissez au moins un destinataire'
      : estGroupe && titreNettoye === ''
        ? 'Donnez un nom au groupe'
        : estDiffusion && !aUnMessage
          ? 'Écrivez un message ou joignez un fichier'
          : ''

  const nomUnique = choisis[0] ? `${choisis[0].prenom ?? ''} ${choisis[0].nom ?? ''}`.trim() : ''
  const resume = estDirect
    ? `Conversation privée${nomUnique ? ` avec ${nomUnique}` : ''}`
    : estGroupe
      ? `Groupe de ${nb + 1} personnes, vous inclus`
      : estDiffusion
        ? `Diffusion : ${nb} conversations privées, une par personne`
        : ''

  const titreEntete = estGroupe && titreNettoye ? titreNettoye : 'Nouvelle discussion'
  const sousTitre = nb === 0 ? 'Choisissez un ou plusieurs destinataires' : `${nb} destinataire${nb > 1 ? 's' : ''}`

  const libelleEnvoi = estGroupe
    ? 'Créer le groupe'
    : estDiffusion
      ? `Envoyer à ${nb} personnes`
      : estDirect && !aUnMessage
        ? 'Ouvrir la conversation'
        : 'Envoyer'

  // Aperçu : le message tel qu'il apparaîtra (uniquement pour les discussions normales)
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
    type: estDirect ? 'DIRECT' : estGroupe ? 'GROUPE' : 'DIFFUSION',
    participants: [utilisateur, ...choisis],
  }
  const etiquette = categorie !== 'NORMAL'

  // Animation d'ouverture
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (visible) panneauRef.current?.focus({ preventScroll: true })
  }, [visible])

  // Focus sur le nom quand on coche « Créer un groupe »
  useEffect(() => {
    if (estGroupe) inputTitreRef.current?.focus({ preventScroll: true })
  }, [estGroupe])

  // Échap ferme
  useEffect(() => {
    function surTouche(e) {
      if (e.key === 'Escape' && !e.defaultPrevented && !envoi) fermer()
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envoi])

  function fermer() {
    if (envoi) return
    setVisible(false)
    setTimeout(() => onFermer(), 300)
  }

  function retirer(matricule) {
    setChoisis((actuels) => actuels.filter((p) => p.matricule !== matricule))
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

  async function creer(e) {
    e?.preventDefault?.()
    if (!pret || envoi) return

    setEnvoi(true)
    setErreur('')

    try {
      const { data } = await api.post('/api/conversations/creer', {
        participants: choisis.map((p) => p.matricule),
        creer_groupe: estGroupe,
        titre: estGroupe ? titreNettoye : null,
      })

      const references =
        data.type === 'DIFFUSION'
          ? data.conversations.map((c) => c.reference_conversation)
          : [data.conversation.reference_conversation]

      // Envoi du message uniquement si ce n'est pas un groupe
      if (aUnMessage && !estGroupe) {
        const resultats = await Promise.allSettled(
          references.map((ref) => api.post(`/api/conversations/${ref}/messages`, construireMessage())),
        )
        const echecs = resultats.filter((r) => r.status === 'rejected')

        if (echecs.length > 0) {
          await recharger()
          setErreur(
            `Conversation créée, mais le message n'a pas pu être envoyé à ${echecs.length} destinataire${
              echecs.length > 1 ? 's' : ''
            }. ${messageErreur(echecs[0].reason)}`,
          )
          setEnvoi(false)
          return
        }
      }

      await recharger()
      navigate(`/conversations/${references[0]}`)
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
      aria-labelledby="titre-nouvelle-discussion"
      className={`pointer-events-auto absolute inset-y-0 right-0 isolate flex w-full flex-col overflow-hidden border-l border-slate-200 shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.15)] outline-none transition-transform duration-300 ease-out motion-reduce:transition-none sm:max-w-xl lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl ${
        visible ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Changement de fond : neutre pour le formulaire de groupe, conversation sinon */}
      {estGroupe ? (
        <div className="pointer-events-none absolute inset-0 -z-10 bg-slate-50" />
      ) : (
        <FondDiscussion className="pointer-events-none absolute inset-0 -z-10 size-full" />
      )}

      {/* ===== En-tête ===== */}
      <header className="relative z-20 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/70 bg-papier/90 px-4 backdrop-blur-xl md:px-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-[14px_14px_14px_5px] bg-mangue-400 text-lagon-950">
          <MessageSquarePlus className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="titre-nouvelle-discussion" className="truncate font-semibold leading-tight text-slate-900">
            {titreEntete}
          </h2>
          <p className="truncate text-xs text-slate-500">{sousTitre}</p>
        </div>

        <button
          type="button"
          onClick={fermer}
          disabled={envoi}
          aria-label="Fermer"
          title="Fermer (Échap)"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-900/5 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-piment-600 disabled:opacity-50"
        >
          <X className="size-[18px]" />
        </button>

        <NotificationsMenu />
      </header>

      {/* ===== Ligne « À » ===== */}
      <div className="relative z-20 shrink-0 border-b border-slate-200/70 bg-papier/90 px-4 py-3 backdrop-blur-xl md:px-6">
        <div className="flex items-start gap-3" role="group" aria-labelledby="libelle-destinataires">
          <span id="libelle-destinataires" className="pt-3 text-sm font-semibold text-slate-600">
            À
          </span>
          <div className="min-w-0 flex-1">
            <SelecteurDestinataires choisis={choisis} onChange={setChoisis} />
          </div>
        </div>

        {nb >= 2 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 pl-7">
            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                creerGroupe
                  ? 'border-piment-600 bg-piment-600/10 text-piment-700'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              <input
                type="checkbox"
                checked={creerGroupe}
                onChange={(e) => {
                  setCreerGroupe(e.target.checked)
                  if (!e.target.checked) setTitre('')
                }}
                className="size-4 shrink-0 rounded border-slate-300 accent-piment-600"
              />
              <Users className="size-4" aria-hidden="true" />
              Créer un groupe
            </label>
          </div>
        )}
      </div>

      {/* ===== Zone centrale ===== */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-3 md:px-6">
        
        {/* --- MODE GROUPE : Formulaire formel --- */}
        {estGroupe ? (
          <div className="mx-auto w-full max-w-2xl space-y-6 pt-6">
            
            {/* Champ Nom du groupe (formel) */}
            <div>
              <label htmlFor="nom-groupe" className="mb-2 block text-sm font-semibold text-slate-700">
                Nom du groupe <span className="text-piment-600">*</span>
              </label>
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
                placeholder="Ex. : Projet de migration, Équipe Marketing…"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-piment-500 focus:outline-none focus:ring-4 focus:ring-piment-500/15"
              />
              <p className="mt-2 text-xs text-slate-500">
                Ce nom sera visible par tous les participants du groupe.
              </p>
            </div>

            {/* Cadre lecture seule pour les participants */}
            <fieldset className="rounded-2xl border border-slate-200 bg-slate-100/50 p-5">
              <legend className="px-2 text-sm font-semibold text-slate-700">
                Participants ({nb + 1})
              </legend>
              
              <ul className="space-y-3">
                {/* Vous (créateur) */}
                <li className="flex items-center gap-3">
                  <Avatar
                    prenom={utilisateur.prenom}
                    nom={utilisateur.nom}
                    photoUrl={utilisateur.photo_url}
                    taille="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {utilisateur.prenom} {utilisateur.nom}
                    </p>
                    {(utilisateur.poste || utilisateur.service) && (
                      <p className="truncate text-xs text-slate-500">
                        {[utilisateur.poste, utilisateur.service].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-piment-600/10 px-2 py-0.5 text-[11px] font-semibold text-piment-700">
                    Vous · créateur
                  </span>
                </li>

                {/* Autres participants */}
                {choisis.map((p) => (
                  <li key={p.matricule} className="flex items-center gap-3">
                    <Avatar prenom={p.prenom} nom={p.nom} photoUrl={p.photo_url} taille="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {p.prenom} {p.nom}
                      </p>
                      {(p.poste || p.service) && (
                        <p className="truncate text-xs text-slate-500">
                          {[p.poste, p.service].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <p className="mt-4 border-t border-slate-200 pt-3 text-xs italic text-slate-500">
                Tous les participants voient l&apos;ensemble des échanges du groupe. Pour modifier la liste, utilisez le champ « À » ci-dessus.
              </p>
            </fieldset>
          </div>
        ) : (
          /* --- MODE NORMAL : Aperçu du message --- */
          <>
            <div className="sticky top-0 z-10 flex justify-center pb-2">
              <span
                className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-md"
                aria-live="polite"
              >
                {manque || resume}
              </span>
            </div>

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

      {/* ===== Pied de page ===== */}
      <footer className="relative z-10 shrink-0 px-4 pb-6 pt-2 md:px-6">
        <div className="mx-auto w-full max-w-3xl">
          {erreur && (
            <p className="mb-2 text-center text-sm text-red-600" role="alert">
              {erreur}
            </p>
          )}

          {estGroupe ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={creer}
                disabled={!pret || envoi}
                className="inline-flex items-center gap-2 rounded-full bg-piment-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-piment-600/20 transition hover:bg-piment-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-piment-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {envoi ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Création…
                  </>
                ) : (
                  <>
                    <Users className="size-4" />
                    Créer le groupe
                  </>
                )}
              </button>
            </div>
          ) : (
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
          )}
        </div>
      </footer>
    </div>
  )
}
