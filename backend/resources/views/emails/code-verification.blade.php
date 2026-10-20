<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>Code de vérification</title>
    <style>
        @media only screen and (max-width: 600px) {
            .conteneur { width: 100% !important; }
            .contenu   { padding: 24px 20px !important; }
            .code      { font-size: 28px !important; letter-spacing: 4px !important; }
        }
        /* Mode sombre : textes clairs sur fonds sombres, contraste supérieur à 7:1 */
        @media (prefers-color-scheme: dark) {
            .fond       { background-color: #111827 !important; }
            .carte      { background-color: #1f2937 !important; border-color: #374151 !important; }
            .texte      { color: #e5e7eb !important; }
            .secondaire { color: #c9d0da !important; }
            .separateur { border-color: #374151 !important; }
            .boite-code { background-color: #111827 !important; border-color: #6b7280 !important; }
            .code       { color: #ffffff !important; }
        }
    </style>
</head>
<body class="fond" style="margin:0; padding:0; background-color:#f4f5f7; -webkit-text-size-adjust:100%;">

    {{-- Texte d'aperçu affiché dans la liste des e-mails (invisible dans le message) --}}
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; mso-hide:all;">
        Votre code de vérification est {{ $code }}. Il est valable {{ $minutes ?? 15 }} minutes.
        &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="fond" style="background-color:#f4f5f7;">
        <tr>
            <td align="center" style="padding:32px 16px;">

                <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" class="conteneur" style="width:560px; max-width:560px;">
                    <tr>
                        <td class="carte contenu" style="background-color:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:32px 36px;">

                            <p class="texte" style="margin:0 0 20px; padding-bottom:16px; border-bottom:1px solid #e2e8f0; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:700; color:#1e293b;" >
                                Messagerie interne
                            </p>

                            <p class="texte" style="margin:0 0 16px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:#1e293b;">
                                @if (!empty($prenom))
                                    Bonjour {{ $prenom }},
                                @else
                                    Bonjour,
                                @endif
                            </p>

                            <p class="texte" style="margin:0 0 16px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:#1e293b;">
                                Vous avez demandé la création d’un compte sur la messagerie interne de votre
                                entreprise. Pour confirmer votre adresse e-mail, veuillez saisir le code
                                ci-dessous dans l’application.
                            </p>

                            <p class="texte" style="margin:0 0 8px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:#1e293b;">
                                Votre code de vérification est le suivant :
                            </p>

                            {{-- Code : un seul bloc de texte, sélectionnable d'un geste (double-clic ou appui long) --}}
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" class="boite-code" style="background-color:#f8fafc; border:1px solid #94a3b8; border-radius:6px; padding:16px;">
                                        <span class="code" style="display:inline-block; font-family:'Courier New', Courier, monospace; font-size:32px; line-height:1.2; font-weight:700; letter-spacing:6px; color:#0f172a; -webkit-user-select:all; user-select:all;">{{ $code }}</span>
                                    </td>
                                </tr>
                            </table>

                            <p class="secondaire" style="margin:12px 0 24px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.6; color:#475569;">
                                Ce code est valable {{ $minutes ?? 15 }} minutes et ne peut être utilisé qu’une seule fois.
                            </p>

                            <p class="texte" style="margin:0 0 16px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.6; color:#1e293b;">
                                <strong>Pour votre sécurité,</strong> ne communiquez ce code à personne, y compris
                                à un membre de l’équipe informatique.
                            </p>

                            <p class="texte" style="margin:0 0 24px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.6; color:#1e293b;">
                                Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer ce message :
                                aucun compte ne sera activé sans ce code.
                            </p>

                            <p class="texte" style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.6; color:#1e293b;">
                                Cordialement,<br>
                                L’équipe de la messagerie interne
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding:16px 16px 0;">
                            <p class="secondaire" style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.6; color:#475569;">
                                Message envoyé automatiquement, merci de ne pas y répondre.
                            </p>
                        </td>
                    </tr>
                </table>

            </td>
        </tr>
    </table>
</body>
</html>
