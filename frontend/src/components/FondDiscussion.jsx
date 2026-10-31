/**
 * Fond de la zone de discussion, version professionnelle.
 *
 *  1. une couleur de base neutre, légèrement teintée vert Fulmar,
 *  2. deux lueurs très douces (une fraîche en haut à gauche, une chaude en bas à droite),
 *  3. une grille de points fine, plus marquée sur les bords et atténuée au centre
 *     pour ne jamais gêner la lecture des messages.
 *
 * Aucun feuillage, aucune couleur vive : le fond reste en retrait, les bulles passent au premier plan.
 *
 * Props (identiques à l'ancienne version) :
 *  - className : classes du conteneur (ex. "pointer-events-none absolute inset-0 -z-10 size-full")
 *  - sombre    : version nuit
 *  - intensite : multiplicateur d'opacité de la grille (1 = défaut, 0 = aucune grille, 1.5 = marquée)
 *  - anime     : true pour une dérive très lente des lueurs (désactivée par défaut)
 *
 * L'animation est coupée automatiquement si le système demande « réduire les animations ».
 */
const THEMES = {
  clair: {
    fond: '#EEF3F0',
    lueurFraiche: 'rgba(160, 205, 192, 0.55)',
    lueurChaude: 'rgba(240, 220, 200, 0.55)',
    points: '#0B2925',
    opacitePoints: 0.1,
  },
  sombre: {
    fond: '#0C1A17',
    lueurFraiche: 'rgba(31, 90, 74, 0.45)',
    lueurChaude: 'rgba(74, 51, 34, 0.30)',
    points: '#A8E0C8',
    opacitePoints: 0.08,
  },
}

const ESPACEMENT = 24
const RAYON = 1.1

const STYLES = `
.fd-lueur {
  position: absolute;
  border-radius: 9999px;
  will-change: transform;
}
.fd-l1 { top: -30%; left: -20%; width: 80%; height: 90%; }
.fd-l2 { bottom: -35%; right: -20%; width: 85%; height: 95%; }

.fd-vivant .fd-l1 { animation: fd-a 70s ease-in-out infinite; }
.fd-vivant .fd-l2 { animation: fd-b 85s ease-in-out infinite; }

@keyframes fd-a { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(10%,8%,0); } }
@keyframes fd-b { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(-9%,-7%,0); } }

@media (prefers-reduced-motion: reduce) {
  .fd-vivant .fd-l1, .fd-vivant .fd-l2 { animation: none; }
}
`

// Points fortement atténués au centre (zone de lecture), pleins vers les bords
const MASQUE = 'radial-gradient(ellipse 75% 70% at 50% 45%, rgba(0,0,0,0.3) 0%, #000 100%)'

export default function FondDiscussion({
  className = '',
  sombre = false,
  intensite = 1,
  anime = false,
}) {
  const t = sombre ? THEMES.sombre : THEMES.clair
  const opacitePoints = Math.min(1, t.opacitePoints * intensite)

  return (
    <div className={className} aria-hidden="true">
      <style>{STYLES}</style>

      <div
        className={anime ? 'fd-vivant' : ''}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          isolation: 'isolate',
          backgroundColor: t.fond,
        }}
      >
        {/* Lueurs douces */}
        <div
          className="fd-lueur fd-l1"
          style={{ background: `radial-gradient(closest-side, ${t.lueurFraiche}, transparent)` }}
        />
        <div
          className="fd-lueur fd-l2"
          style={{ background: `radial-gradient(closest-side, ${t.lueurChaude}, transparent)` }}
        />

        {/* Grille de points */}
        {opacitePoints > 0 && (
          <svg
            width="100%"
            height="100%"
            xmlns="http://www.w3.org/2000/svg"
            role="presentation"
            focusable="false"
            style={{
              position: 'absolute',
              inset: 0,
              WebkitMaskImage: MASQUE,
              maskImage: MASQUE,
            }}
          >
            <defs>
              <pattern id="fd-points" width={ESPACEMENT} height={ESPACEMENT} patternUnits="userSpaceOnUse">
                <circle cx={ESPACEMENT / 2} cy={ESPACEMENT / 2} r={RAYON} fill={t.points} fillOpacity={opacitePoints} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#fd-points)" />
          </svg>
        )}
      </div>
    </div>
  )
}
