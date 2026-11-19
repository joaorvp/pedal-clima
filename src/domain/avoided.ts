/**
 * "Chuva evitada": você pedalou seco quando outra escolha pegaria chuva.
 * - 'route': a rota escolhida está seca e alguma alternativa (no mesmo horário) pegaria chuva;
 * - 'time': quando você abriu o trajeto, sair na hora pegaria chuva, e você saiu depois, já seco.
 * Só conta de verdade se o pedal terminar seco (sem chuva prevista onde você passou) e você não disser "Choveu".
 */
export type Avoided = 'route' | 'time'

export function avoidedRain(chosenRainy: boolean, altRainy: boolean[], rainyAtOpen: boolean | null): Avoided | null {
  if (chosenRainy) return null
  if (altRainy.some(Boolean)) return 'route'
  if (rainyAtOpen) return 'time'
  return null
}

export const avoidedText = (a: Avoided) => a === 'route' ? 'a outra rota pegaria chuva' : 'saindo na hora em que você olhou, pegaria chuva'
