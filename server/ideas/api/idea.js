// PlantFam "Suggest a plant or idea": the app posts here and this adds a row to the
// "PlantFam ideas" Notion database. The Notion key lives only in this project's Vercel
// environment (NOTION_TOKEN), never in the app.
const NOTION_VERSION = '2022-06-28';
const TYPES = ['Missing plant', 'Feature idea', 'Something confusing', 'Bug', 'Other'];
const LIMITS = { details: 2000, plant: 80, email: 120, app: 80 };

// Best-effort spam brake per warm instance: 5 ideas per address per 10 minutes.
const recent = new Map();
const tooMany = (ip) => {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > 5;
};

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const rich = (s) => (s ? [{ type: 'text', text: { content: s } }] : []);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });
  const token = process.env.NOTION_TOKEN;
  const db = process.env.NOTION_IDEAS_DB;
  if (!token || !db) return res.status(503).json({ ok: false, error: 'not-configured' });

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body ?? {};
  // Honeypot: the app never fills this; simple bots do. Pretend it worked.
  if (body.website) return res.status(200).json({ ok: true });

  const type = TYPES.includes(body.type) ? body.type : 'Other';
  const details = text(body.details, LIMITS.details);
  const plant = text(body.plant, LIMITS.plant);
  const email = text(body.email, LIMITS.email);
  const app = text(body.app, LIMITS.app);
  if (details.length < 3 && plant.length < 2) return res.status(400).json({ ok: false, error: 'empty' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: 'email' });

  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) return res.status(429).json({ ok: false, error: 'slow-down' });

  const title = (type === 'Missing plant' && plant ? `Add ${plant}` : details.split('\n')[0]).slice(0, 90);
  const properties = {
    Idea: { title: rich(title) },
    Type: { select: { name: type } },
    Details: { rich_text: rich(details) },
    Plant: { rich_text: rich(plant) },
    App: { rich_text: rich(app) },
  };
  if (email) properties['Email (optional)'] = { email };

  const r = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
    body: JSON.stringify({ parent: { database_id: db }, properties }),
  }).catch(() => null);
  if (!r || !r.ok) {
    console.error('notion', r?.status, r ? await r.text().catch(() => '') : 'network');
    return res.status(502).json({ ok: false, error: 'notion' });
  }
  return res.status(200).json({ ok: true });
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
