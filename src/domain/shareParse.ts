import { parseCoords } from './places'
import { findPlusCode, plusCodeToLatLon } from './plusCode'

/**
 * O que o Google Maps (ou outro app) manda ao "Compartilhar" um lugar. Exemplos:
 *   "Supermercado X\nQuadra 10, Conjunto A - Bairro, Cidade - DF, 72000-000\nhttps://maps.app.goo.gl/abc"
 *   título "Smart Fit" + texto "https://maps.app.goo.gl/abc"
 *   "https://www.google.com/maps/place/.../@-15.83,-48.10,17z/..."
 *   "-15.8312, -48.1077"
 */
export interface SharedPlace { name?: string; address?: string; cep?: string; coords?: [number, number]; link?: string }

const URL_RE = /https?:\/\/\S+/gi
const CEP_RE = /\b(\d{5})-?(\d{3})\b/

/** Texto parece um compartilhamento de mapa (link do Maps ou várias linhas com endereço)? */
export function looksShared(t: string): boolean {
  return /maps\.app\.goo\.gl|goo\.gl\/maps|google\.[a-z.]+\/maps|waze\.com\/ul/i.test(t) || !!findPlusCode(t) || (t.includes('\n') && t.trim().split('\n').length >= 2)
}

/** Só o link curto do Google (sem nome, endereço nem código): não dá para abrir pelo navegador. */
export function shortLinkOnly(t: string): boolean {
  const rest = t.replace(/https?:\/\/\S+/gi, '').trim()
  return /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(t) && !rest && !findPlusCode(t)
}

export function parseShared(p: { title?: string | null; text?: string | null; url?: string | null }, ref: [number, number] = [-15.82, -48.0]): SharedPlace | null {
  const raw = [p.text ?? '', p.url ?? ''].join('\n')
  const links = raw.match(URL_RE) ?? []
  const out: SharedPlace = {}
  if (links.length) out.link = links[0]
  // coordenadas: no link longo (…/@lat,lon) ou soltas no texto
  for (const s of [...links, ...raw.split('\n')]) { const c = parseCoords(s.trim()) ?? matchLoose(s); if (c) { out.coords = c; break } }
  // Plus Code do Google ("2V8R+XG Cidade"): posição exata, decifrada aqui mesmo
  const textNoLinks = (p.text ?? '').replace(URL_RE, '')
  let codeLine = ''
  if (!out.coords) {
    const pc = plusCodeToLatLon(textNoLinks + ' ' + (p.title ?? ''), ref)
    if (pc) { out.coords = pc; codeLine = textNoLinks.split('\n').map(l => l.trim()).find(l => findPlusCode(l)) ?? '' }
  }
  const lines = textNoLinks.split('\n').map(l => l.trim()).filter(l => l && !/^[-–:·]+$/.test(l) && !matchLoose(l) && !findPlusCode(l))
  const title = (p.title ?? '').trim()
  const titleOk = title && !URL_RE.test(title) && !/^(compartilhar|share|localiza[cç][aã]o|google maps)$/i.test(title)
  URL_RE.lastIndex = 0
  const isAddress = (l: string) => CEP_RE.test(l) || /\d/.test(l) && /,| - /.test(l)
  if (titleOk) out.name = title
  if (lines.length >= 2) { out.name ??= lines[0]; out.address = lines.slice(1).find(isAddress) ?? lines[1] }
  else if (lines.length === 1) { if (isAddress(lines[0])) out.address = lines[0]; else out.name ??= lines[0] }
  // só o código: o nome provisório é a linha do código ("2V8R+XG Cidade"); dá para renomear ao salvar
  if (!out.name && !out.address && codeLine) out.name = codeLine
  if (out.name && out.address === out.name) delete out.address
  const m = (out.address ?? lines.join(' ')).match(CEP_RE)
  if (m) out.cep = m[1] + m[2]
  if (out.name) out.name = out.name.replace(/^(lugar|local|pin) (marcado|fixado)$/i, '').slice(0, 60) || undefined
  return out.name || out.address || out.coords || out.cep ? out : null
}

/** "-15.8312, -48.1077" em qualquer parte da linha. */
function matchLoose(s: string): [number, number] | null {
  const m = s.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/)
  if (!m) return null
  const lat = +m[1], lon = +m[2]
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [lat, lon] : null
}

/** Endereço sem o CEP e sem o país, para os buscadores (que se perdem com eles). */
export function addressQuery(a: string): string {
  return a.replace(CEP_RE, '').replace(/,?\s*(brasil|brazil)\s*$/i, '').replace(/\s*,\s*,/g, ',').replace(/[\s,–-]+$/, '').trim()
}

/** O que dizer quando só chega o link curto. */
export const SHORT_LINK_HELP = 'O link curto do Google Maps não pode ser aberto pelo app. No Google Maps, toque no código do lugar (como 2V8R+XG, ao lado do ícone de alvo) ou no endereço para copiar, e cole aqui.'
