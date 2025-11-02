migrate((app) => {
  const snapshot = [
    {
      "id": "pbc_email_templates",
      "name": "email_templates",
      "type": "base",
      "system": false,
      "listRule": "@request.auth.role = \"admin\"",
      "viewRule": "@request.auth.role = \"admin\"",
      "createRule": "@request.auth.role = \"admin\"",
      "updateRule": "@request.auth.role = \"admin\"",
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
          "id": "select_template_type",
          "maxSelect": 1,
          "name": "template_type",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "select",
          "values": [
            "verification",
            "password_reset",
            "email_change"
          ]
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_subject",
          "max": 500,
          "min": 0,
          "name": "subject",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "convertUrls": false,
          "hidden": false,
          "id": "editor_body",
          "name": "body",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "editor"
        },
        {
          "hidden": false,
          "id": "select_collection_ref",
          "maxSelect": 1,
          "name": "collection_ref",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "select",
          "values": [
            "users",
            "_superusers"
          ]
        },
        {
          "hidden": false,
          "id": "bool_is_active",
          "name": "is_active",
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
      "indexes": []
    },
    {
      "id": "pbc_ui_content",
      "name": "ui_content",
      "type": "base",
      "system": false,
      "listRule": "@request.auth.id != \"\"",
      "viewRule": "@request.auth.id != \"\"",
      "createRule": "@request.auth.role = \"admin\"",
      "updateRule": "@request.auth.role = \"admin\"",
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
          "id": "text_key",
          "max": 200,
          "min": 0,
          "name": "key",
          "pattern": "^[a-z0-9._-]+$",
          "presentable": true,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text",
          "unique": true
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_value",
          "max": 5000,
          "min": 0,
          "name": "value",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "select_category",
          "maxSelect": 1,
          "name": "category",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "select",
          "values": [
            "home",
            "auth",
            "profile",
            "admin",
            "rating",
            "song_choice"
          ]
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_description",
          "max": 500,
          "min": 0,
          "name": "description",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "json_variables",
          "maxSize": 1,
          "name": "variables",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "json"
        },
        {
          "hidden": false,
          "id": "bool_is_active",
          "name": "is_active",
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
      "indexes": []
    }
  ];

  return app.importCollections(snapshot, true);
}, (app) => {
  return null;
});
