# Backend messagerie - API conversations, messages, fichiers, administration

Copier dans backend/ (chemins deja corrects) :  unzip -o messagerie-api.zip   (depuis le dossier qui contient backend/)

Fichiers ajoutes ou remplaces :
- app/Http/Middleware : RoleRequis, CompteActif
- app/Policies : ConversationPolicy, MessagePolicy
- app/Http/Controllers : AnnuaireController, ConversationController, MessageController, FichierController, Admin/*
- app/Models : Conversation (remplace), Utilisateur (remplace)
- app/Http/Controllers/AuthController.php (remplace : email en minuscules)
- routes/api.php (remplace)
- database/seeders/DatabaseSeeder.php (remplace : comptes de test)
- tests/Feature/MessagerieTest.php
