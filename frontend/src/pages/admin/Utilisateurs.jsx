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

export default function AdminUtilisateurs() {
  const { utilisateur: moi } = useAuth()

  const [utilisateurs, setUtilisateurs] = useState([])
  const [stats, setStats] = useState({ total: 0, actifs: 0, en_attente: 0, desactives: 0 })
  const [meta, setMeta] = useState({ page: 1, derniere_page: 1, total: 0 })
  const [chargement, setChargement] = useState(true)

  const [roles, setRoles] = useState(ROLES_VIDE)
  const [services, setServices] = useState(SERVICES_VIDE)
  const [postes, setPostes] = useState(POSTES_VIDE)

  // Filtres
  const [recherche, setRecherche] = useState('')
  const [filtreRole, setFiltreRole] = useState('')
  const [filtreService, setFiltreService] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [page, setPage] = useState(1)
  const rechercheDebouncee = useDebounce(recherche, 300)

  // Modales
  const [modalEdition, setModalEdition] = useState(null)   // user ou 'nouveau'
  const [confirmation, setConfirmation] = useState(null)   // { user, action }

  // Charge les référentiels une fois
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

  // Charge les utilisateurs
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

  // Reset page quand filtres changent
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
              <span className="text-amber-600 font-medium">
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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher…"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>

        <select
          value={filtreRole}
          onChange={(e) => setFiltreRole(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        >
          <option value="">Tous les rôles</option>
          {roles.map((r) => (
            <option key={r.code_role} value={r.code_role}>{r.libelle}</option>
          ))}
        </select>

        <select
          value={filtreService}
          onChange={(e) => setFiltreService(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        >
          <option value="">Tous les services</option>
          {services.map((s) => (
            <option key={s.code_service} value={s.code_service}>{s.nom_service}</option>
          ))}
        </select>

        <select
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
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
          className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-amber-50 border border-amber-200
                     text-sm text-amber-800 hover:bg-amber-100 transition-colors"
        >
          <AlertTriangle className="size-4 flex-shrink-0" />
          <span>
            <strong>{stats.en_attente}</strong> compte{stats.en_attente > 1 ? 's' : ''} en attente de validation
          </span>
          <span className="ml-auto text-xs text-amber-600">Cliquez pour filtrer →</span>
        </button>
      )}

      {/* Tableau */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
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
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3 hidden md:table-cell">Poste</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Service</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Rôle</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {utilisateurs.map((u) => {
                  const estMoi = u.matricule === moi?.matricule
                  return (
                    <tr key={u.matricule} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar prenom={u.prenom} nom={u.nom} taille="sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">
                              {u.prenom} {u.nom}
                              {estMoi && <span className="ml-2 text-xs text-slate-400">(vous)</span>}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-600">
                        {u.poste?.libelle || '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-slate-600">
                        {u.service?.nom_service || '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          u.role?.libelle === 'Administrateur'
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-slate-100 text-slate-600'
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
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            aria-label="Modifier"
                            title="Modifier"
                          >
                            <Pencil className="size-4" />
                          </button>

                          {u.statut_compte === 'en_attente' && (
                            <>
                              <button
                                onClick={() => setConfirmation({ user: u, action: 'valider' })}
                                className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                aria-label="Valider"
                                title="Valider le compte"
                              >
                                <Check className="size-4" />
                              </button>
                              <button
                                onClick={() => setConfirmation({ user: u, action: 'refuser' })}
                                className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-600"
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
                              className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label="Désactiver"
                              title={estMoi ? 'Vous ne pouvez pas vous désactiver' : 'Désactiver'}
                            >
                              <UserX className="size-4" />
                            </button>
                          )}

                          {u.statut_compte === 'desactive' && (
                            <button
                              onClick={() => setConfirmation({ user: u, action: 'reactiver' })}
                              className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
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
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
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

      {/* Confirmation valider / refuser / désactiver / réactiver */}
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
    actif:      { classe: 'bg-emerald-100 text-emerald-700', libelle: 'Actif' },
    en_attente: { classe: 'bg-amber-100 text-amber-700',     libelle: 'En attente' },
    desactive:  { classe: 'bg-red-100 text-red-700',         libelle: 'Désactivé' },
  }
  const c = config[statut] || { classe: 'bg-slate-100 text-slate-600', libelle: statut || '—' }
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${c.classe}`}>
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
      <div className="absolute inset-0 bg-slate-900/50" onClick={onFermer} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-semibold text-slate-900">
            {estEdition ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'}
          </h3>
          <button onClick={onFermer} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fermer">
            <X className="size-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={soumettre} className="px-6 py-5 space-y-4">
          {/* Prénom + Nom */}
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Prénom *" erreur={erreurDe('prenom')}>
              <input
                type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </Champ>
            <Champ label="Nom *" erreur={erreurDe('nom')}>
              <input
                type="text" value={nom} onChange={(e) => setNom(e.target.value)} required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </Champ>
          </div>

          <Champ label="Adresse e-mail *" erreur={erreurDe('email')}>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
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
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </Champ>

          <Champ label="Poste" erreur={erreurDe('code_poste')}>
            <select
              value={codePoste} onChange={(e) => setCodePoste(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
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
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm bg-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
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
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm bg-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {roles.map((r) => (
                  <option key={r.code_role} value={r.code_role}>{r.libelle}</option>
                ))}
              </select>
            </Champ>
          </div>

          {erreur && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="size-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{erreur}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button" onClick={onFermer} disabled={envoi}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit" disabled={envoi}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
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
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      {children}
      {erreur && (
        <p className="mt-1 text-xs text-red-600">{erreur}</p>
      )}
    </div>
  )
}
