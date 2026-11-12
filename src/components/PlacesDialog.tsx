import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { KINDS, guessKind, kindOf, type KindId } from '../domain/placeKinds'
import type { LatLon } from '../domain/types'
import { useSettings } from '../store/settings'
import { useTrip } from '../store/trip'
import { AddressCombo } from './AddressCombo'
import { Dialog } from './Dialog'
import { KindIcon } from './KindIcon'

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
      {open && <PlacesBody key={open.ll?.join(',') ?? 'novo'} start={open} close={close} />}
    </Dialog>
  )
}

function PlacesBody({ start, close }: { start: { ll?: LatLon; name?: string }; close: () => void }) {
  const s = useSettings()
  // veio do mapa ("Salvar lugar"): já traz o ponto e o nome da rua
  const [name, setName] = useState((start.name ?? '').split(',')[0].slice(0, 30)), [kind, setKind] = useState<KindId | null>(null)
  const [pt, setPt] = useState<{ ll: LatLon; addr: string } | null>(start.ll ? { ll: start.ll, addr: start.name ?? '' } : null)
  const [editing, setEditing] = useState<string | null>(null), [msg, setMsg] = useState('')
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
          {pt
            ? <div className="pl-picked"><span><b>{pt.addr.split(',')[0] || 'Ponto no mapa'}</b><small>{pt.addr.split(',').slice(1).join(',').trim()}</small></span><button className="linkbtn" type="button" onClick={() => setPt(null)}>Trocar</button></div>
            : <AddressCombo id="pl-search" label="Endereço do lugar" placeholder="Busque o endereço ou o nome do lugar" value=""
                onPick={(ll, label) => { setPt({ ll, addr: label }); if (!name) setName((label || '').split(',')[0].slice(0, 30)) }} />}
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
