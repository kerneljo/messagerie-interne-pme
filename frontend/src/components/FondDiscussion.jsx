/**
 * Fond de la zone de discussion, façon Telegram :
 *  1. une couleur de base,
 *  2. quatre nappes de couleur qui dérivent lentement (dégradé vivant),
 *  3. le motif « feuillage tropical de Madagascar », très discret, par-dessus.
 *
 * Choix de performance : seules les nappes bougent (transform uniquement),
 * le motif est une couche statique sans mélange de couleurs.
 *
 * Props :
 *  - className : classes du conteneur (ex. "pointer-events-none absolute inset-0 -z-10 size-full")
 *  - sombre    : version nuit
 *  - intensite : multiplicateur d'opacité du motif (1 = défaut, 0.5 = quasi invisible, 1.5 = marqué)
 *  - anime     : false pour figer le dégradé
 *
 * L'animation est coupée automatiquement si le système demande « réduire les animations ».
 */
const THEMES = {
  clair: {
    fond: '#7EC6B2',
    // Quatre verts / vert-bleu de luminosité proche : pas de zone délavée
    nappes: ['#5DB39A', '#8ED3C4', '#A3D49A', '#2F9488'],
    motif: '#134A3C',
    baie: '#C2441F',
    baiePale: '#B97A5C',
    opaciteFeuille: 0.05,
    opaciteContour: 0.10,
    opaciteBaie: 0.16,
  },
  sombre: {
    fond: '#0D1816',
    nappes: ['#1F5A4A', '#2E4A2A', '#134A52', '#4A3322'],
    motif: '#A8E0C8',
    baie: '#E8622E',
    baiePale: '#A67B5E',
    opaciteFeuille: 0.05,
    opaciteContour: 0.09,
    opaciteBaie: 0.14,
  },
}

const STYLES = `
.fd-nappe {
  position: absolute;
  will-change: transform;
}
.fd-n1 { top: -25%; left: -20%;  width: 85%; height: 85%; animation: fd-a 28s ease-in-out infinite; }
.fd-n2 { top: -20%; right: -25%; width: 80%; height: 80%; animation: fd-b 34s ease-in-out infinite; }
.fd-n3 { bottom: -30%; left: -15%;  width: 90%; height: 90%; animation: fd-c 40s ease-in-out infinite; }
.fd-n4 { bottom: -25%; right: -20%; width: 80%; height: 80%; animation: fd-d 31s ease-in-out infinite; }
.fd-fige .fd-nappe { animation: none; }

@keyframes fd-a { 0%,100% { transform: translate3d(0,0,0) scale(1); }    50% { transform: translate3d(22%,16%,0) scale(1.18); } }
@keyframes fd-b { 0%,100% { transform: translate3d(0,0,0) scale(1.1); }  50% { transform: translate3d(-20%,22%,0) scale(0.92); } }
@keyframes fd-c { 0%,100% { transform: translate3d(0,0,0) scale(1); }    50% { transform: translate3d(18%,-20%,0) scale(1.15); } }
@keyframes fd-d { 0%,100% { transform: translate3d(0,0,0) scale(0.95); } 50% { transform: translate3d(-24%,-14%,0) scale(1.12); } }

@media (prefers-reduced-motion: reduce) {
  .fd-nappe { animation: none; }
}
`

