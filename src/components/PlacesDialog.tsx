import { ChevronDown, ChevronUp, ClipboardPaste, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { KINDS, guessKind, kindOf, type KindId } from '../domain/placeKinds'
import type { LatLon } from '../domain/types'
import { useSettings } from '../store/settings'
import { useTrip } from '../store/trip'
import { AddressCombo } from './AddressCombo'
import { Dialog } from './Dialog'
import { KindIcon } from './KindIcon'
import { MiniMapPin } from './MiniMapPin'
import { lastView } from '../hooks/location'
import { resolveShared } from '../services/places'
import { parseShared, shortLinkOnly, SHORT_LINK_HELP, type SharedPlace } from '../domain/shareParse'

/** Escolha do tipo: fileira de botões com ícone. */
function KindPicker({ value, onChange, idPrefix }: { value: string; onChange: (k: KindId) => void; idPrefix: string }) {
  return (
    <div className="kinds" role="radiogroup" aria-label="Tipo do lugar">
      {KINDS.map(k => (
        <button key={k.id} type="button" role="radio" aria-checked={value === k.id} id={`${idPrefix}-${k.id}`} className="kind" style={{ '--kc': k.color } as React.CSSProperties} onClick={() => onChange(k.id)}>
          <KindIcon kind={k.id} /><span>{k.label}</span>
        </button>
      ))}
    </div>
  )
}

/** "Meus lugares": lugares salvos agrupados por tipo; adicionar, renomear, trocar o tipo, reordenar e apagar. */
export function PlacesDialog() {
  const open = useTrip(s => s.placesOpen)
  const close = () => useTrip.getState().set({ placesOpen: null })
  return (
    <Dialog open={!!open} onClose={close} labelledBy="places-title" className="places-dlg">
      {open && <PlacesBody key={open.ll?.join(',') ?? (open.shared ? 'compartilhado' : 'novo')} start={open} close={close} />}
    </Dialog>
  )
}

function PlacesBody({ start, close }: { start: { ll?: LatLon; name?: string; shared?: SharedPlace; notice?: string }; close: () => void }) {
  const s = useSettings()
  // veio do mapa ("Salvar lugar"): já traz o ponto e o nome da rua
  const [name, setName] = useState((start.name ?? '').split(',')[0].slice(0, 30)), [kind, setKind] = useState<KindId | null>(null)
  const [pt, setPt] = useState<{ ll: LatLon; addr: string } | null>(start.ll ? { ll: start.ll, addr: start.name ?? '' } : null)
  const [editing, setEditing] = useState<string | null>(null), [msg, setMsg] = useState('')
  // lugar compartilhado de outro app (Google Maps…): procura o ponto pelas coordenadas, endereço, CEP ou nome
  const [sharing, setSharing] = useState(!!start.shared && !start.ll), [precise, setPrecise] = useState<boolean | null>(start.ll ? true : null)
  const nearNow = () => useTrip.getState().me?.pos ?? lastView()?.c ?? null
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])
  /** Procura o ponto do lugar compartilhado/colado e prepara para salvar. */
  function applyShared(sh: SharedPlace) { setSharing(true); setMsg(''); resolveAndShow(sh) }
  function resolveAndShow(sh: SharedPlace) {
    const near = nearNow()
    resolveShared(sh, near).then(r => {
      if (!alive.current) return
      setSharing(false)
      if (r) { setPt({ ll: r.ll, addr: r.addr }); setName(r.name.slice(0, 30)); setPrecise(r.precise) }
      else { setPt({ ll: near ?? [-15.82, -48.0], addr: sh.address ?? '' }); setName((sh.name ?? '').slice(0, 30)); setPrecise(false)
        setMsg('Não achei esse lugar. Arraste o alfinete até ele no mapinha abaixo.') }
    })
  }
  // o estado inicial já começa "procurando" quando veio um compartilhamento
  useEffect(() => { if (start.shared && !start.ll) resolveAndShow(start.shared) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  /** "Colar do Google Maps": lê o que você copiou (código do lugar, endereço ou texto compartilhado). */
  async function pasteFromMaps() {
    let t = ''
    try { t = await navigator.clipboard.readText() } catch { setMsg('O celular não deixou ler o que foi copiado. Toque na busca acima e cole por lá.'); return }
    if (!t.trim()) { setMsg('Nada copiado. No Google Maps, toque no código do lugar (como 2V8R+XG) ou no endereço para copiar.'); return }
    if (shortLinkOnly(t)) { setMsg(SHORT_LINK_HELP); return }
    const sh = parseShared({ text: t }, nearNow() ?? undefined) ?? { address: t.trim().slice(0, 200) }
    applyShared(sh)
  }
  const autoKind = kind ?? guessKind(name)
  function add() {
    if (!pt) return
    const n = (name.trim() || pt.addr.split(',')[0] || 'Lugar').slice(0, 30)
    s.addPlace(n, pt.addr, pt.ll, autoKind)
    setMsg(`"${n}" salvo em ${kindOf(autoKind).label}.`); setName(''); setKind(null); setPt(null)
  }
  const groups = KINDS.map(k => ({ k, list: s.places.filter(p => kindOf(p.kind ?? guessKind(p.name)).id === k.id) })).filter(g => g.list.length)
  return <>
      <div className="dlg-head">
        <h2 id="places-title">Meus lugares</h2>
        <button className="ibtn" type="button" aria-label="Fechar" style={{ marginLeft: 'auto' }} onClick={close}><X className="i" /></button>
      </div>
      <div className="dlg-body">
        <section className="pl-add" aria-labelledby="pl-add-title">
          <h3 id="pl-add-title">Adicionar lugar</h3>
          {start.notice && !pt && !msg && <p className="note" style={{ margin: 0 }}>{start.notice}</p>}
          {sharing && <p className="note" id="pl-sharing" style={{ margin: 0 }}>Procurando o lugar…</p>}
          {pt
            ? <div className="pl-picked"><span><b>{pt.addr.split(',')[0] || 'Ponto no mapa'}</b><small>{pt.addr.split(',').slice(1).join(',').trim()}</small></span><button className="linkbtn" type="button" onClick={() => { setPt(null); setPrecise(null) }}>Trocar</button></div>
            : <AddressCombo id="pl-search" label="Endereço do lugar" placeholder="Busque o endereço ou o nome do lugar" value=""
                onPick={(ll, label) => { setPt({ ll, addr: label }); setPrecise(null); if (!name) setName((label || '').split(',')[0].slice(0, 30)) }} />}
          {!pt && !sharing && <button className="btn pl-paste" type="button" id="pl-paste" onClick={pasteFromMaps}><ClipboardPaste className="i" />Colar do Google Maps</button>}
          {pt && <>
            <MiniMapPin ll={pt.ll} onMove={ll => { setPt(p => p ? { ...p, ll } : p); setPrecise(true) }} />
            <p className={'pl-precise' + (precise === false ? ' approx' : '')} id="pl-precise">{precise === false
              ? 'Posição aproximada (pelo endereço). Arraste o alfinete até a porta do lugar.'
              : 'Arraste o alfinete ou toque no mapa para acertar o lugar.'}</p>
          </>}
          <input className="pl-name" id="pl-name" type="text" placeholder="Nome (ex.: Academia, Casa da mãe)" aria-label="Nome do lugar" maxLength={30} value={name} onChange={e => setName(e.target.value)} />
          <KindPicker value={autoKind} onChange={setKind} idPrefix="pl-kind" />
          <button className="btn primary pl-save" type="button" id="pl-save" disabled={!pt} onClick={add}><Plus className="i" />Salvar lugar</button>
          {msg && <p className="note ok-text" id="pl-msg" style={{ margin: 0 }}>{msg}</p>}
        </section>

        {groups.length ? groups.map(({ k, list }) => (
          <section key={k.id} className="pl-group" aria-label={k.label}>
            <h3 style={{ '--kc': k.color } as React.CSSProperties}><span className="kdot"><KindIcon kind={k.id} /></span>{k.label}</h3>
            <ul className="pl-list">
              {list.map(p => {
                const i = s.places.indexOf(p)
                return (
                  <li key={p.id}>
                    <div className="pl-row">
                      <div className="pname"><input aria-label={'Nome de ' + p.name} defaultValue={p.name} maxLength={30} onBlur={e => s.renamePlace(p.id, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} /><small>{p.addr || 'Ponto marcado no mapa'}</small></div>
                      <div className="pact">
                        <button className="ibtn sm" type="button" aria-label={'Trocar o tipo de ' + p.name} aria-expanded={editing === p.id} onClick={() => setEditing(editing === p.id ? null : p.id)}><KindIcon kind={k.id} /></button>
                        <button className="ibtn sm" type="button" aria-label={'Subir ' + p.name} disabled={i === 0} onClick={() => s.shiftPlace(p.id, -1)}><ChevronUp className="i" /></button>
                        <button className="ibtn sm" type="button" aria-label={'Descer ' + p.name} disabled={i === s.places.length - 1} onClick={() => s.shiftPlace(p.id, 1)}><ChevronDown className="i" /></button>
                        <button className="ibtn sm" type="button" aria-label={'Apagar ' + p.name} onClick={() => s.removePlace(p.id)}><Trash2 className="i" /></button>
                      </div>
                    </div>
                    {editing === p.id && <KindPicker value={k.id} idPrefix={'k-' + p.id} onChange={nk => { s.setPlaceKind(p.id, nk); setEditing(null) }} />}
                  </li>
                )
              })}
            </ul>
          </section>
        )) : <p className="note" style={{ margin: 0 }}>Nenhum lugar ainda. Busque acima, toque na estrela ☆ ao lado de um resultado de busca ou segure o dedo no mapa e toque em "Salvar lugar".</p>}
        {groups.length > 0 && <p className="note" style={{ margin: 0 }}>Casa e Trabalho ficam em Ajustes. A ordem aqui é a mesma dos atalhos da tela inicial.</p>}
      </div>
      <div className="dlg-foot"><button className="btn primary" type="button" onClick={close}>Pronto</button></div>
  </>
}
