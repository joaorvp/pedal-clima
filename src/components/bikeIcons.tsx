/**
 * Ícones da barra do topo com cara de bicicleta (mesmo traço dos ícones do app: 24×24, linha 2, pontas redondas).
 * Roda (atualizar: gira enquanto atualiza), alfinete com estrela (Meus lugares), velocímetro (Seus pedais) e
 * coroa da corrente (Ajustes).
 */
type P = { className?: string }
const Svg = ({ className = 'i', children }: P & { children: React.ReactNode }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)

/** Roda de bicicleta: aro, cubo e raios. */
export function WheelIcon(p: P) {
  return <Svg {...p}>
    <circle cx="12" cy="12" r="9.4" />
    <circle cx="12" cy="12" r="2" />
    <path strokeWidth="1.5" d="M14.13 12.57L20.31 14.23M12.57 14.13L14.23 20.31M10.44 13.56L5.92 18.08M9.87 11.43L3.69 9.77M11.43 9.87L9.77 3.69M13.56 10.44L18.08 5.92" />
  </Svg>
}

/** Alfinete de mapa com estrela: seus lugares. */
export function PlacePinIcon(p: P) {
  return <Svg {...p}>
    <path d="M12 21.5s-7-6.1-7-11.6a7 7 0 0 1 14 0c0 5.5-7 11.6-7 11.6z" />
    <path strokeWidth="1.4" d="M12.00 6.80 L12.85 9.03 L15.23 9.15 L13.38 10.65 L14.00 12.95 L12.00 11.65 L10.00 12.95 L10.62 10.65 L8.77 9.15 L11.15 9.03Z" />
  </Svg>
}

/** Velocímetro de bike: seus pedais, km e conquistas. */
export function SpeedoIcon(p: P) {
  return <Svg {...p}>
    <path d="M2.6 16.6a9.4 9.4 0 1 1 18.8 0" />
    <path d="M12 16.6l4.6-6.2" />
    <circle cx="12" cy="16.6" r="1.4" />
    <path strokeWidth="1.6" d="M5.6 10l1.1.9M12 4.9v1.5M18.4 10l-1.1.9" />
    <path d="M6 20.4h12" />
  </Svg>
}

/** Coroa da corrente (com dentes): ajustes. */
export function ChainringIcon(p: P) {
  return <Svg {...p}>
    <circle cx="12" cy="12" r="7.2" />
    <circle cx="12" cy="12" r="2.2" />
    <path strokeWidth="2.2" d="M19.20 12.00L21.30 12.00M18.24 15.60L20.06 16.65M15.60 18.24L16.65 20.06M12.00 19.20L12.00 21.30M8.40 18.24L7.35 20.06M5.76 15.60L3.94 16.65M4.80 12.00L2.70 12.00M5.76 8.40L3.94 7.35M8.40 5.76L7.35 3.94M12.00 4.80L12.00 2.70M15.60 5.76L16.65 3.94M18.24 8.40L20.06 7.35" />
    <path strokeWidth="1.5" d="M12.00 9.80L12.00 6.80M14.09 11.32L16.95 10.39M13.29 13.78L15.06 16.21M10.71 13.78L8.94 16.21M9.91 11.32L7.05 10.39" />
  </Svg>
}
