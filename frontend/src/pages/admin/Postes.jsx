import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Briefcase } from 'lucide-react'
import api from '../../api'
import { Bouton, Chargement, EtatVide } from '../../components/ui'
import ConfirmationModal from '../../components/ConfirmationModal'

export default function AdminPostes() {
  const [postes, setPostes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [modalOuverte, setModalOuverte] = useState(false)
  const [posteEdite, setPosteEdite] = useState(null)
  const [confirmation, setConfirmation] = useState(null)

  async function charger() {
    setChargement(true)
    try {
      const r = await api.get('/api/admin/postes', {
        params: { q: recherche || undefined },
      })
      setPostes(r.data)
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(charger, 300)
    return () => clearTimeout(t)
  }, [recherche])

  async function confirmerSuppression() {
    try {
      await api.delete(`/api/admin/postes/${confirmation.code_poste}`)
      setConfirmation(null)
      charger()
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la suppression.')
      setConfirmation(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Postes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Gérez la liste des postes proposés à l’inscription.
          </p>
        </div>
        <Bouton variante="primaire" onClick={() => { setPosteEdite(null); setModalOuverte(true) }}>
          <Plus className="size-4" />
          Nouveau poste
        </Bouton>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un poste…"
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {chargement ? (
          <Chargement />
        ) : postes.length === 0 ? (
          <EtatVide icone={Briefcase} titre="Aucun poste">
            {recherche ? 'Aucun résultat.' : 'Commencez par créer un poste.'}
          </EtatVide>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Libellé</th>
                <th className="px-4 py-3 hidden sm:table-cell">Description</th>
                <th className="px-4 py-3 text-center">Utilisateurs</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {postes.map((p) => (
                <tr key={p.code_poste} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.libelle}</td>
                  <td className="px-4 py-3 text-slate-500 hidden sm:table-cell truncate max-w-xs">
                    {p.description || '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {p.utilisateurs_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      p.actif ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {p.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setPosteEdite(p); setModalOuverte(true) }}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Modifier"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => setConfirmation(p)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
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
        )}
      </div>

      {modalOuverte && (
        <ModalPoste
          poste={posteEdite}
          onFermer={() => setModalOuverte(false)}
          onEnregistre={() => { setModalOuverte(false); charger() }}
        />
      )}

      <ConfirmationModal
        ouvert={!!confirmation}
        onFermer={() => setConfirmation(null)}
        onConfirmer={confirmerSuppression}
        titre="Supprimer ce poste ?"
        message={confirmation ? `Le poste "${confirmation.libelle}" sera définitivement supprimé.` : ''}
        texteConfirmer="Supprimer"
        variant="danger"
      />
    </div>
  )
}

function ModalPoste({ poste, onFermer, onEnregistre }) {
  const [libelle, setLibelle] = useState(poste?.libelle || '')
  const [description, setDescription] = useState(poste?.description || '')
  const [actif, setActif] = useState(poste?.actif ?? true)
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  async function soumettre(e) {
    e.preventDefault()
    setErreur('')
    setEnvoi(true)
    try {
      if (poste) {
        await api.put(`/api/admin/postes/${poste.code_poste}`, { libelle, description, actif })
      } else {
        await api.post('/api/admin/postes', { libelle, description, actif })
      }
      onEnregistre()
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onFermer} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {poste ? 'Modifier le poste' : 'Nouveau poste'}
          </h3>
        </div>
        <form onSubmit={soumettre} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Libellé *</label>
            <input
              type="text"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={actif}
              onChange={(e) => setActif(e.target.checked)}
              className="rounded border-slate-300"
            />
            Poste actif (visible à l'inscription)
          </label>

          {erreur && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {erreur}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onFermer}
              disabled={envoi}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={envoi}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {envoi ? '…' : poste ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
