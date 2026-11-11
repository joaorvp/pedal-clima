import { describe, expect, it } from 'vitest'
import { checklist, rideVerdict, timelineGroups, verdict, type TripCtx } from './advice'
import { clearTime, darkness, evaluate, isRainy } from './weather'
import { sampleRoute } from './testData'

const now = Math.floor(Date.now() / 900e3) * 900e3
const ctx = (route = sampleRoute(now / 1000)): TripCtx => ({ route, dir: 'ida', speed: 22, probTh: 50, depLabel: 'Saída de casa', arrLabel: 'Chegada no trabalho', now })

describe('avaliação do trajeto', () => {
  it('encontra chuva só no trecho do meio', () => {
    const c = ctx(), ev = evaluate(c.route, 'ida', now, 22)
    expect(ev.exposure).toBeGreaterThan(0.15)
    const groups = timelineGroups(ev)
    expect(groups[0].c).toBe(0); expect(groups.some(g => g.c >= 1)).toBe(true); expect(groups.at(-1)!.c).toBe(0)
  })
  it('manda levar a capa e diz onde a chuva começa', () => {
    const c = ctx(), v = verdict(evaluate(c.route, 'ida', now, 22), c)
    expect(v.title).toBe('Leve a capa'); expect(v.sub).toMatch(/a partir de km \d+/)
  })
  it('diz que pode ir tranquilo sem chuva', () => {
    const c = ctx(sampleRoute(now / 1000, false)), ev = evaluate(c.route, 'ida', now, 22)
    expect(isRainy(ev)).toBe(false); expect(verdict(ev, c).title).toBe('Pode ir tranquilo')
  })
  it('acha o horário em que a chuva passa', () => {
    const c = ctx(), t = clearTime(c.route, 'ida', now, 22)
    expect(t).not.toBeNull(); expect(t!).toBeGreaterThan(now)
  })
  it('no modo pedal, conta a distância até a chuva', () => {
    const c = ctx(), v = rideVerdict(evaluate(c.route, 'ida', now, 22), c, 1, 0, 22)
    expect(v.title).toMatch(/^Chuva em \d/)
  })
  it('lembra do farol quando a viagem pega o anoitecer', () => {
    const c = ctx(), ev = evaluate(c.route, 'ida', now, 22), set = ev.arr / 1000 - 300
    expect(darkness({ sunrise: [set - 12 * 3600], sunset: [set] }, ev)?.kind).toBe('set')
    expect(checklist(ev, c, { sunrise: [set - 12 * 3600], sunset: [set] }, null).some(i => /Escurece/.test(i.title))).toBe(true)
  })
})
