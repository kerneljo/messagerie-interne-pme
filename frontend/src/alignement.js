/**
 * Alignement des messages dans la discussion.
 *  true  : tous les messages à gauche (style Slack / Teams, un seul bord de lecture)
 *  false : style classique, mes messages à droite et ceux des autres à gauche
 */
export const MESSAGES_A_GAUCHE = false

export function estADroite(moi) {
  return moi && !MESSAGES_A_GAUCHE
}
