import { useEffect, useState } from 'react'
import {
  Plus, Pencil, UserX, UserCheck, Search, Users, Mail, X,
  ChevronLeft, ChevronRight, Shield, Briefcase, Building2, AlertTriangle,
  Check, XCircle,
} from 'lucide-react'
import api from '../../api'
import { useAuth } from '../../AuthContext'
import useDebounce from '../../useDebounce'
import { Avatar, Bouton, Chargement, EtatVide } from '../../components/ui'
import ConfirmationModal from '../../components/ConfirmationModal'

const ROLES_VIDE = []
const SERVICES_VIDE = []
const POSTES_VIDE = []

const CONTOUR = 'border-slate-200 dark:border-slate-300'
const CLASSE_CHAMP =
  'w-full rounded-lg border px-3.5 py-2.5 text-sm bg-papier text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'

export default function AdminUtilisateurs() {
  const { utilisateur: moi } = useAuth()

  const [utilisateurs, setUtilisateurs] = useState([])
  const [stats, setStats] = useState({ total: 0, actifs: 0, en_attente: 0, desactives: 0 })
  const [meta, setMeta] = useState({ page: 1, derniere_page: 1, total: 0 })
  const [chargement, setChargement] = useState(true)

  const [roles, setRoles] = useState(ROLES_VIDE)
  const [services, setServices] = useState(SERVICES_VIDE)
  const [postes, setPostes] = useState(POSTES_VIDE)

  const [recherche, setRecherche] = useState('')
  const [filtreRole, setFiltreRole] = useState('')
  const [filtreService, setFiltreService] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [page, setPage] = useState(1)
  const rechercheDebouncee = useDebounce(recherche, 300)

  const [modalEdition, setModalEdition] = useState(null)
  const [confirmation, setConfirmation] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/api/roles').catch(() => ({ data: [] })),
      api.get('/api/services').catch(() => ({ data: [] })),
      api.get('/api/postes').catch(() => ({ data: [] })),
    ]).then(([r, s, p]) => {
      setRoles(r.data)
      setServices(s.data)
      setPostes(p.data)
    })
  }, [])

  async function charger() {
    setChargement(true)
    try {
      const r = await api.get('/api/admin/utilisateurs', {
        params: {
          q: rechercheDebouncee || undefined,
          code_role: filtreRole || undefined,
          code_service: filtreService || undefined,
          statut: filtreStatut || undefined,
          page,
          par_page: 15,
        },
      })
      setUtilisateurs(r.data.data)
      setMeta(r.data.meta)
      setStats(r.data.stats)
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => { charger() }, [rechercheDebouncee, filtreRole, filtreService, filtreStatut, page])
  useEffect(() => { setPage(1) }, [rechercheDebouncee, filtreRole, filtreService, filtreStatut])

  async function confirmerAction() {
    const { user, action } = confirmation
    try {
      if (action === 'desactiver') {
        await api.delete(`/api/admin/utilisateurs/${user.matricule}`)
      } else if (action === 'reactiver') {
        await api.post(`/api/admin/utilisateurs/${user.matricule}/reactiver`)
      } else if (action === 'valider') {
        await api.post(`/api/admin/utilisateurs/${user.matricule}/valider`)
      } else if (action === 'refuser') {
        await api.post(`/api/admin/utilisateurs/${user.matricule}/refuser`)
      }
      setConfirmation(null)
      charger()
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur.')
      setConfirmation(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Utilisateurs</h2>
          <p className="mt-1 text-sm text-slate-500">
            {stats.total} comptes · {stats.actifs} actifs ·{' '}
            {stats.en_attente > 0 && (
              <span className="font-medium text-mangue-500 dark:text-mangue-400">
                {stats.en_attente} en attente ·{' '}
              </span>
            )}
            {stats.desactives} désactivés
          </p>
        </div>
        <Bouton variante="primaire" onClick={() => setModalEdition('nouveau')}>
          <Plus className="size-4" />
          Nouvel utilisateur
        </Bouton>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher…"
            className={`${CLASSE_CHAMP} ${CONTOUR} pl-10 pr-4`}
          />
        </div>

        <select
          value={filtreRole}
          onChange={(e) => setFiltreRole(e.target.value)}
          className={`${CLASSE_CHAMP} ${CONTOUR}`}
        >
          <option value="">Tous les rôles</option>
          {roles.map((r) => (
            <option key={r.code_role} value={r.code_role}>{r.libelle}</option>
          ))}
        </select>

        <select
          value={filtreService}
          onChange={(e) => setFiltreService(e.target.value)}
          className={`${CLASSE_CHAMP} ${CONTOUR}`}
        >
          <option value="">Tous les services</option>
          {services.map((s) => (
            <option key={s.code_service} value={s.code_service}>{s.nom_service}</option>
          ))}
        </select>

        <select
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
          className={`${CLASSE_CHAMP} ${CONTOUR}`}
        >
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="en_attente">En attente</option>
          <option value="desactive">Désactivé</option>
        </select>
      </div>

      {/* Bannière comptes en attente */}
      {stats.en_attente > 0 && filtreStatut !== 'en_attente' && (
        <button
          onClick={() => setFiltreStatut('en_attente')}
          className="flex w-full items-center gap-2 rounded-xl border border-mangue-400/40 bg-mangue-300/30 px-4 py-3 text-sm text-slate-800 transition hover:bg-mangue-300/50 dark:border-mangue-400/30 dark:bg-mangue-400/10 dark:text-mangue-300 dark:hover:bg-mangue-400/20"
        >
          <AlertTriangle className="size-4 flex-shrink-0" />
          <span>
            <strong>{stats.en_attente}</strong> compte{stats.en_attente > 1 ? 's' : ''} en attente de validation
          </span>
          <span className="ml-auto text-xs opacity-70">Cliquez pour filtrer →</span>
        </button>
      )}

      {/* Tableau */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-papier">
        {chargement ? (
          <Chargement />
        ) : utilisateurs.length === 0 ? (
          <EtatVide icone={Users} titre="Aucun utilisateur">
            {filtreStatut === 'en_attente'
              ? 'Aucun compte en attente de validation.'
              : recherche || filtreRole || filtreService || filtreStatut
                ? 'Aucun résultat pour ces filtres.'
                : 'Commencez par créer un compte.'}
          </EtatVide>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-100">
                <tr>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="hidden px-4 py-3 md:table-cell">Poste</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Service</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Rôle</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-200">
                {utilisateurs.map((u) => {
                  const estMoi = u.matricule === moi?.matricule
                  return (
                    <tr key={u.matricule} className="hover:bg-slate-50 dark:hover:bg-slate-100">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar prenom={u.prenom} nom={u.nom} taille="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">
                              {u.prenom} {u.nom}
                              {estMoi && <span className="ml-2 text-xs text-slate-400">(vous)</span>}
                            </p>
                            <p className="truncate text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                        {u.poste?.libelle || '—'}
                      </td>
                      <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                        {u.service?.nom_service || '—'}
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.role?.libelle === 'Administrateur'
                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-100 dark:text-violet-800'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-200 dark:text-slate-700'
                        }`}>
                          {u.role?.libelle || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BadgeStatut statut={u.statut_compte} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setModalEdition(u)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-200"
                            aria-label="Modifier"
                            title="Modifier"
                          >
                            <Pencil className="size-4" />
                          </button>

                          {u.statut_compte === 'en_attente' && (
                            <>
                              <button
                                onClick={() => setConfirmation({ user: u, action: 'valider' })}
                                className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-100"
                                aria-label="Valider"
                                title="Valider le compte"
                              >
                                <Check className="size-4" />
                              </button>
                              <button
                                onClick={() => setConfirmation({ user: u, action: 'refuser' })}
                                className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15"
                                aria-label="Refuser"
                                title="Refuser le compte"
                              >
                                <XCircle className="size-4" />
                              </button>
                            </>
                          )}

                          {u.statut_compte === 'actif' && (
                            <button
                              onClick={() => setConfirmation({ user: u, action: 'desactiver' })}
                              disabled={estMoi}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-500/15"
                              aria-label="Désactiver"
                              title={estMoi ? 'Vous ne pouvez pas vous désactiver' : 'Désactiver'}
                            >
                              <UserX className="size-4" />
                            </button>
                          )}

                          {u.statut_compte === 'desactive' && (
                            <button
                              onClick={() => setConfirmation({ user: u, action: 'reactiver' })}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-100"
                              aria-label="Réactiver"
                              title="Réactiver"
                            >
                              <UserCheck className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.derniere_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-300">
            <span>
              {meta.total} résultat{meta.total > 1 ? 's' : ''} · page {meta.page} / {meta.derniere_page}
            </span>
            <div className="flex items-center gap-2">
              <Bouton disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)} aria-label="Précédent">
                <ChevronLeft className="size-4" />
              </Bouton>
              <Bouton disabled={meta.page >= meta.derniere_page} onClick={() => setPage(meta.page + 1)} aria-label="Suivant">
                <ChevronRight className="size-4" />
              </Bouton>
            </div>
          </div>
        )}
      </div>

      {/* Modal création/édition */}
      {modalEdition && (
        <ModalUtilisateur
          utilisateur={modalEdition === 'nouveau' ? null : modalEdition}
          roles={roles}
          services={services}
          postes={postes}
          moiMeme={modalEdition !== 'nouveau' && modalEdition.matricule === moi?.matricule}
          onFermer={() => setModalEdition(null)}
          onEnregistre={() => { setModalEdition(null); charger() }}
        />
      )}

      {/* Confirmation */}
      {confirmation && (() => {
        const config = {
          desactiver: {
            titre: 'Désactiver ce compte ?',
            message: `${confirmation.user.prenom} ${confirmation.user.nom} ne pourra plus se connecter. Ses données sont conservées.`,
            texteConfirmer: 'Désactiver',
            variant: 'danger',
          },
          reactiver: {
            titre: 'Réactiver ce compte ?',
            message: `${confirmation.user.prenom} ${confirmation.user.nom} pourra à nouveau se connecter.`,
            texteConfirmer: 'Réactiver',
            variant: 'primary',
          },
          valider: {
            titre: 'Valider ce compte ?',
            message: `${confirmation.user.prenom} ${confirmation.user.nom} pourra se connecter et accéder à la plateforme.`,
            texteConfirmer: 'Valider',
            variant: 'primary',
          },
          refuser: {
            titre: 'Refuser ce compte ?',
            message: `La demande de ${confirmation.user.prenom} ${confirmation.user.nom} sera refusée. Cette action est irréversible.`,
            texteConfirmer: 'Refuser',
            variant: 'danger',
          },
        }
        const c = config[confirmation.action]
        if (!c) return null
        return (
          <ConfirmationModal
            ouvert
            onFermer={() => setConfirmation(null)}
            onConfirmer={confirmerAction}
            titre={c.titre}
            message={c.message}
            texteConfirmer={c.texteConfirmer}
            variant={c.variant}
          />
        )
      })()}
    </div>
  )
}

/* ============================================================
   Badge de statut
   ============================================================ */
function BadgeStatut({ statut }) {
  const config = {
    actif: {
      classe: 'bg-blue-100 text-blue-700 dark:bg-blue-100 dark:text-blue-800',
      libelle: 'Actif',
    },
    en_attente: {
      classe: 'bg-mangue-300/40 text-mangue-500 dark:bg-mangue-400/20 dark:text-mangue-400',
      libelle: 'En attente',
    },
    desactive: {
      classe: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300',
      libelle: 'Désactivé',
    },
  }
  const c = config[statut] || { classe: 'bg-slate-100 text-slate-600 dark:bg-slate-200 dark:text-slate-700', libelle: statut || '—' }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${c.classe}`}>
      {c.libelle}
    </span>
  )
}

/* ============================================================
   Modal création / édition
   ============================================================ */
function ModalUtilisateur({ utilisateur, roles, services, postes, moiMeme, onFermer, onEnregistre }) {
  const estEdition = !!utilisateur
  const [nom, setNom] = useState(utilisateur?.nom || '')
  const [prenom, setPrenom] = useState(utilisateur?.prenom || '')
  const [email, setEmail] = useState(utilisateur?.email || '')
  const [motDePasse, setMotDePasse] = useState('')
  const [codePoste, setCodePoste] = useState(utilisateur?.poste?.code_poste || '')
  const [codeService, setCodeService] = useState(utilisateur?.service?.code_service || '')
  const [codeRole, setCodeRole] = useState(utilisateur?.role?.code_role || 2)
  const [erreur, setErreur] = useState('')
  const [erreursChamps, setErreursChamps] = useState({})
  const [envoi, setEnvoi] = useState(false)

  async function soumettre(e) {
    e.preventDefault()
    setErreur('')
    setErreursChamps({})
    setEnvoi(true)

    try {
      const payload = {
        nom, prenom, email,
        code_poste: codePoste || null,
        code_service: codeService,
        code_role: codeRole,
      }
      if (motDePasse) payload.mot_de_passe = motDePasse

      if (estEdition) {
        await api.put(`/api/admin/utilisateurs/${utilisateur.matricule}`, payload)
      } else {
        await api.post('/api/admin/utilisateurs', payload)
      }
      onEnregistre()
    } catch (err) {
      const data = err.response?.data
      if (data?.errors) setErreursChamps(data.errors)
      setErreur(data?.message || 'Erreur.')
    } finally {
      setEnvoi(false)
    }
  }

  const erreurDe = (champ) => erreursChamps[champ]?.[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-black/70" onClick={onFermer} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-papier shadow-2xl">
        {/* En-tête */}
        <div className="sticky top-0 flex items-center justify-between rounded-t-2xl border-b border-slate-100 bg-papier px-6 py-4 dark:border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            {estEdition ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
          </h3>
          <button
            onClick={onFermer}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-200"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={soumettre} className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Prénom *" erreur={erreurDe('prenom')}>
              <input
                type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} required
                className={`${CLASSE_CHAMP} ${CONTOUR}`}
              />
            </Champ>
            <Champ label="Nom *" erreur={erreurDe('nom')}>
              <input
                type="text" value={nom} onChange={(e) => setNom(e.target.value)} required
                className={`${CLASSE_CHAMP} ${CONTOUR}`}
              />
            </Champ>
          </div>

          <Champ label="Adresse e-mail *" erreur={erreurDe('email')}>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className={`${CLASSE_CHAMP} ${CONTOUR}`}
            />
          </Champ>

          <Champ
            label={estEdition ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe initial *'}
            erreur={erreurDe('mot_de_passe')}
          >
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required={!estEdition}
              placeholder="8 caractères minimum"
              className={`${CLASSE_CHAMP} ${CONTOUR}`}
            />
          </Champ>

          <Champ label="Poste" erreur={erreurDe('code_poste')}>
            <select
              value={codePoste} onChange={(e) => setCodePoste(e.target.value)}
              className={`${CLASSE_CHAMP} ${CONTOUR}`}
            >
              <option value="">— Aucun —</option>
              {postes.map((p) => (
                <option key={p.code_poste} value={p.code_poste}>{p.libelle}</option>
              ))}
            </select>
          </Champ>

          <div className="grid grid-cols-2 gap-4">
            <Champ label="Service *" erreur={erreurDe('code_service')}>
              <select
                value={codeService} onChange={(e) => setCodeService(e.target.value)} required
                className={`${CLASSE_CHAMP} ${CONTOUR}`}
              >
                <option value="">— Choisir —</option>
                {services.map((s) => (
                  <option key={s.code_service} value={s.code_service}>{s.nom_service}</option>
                ))}
              </select>
            </Champ>

            <Champ label="Rôle *" erreur={erreurDe('code_role')}>
              <select
                value={codeRole} onChange={(e) => setCodeRole(e.target.value)} required
                disabled={moiMeme}
                title={moiMeme ? 'Vous ne pouvez pas changer votre propre rôle' : ''}
                className={`${CLASSE_CHAMP} ${CONTOUR} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {roles.map((r) => (
                  <option key={r.code_role} value={r.code_role}>{r.libelle}</option>
                ))}
              </select>
            </Champ>
          </div>

          {erreur && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/15">
              <AlertTriangle className="mt-0.5 size-4 flex-shrink-0 text-red-500 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{erreur}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button" onClick={onFermer} disabled={envoi}
              className={`rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-100 ${CONTOUR}`}
            >
              Annuler
            </button>
            <button
              type="submit" disabled={envoi}
              className="rounded-lg bg-action-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-action-700 disabled:opacity-60"
            >
              {envoi ? '…' : estEdition ? 'Enregistrer' : 'Créer le compte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Champ({ label, erreur, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      {children}
      {erreur && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{erreur}</p>}
    </div>
  )
}