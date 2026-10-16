import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Users, Settings, Trash2, Camera, Check, LogOut,
  UserPlus, Shield, MoreVertical, Crown, UserMinus, X
} from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'
import { useMessagerie } from '../MessagerieContext'
import { messageErreur } from '../utils'
import { Avatar } from './ui'
import SelecteurDestinataires from './SelecteurDestinataires'

export default function ParametresGroupe({ conversation, onRetour }) {
  const navigate = useNavigate()
  const { utilisateur } = useAuth()
  const { recharger } = useMessagerie()

  // États
  const [titre, setTitre] = useState(conversation.titre || '')
  const [photo, setPhoto] = useState(null)
  const [apercuPhoto, setApercuPhoto] = useState(conversation.photo_url || null)
  const [participants, setParticipants] = useState(conversation.participants || [])
  const [nouveaux, setNouveaux] = useState([])
  const [modeEdition, setModeEdition] = useState(false)
  const [ajoutMembresOuvert, setAjoutMembresOuvert] = useState(false)
  const [menuOuvert, setMenuOuvert] = useState(null)
  const [enregistrement, setEnregistrement] = useState(false)
  const [erreur, setErreur] = useState('')

  // ✅ FIX : le backend renvoie 'matricule_createur', pas 'createur_matricule'
  const estCreateur = conversation.matricule_createur === utilisateur.matricule

  const aDesChangements =
    titre.trim() !== (conversation.titre || '').trim() || photo !== null

  function annulerEdition() {
    setTitre(conversation.titre || '')
    setPhoto(null)
    setApercuPhoto(conversation.photo_url || null)
    setModeEdition(false)
    setErreur('')
  }

  function choisirPhoto(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setPhoto(f)
    setApercuPhoto(URL.createObjectURL(f))
  }

  async function enregistrerInfos() {
    if (!aDesChangements || enregistrement) return
    setEnregistrement(true)
    setErreur('')

    try {
      const donnees = new FormData()
      if (titre.trim() !== (conversation.titre || '').trim()) {
        donnees.append('titre', titre.trim())
      }
      if (photo) donnees.append('photo', photo)
      await api.patch(`/api/conversations/${conversation.reference_conversation}`, donnees)
      await recharger()
      setModeEdition(false)
      setPhoto(null)
    } catch (err) {
      setErreur(messageErreur(err))
    } finally {
      setEnregistrement(false)
    }
  }

  async function ajouterMembres() {
    if (nouveaux.length === 0 || enregistrement) return
    setEnregistrement(true)
    setErreur('')

    try {
      await api.post(`/api/conversations/${conversation.reference_conversation}/participants`, {
        matricules: nouveaux.map((p) => p.matricule),
      })
      setParticipants((actuels) => [...actuels, ...nouveaux])
      setNouveaux([])
      setAjoutMembresOuvert(false)
      await recharger()
    } catch (err) {
      setErreur(messageErreur(err))
    } finally {
      setEnregistrement(false)
    }
  }

  async function retirerMembre(membre) {
    if (!window.confirm(`Retirer ${membre.prenom} ${membre.nom} du groupe ?`)) return
    setMenuOuvert(null)
    try {
      await api.delete(
        `/api/conversations/${conversation.reference_conversation}/participants/${membre.matricule}`
      )
      setParticipants((actuels) => actuels.filter((p) => p.matricule !== membre.matricule))
      await recharger()
    } catch (err) {
      setErreur(messageErreur(err))
    }
  }

  async function promouvoirMembre(membre) {
    if (!window.confirm(`Promouvoir ${membre.prenom} ${membre.nom} comme administrateur ?`)) return
    setMenuOuvert(null)
    try {
      await api.patch(
        `/api/conversations/${conversation.reference_conversation}/participants/${membre.matricule}`,
        { role: 'ADMIN' }
      )
      setParticipants((actuels) =>
        actuels.map((p) => (p.matricule === membre.matricule ? { ...p, role: 'ADMIN' } : p))
      )
      await recharger()
    } catch (err) {
      setErreur(messageErreur(err))
    }
  }

  async function quitterGroupe() {
    if (!window.confirm('Voulez-vous vraiment quitter ce groupe ?')) return
    try {
      await api.delete(`/api/conversations/${conversation.reference_conversation}/participants/moi`)
      await recharger()
      navigate('/conversations')
    } catch (err) {
      setErreur(messageErreur(err))
    }
  }

  async function supprimerGroupe() {
    if (!window.confirm('Supprimer définitivement ce groupe et tous ses messages ?')) return
    try {
      await api.delete(`/api/conversations/${conversation.reference_conversation}`)
      await recharger()
      navigate('/conversations')
    } catch (err) {
      setErreur(messageErreur(err))
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-50">
      {/* ===== En-tête ===== */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <button
            type="button"
            onClick={onRetour}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft className="size-4" />
            Retour
          </button>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Paramètres du groupe
          </span>
        </div>
      </div>

      {/* ===== Contenu ===== */}
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">

        {/* --- Carte principale (identité) --- */}
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="relative shrink-0">
              <Avatar prenom={titre || 'Groupe'} nom="" photoUrl={apercuPhoto} taille="xl" />
              {modeEdition && estCreateur && (
                <>
                  <button
                    type="button"
                    onClick={() => document.getElementById('input-photo-groupe').click()}
                    className="absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full bg-lagon-600 text-white shadow-md transition hover:bg-lagon-700"
                    aria-label="Changer la photo du groupe"
                  >
                    <Camera className="size-4" />
                  </button>
                  <input
                    id="input-photo-groupe"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={choisirPhoto}
                  />
                </>
              )}
            </div>

            <div className="min-w-0 flex-1">
              {modeEdition && estCreateur ? (
                <input
                  type="text"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  maxLength={150}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-xl font-bold text-slate-900 focus:border-lagon-500 focus:outline-none focus:ring-4 focus:ring-lagon-500/15"
                  placeholder="Nom du groupe"
                />
              ) : (
                <h1 className="truncate text-xl font-bold text-slate-900">
                  {conversation.titre || 'Groupe sans nom'}
                </h1>
              )}
              <p className="mt-1 text-sm text-slate-500">
                {participants.length + 1} membres
              </p>
            </div>

            {estCreateur && (
              <div className="flex shrink-0 gap-2">
                {modeEdition ? (
                  <>
                    <button
                      type="button"
                      onClick={annulerEdition}
                      disabled={enregistrement}
                      className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={enregistrerInfos}
                      disabled={!aDesChangements || enregistrement}
                      className="inline-flex items-center gap-2 rounded-full bg-lagon-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-lagon-700 disabled:opacity-50"
                    >
                      {enregistrement ? (
                        <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <Check className="size-4" />
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
                    <Settings className="size-4" />
                    Modifier
                  </button>
                )}
              </div>
            )}
          </div>

          {erreur && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">
              {erreur}
            </p>
          )}
        </div>

        {/* --- Section Membres --- */}
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white">
          {/* En-tête de la section */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Membres ({participants.length + 1})
            </h2>
            {/* ✅ MODIFIÉ : bouton visible pour tous les participants */}
            <button
              type="button"
              onClick={() => setAjoutMembresOuvert(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-lagon-600/10 px-3 py-1.5 text-xs font-semibold text-lagon-700 transition hover:bg-lagon-600/20"
            >
              <UserPlus className="size-3.5" />
              Ajouter
            </button>
          </div>

          {/* Liste des membres */}
          <ul className="divide-y divide-slate-100">
            {/* Vous (créateur) */}
            <li className="flex items-center gap-3 px-6 py-3">
              <Avatar
                prenom={utilisateur.prenom}
                nom={utilisateur.nom}
                photoUrl={utilisateur.photo_url}
                taille="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {utilisateur.prenom} {utilisateur.nom}
                  <span className="ml-1.5 text-slate-500">(Vous)</span>
                </p>
              </div>
              {estCreateur && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                  <Crown className="size-3" />
                  Créateur
                </span>
              )}
            </li>

            {/* Autres membres */}
            {participants.map((p) => {
              const estAdmin = p.role === 'ADMIN'
              return (
                <li key={p.matricule} className="flex items-center gap-3 px-6 py-3">
                  <Avatar prenom={p.prenom} nom={p.nom} photoUrl={p.photo_url} taille="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {p.prenom} {p.nom}
                    </p>
                    {(p.poste || p.service) && (
                      <p className="truncate text-xs text-slate-500">
                        {[p.poste, typeof p.service === 'object' ? p.service?.nom : p.service]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </div>

                  {estAdmin && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-lagon-600/10 px-2.5 py-0.5 text-[11px] font-semibold text-lagon-700">
                      <Shield className="size-3" />
                      Admin
                    </span>
                  )}

                  {/* ✅ Menu contextuel visible uniquement pour le créateur */}
                  {estCreateur && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setMenuOuvert(menuOuvert === p.matricule ? null : p.matricule)
                        }
                        className="flex size-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Actions"
                      >
                        <MoreVertical className="size-4" />
                      </button>

                      {menuOuvert === p.matricule && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setMenuOuvert(null)}
                          />
                          <div className="absolute right-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                            {!estAdmin && (
                              <button
                                type="button"
                                onClick={() => promouvoirMembre(p)}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                              >
                                <Crown className="size-4 text-amber-600" />
                                Promouvoir admin
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => retirerMembre(p)}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
                            >
                              <UserMinus className="size-4" />
                              Retirer du groupe
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        {/* --- Zone dangereuse (discrète) --- */}
        <div className="space-y-2">
          {/* Quitter le groupe : caché pour le créateur (il ne peut pas quitter, il doit supprimer) */}
          {!estCreateur && (
            <button
              type="button"
              onClick={quitterGroupe}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut className="size-4 text-slate-500" />
              Quitter le groupe
            </button>
          )}

          {estCreateur && (
            <button
              type="button"
              onClick={supprimerGroupe}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              <Trash2 className="size-4" />
              Supprimer le groupe
            </button>
          )}
        </div>
      </div>

      {/* ===== Modale : Ajouter des membres ===== */}
      {ajoutMembresOuvert && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
          onClick={() => {
            setAjoutMembresOuvert(false)
            setNouveaux([])
          }}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Ajouter des membres</h3>
              <button
                type="button"
                onClick={() => {
                  setAjoutMembresOuvert(false)
                  setNouveaux([])
                }}
                className="flex size-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
                aria-label="Fermer"
              >
                <X className="size-4" />
              </button>
            </div>

            <SelecteurDestinataires
              choisis={nouveaux}
              onChange={setNouveaux}
              exclure={[utilisateur.matricule, ...participants.map((p) => p.matricule)]}
            />

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAjoutMembresOuvert(false)
                  setNouveaux([])
                }}
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={ajouterMembres}
                disabled={nouveaux.length === 0 || enregistrement}
                className="inline-flex items-center gap-2 rounded-full bg-lagon-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-lagon-700 disabled:opacity-50"
              >
                {enregistrement && (
                  <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                Ajouter {nouveaux.length > 0 && `(${nouveaux.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
