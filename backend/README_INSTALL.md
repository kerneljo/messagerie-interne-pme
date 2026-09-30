# Squelette Laravel - Messagerie interne

Copier ces fichiers dans le dossier `backend/` (les chemins sont deja les bons) :

    unzip -o messagerie-laravel-squelette.zip -d backend

Contenu :
- app/Models/            Service, Role, Utilisateur, Conversation, Message, Fichier, JournalAudit
- database/migrations/   9 migrations (une par table du MLD)
- database/seeders/      DatabaseSeeder (services, roles, compte admin de developpement)

Voir les etapes de mise en place dans la reponse du chat (base PostgreSQL, .env, install:api, migrate).
