# Atelier · Madera & Materia (https://atelier.webproai.tech)

Sitio web de mobiliario arquitectónico en madera maciza conectado a **WebProAI CMS Studio** (https://webproai.tech).

## Comandos de sincronización (CLI)

`ash
# 1. Descargar cambios hechos por el cliente desde el panel visual (/portal)
ltn pull atelier

# 2. Subir cambios de código y estructura al CMS
ltn push atelier --overwrite --message "Update furniture catalog schema"
`

## Variables de entorno (.env.local)

`env
NEXT_PUBLIC_CMS_API_URL=https://webproai.tech/api
NEXT_PUBLIC_CMS_PROJECT_SLUG=atelier
CMS_PROJECT_API_KEY=ltn_pub_atelier_...
`
"@ | Set-Content "C:\Users\USER\.gemini\antigravity-cli\brain\f475f2e2-7389-420f-961b-8ed25075e8a5\scratch\atelier-mobiliario\README.md" -Encoding UTF8

@"
const CMS_API = process.env.NEXT_PUBLIC_CMS_API_URL || 'https://webproai.tech/api';
const SLUG = process.env.NEXT_PUBLIC_CMS_PROJECT_SLUG || 'atelier';

export async function getAtelierManifest() {
  const res = await fetch(${CMS_API}/projects//manifest, {
    headers: { 'x-cms-api-key': process.env.CMS_PROJECT_API_KEY || '' },
    next: { revalidate: 15 },
  });
  if (!res.ok) throw new Error('Error cargando manifiesto CMS de Atelier');
  return res.json();
}
