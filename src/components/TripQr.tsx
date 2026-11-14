import { Copy, X } from 'lucide-react'
import qrcode from 'qrcode-generator'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { tripLinkQuery } from '../domain/tripLink'
import { endpointName, useTrip } from '../store/trip'
import { Dialog } from './Dialog'

/** Desenha o QR code como SVG (feito aqui mesmo, sem serviço externo: o link nunca sai do aparelho). */
function QrSvg({ text }: { text: string }) {
  const { n, d } = useMemo(() => {
    const qr = qrcode(0, 'M'); qr.addData(text); qr.make()
    const n = qr.getModuleCount(); let d = ''
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`
    return { n, d }
  }, [text])
  return (
    <svg className="qr" viewBox={`0 0 ${n + 8} ${n + 8}`} role="img" aria-label="QR code do trajeto" shapeRendering="crispEdges">
      <rect width={n + 8} height={n + 8} fill="#fff" /><path d={d} fill="#000" />
    </svg>
  )
}

/** "Abrir no celular": planeje no computador e continue no celular apontando a câmera para o código. */
export function TripQrDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const origin = useTrip(s => s.origin), dest = useTrip(s => s.dest), vias = useTrip(s => s.vias)
  const [msg, setMsg] = useState('')
  if (!dest || dest.kind !== 'place') return null
  const url = `${location.origin}${location.pathname}?${tripLinkQuery({
    dest: { ll: dest.ll, name: dest.name },
    ...(origin.kind === 'place' ? { origin: { ll: origin.ll, name: origin.name } } : {}),
    ...(vias[0] ? { via: vias[0] } : {}),
  })}`
  const close = () => { setMsg(''); onClose() }
  // portal: o botão fica dentro do cartão do trajeto, e os estilos do cartão não devem vazar para a janela
  return createPortal(
    <Dialog open={open} onClose={close} labelledBy="tripqr-title">
      <div className="dlg-head">
        <h2 id="tripqr-title">Abrir no celular</h2>
        <button className="ibtn" type="button" aria-label="Fechar" style={{ marginLeft: 'auto' }} onClick={close}><X className="i" /></button>
      </div>
      <div className="dlg-body tripqr">
        <QrSvg text={url} />
        <p className="note" style={{ margin: 0 }}>Aponte a câmera do celular para o código: o Pedágua abre com o trajeto até <b>{endpointName(dest)}</b>{origin.kind === 'me' ? ', saindo de onde o celular estiver' : `, saindo de ${endpointName(origin)}`}{vias.length ? ' e passando pelo ponto escolhido' : ''}.</p>
        <p className="note" style={{ margin: 0 }}>O trajeto vai dentro do próprio link (com as coordenadas dos pontos). Nada é enviado a servidor nenhum, mas, se você copiar e mandar o link para alguém, essa pessoa verá esses pontos.</p>
        <button className="btn" type="button" id="tripqr-copy" onClick={async () => {
          try { await navigator.clipboard.writeText(url); setMsg('Link copiado.') } catch { setMsg(url) }
        }}><Copy className="i" />Copiar link</button>
        {msg && <p className="note ok-text" id="tripqr-msg" style={{ margin: 0, wordBreak: 'break-all' }}>{msg}</p>}
      </div>
      <div className="dlg-foot"><button className="btn primary" type="button" onClick={close}>Pronto</button></div>
    </Dialog>,
    document.body,
  )
}
