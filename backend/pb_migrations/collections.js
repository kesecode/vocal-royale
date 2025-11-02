migrate((app) => {
  const snapshot = [
    {
      "createRule": null,
      "deleteRule": null,
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text455797646",
          "max": 0,
          "min": 0,
          "name": "collectionRef",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text127846527",
          "max": 0,
          "min": 0,
          "name": "recordRef",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text1582905952",
          "max": 0,
          "min": 0,
          "name": "method",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": true,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": true,
          "type": "autodate"
        }
      ],
      "id": "pbc_2279338944",
      "indexes": [
        "CREATE INDEX `idx_mfas_collectionRef_recordRef` ON `_mfas` (collectionRef,recordRef)"
      ],
      "listRule": "@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId",
      "name": "_mfas",
      "system": true,
      "type": "base",
      "updateRule": null,
      "viewRule": "@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId"
    },
    {
      "createRule": null,
      "deleteRule": null,
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text455797646",
          "max": 0,
          "min": 0,
          "name": "collectionRef",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text127846527",
          "max": 0,
          "min": 0,
          "name": "recordRef",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "cost": 8,
          "hidden": true,
          "id": "password901924565",
          "max": 0,
          "min": 0,
          "name": "password",
          "pattern": "",
          "presentable": false,
          "required": true,
          "system": true,
          "type": "password"
        },
        {
          "autogeneratePattern": "",
          "hidden": true,
          "id": "text3866985172",
          "max": 0,
          "min": 0,
          "name": "sentTo",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": true,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": true,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": true,
          "type": "autodate"
        }
      ],
      "id": "pbc_1638494021",
      "indexes": [
        "CREATE INDEX `idx_otps_collectionRef_recordRef` ON `_otps` (collectionRef, recordRef)"
      ],
      "listRule": "@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId",
      "name": "_otps",
      "system": true,
      "type": "base",
      "updateRule": null,
      "viewRule": "@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId"
    },
    {
      "createRule": null,
      "deleteRule": "@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId",
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text455797646",
          "max": 0,
          "min": 0,
          "name": "collectionRef",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text127846527",
          "max": 0,
          "min": 0,
          "name": "recordRef",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text2462348188",
          "max": 0,
          "min": 0,
          "name": "provider",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text1044722854",
          "max": 0,
          "min": 0,
          "name": "providerId",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": true,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": true,
          "type": "autodate"
        }
      ],
      "id": "pbc_2281828961",
      "indexes": [
        "CREATE UNIQUE INDEX `idx_externalAuths_record_provider` ON `_externalAuths` (collectionRef, recordRef, provider)",
        "CREATE UNIQUE INDEX `idx_externalAuths_collection_provider` ON `_externalAuths` (collectionRef, provider, providerId)"
      ],
      "listRule": "@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId",
      "name": "_externalAuths",
      "system": true,
      "type": "base",
      "updateRule": null,
      "viewRule": "@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId"
    },
    {
      "createRule": null,
      "deleteRule": "@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId",
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text455797646",
          "max": 0,
          "min": 0,
          "name": "collectionRef",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text127846527",
          "max": 0,
          "min": 0,
          "name": "recordRef",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text4228609354",
          "max": 0,
          "min": 0,
          "name": "fingerprint",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": true,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": true,
          "type": "autodate"
        }
      ],
      "id": "pbc_4275539003",
      "indexes": [
        "CREATE UNIQUE INDEX `idx_authOrigins_unique_pairs` ON `_authOrigins` (collectionRef, recordRef, fingerprint)"
      ],
      "listRule": "@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId",
      "name": "_authOrigins",
      "system": true,
      "type": "base",
      "updateRule": null,
      "viewRule": "@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId"
    },
    {
      "authAlert": {
        "emailTemplate": {
          "body": "<p>Hello,</p>\n<p>We noticed a login to your Aja 30! account from a new location.</p>\n<p>If this was you, you may disregard this email.</p>\n<p><strong>If this wasn't you, you should immediately change your Aja 30! account password to revoke access from all other locations.</strong></p>\n<p>\n  Thanks,<br/>\n  Aja 30! team\n</p>",
          "subject": "Login from a new location"
        },
        "enabled": true
      },
      "authRule": "",
      "authToken": {
        "duration": 86400
      },
      "confirmEmailChangeTemplate": {
        "body": "<p>Hello,</p>\n<p>Click on the button below to confirm your new email address.</p>\n<p>\n  <a class=\"btn\" href=\"aja30.davidweppler.io/_/#/auth/confirm-email-change/{TOKEN}\" target=\"_blank\" rel=\"noopener\">Confirm new email</a>\n</p>\n<p><i>If you didn't ask to change your email address, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  Aja 30! team\n</p>",
        "subject": "Confirm your Aja 30! new email address"
      },
      "createRule": null,
      "deleteRule": null,
      "emailChangeToken": {
        "duration": 1800
      },
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "cost": 0,
          "hidden": true,
          "id": "password901924565",
          "max": 0,
          "min": 8,
          "name": "password",
          "pattern": "",
          "presentable": false,
          "required": true,
          "system": true,
          "type": "password"
        },
        {
          "autogeneratePattern": "[a-zA-Z0-9]{50}",
          "hidden": true,
          "id": "text2504183744",
          "max": 60,
          "min": 30,
          "name": "tokenKey",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "exceptDomains": null,
          "hidden": false,
          "id": "email3885137012",
          "name": "email",
          "onlyDomains": null,
          "presentable": false,
          "required": true,
          "system": true,
          "type": "email"
        },
        {
          "hidden": false,
          "id": "bool1547992806",
          "name": "emailVisibility",
          "presentable": false,
          "required": false,
          "system": true,
          "type": "bool"
        },
        {
          "hidden": false,
          "id": "bool256245529",
          "name": "verified",
          "presentable": false,
          "required": false,
          "system": true,
          "type": "bool"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": true,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": true,
          "type": "autodate"
        }
      ],
      "fileToken": {
        "duration": 180
      },
      "id": "pbc_3142635823",
      "indexes": [
        "CREATE UNIQUE INDEX `idx_tokenKey_pbc_3142635823` ON `_superusers` (`tokenKey`)",
        "CREATE UNIQUE INDEX `idx_email_pbc_3142635823` ON `_superusers` (`email`) WHERE `email` != ''"
      ],
      "listRule": null,
      "manageRule": null,
      "mfa": {
        "duration": 1800,
        "enabled": false,
        "rule": ""
      },
      "name": "_superusers",
      "oauth2": {
        "enabled": false,
        "mappedFields": {
          "avatarURL": "",
          "id": "",
          "name": "",
          "username": ""
        }
      },
      "otp": {
        "duration": 180,
        "emailTemplate": {
          "body": "<p>Hello,</p>\n<p>Your one-time password is: <strong>{OTP}</strong></p>\n<p><i>If you didn't ask for the one-time password, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  Aja 30! team\n</p>",
          "subject": "OTP for Aja 30!"
        },
        "enabled": false,
        "length": 8
      },
      "passwordAuth": {
        "enabled": true,
        "identityFields": [
          "email"
        ]
      },
      "passwordResetToken": {
        "duration": 1800
      },
      "resetPasswordTemplate": {
        "body": "<!DOCTYPE html>\n<html lang=\"de\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Passwort zurücksetzen - Aja, 30!</title>\n  <link href=\"https://fonts.googleapis.com/css2?family=Bangers&family=Fredoka:wght@400;600&display=swap\" rel=\"stylesheet\">\n</head>\n<body style=\"margin: 0; padding: 0; background-color: #b82015; font-family: 'Fredoka', Arial, sans-serif;\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-image: radial-gradient(#a11b11 1.2px, transparent 1.2px); background-size: 12px 12px;\">\n    <tr>\n      <td align=\"center\" style=\"padding: 40px 20px;\">\n        <table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width: 600px;\">\n          <tr>\n            <td align=\"center\" style=\"padding-bottom: 30px;\">\n              <h1 style=\"font-family: 'Bangers', Arial, sans-serif; font-size: 48px; color: #ffcc00; margin: 0; text-shadow: 3px 3px 0 #000;\">Aja, 30!!</h1>\n            </td>\n          </tr>\n          <tr>\n            <td style=\"background-color: #5e0e79; border: 2px solid #333; border-radius: 10px; box-shadow: 4px 4px 0 #2a0436; padding: 30px; color: white;\">\n              <h2 style=\"font-family: 'Fredoka', Arial, sans-serif; font-size: 24px; margin-top: 0; color: #ffcc00;\">Passwort zurücksetzen</h2>\n              <p style=\"font-size: 16px; line-height: 1.5; margin: 15px 0;\">Hallo,</p>\n              <p style=\"font-size: 16px; line-height: 1.5; margin: 15px 0;\">Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. Klicke auf den Button unten, um ein neues Passwort festzulegen:</p>\n              <table cellpadding=\"0\" cellspacing=\"0\" style=\"margin: 25px 0;\">\n                <tr>\n                  <td align=\"center\" style=\"background-color: #ffcc00; border: 2px solid #333; border-radius: 12px; box-shadow: 4px 4px 0 #cc9900;\">\n                    <a href=\"aja30.davidweppler.io/auth/confirm-password-reset/{TOKEN}\" style=\"display: inline-block; padding: 12px 24px; color: #161616; text-decoration: none; font-weight: 600; font-size: 16px;\">Passwort zurücksetzen</a>\n                  </td>\n                </tr>\n              </table>\n              <p style=\"font-size: 14px; line-height: 1.5; margin: 15px 0; color: #e6e6e6;\"><i>Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail einfach ignorieren.</i></p>\n              <p style=\"font-size: 14px; line-height: 1.5; margin: 15px 0; color: #cccccc;\">Der Link ist 30 Minuten gültig.</p>\n              <p style=\"font-size: 16px; line-height: 1.5; margin-top: 25px;\">Viel Spaß beim Singen!<br/>Dein Aja, 30! Team</p>\n            </td>\n          </tr>\n          <tr>\n            <td align=\"center\" style=\"padding-top: 30px; color: #b3b3b3; font-size: 12px;\">\n              © 2025 David Weppler\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>",
        "subject": "Passwort zurücksetzen - Aja, 30!"
      },
      "system": true,
      "type": "auth",
      "updateRule": null,
      "verificationTemplate": {
        "body": "<!DOCTYPE html>\n<html lang=\"de\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>E-Mail verifizieren - Aja, 30!</title>\n  <link href=\"https://fonts.googleapis.com/css2?family=Bangers&family=Fredoka:wght@400;600&display=swap\" rel=\"stylesheet\">\n</head>\n<body style=\"margin: 0; padding: 0; background-color: #b82015; font-family: 'Fredoka', Arial, sans-serif;\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-image: radial-gradient(#a11b11 1.2px, transparent 1.2px); background-size: 12px 12px;\">\n    <tr>\n      <td align=\"center\" style=\"padding: 40px 20px;\">\n        <table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width: 600px;\">\n          <tr>\n            <td align=\"center\" style=\"padding-bottom: 30px;\">\n              <h1 style=\"font-family: 'Bangers', Arial, sans-serif; font-size: 48px; color: #ffcc00; margin: 0; text-shadow: 3px 3px 0 #000;\">Aja, 30!!</h1>\n            </td>\n          </tr>\n          <tr>\n            <td style=\"background-color: #5e0e79; border: 2px solid #333; border-radius: 10px; box-shadow: 4px 4px 0 #2a0436; padding: 30px; color: white;\">\n              <h2 style=\"font-family: 'Fredoka', Arial, sans-serif; font-size: 24px; margin-top: 0; color: #ffcc00;\">Willkommen bei Aja, 30!!</h2>\n              <p style=\"font-size: 16px; line-height: 1.5; margin: 15px 0;\">Hallo,</p>\n              <p style=\"font-size: 16px; line-height: 1.5; margin: 15px 0;\">Vielen Dank, dass du dich bei Aja, 30! angemeldet hast! Klicke auf den Button unten, um deine E-Mail-Adresse zu verifizieren:</p>\n              <table cellpadding=\"0\" cellspacing=\"0\" style=\"margin: 25px 0;\">\n                <tr>\n                  <td align=\"center\" style=\"background-color: #ffcc00; border: 2px solid #333; border-radius: 12px; box-shadow: 4px 4px 0 #cc9900;\">\n                    <a href=\"aja30.davidweppler.io/auth/confirm-verification/{TOKEN}\" style=\"display: inline-block; padding: 12px 24px; color: #161616; text-decoration: none; font-weight: 600; font-size: 16px;\">E-Mail verifizieren</a>\n                  </td>\n                </tr>\n              </table>\n              <p style=\"font-size: 14px; line-height: 1.5; margin: 15px 0; color: #cccccc;\">Der Link ist 72 Stunden gültig.</p>\n              <p style=\"font-size: 16px; line-height: 1.5; margin-top: 25px;\">Bis bald du Sack!<br/>Gruß<br/>David</p>\n            </td>\n          </tr>\n          <tr>\n            <td align=\"center\" style=\"padding-top: 30px; color: #b3b3b3; font-size: 12px;\">\n              © 2025 David Weppler\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>",
        "subject": "E-Mail verifizieren - Aja, 30!"
      },
      "verificationToken": {
        "duration": 259200
      },
      "viewRule": null
    },
    {
      "authAlert": {
        "emailTemplate": {
          "body": "<p>Hello,</p>\n<p>We noticed a login to your Aja 30! account from a new location.</p>\n<p>If this was you, you may disregard this email.</p>\n<p><strong>If this wasn't you, you should immediately change your Aja 30! account password to revoke access from all other locations.</strong></p>\n<p>\n  Thanks,<br/>\n  Aja 30! team\n</p>",
          "subject": "Login from a new location"
        },
        "enabled": true
      },
      "authRule": "",
      "authToken": {
        "duration": 604800
      },
      "confirmEmailChangeTemplate": {
        "body": "<p>Hello,</p>\n<p>Click on the button below to confirm your new email address.</p>\n<p>\n  <a class=\"btn\" href=\"aja30.davidweppler.io/_/#/auth/confirm-email-change/{TOKEN}\" target=\"_blank\" rel=\"noopener\">Confirm new email</a>\n</p>\n<p><i>If you didn't ask to change your email address, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  Aja 30! team\n</p>",
        "subject": "Confirm your Aja 30! new email address"
      },
      "createRule": "",
      "deleteRule": "id = @request.auth.id",
      "emailChangeToken": {
        "duration": 1800
      },
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "cost": 0,
          "hidden": true,
          "id": "password901924565",
          "max": 0,
          "min": 8,
          "name": "password",
          "pattern": "",
          "presentable": false,
          "required": true,
          "system": true,
          "type": "password"
        },
        {
          "autogeneratePattern": "[a-zA-Z0-9]{50}",
          "hidden": true,
          "id": "text2504183744",
          "max": 60,
          "min": 30,
          "name": "tokenKey",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "exceptDomains": null,
          "hidden": false,
          "id": "email3885137012",
          "name": "email",
          "onlyDomains": null,
          "presentable": false,
          "required": true,
          "system": true,
          "type": "email"
        },
        {
          "hidden": false,
          "id": "bool1547992806",
          "name": "emailVisibility",
          "presentable": false,
          "required": false,
          "system": true,
          "type": "bool"
        },
        {
          "hidden": false,
          "id": "bool256245529",
          "name": "verified",
          "presentable": false,
          "required": false,
          "system": true,
          "type": "bool"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text1579384326",
          "max": 255,
          "min": 0,
          "name": "name",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "file376926767",
          "maxSelect": 1,
          "maxSize": 0,
          "mimeTypes": [
            "image/jpeg",
            "image/png",
            "image/svg+xml",
            "image/gif",
            "image/webp"
          ],
          "name": "avatar",
          "presentable": false,
          "protected": false,
          "required": false,
          "system": false,
          "thumbs": null,
          "type": "file"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text2849095986",
          "max": 0,
          "min": 0,
          "name": "firstName",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text3356015194",
          "max": 0,
          "min": 0,
          "name": "lastName",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text1803505011",
          "max": 0,
          "min": 0,
          "name": "artistName",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "select1466534506",
          "maxSelect": 1,
          "name": "role",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": [
            "default",
            "participant",
            "spectator",
            "juror",
            "admin"
          ]
        },
        {
          "hidden": false,
          "id": "bool3222847152",
          "name": "eliminated",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "hidden": false,
          "id": "bool4144053144",
          "name": "sangThisRound",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "hidden": false,
          "id": "bool1234567890",
          "name": "checkedIn",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        }
      ],
      "fileToken": {
        "duration": 180
      },
      "id": "_pb_users_auth_",
      "indexes": [
        "CREATE UNIQUE INDEX `idx_tokenKey__pb_users_auth_` ON `users` (`tokenKey`)",
        "CREATE UNIQUE INDEX `idx_email__pb_users_auth_` ON `users` (`email`) WHERE `email` != ''"
      ],
      "listRule": "@request.auth.id != ''",
      "manageRule": null,
      "mfa": {
        "duration": 1800,
        "enabled": false,
        "rule": ""
      },
      "name": "users",
      "oauth2": {
        "enabled": false,
        "mappedFields": {
          "avatarURL": "avatar",
          "id": "",
          "name": "name",
          "username": ""
        }
      },
      "otp": {
        "duration": 180,
        "emailTemplate": {
          "body": "<p>Hello,</p>\n<p>Your one-time password is: <strong>{OTP}</strong></p>\n<p><i>If you didn't ask for the one-time password, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  Aja 30! team\n</p>",
          "subject": "OTP for Aja 30!"
        },
        "enabled": false,
        "length": 8
      },
      "passwordAuth": {
        "enabled": true,
        "identityFields": [
          "email"
        ]
      },
      "passwordResetToken": {
        "duration": 1800
      },
      "resetPasswordTemplate": {
        "body": "<!DOCTYPE html>\n<html lang=\"de\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Passwort zurücksetzen - Aja, 30!</title>\n  <link href=\"https://fonts.googleapis.com/css2?family=Bangers&family=Fredoka:wght@400;600&display=swap\" rel=\"stylesheet\">\n</head>\n<body style=\"margin: 0; padding: 0; background-color: #b82015; font-family: 'Fredoka', Arial, sans-serif;\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-image: radial-gradient(#a11b11 1.2px, transparent 1.2px); background-size: 12px 12px;\">\n    <tr>\n      <td align=\"center\" style=\"padding: 40px 20px;\">\n        <table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width: 600px;\">\n          <tr>\n            <td align=\"center\" style=\"padding-bottom: 30px;\">\n              <h1 style=\"font-family: 'Bangers', Arial, sans-serif; font-size: 48px; color: #ffcc00; margin: 0; text-shadow: 3px 3px 0 #000;\">Aja, 30!!</h1>\n            </td>\n          </tr>\n          <tr>\n            <td style=\"background-color: #5e0e79; border: 2px solid #333; border-radius: 10px; box-shadow: 4px 4px 0 #2a0436; padding: 30px; color: white;\">\n              <h2 style=\"font-family: 'Fredoka', Arial, sans-serif; font-size: 24px; margin-top: 0; color: #ffcc00;\">Passwort zurücksetzen</h2>\n              <p style=\"font-size: 16px; line-height: 1.5; margin: 15px 0;\">Gude aus Darmstadt,</p>\n              <p style=\"font-size: 16px; line-height: 1.5; margin: 15px 0;\">Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. Klicke auf den Button unten, um ein neues Passwort festzulegen:</p>\n              <table cellpadding=\"0\" cellspacing=\"0\" style=\"margin: 25px 0;\">\n                <tr>\n                  <td align=\"center\" style=\"background-color: #ffcc00; border: 2px solid #333; border-radius: 12px; box-shadow: 4px 4px 0 #cc9900;\">\n                    <a href=\"aja30.davidweppler.io/auth/confirm-password-reset/{TOKEN}\" style=\"display: inline-block; padding: 12px 24px; color: #161616; text-decoration: none; font-weight: 600; font-size: 16px;\">Passwort zurücksetzen</a>\n                  </td>\n                </tr>\n              </table>\n              <p style=\"font-size: 14px; line-height: 1.5; margin: 15px 0; color: #e6e6e6;\"><i>Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail einfach ignorieren.</i></p>\n              <p style=\"font-size: 14px; line-height: 1.5; margin: 15px 0; color: #cccccc;\">Der Link ist 30 Minuten gültig.</p>\n              <p style=\"font-size: 16px; line-height: 1.5; margin-top: 25px;\">Viel Spaß beim Singen!<br/>Dein Aja, 30! Team</p>\n            </td>\n          </tr>\n          <tr>\n            <td align=\"center\" style=\"padding-top: 30px; color: #b3b3b3; font-size: 12px;\">\n              © 2025 David Weppler\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>",
        "subject": "Passwort zurücksetzen - Aja, 30!"
      },
      "system": false,
      "type": "auth",
      "updateRule": "id = @request.auth.id",
      "verificationTemplate": {
        "body": "<!DOCTYPE html>\n<html lang=\"de\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>E-Mail verifizieren - Aja, 30!</title>\n  <link href=\"https://fonts.googleapis.com/css2?family=Bangers&family=Fredoka:wght@400;600&display=swap\" rel=\"stylesheet\">\n</head>\n<body style=\"margin: 0; padding: 0; background-color: #b82015; font-family: 'Fredoka', Arial, sans-serif;\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-image: radial-gradient(#a11b11 1.2px, transparent 1.2px); background-size: 12px 12px;\">\n    <tr>\n      <td align=\"center\" style=\"padding: 40px 20px;\">\n        <table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width: 600px;\">\n          <tr>\n            <td align=\"center\" style=\"padding-bottom: 30px;\">\n              <h1 style=\"font-family: 'Bangers', Arial, sans-serif; font-size: 48px; color: #ffcc00; margin: 0; text-shadow: 3px 3px 0 #000;\">Aja, 30!!</h1>\n            </td>\n          </tr>\n          <tr>\n            <td style=\"background-color: #5e0e79; border: 2px solid #333; border-radius: 10px; box-shadow: 4px 4px 0 #2a0436; padding: 30px; color: white;\">\n              <h2 style=\"font-family: 'Fredoka', Arial, sans-serif; font-size: 24px; margin-top: 0; color: #ffcc00;\">Willkommen bei Aja, 30!!</h2>\n              <p style=\"font-size: 16px; line-height: 1.5; margin: 15px 0;\">Gude aus Darmstadt,</p>\n              <p style=\"font-size: 16px; line-height: 1.5; margin: 15px 0;\">Vielen Dank, dass du dich bei Aja, 30! angemeldet hast! Klicke auf den Button unten, um deine E-Mail-Adresse zu verifizieren:</p>\n              <table cellpadding=\"0\" cellspacing=\"0\" style=\"margin: 25px 0;\">\n                <tr>\n                  <td align=\"center\" style=\"background-color: #ffcc00; border: 2px solid #333; border-radius: 12px; box-shadow: 4px 4px 0 #cc9900;\">\n                    <a href=\"aja30.davidweppler.io/auth/confirm-verification/{TOKEN}\" style=\"display: inline-block; padding: 12px 24px; color: #161616; text-decoration: none; font-weight: 600; font-size: 16px;\">E-Mail verifizieren</a>\n                  </td>\n                </tr>\n              </table>\n              <p style=\"font-size: 14px; line-height: 1.5; margin: 15px 0; color: #cccccc;\">Der Link ist 72 Stunden gültig.</p>\n              <p style=\"font-size: 16px; line-height: 1.5; margin-top: 25px;\">Wir freuen uns auf deine Teilnahme!<br/>Dein Aja, 30! Team</p>\n            </td>\n          </tr>\n          <tr>\n            <td align=\"center\" style=\"padding-top: 30px; color: #b3b3b3; font-size: 12px;\">\n              © 2025 David Weppler\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>",
        "subject": "E-Mail verifizieren - Aja, 30!"
      },
      "verificationToken": {
        "duration": 259200
      },
      "viewRule": "@request.auth.id != ''"
    },
    {
      "createRule": "@request.auth.role = 'admin'",
      "deleteRule": null,
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "number3320769076",
          "max": 5,
          "min": 1,
          "name": "round",
          "onlyInt": false,
          "presentable": false,
          "required": true,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "bool3982198806",
          "name": "competitionStarted",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "hidden": false,
          "id": "select2596314180",
          "maxSelect": 1,
          "name": "roundState",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": [
            "singing_phase",
            "rating_phase",
            "result_locked",
            "result_phase",
            "break"
          ]
        },
        {
          "cascadeDelete": false,
          "collectionId": "_pb_users_auth_",
          "hidden": false,
          "id": "relation334132808",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "activeParticipant",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        },
        {
          "hidden": false,
          "id": "bool885319865",
          "name": "competitionFinished",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        }
      ],
      "id": "pbc_3454597180",
      "indexes": [],
      "listRule": "@request.auth.role = 'admin'",
      "name": "competition_state",
      "system": false,
      "type": "base",
      "updateRule": "@request.auth.role = 'admin'",
      "viewRule": "@request.auth.role != 'default'"
    },
    {
      "createRule": "@request.auth.role = 'spectator' || @request.auth.role = 'juror'",
      "deleteRule": "id = @request.auth.id",
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "cascadeDelete": false,
          "collectionId": "_pb_users_auth_",
          "hidden": false,
          "id": "relation3182418120",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "author",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "relation"
        },
        {
          "cascadeDelete": false,
          "collectionId": "_pb_users_auth_",
          "hidden": false,
          "id": "relation776685599",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "ratedUser",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "relation"
        },
        {
          "hidden": false,
          "id": "number3632866850",
          "max": 10,
          "min": 1,
          "name": "rating",
          "onlyInt": false,
          "presentable": false,
          "required": true,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "number3320769076",
          "max": 5,
          "min": 1,
          "name": "round",
          "onlyInt": false,
          "presentable": false,
          "required": true,
          "system": false,
          "type": "number"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text2490651244",
          "max": 100,
          "min": 0,
          "name": "comment",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "number230520855",
          "max": 10,
          "min": 1,
          "name": "performanceRating",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "number111333315",
          "max": 10,
          "min": 1,
          "name": "vocalRating",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "number108596012",
          "max": 10,
          "min": 1,
          "name": "difficultyRating",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        }
      ],
      "id": "pbc_1608874019",
      "indexes": [],
      "listRule": "@request.auth.id != ''",
      "name": "ratings",
      "system": false,
      "type": "base",
      "updateRule": "id = @request.auth.id",
      "viewRule": "@request.auth.id != ''"
    },
    {
      "createRule": "@request.auth.role = 'admin'",
      "deleteRule": null,
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "number983500123",
          "max": null,
          "min": null,
          "name": "maxParticipantCount",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "number3578455248",
          "max": null,
          "min": null,
          "name": "maxJurorCount",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "json1172367516",
          "maxSize": 0,
          "name": "roundEliminationPattern",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "json"
        },
        {
          "hidden": false,
          "id": "number1956227788",
          "max": null,
          "min": null,
          "name": "totalRounds",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "number3001631701",
          "max": null,
          "min": null,
          "name": "numberOfFinalSongs",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "date774824417",
          "max": "",
          "min": "",
          "name": "songChoiceDeadline",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "date"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        }
      ],
      "id": "pbc_2769025244",
      "indexes": [],
      "listRule": "@request.auth.role = 'admin'",
      "name": "settings",
      "system": false,
      "type": "base",
      "updateRule": "@request.auth.role = 'admin'",
      "viewRule": "@request.auth.role = 'admin'"
    },
    {
      "createRule": "@request.auth.role = 'participant'",
      "deleteRule": "user = @request.auth.id",
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "cascadeDelete": false,
          "collectionId": "_pb_users_auth_",
          "hidden": false,
          "id": "relation2375276105",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "user",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "relation"
        },
        {
          "hidden": false,
          "id": "number3320769076",
          "max": 5,
          "min": 1,
          "name": "round",
          "onlyInt": true,
          "presentable": false,
          "required": true,
          "system": false,
          "type": "number"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text22648455",
          "max": 0,
          "min": 0,
          "name": "artist",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text3868388654",
          "max": 0,
          "min": 0,
          "name": "songTitle",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text1052915062",
          "max": 0,
          "min": 0,
          "name": "appleMusicSongId",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "bool3360088028",
          "name": "confirmed",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        }
      ],
      "id": "pbc_1597883152",
      "indexes": [
        "CREATE UNIQUE INDEX `idx_song_choices_user_round` ON `song_choices` (\n  `user`,\n  `round`\n)"
      ],
      "listRule": "user = @request.auth.id",
      "name": "song_choices",
      "system": false,
      "type": "base",
      "updateRule": "user = @request.auth.id || @request.auth.role = 'admin'",
      "viewRule": "user = @request.auth.id"
    }
  ];

  return app.importCollections(snapshot, false);
}, (app) => {
  return null;
})
