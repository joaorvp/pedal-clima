/**
 * Plus Code (Open Location Code, padrão aberto do Google): a posição exata escrita como "58GR2V8R+XG" ou,
 * na forma curta mostrada no Google Maps, "2V8R+XG Cidade". Decifrado aqui mesmo, sem internet.
 * Algoritmo conforme a especificação pública do Open Location Code (Apache 2.0).
 */
const ALPHA = '23456789CFGHJMPQRVWX'
const PAIR_RES = [20, 1, 0.05, 0.0025, 0.000125]
const GRID_ROWS = 5, GRID_COLS = 4

/** Acha um Plus Code no texto (completo ou curto). */
export function findPlusCode(t: string): string | null {
  const m = t.toUpperCase().match(/(?:^|[^0-9A-Z])([23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{0,7})(?![0-9A-Z])/)
  if (!m) return null
  const code = m[1], pre = code.indexOf('+')
  // formato válido: 8 caracteres antes do "+" (completo) ou 4 a 6 (curto, com número par); depois do "+", 0 ou 2+
  if (pre > 8 || pre < 2 || pre % 2 !== 0) return null
  if (code.length - pre - 1 === 1) return null
  return code
}

/** Centro da área de um código completo (8 caracteres antes do "+"). */
export function decodeFull(code: string): [number, number] | null {
  const c = code.toUpperCase().replace('+', '').replace(/0+$/, '')
  if (c.length < 8) return null
  let lat = -90, lng = -180, latRes = 20, lngRes = 20
  for (let i = 0; i < Math.min(10, c.length); i += 2) {
    const a = ALPHA.indexOf(c[i]), b = ALPHA.indexOf(c[i + 1])
    if (a < 0 || b < 0) return null
    latRes = PAIR_RES[i / 2]; lngRes = PAIR_RES[i / 2]
    lat += a * latRes; lng += b * lngRes
  }
  // depois de 10 caracteres: grade 5×4 por caractere
  for (let i = 10; i < c.length; i++) {
    const v = ALPHA.indexOf(c[i]); if (v < 0) return null
    latRes /= GRID_ROWS; lngRes /= GRID_COLS
    lat += Math.floor(v / GRID_COLS) * latRes; lng += (v % GRID_COLS) * lngRes
  }
  return [+(lat + latRes / 2).toFixed(6), +(lng + lngRes / 2).toFixed(6)]
}

/** Código curto ("2V8R+XG"): completa com a região de referência (onde você está) e decifra. */
export function recoverNearest(short: string, ref: [number, number]): [number, number] | null {
  const code = short.toUpperCase(), pre = code.indexOf('+')
  if (pre === 8) return decodeFull(code)
  const padLen = 8 - pre, res = Math.pow(20, 2 - padLen / 2), half = res / 2
  const refLat = Math.min(89.999999, Math.max(-90, ref[0])), refLng = ((ref[1] + 180) % 360 + 360) % 360 - 180
  // prefixo da área de referência no tamanho que falta
  const full = encode(refLat, refLng).slice(0, padLen) + code
  const c = decodeFull(full); if (!c) return null
  let [lat, lng] = c
  if (refLat + half < lat && lat - res >= -90) lat -= res
  else if (refLat - half > lat && lat + res <= 90) lat += res
  if (refLng + half < lng) lng -= res
  else if (refLng - half > lng) lng += res
  return [+lat.toFixed(6), +lng.toFixed(6)]
}

/** Codifica uma posição (10 caracteres, ~14 m). Usado para completar códigos curtos e nos testes. */
export function encode(lat: number, lng: number): string {
  let la = Math.min(89.9999999, Math.max(-90, lat)) + 90, lo = ((lng + 180) % 360 + 360) % 360
  let out = ''
  for (let i = 0; i < 5; i++) {
    const r = PAIR_RES[i]
    const a = Math.floor(la / r), b = Math.floor(lo / r)
    la -= a * r; lo -= b * r
    out += ALPHA[a] + ALPHA[b]
    if (i === 3) out += '+'
  }
  return out
}

/** Posição do Plus Code achado no texto (curto usa `ref`). */
export function plusCodeToLatLon(t: string, ref: [number, number]): [number, number] | null {
  const code = findPlusCode(t); if (!code) return null
  return code.indexOf('+') === 8 ? decodeFull(code) : recoverNearest(code, ref)
}
