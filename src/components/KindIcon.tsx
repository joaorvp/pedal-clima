import { kindOf } from '../domain/placeKinds'

/** Ícone do tipo de lugar (o mesmo desenho dos alfinetes do mapa). */
export function KindIcon({ kind, className = 'i' }: { kind?: string; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: kindOf(kind).path }} />
}
