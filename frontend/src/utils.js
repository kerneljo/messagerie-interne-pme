/** Extrait un message lisible d'une erreur axios (validation Laravel incluse). */
export function messageErreur(err) {
  const d = err?.response?.data
  if (d?.errors) {
    const premiere = Object.values(d.errors).flat()[0]
    if (premiere) return premiere
  }
  return d?.message || 'Une erreur est survenue.'
}

/** Heure si c'est aujourd'hui, sinon jj/mm. */
export function heureCourte(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (d.toDateString() === new Date().toDateString()) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export function heureSeule(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** Libellé de séparateur de jour dans la discussion. */
export function libelleJour(iso) {
  const d = new Date(iso)
  const hier = new Date()
  hier.setDate(hier.getDate() - 1)
  if (d.toDateString() === new Date().toDateString()) return "Aujourd'hui"
  if (d.toDateString() === hier.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function tailleLisible(octets) {
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}

export function initiales(prenom, nom) {
  return `${(prenom ?? '').charAt(0)}${(nom ?? '').charAt(0)}`.toUpperCase() || '?'
}

// Classes complètes (Tailwind ne détecte que les noms écrits en entier dans le code)
const COULEURS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]

export function couleurAvatar(graine) {
  let somme = 0
  for (const c of String(graine)) somme += c.charCodeAt(0)
  return COULEURS[somme % COULEURS.length]
}
