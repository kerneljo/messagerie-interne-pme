import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Building2, X, AlertTriangle } from 'lucide-react'
import api from '../../api'
import useDebounce from '../../useDebounce'
import { Bouton, Chargement, EtatVide } from '../../components/ui'
import ConfirmationModal from '../../components/ConfirmationModal'

export default function AdminServices() {
  const [services, setServices] = useState([])
  const [chargement, setChargement] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [modalOuverte, setModalOuverte] = useState(false)
  const [serviceEdite, setServiceEdite] = useState(null)
  const [confirmation, setConfirmation] = useState(null)

  const rechercheDebouncee = useDebounce(recherche, 300)

  async function charger() {
    setChargement(true)
    try {
      const r = await api.get('/api/admin/services', {
        params: { q: rechercheDebouncee || undefined },
      })
      setServices(r.data)
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => { charger() }, [rechercheDebouncee])

  async function confirmerSuppression() {
    try {
      await api.delete(`/api/admin/services/${confirmation.code_service}`)
      setConfirmation(null)
      charger()
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la suppression.')
      setConfirmation(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Services</h2>
          <p className="mt-1 text-sm text-slate-500">
            Départements et services de l’entreprise.
          </p>
        </div>
        <Bouton variante="primaire" onClick={() => { setServiceEdite(null); setModalOuverte(true) }}>
          <Plus className="size-4" />
          Nouveau service
        </Bouton>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un service…"
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {chargement ? (
          <Chargement />
        ) : services.length === 0 ? (
          <EtatVide icone={Building2} titre="Aucun service">
            {recherche ? 'Aucun résultat.' : 'Commencez par créer un service.'}
          </EtatVide>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Nom du service</th>
                  <th className="px-4 py-3 text-center">Utilisateurs</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map((s) => (
                  <tr key={s.code_service} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Building2 className="size-4" />
                        </span>
                        <span className="font-medium text-slate-900">{s.nom_service}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {s.utilisateurs_count ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => { setServiceEdite(s); setModalOuverte(true) }}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          aria-label="Modifier"
                          title="Modifier"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => setConfirmation(s)}
                          disabled={(s.utilisateurs_count ?? 0) > 0}
                          title={(s.utilisateurs_count ?? 0) > 0 ? 'Service utilisé par des utilisateurs' : 'Supprimer'}
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600
                                     disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOuverte && (
        <ModalService
          service={serviceEdite}
          onFermer={() => setModalOuverte(false)}
          onEnregistre={() => { setModalOuverte(false); charger() }}
        />
      )}

      <ConfirmationModal
        ouvert={!!confirmation}
        onFermer={() => setConfirmation(null)}
        onConfirmer={confirmerSuppression}
        titre="Supprimer ce service ?"
        message={confirmation ? `Le service "${confirmation.nom_service}" sera définitivement supprimé.` : ''}
        texteConfirmer="Supprimer"
        variant="danger"
      />
    </div>
  )
}

function ModalService({ service, onFermer, onEnregistre }) {
  const [nom, setNom] = useState(service?.nom_service || '')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  async function soumettre(e) {
    e.preventDefault()
    setErreur('')
    setEnvoi(true)
    try {
      if (service) {
        await api.put(`/api/admin/services/${service.code_service}`, { nom_service: nom })
      } else {
        await api.post('/api/admin/services', { nom_service: nom })
      }
      onEnregistre()
    } catch (err) {
      const data = err.response?.data
      setErreur(data?.errors?.nom_service?.[0] || data?.message || 'Erreur.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onFermer} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {service ? 'Modifier le service' : 'Nouveau service'}
          </h3>
          <button onClick={onFermer} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fermer">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={soumettre} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nom du service *
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              autoFocus
              placeholder="Ex : Marketing, Comptabilité…"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          {erreur && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
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
              {envoi ? '…' : service ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
