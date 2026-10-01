import { useEffect, useState } from 'react'
import api from '../api'
import { messageErreur } from '../utils'

const TYPES = [
  { valeur: 'DIRECT', nom: 'Message direct', aide: 'Une personne' },
  { valeur: 'GROUPE', nom: 'Groupe', aide: '3 personnes ou plus, tout le monde ecrit' },
  { valeur: 'DIFFUSION', nom: 'Diffusion', aide: 'Vous seul ecrivez, les autres lisent' },
]

export default function NouvelleConversation({ onFermer, onCreee }) {
  const [type, setType] = useState('DIRECT')
  const [titre, setTitre] = useState('')
  const [q, setQ] = useState('')
  const [annuaire, setAnnuaire] = useState([])
  const [choisis, setChoisis] = useState([])
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  // Recherche dans l'annuaire (avec un petit delai pendant la saisie)
  useEffect(() => {
    const minuteur = setTimeout(() => {
      api
        .get('/api/annuaire', { params: { q, limite: 50 } })
        .then((r) => setAnnuaire(r.data))
        .catch((e) => setErreur(messageErreur(e)))
    }, 250)
    return () => clearTimeout(minuteur)
  }, [q])

  const direct = type === 'DIRECT'
  const minimum = type === 'GROUPE' ? 2 : 1 // sans compter le createur
  const pret = choisis.length >= minimum && (direct || titre.trim() !== '')

  function changerType(nouveau) {
    setType(nouveau)
    if (nouveau === 'DIRECT') setChoisis((c) => c.slice(0, 1))
  }

  function basculer(personne) {
    setChoisis((actuels) => {
      if (actuels.some((p) => p.matricule === personne.matricule)) {
        return actuels.filter((p) => p.matricule !== personne.matricule)
      }
      return direct ? [personne] : [...actuels, personne]
    })
  }

  async function creer() {
    setEnvoi(true)
    setErreur('')
    try {
      const { data } = await api.post('/api/conversations', {
        type,
        titre: direct ? undefined : titre.trim(),
        participants: choisis.map((p) => p.matricule),
      })
      await onCreee(data)
    } catch (e) {
      setErreur(messageErreur(e))
      setEnvoi(false)
    }
  }

  return (
    <div className="modal-fond" onMouseDown={(e) => e.target === e.currentTarget && onFermer()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Nouvelle conversation">
        <h2>Nouvelle conversation</h2>

        <div className="types">
          {TYPES.map((t) => (
            <label key={t.valeur} className={'type' + (type === t.valeur ? ' actif' : '')}>
              <input
                type="radio"
                name="type"
                value={t.valeur}
                checked={type === t.valeur}
                onChange={() => changerType(t.valeur)}
              />
              <strong>{t.nom}</strong>
              <small>{t.aide}</small>
            </label>
          ))}
        </div>

        {!direct && (
          <label className="champ">
            Titre
            <input value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={150} placeholder="Nom du groupe ou de l'annonce" />
          </label>
        )}

        <label className="champ">
          {direct ? 'Destinataire' : 'Participants'}
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un collegue..." />
        </label>

        {choisis.length > 0 && (
          <div className="puces">
            {choisis.map((p) => (
              <button key={p.matricule} type="button" className="puce" onClick={() => basculer(p)}>
                {p.prenom} {p.nom} ✕
              </button>
            ))}
          </div>
        )}

        <ul className="annuaire">
          {annuaire.length === 0 && <li className="vide">Aucun resultat.</li>}
          {annuaire.map((p) => {
            const coche = choisis.some((c) => c.matricule === p.matricule)
            return (
              <li key={p.matricule}>
                <label className="personne">
                  <input type={direct ? 'radio' : 'checkbox'} name="personne" checked={coche} onChange={() => basculer(p)} />
                  <span>
                    <strong>{p.prenom} {p.nom}</strong>
                    <small>{[p.poste, p.service].filter(Boolean).join(' · ')}</small>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>

        {erreur && <p className="erreur" role="alert">{erreur}</p>}

        <div className="modal-actions">
          <button className="btn" onClick={onFermer} disabled={envoi}>Annuler</button>
          <button className="btn btn-primaire" onClick={creer} disabled={!pret || envoi}>
            {envoi ? 'Creation...' : 'Creer'}
          </button>
        </div>
      </div>
    </div>
  )
}
