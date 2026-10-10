/*
 * « Salle » courante selon la page : détermine la couleur d'accent de la section
 * (onglet de la sidebar, et toute zone qui utilise la classe bg-salle).
 */
export function salleDe(pathname) {
  if (pathname === '/') return 'dashboard'
  if (pathname.startsWith('/envoyer')) return 'envoyer'
  if (pathname.startsWith('/recus')) return 'recus'
  if (pathname.startsWith('/envoyes')) return 'envoyes'
  if (pathname.startsWith('/conversations')) return 'conversations'
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/profil')) return 'profil'
  return 'dashboard'
}
