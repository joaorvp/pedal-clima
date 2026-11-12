/** Tipos de lugar salvo: ícone (SVG 24×24, traço) e cor. A ordem é a dos grupos em "Meus lugares". */
export const KINDS = [
  { id: 'academia', label: 'Academia', color: '#e2662a', path: '<path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12"/>' },
  { id: 'mercado', label: 'Mercado', color: '#2f8a4f', path: '<path d="M3 4h2.2l2.3 10.3a1 1 0 0 0 1 .7h8.8a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="16.5" cy="19" r="1.4"/>' },
  { id: 'estudo', label: 'Estudo', color: '#5a3ec2', path: '<path d="M2 9.5 12 4.5l10 5-10 5z"/><path d="M6 11.5v4.5c3.2 2.3 8.8 2.3 12 0v-4.5M22 9.5v5"/>' },
  { id: 'familia', label: 'Família', color: '#c42c8b', path: '<path d="M12 20s-7-4.3-7-9.7A4 4 0 0 1 12 7.6a4 4 0 0 1 7 2.7C19 15.7 12 20 12 20z"/>' },
  { id: 'amigos', label: 'Amigos', color: '#1d5ea8', path: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.2A4.6 4.6 0 0 1 21 19"/>' },
  { id: 'comida', label: 'Comida', color: '#c2700b', path: '<path d="M6 3v7a2 2 0 0 0 4 0V3M8 12v9M16.5 3c-1.9 1.4-2.5 4.6-1.5 7l1.5.6V21"/>' },
  { id: 'saude', label: 'Saúde', color: '#c7392f', path: '<path d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z"/>' },
  { id: 'outro', label: 'Outro', color: '#59657c', path: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>' },
] as const
export type KindId = typeof KINDS[number]['id']
export const kindOf = (id: string | undefined) => KINDS.find(k => k.id === id) ?? KINDS[KINDS.length - 1]

const RULES: [KindId, RegExp][] = [
  ['academia', /academia|gym|crossfit|pilates|muscula|nata[cç][aã]o|clube|quadra|est[uú]dio de/i],
  ['mercado', /mercado|supermercado|atacad|feira|hortifruti|a[cç]ougue|sacol[aã]o|mercearia/i],
  ['estudo', /escola|faculdade|universidade|unb|col[eé]gio|curso|creche|instituto|biblioteca|campus/i],
  // fronteira de palavra com acento: \b do JavaScript não entende "vó" ou "mãe"
  ['familia', /(?<!\p{L})(m[aã]e|pai|v[oó]|av[oó]|tia|tio|irm[aã]|irm[aã]o|sogr[ao]|prim[ao]|fam[ií]lia|filh[ao])(?!\p{L})/iu],
  ['amigos', /amig|galera|turma|\bcasa d[aoe] /i],
  ['comida', /restaurante|padaria|caf[eé]|lanchonete|\bbar\b|pizzaria|hamburg|sorvet|a[cç]a[ií]|churrasc|confeitaria|food/i],
  ['saude', /hospital|cl[ií]nica|farm[aá]cia|drogaria|posto de sa[uú]de|\bupa\b|ubs|laborat[oó]rio|dentista|m[eé]dic/i],
]
/** Tipo provável pelo nome ("Casa da mãe" → Família, "Academia Fit" → Academia). */
export function guessKind(name: string): KindId {
  // "casa da mãe" é família, não amigos: as regras de família vêm antes
  for (const [k, re] of RULES) if (re.test(name)) return k
  return 'outro'
}
