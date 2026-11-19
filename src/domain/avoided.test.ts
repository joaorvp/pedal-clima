import { describe, expect, it } from 'vitest'
import { avoidedRain } from './avoided'

describe('chuva evitada', () => {
  it('conta quando a rota escolhida está seca e outra pegaria chuva', () => expect(avoidedRain(false, [true, false], false)).toBe('route'))
  it('conta quando esperou a janela seca', () => expect(avoidedRain(false, [false], true)).toBe('time'))
  it('não conta se a escolhida pega chuva ou se nunca houve chuva prevista', () => {
    expect(avoidedRain(true, [true], true)).toBeNull()
    expect(avoidedRain(false, [false], false)).toBeNull()
    expect(avoidedRain(false, [], null)).toBeNull()
  })
})
