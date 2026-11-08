/**
 * Fond de la zone de discussion : une couleur unie qui suit le thème (bg-creme).
 * Aucun dégradé, aucune lueur, aucun motif.
 *
 * Props conservées pour ne pas casser les appels existants (elles sont ignorées) :
 *  - className : classes du conteneur
 *  - sombre, intensite, anime : sans effet
 */
export default function FondDiscussion({ className = '' }) {
  return <div className={`bg-creme ${className}`} aria-hidden="true" />
}
