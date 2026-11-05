# plantfam-ideas

The Vercel function behind the app's "Suggest a plant or idea" form: `POST /api/idea` adds a row
to the "PlantFam ideas" Notion database.

Environment (Vercel project `plantfam-ideas`):
- `NOTION_TOKEN`: a Notion internal integration secret, as a Sensitive variable. Set in the Vercel dashboard only.
- `NOTION_IDEAS_DB`: the database id (not secret).

The database must be shared with the integration (database ⋯ → Connections).
