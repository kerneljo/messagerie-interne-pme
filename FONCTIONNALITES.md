# 📘 Fonctionnalités — Messagerie Interne

Document de référence **fonctionnel** uniquement.
Pas de design. Pas de charte graphique. Que du **comportement**.

---

## 🎯 Vue d'ensemble

L'application est une **messagerie interne d'entreprise**.
Elle permet à des employés de :
1. **Communiquer** (messages en temps réel)
2. **Tracer** (annonces officielles avec preuve de lecture)
3. **Partager** (documents centralisés)
4. **Trouver** (annuaire d'entreprise)

---

## 📌 1. Authentification

### 1.1 Inscription
- Formulaire public : nom, prénom, email, poste, mot de passe
- Le compte est créé avec le statut **`en_attente`**
- L'utilisateur **ne peut pas se connecter** tant qu'il n'est pas validé
- Un message clair lui indique d'attendre la validation

### 1.2 Validation des comptes (admin)
- Page admin listant les comptes en attente
- Actions : **Valider** / **Refuser**
- Validation → statut `actif`
- Refus → statut `desactive`
- Notification (optionnelle) au nouvel utilisateur

### 1.3 Connexion
- Email + mot de passe
- Messages d'erreur **spécifiques** :
  - Compte en attente → *"Votre compte est en attente de validation"*
  - Compte désactivé → *"Votre compte a été désactivé"*
  - Identifiants invalides → *"Email ou mot de passe incorrect"*

### 1.4 Déconnexion
- Bouton dans la sidebar
- Confirmation avant
- Session détruite côté serveur

---

## 📌 2. Conversations

### 2.1 Types de conversation

3 types, modélisés avec **2 champs** :

| Type | Champ `type` | Champ `lecture_seule` |
|---|---|---|
| **Message direct** | DIRECT | FALSE |
| **Groupe** | GROUPE | FALSE |
| **Diffusion** | GROUPE | TRUE |

### 2.2 Création d'une conversation

**Règle de détection automatique** :
- Sélection de **1 personne** → **DIRECT**
- Sélection de **2+ personnes** → **GROUPE**
- Case "Seul le créateur peut écrire" cochée → **Diffusion**

**Champs du formulaire de création** :
- Participants (recherche avec suggestions)
- Titre du groupe (obligatoire pour un groupe, optionnel pour DM)
- Case "lecture seule" (visible uniquement si 2+ personnes)

### 2.3 Comportement selon le type

| | Direct | Groupe | Diffusion |
|---|---|---|---|
| **Qui écrit** | Les 2 participants | Tous les membres | Créateur uniquement |
| **Qui lit** | Les 2 participants | Tous les membres | Tous les membres |
| **Peut quitter** | N/A | ✅ Oui | ❌ Non |
| **Peut ajouter des membres** | ❌ | ✅ Oui | ✅ Oui (créateur) |
| **Peut retirer des membres** | ❌ | ✅ Oui (créateur) | ✅ Oui (créateur) |

### 2.4 Quitter une conversation
- Possible uniquement pour les **groupes** (pas les DM, pas les diffusions)
- Confirmation demandée
- L'utilisateur est retiré de la table `participant`
- Il n'a plus accès à l'historique

### 2.5 Renommer un groupe
- Possible par le créateur ou un admin
- Champ titre modifiable

### 2.6 Suppression d'une conversation
- Possible par le créateur ou un admin
- **Suppression logique** (pas physique) pour préserver l'intégrité
- La conversation disparaît de la liste des participants

---

## 📌 3. Messages

### 3.1 Envoi d'un message

**Champs possibles** :
- Contenu texte (max 5000 caractères)
- Pièces jointes (max 5 fichiers, 10 Mo chacun)
- Réponse à un message parent (optionnel)
- **Type de message** (voir 3.2)

**Règles** :
- Au moins **du contenu** OU **une pièce jointe** obligatoire
- Si réponse à un parent → le parent doit être dans la même conversation

### 3.2 Types de message

**4 types** :

#### 🟢 Normal
- Message standard
- Aucune action requise
- Notification standard

#### 🔵 Information
- Annonce officielle sans action demandée
- Badge "Information" affiché sur la bulle
- Notification standard
- **Cas d'usage** : note d'information, mise à jour

#### 🟡 Action requise
- Message demandant une **action au destinataire**
- Badge "Action requise" affiché
- **Champ `date_echeance`** obligatoire
- **Bouton "J'ai pris en compte"** affiché pour chaque destinataire
- Notification **prioritaire** (remonte dans la liste)
- **Cas d'usage** : validation de document, confirmation de présence

#### 🔴 Urgent
- Message critique nécessitant une action immédiate
- Badge "Urgent" affiché
- **Bouton "J'ai pris en compte"** obligatoire
- Notification **prioritaire + répétée** toutes les 5 minutes jusqu'à prise en compte
- **Cas d'usage** : panne serveur, incident critique

### 3.3 Le système "Pris en compte"

**Principe** :
- Sur les messages Action requise et Urgent, chaque destinataire peut cliquer sur **"J'ai pris en compte"**
- L'action est enregistrée dans une table `prise_en_compte` avec la date et l'heure

**Côté destinataire** :
- Voir le bouton sur le message
- Cliquer dessus
- Le bouton devient un indicateur "✅ Pris en compte à HH:MM"

**Côté expéditeur** :
- Voir en temps réel le **compteur** : "Pris en compte : 8/20"
- Voir la **liste des personnes** qui n'ont pas pris en compte
- Pouvoir **relancer** les personnes qui n'ont pas pris en compte (renvoi de notification)

**Différence avec "Lu"** :
- "Lu" = ouverture de la conversation
- "Pris en compte" = engagement explicite

### 3.4 Édition d'un message
- Possible uniquement par l'expéditeur
- Un message édité affiche "· modifié" à côté de l'heure
- Date de modification enregistrée

### 3.5 Suppression d'un message
- Possible uniquement par l'expéditeur ou un admin
- **Suppression logique** (`est_supprime = true`)
- Effet visuel : désintégration en particules
- Le message disparaît pour tous les participants

### 3.6 Réponses en fil
- Possibilité de répondre à un message spécifique
- Le message de réponse affiche un **aperçu du parent** au-dessus
- Le parent est cliquable pour remonter au message

### 3.7 Réactions
- Palette d'emojis rapides : 👍 ❤ 😂 🔥 😮 😢
- Maximum 3 réactions par utilisateur par message
- Une réaction peut être retirée en cliquant dessus
- Affichage : compteur des réactions groupées

### 3.8 Pièces jointes
- Formats acceptés : PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ODT, ODS, TXT, CSV, PNG, JPG, JPEG, GIF, WEBP
- Taille max : 10 Mo par fichier
- Nombre max : 5 fichiers par message
- Stockage : disque privé (non accessible directement par URL)
- Empreinte SHA-256 calculée à l'upload pour vérification

---

## 📌 4. Temps réel

### 4.1 Diffusion des messages
- Nouveau message → diffusé aux autres participants **instantanément**
- Le message apparaît sans recharger la page

### 4.2 Indicateur "en train d'écrire"
- Quand un utilisateur tape, les autres participants voient : *"Alice est en train d'écrire…"*
- L'indicateur disparaît après 3 secondes d'inactivité

### 4.3 Reçus de lecture
- Marquage automatique en "lu" quand l'utilisateur ouvre une conversation
- L'expéditeur voit : *"Lu"* ou *"Lu par X/Y"* (en groupe)

---

## 📌 5. Recherche

### 5.1 Recherche dans les conversations
- Barre de recherche en haut de la liste
- Recherche par **nom de conversation** ou **nom de participant**
- Filtrage en temps réel (debounced)

### 5.2 Recherche dans une conversation
- Recherche par mot-clé dans les messages
- Résultats surlignés

### 5.3 Recherche dans l'annuaire (voir 7)

---

## 📌 6. Page "À traiter"

### 6.1 Rôle
Centraliser **tout ce que l'utilisateur doit prendre en compte**.

### 6.2 Onglet "Actions"
- Liste des messages **Action requise** et **Urgent** non pris en compte
- Chaque élément affiche :
  - Type (badge couleur)
  - Expéditeur
  - Extrait du contenu
  - Échéance (pour Action requise)
  - Temps écoulé depuis l'envoi
  - Bouton **"J'ai pris en compte"**

### 6.3 Onglet "Suivi"
- Liste des messages **Action requise** et **Urgent** que **j'ai envoyés**
- Chaque élément affiche :
  - Type
  - Titre/extrait
  - Nombre de destinataires
  - Compteurs : **Pris en compte / Lu / En attente**
  - Bouton **"Relancer"** pour notifier ceux qui n'ont pas pris en compte

### 6.4 Notifications
- Badge sur l'icône "À traiter" dans la sidebar
- Nombre d'actions non prises en compte

---

## 📌 7. Annuaire

### 7.1 Rôle
Permettre de **trouver n'importe quel employé** de l'entreprise.

### 7.2 Fonctionnalités
- **Recherche** : nom, prénom, email, poste, service
- **Filtres** : service, rôle
- **Groupement** des résultats par service
- **Affichage** : avatar, nom complet, poste, service

### 7.3 Actions sur un utilisateur
- **Ouvrir une conversation** (DM)
- **Voir le profil** (si l'utilisateur l'autorise)
- **Copier l'email**

### 7.4 Accès
- Depuis la modale "Nouveau message"
- Ou en tant que page indépendante (accessible depuis le profil)

---

## 📌 8. Documents

### 8.1 Rôle
Vue **globale** de tous les fichiers échangés dans les conversations.

### 8.2 Fonctionnalités
- **Liste** de tous les fichiers avec : nom, auteur, date, taille, type
- **Recherche** par nom de fichier
- **Filtres** : par type (PDF, image, etc.), par auteur, par date
- **Tri** : par date, par nom, par taille

### 8.3 Actions sur un fichier
- **Aperçu** (pour images et PDF)
- **Télécharger**
- **Voir le message d'origine** (contexte du fichier)

### 8.4 Vérification d'intégrité
- Empreinte SHA-256 affichée
- Permet de vérifier que le fichier n'a pas été modifié

---

## 📌 9. Profil utilisateur

### 9.1 Informations affichées
- Photo de profil (modifiable, max 5 Mo)
- Prénom, nom
- Email (non modifiable, géré par admin)
- Poste, service, rôle
- Date de création, dernière connexion

### 9.2 Actions possibles
- Changer la photo de profil
- Changer le mot de passe
- Choisir le thème (Latérite / Basalte / Calcaire)
- Se déconnecter

### 9.3 Changer le mot de passe
- Mot de passe actuel requis
- Nouveau mot de passe (min 8 caractères)
- Confirmation
- Indicateur de robustesse (faible / moyen / bon / excellent)

---

## 📌 10. Administration

### 10.1 Rôle
Réservé aux utilisateurs avec le rôle **Administrateur**.

### 10.2 Gestion des utilisateurs
- Liste paginée avec filtres (rôle, service, statut)
- Créer un utilisateur
- Modifier un utilisateur
- Désactiver / Réactiver
- Valider un compte en attente
- Refuser un compte en attente

### 10.3 Référentiels
- **Services** : créer, modifier, supprimer
- **Postes** : créer, modifier, supprimer
- **Rôles** : consultation uniquement (rôles fixes)

### 10.4 Journal d'audit
- Historique de toutes les actions sensibles
- Filtres : par utilisateur, par action, par date
- Actions tracées :
  - Création / modification / désactivation d'utilisateur
  - Validation / refus de compte
  - Création / modification / suppression de service/poste
  - Envoi de message
  - Suppression de message

---

## 📌 11. Notifications

### 11.1 Notifications en ligne
- **Badge** sur l'icône "Conversations" : nombre de conversations avec messages non lus
- **Badge** sur l'icône "À traiter" : nombre d'actions non prises en compte
- **Aperçu** dans la liste des conversations : dernier message + compteur non lus

### 11.2 Notifications navigateur (optionnel, phase 2)
- Notification système quand l'onglet n'est pas actif
- Clic sur la notification → ouvre la conversation

### 11.3 Notifications par priorité (optionnel, phase 2)
- Normal : notification discrète
- Information : notification standard
- Action requise : notification prioritaire
- Urgent : notification répétée jusqu'à prise en compte

---

## 📌 12. Thème et préférences

### 12.1 Choix du thème
- **Latérite** (défaut) — chaleureux
- **Basalte** — sombre
- **Calcaire** — clair neutre

### 12.2 Persistance
- Le choix est stocké dans le navigateur (localStorage)
- Il est appliqué instantanément sans recharger

---

## 📌 13. Règles métier importantes

### 13.1 Sécurité
- Un utilisateur ne peut **se désactiver lui-même**
- Un utilisateur ne peut **changer son propre rôle**
- Un administrateur **ne peut pas être rétrogradé** s'il est le dernier admin actif
- Les mots de passe sont hashés (bcrypt)
- Les sessions expirent après 120 minutes d'inactivité

### 13.2 Intégrité des données
- Suppression **logique** des messages (pas physique)
- Les fichiers supprimés sont marqués, pas effacés
- Chaque message a un `reference_message` unique

### 13.3 Traçabilité
- Toutes les actions sensibles sont tracées dans le **journal d'audit**
- Chaque entrée contient : auteur, action, cible, date

### 13.4 Permissions
- Un utilisateur ne voit que les conversations auxquelles il participe
- Un utilisateur ne peut écrire que dans les conversations où il est autorisé
- Un utilisateur ne peut pas accéder aux conversations des autres

---

## 📌 14. Cas d'usage typiques

### 14.1 Envoyer un message rapide à un collègue
1. Clic "Nouveau message"
2. Rechercher le collègue
3. Sélectionner
4. Ouvrir la conversation
5. Écrire + Envoyer

### 14.2 Organiser une réunion
1. Clic "Nouveau message"
2. Sélectionner 5 participants
3. Nommer le groupe "Réunion projet"
4. Écrire le message avec **type = Action requise**
5. Ajouter une échéance
6. Envoyer → les participants reçoivent une notification prioritaire
7. Suivre les "Pris en compte" dans la page "À traiter"

### 14.3 Diffuser une note de service
1. Clic "Nouveau message"
2. Sélectionner tous les employés concernés
3. Cocher "Seul le créateur peut écrire"
4. Nommer "Note de service"
5. Écrire le message avec **type = Information**
6. Envoyer

### 14.4 Retrouver un document
1. Clic sur "Documents" dans la sidebar
2. Rechercher par nom ou filtrer par date
3. Cliquer sur le fichier → aperçu
4. Télécharger

### 14.5 Trouver un collègue
1. Clic "Nouveau message"
2. Rechercher dans l'annuaire (par nom, service ou poste)
3. Voir le résultat avec poste et service
4. Cliquer → ouvrir la conversation

---

## 📌 15. Ce qui n'est PAS dans l'application

Pour être clair sur le périmètre :

- ❌ **Pas de canaux thématiques** (Slack-like)
- ❌ **Pas de fils de discussion** (Slack threads)
- ❌ **Pas de gestion de projet** (tâches, kanban)
- ❌ **Pas de calendrier** (réunions planifiées)
- ❌ **Pas d'appels audio/vidéo** (dans cette version)
- ❌ **Pas de partage d'écran**
- ❌ **Pas de statut personnalisé** ("En réunion", "Ne pas déranger") — dans cette version

Ces fonctionnalités pourraient être ajoutées en **phase 2 ou 3** si nécessaire.

---

## 📌 16. Priorités d'implémentation

### Phase 1 — Fondations (fait)
- ✅ Authentification
- ✅ Conversations (DM + Groupes)
- ✅ Messages (envoi, édition, suppression)
- ✅ Temps réel (Reverb)
- ✅ Pièces jointes
- ✅ Profil utilisateur
- ✅ Administration

### Phase 2 — Différenciation
- 🔄 **Types de message** (Normal / Information / Action requise / Urgent)
- 🔄 **Système "Pris en compte"**
- 🔄 **Page "À traiter"**
- 🔄 **Page "Suivi des envois"**
- 🔄 **Fusion Groupe/Diffusion** (option lecture seule)

### Phase 3 — Compléments
- ⏳ **Annuaire d'entreprise**
- ⏳ **Modale "Nouveau message"** avec détection auto
- ⏳ **Page "Documents"** (vue globale)
- ⏳ **Sidebar compacte** (icônes uniquement)

### Phase 4 — Bonus
- ⏳ Statut "en ligne / absent"
- ⏳ Notifications navigateur
- ⏳ Recherche globale
- ⏳ Visioconférence (Jitsi)

---

**Fin du document.**

**Référence fonctionnelle** à consulter avant chaque développement.