export default function FondDiscussion({
  className = '',
  sombre = false,
  intensite = 1,
  anime = true,
}) {
  const t = sombre ? THEMES.sombre : THEMES.clair

  // Applique le multiplicateur sans dépasser 1
  const o = (v) => Math.min(1, v * intensite)

  const opFeuille = o(t.opaciteFeuille)
  const opContour = o(t.opaciteContour)
  const opBaie = o(t.opaciteBaie)

  return (
    <div className={className} aria-hidden="true">
      <style>{STYLES}</style>

      {/* Conteneur interne : coupe les nappes qui dépassent */}
      <div
        className={anime ? '' : 'fd-fige'}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          isolation: 'isolate',
          backgroundColor: t.fond,
        }}
      >
        {/* Dégradé vivant : quatre nappes de couleur qui dérivent */}
        {t.nappes.map((couleur, i) => (
          <div
            key={couleur}
            className={`fd-nappe fd-n${i + 1}`}
            style={{ background: `radial-gradient(closest-side, ${couleur}, transparent)` }}
          />
        ))}

        {/* Motif statique, très discret */}
        <svg
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          role="presentation"
          focusable="false"
          preserveAspectRatio="xMidYMid slice"
          style={{ position: 'absolute', inset: 0 }}
        >
          <defs>
            {/* Feuille simple (asymétrique) */}
            <g id="fd-feuille">
              <path d="M0 0 C12 -10 10 -28 0 -38 C-7 -25 -6 -10 0 0 Z" />
              <path d="M0 -4 L0 -30" fill="none" strokeWidth="0.8" />
            </g>

            {/* Feuille de palmier (longue, nervures) */}
            <g id="fd-palme">
              <path d="M0 0 C5 -22 5 -46 0 -68 C-5 -46 -5 -22 0 0 Z" />
              <path d="M0 -6 L3 -22 M0 -16 L-3 -32 M0 -26 L2 -44 M0 -38 L-2 -56" fill="none" strokeWidth="0.7" />
            </g>

            {/* Fougère (folioles fines) */}
            <g id="fd-fougere">
              <path d="M0 0 Q3 -14 0 -28" fill="none" strokeWidth="1" />
              <path d="M0 -6 Q-6 -9 -9 -14 M0 -6 Q6 -9 9 -14" fill="none" strokeWidth="0.9" />
              <path d="M0 -14 Q-5 -17 -8 -21 M0 -14 Q5 -17 8 -21" fill="none" strokeWidth="0.9" />
              <path d="M0 -22 Q-4 -24 -6 -28 M0 -22 Q4 -24 6 -28" fill="none" strokeWidth="0.9" />
            </g>

            {/* Brindille (tige + 5 feuilles) */}
            <g id="fd-brindille">
              <path d="M0 0 Q4 -22 0 -46" fill="none" strokeWidth="1" />
              <use href="#fd-feuille" transform="translate(0 -8) rotate(-52) scale(0.62)" />
              <use href="#fd-feuille" transform="translate(1 -8) rotate(52) scale(0.62)" />
              <use href="#fd-feuille" transform="translate(2 -24) rotate(-46) scale(0.58)" />
              <use href="#fd-feuille" transform="translate(2 -24) rotate(48) scale(0.58)" />
              <use href="#fd-feuille" transform="translate(0 -46) scale(0.66)" />
            </g>

            {/* Tuile 260 × 260 */}
            <pattern id="fd-motif" width="260" height="260" patternUnits="userSpaceOnUse">
              {/* Brindilles */}
              <g
                fill="none"
                stroke={t.motif}
                strokeOpacity={opContour}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <use href="#fd-brindille" transform="translate(50 80) rotate(-24)" />
                <use href="#fd-brindille" transform="translate(200 210) rotate(152) scale(0.9)" />
                <use href="#fd-brindille" transform="translate(90 230) rotate(-80) scale(0.75)" />
              </g>

              {/* Feuilles pleines */}
              <g
                fill={t.motif}
                fillOpacity={opFeuille}
                stroke={t.motif}
                strokeOpacity={o(t.opaciteFeuille + 0.05)}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <use href="#fd-feuille" transform="translate(190 75) rotate(34)" />
                <use href="#fd-feuille" transform="translate(120 145) rotate(-58) scale(0.85)" />
                <use href="#fd-feuille" transform="translate(30 195) rotate(18) scale(0.75)" />
                <use href="#fd-feuille" transform="translate(160 30) rotate(-25) scale(0.7)" />
              </g>

              {/* Feuilles de palmier */}
              <g fill="none" stroke={t.motif} strokeOpacity={opContour} strokeWidth="1.4" strokeLinecap="round">
                <use href="#fd-palme" transform="translate(215 155) rotate(-30) scale(0.85)" />
                <use href="#fd-palme" transform="translate(65 35) rotate(40) scale(0.6)" />
              </g>

              {/* Fougères */}
              <g fill="none" stroke={t.motif} strokeOpacity={opContour} strokeWidth="1.2" strokeLinecap="round">
                <use href="#fd-fougere" transform="translate(150 55) rotate(-15)" />
                <use href="#fd-fougere" transform="translate(35 120) rotate(25) scale(0.9)" />
                <use href="#fd-fougere" transform="translate(220 235) rotate(-40) scale(0.8)" />
              </g>

              {/* Feuilles en contour */}
              <g
                fill="none"
                stroke={t.motif}
                strokeOpacity={opContour}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <use href="#fd-feuille" transform="translate(215 30) rotate(-34) scale(0.95)" />
                <use href="#fd-feuille" transform="translate(155 225) rotate(-18) scale(0.75)" />
              </g>

              {/* Baies (touches piment) */}
              <g fill={t.baie} fillOpacity={opBaie}>
                <circle cx="150" cy="115" r="3" />
                <circle cx="20" cy="150" r="2.5" />
                <circle cx="235" cy="30" r="2.5" />
                <circle cx="95" cy="185" r="2.2" />
                <circle cx="200" cy="180" r="2.2" />
              </g>

              {/* Baies pâles */}
              <g fill={t.baiePale} fillOpacity={opBaie * 0.7}>
                <circle cx="185" cy="200" r="2" />
                <circle cx="75" cy="65" r="1.8" />
                <circle cx="120" cy="245" r="1.8" />
              </g>

              {/* Petits points */}
              <g fill={t.motif} fillOpacity={opContour}>
                <circle cx="80" cy="70" r="1.6" />
                <circle cx="170" cy="170" r="1.4" />
                <circle cx="245" cy="195" r="1.5" />
                <circle cx="40" cy="240" r="1.3" />
              </g>
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#fd-motif)" />
        </svg>
      </div>
    </div>
  )
}
