import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const MARGE = 90 // espace autour de la bulle pour que les particules puissent s'envoler

/**
 * Désintégration façon Telegram : la bulle se transforme en poussière
 * qui balaie de gauche à droite et dérive vers le haut en s'estompant.
 */
export default function EffetPoussiere({ rect, couleurs, onFin }) {
  const canvasRef = useRef(null)
  const finRef = useRef(onFin)
  finRef.current = onFin

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const W = rect.width + MARGE * 2
    const H = rect.height + MARGE * 2

    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    const DUREE_BALAYAGE = 520
    const nombre = Math.min(1600, Math.round((rect.width * rect.height) / 8))

    const particules = Array.from({ length: nombre }, () => {
      const px = Math.random()
      return {
        x: MARGE + px * rect.width,
        y: MARGE + Math.random() * rect.height,
        vx: 0.5 + Math.random() * 1.6,
        vy: -(0.3 + Math.random() * 1.3),
        ondulation: Math.random() * Math.PI * 2,
        taille: 1 + Math.random() * 2.2,
        couleur: couleurs[Math.floor(Math.random() * couleurs.length)],
        depart: px * DUREE_BALAYAGE + Math.random() * 140,
        vie: 500 + Math.random() * 400,
      }
    })

    const fin = Math.max(...particules.map((p) => p.depart + p.vie)) + 30
    const debut = performance.now()
    let raf

    function image(maintenant) {
      const ecoule = maintenant - debut
      ctx.clearRect(0, 0, W, H)

      for (const p of particules) {
        const t = ecoule - p.depart
        if (t >= p.vie) continue

        let x = p.x
        let y = p.y
        let alpha = 1

        if (t > 0) {
          const k = t / p.vie
          x += p.vx * t * 0.06
          y += p.vy * t * 0.06 + Math.sin(p.ondulation + t * 0.01) * 6 * k
          alpha = 1 - k * k
        }

        ctx.globalAlpha = Math.max(alpha, 0)
        ctx.fillStyle = p.couleur
        ctx.fillRect(x, y, p.taille, p.taille)
      }

      if (ecoule < fin) {
        raf = requestAnimationFrame(image)
      } else {
        finRef.current?.()
      }
    }

    raf = requestAnimationFrame(image)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createPortal(
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        left: rect.left - MARGE,
        top: rect.top - MARGE,
        width: rect.width + MARGE * 2,
        height: rect.height + MARGE * 2,
        pointerEvents: 'none',
        zIndex: 200,
      }}
    />,
    document.body
  )
}
