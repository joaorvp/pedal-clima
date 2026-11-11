import { describe, expect, it } from 'vitest'
import { buildSamples, cumulative, hav, project, removeSpurs } from './geo'
import type { LatLon } from './types'

const straight: LatLon[] = Array.from({ length: 51 }, (_, i) => [-15.8, -48.0 + i * 0.001])
const len = (l: LatLon[]) => cumulative(l).at(-1)!

describe('geo', () => {
  it('calcula distâncias em km', () => { expect(hav([-15.8, -48], [-15.8, -47.99])).toBeCloseTo(1.07, 1) })
  it('remove bicos de ida e volta criados pelo ponto intermediário', () => {
    const spur: LatLon[] = [1, 2, 3, 4].map(i => [-15.8 + i * 0.001, -47.975])
    const line = [...straight.slice(0, 26), ...spur, ...spur.slice(0, -1).reverse(), ...straight.slice(25)]
    expect(len(line)).toBeGreaterThan(6)
    expect(len(removeSpurs(line))).toBeCloseTo(len(straight), 1)
  })
  it('gera no máximo ~19 amostras, com início e fim', () => {
    const { samples, total } = buildSamples(straight)
    expect(samples[0].km).toBe(0); expect(samples.at(-1)!.km).toBeCloseTo(total); expect(samples.length).toBeLessThanOrEqual(19)
  })
  it('projeta a posição do GPS sobre a rota', () => {
    const cum = cumulative(straight), p = project([-15.8005, -47.98], straight, cum)
    expect(p.d).toBeCloseTo(hav(straight[0], [-15.8, -47.98]), 1); expect(p.off).toBeLessThan(0.1)
  })
})
