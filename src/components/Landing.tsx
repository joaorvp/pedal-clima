import { Bike, CloudRain, Download, History, Navigation, Radar, ShieldCheck, Smartphone, Umbrella, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSettings } from '../store/settings'
import { useTrip } from '../store/trip'

interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const FEATURES = [
  { icon: CloudRain, title: 'Chuva trecho a trecho', text: 'Cruza a sua rota com a previsão de 15 em 15 minutos e mostra onde vai chover na hora exata em que você passar.' },
  { icon: Bike, title: 'Rotas por ciclovia', text: 'Prioriza ciclovias e ruas calmas e mostra quanto de cada caminho é em ciclovia. Escolha a rota tocando nela no mapa.' },
  { icon: Volume2, title: 'Curvas e chuva por voz', text: '"Em 250 metros, vire à direita." "Chuva em 1 quilômetro." Com o celular no guidão, sem tirar os olhos da rua.' },
  { icon: Radar, title: 'Radar e alertas', text: 'Radar de chuva da última hora e os alertas oficiais do INMET, direto no mapa.' },
  { icon: Umbrella, title: 'Onde se abrigar', text: 'Vai pegar chuva? Mostra pontos de ônibus cobertos, postos e shoppings perto de onde ela começa.' },
  { icon: History, title: 'Seus pedais', text: 'Histórico, resumo da semana e uma chegada prevista que aprende com a sua média real.' },
]

/** Página de apresentação: quem abre pelo navegador pela primeira vez (ou pelo link "Sobre") vê o que o app faz antes de começar. */
export function Landing() {
  const open = useTrip(s => s.landing), onboarded = useSettings(s => s.onboarded)
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BeforeInstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])
  // botão fixo embaixo só aparece quando o "Começar" do topo sai da tela (no celular)
  const [stuck, setStuck] = useState(false)
  useEffect(() => {
    const el = ref.current?.querySelector('#landing-start'); if (!open || !el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { root: ref.current })
    io.observe(el); return () => io.disconnect()
  }, [open])
  // link direto para a privacidade (#privacidade)
  useEffect(() => {
    if (open && location.hash === '#privacidade') requestAnimationFrame(() => ref.current?.querySelector('#privacidade')?.scrollIntoView())
  }, [open])
  if (!open) return null
  const start = () => {
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search)
    useTrip.getState().set({ landing: false })
  }
  const cta = onboarded ? 'Voltar ao app' : 'Começar'
  return (
    <div className="landing" ref={ref} role="main" aria-label="Sobre o Pedágua">
      <header className="ld-top">
        <img className="logo" src={import.meta.env.BASE_URL + 'icon.svg'} alt="" width={32} height={32} />
        <span className="brand">Pedágua</span>
        <button className="btn ld-top-cta" type="button" onClick={start}>{cta}</button>
      </header>

      <section className="ld-hero">
        <div className="ld-hero-txt">
          <p className="ld-kicker">Pedal com previsão</p>
          <h1>Saiba onde vai chover no seu caminho de bike.</h1>
          <p className="ld-lead">O Pedágua mostra, trecho por trecho, se você vai pegar chuva no trajeto, na hora em que passar por cada parte dele. E acompanha o pedal com rotas por ciclovia, avisos de curva e radar.</p>
          <div className="ld-ctas">
            <button className="btn primary ld-cta" type="button" id="landing-start" onClick={start}><Navigation className="i" />{cta}</button>
            <a className="btn" href="#instalar" onClick={e => { e.preventDefault(); ref.current?.querySelector('#instalar')?.scrollIntoView({ behavior: 'smooth' }) }}><Smartphone className="i" />Como instalar</a>
          </div>
          <p className="ld-free">Gratuito, sem conta e sem anúncios. Seus dados ficam no seu celular.</p>
        </div>
        <RouteArt />
      </section>

      <section className="ld-sec" aria-labelledby="ld-feat">
        <h2 id="ld-feat">O que ele faz</h2>
        <div className="ld-grid">
          {FEATURES.map(f => (
            <article key={f.title} className="ld-card">
              <span className="ld-ic"><f.icon className="i" /></span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ld-sec" aria-labelledby="ld-how">
        <h2 id="ld-how">Como funciona</h2>
        <ol className="ld-steps">
          <li><b>Marque casa e trabalho</b><span>Leva menos de um minuto. Dá para salvar outros lugares depois.</span></li>
          <li><b>Veja a chuva no caminho</b><span>Cada rota mostra o tempo, a chuva prevista e o melhor horário para sair.</span></li>
          <li><b>Toque em "Iniciar pedal"</b><span>O app acompanha você, avisa as curvas e a chuva à frente e calcula a chegada.</span></li>
        </ol>
      </section>

      <section className="ld-sec" id="instalar" aria-labelledby="ld-inst">
        <h2 id="ld-inst">Instale no celular</h2>
        <p className="ld-p">O Pedágua funciona no navegador, mas instalado ele abre em tela cheia, como um app, e tem atalhos para "Ir para o trabalho" e "Ir para casa".</p>
        <div className="ld-install">
          <div className="ld-card">
            <h3>Android e computador</h3>
            {evt
              ? <button className="btn primary" type="button" id="landing-install" onClick={async () => { await evt.prompt(); await evt.userChoice; setEvt(null) }}><Download className="i" />Instalar agora</button>
              : <p>No Chrome, abra o menu ⋮ e toque em <b>Instalar app</b> (ou <b>Adicionar à tela inicial</b>).</p>}
          </div>
          <div className="ld-card">
            <h3>iPhone</h3>
            <p>No Safari, toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.{ios ? '' : ' (abra este endereço no Safari do iPhone)'}</p>
          </div>
        </div>
      </section>

      <section className="ld-sec" id="privacidade" aria-labelledby="ld-priv">
        <h2 id="ld-priv"><ShieldCheck className="i" />Privacidade</h2>
        <ul className="ld-priv">
          <li><b>Sem conta, sem servidor próprio.</b> Casa, trabalho, lugares e histórico ficam guardados só no seu aparelho. Não há cadastro, anúncios, cookies de rastreamento nem estatísticas de uso.</li>
          <li><b>O que sai do aparelho.</b> Para calcular rotas e previsão, o app consulta serviços públicos. Eles recebem pontos do mapa, mas não sabem quem você é:
            <ul>
              <li>Open-Meteo: previsão, altitude e qualidade do ar dos pontos da rota e de onde você está.</li>
              <li>BRouter e OSRM: origem, destino e ponto de passagem, para traçar as rotas.</li>
              <li>Photon (Komoot): o texto que você digita na busca e o ponto marcado no mapa, para achar o endereço.</li>
              <li>Overpass (OpenStreetMap): a região onde a chuva começa, quando você procura abrigos.</li>
              <li>OpenStreetMap, CyclOSM, Esri e RainViewer: as imagens do mapa e do radar da região que você está vendo.</li>
              <li>INMET: os alertas oficiais, sem nenhuma localização.</li>
            </ul>
          </li>
          <li><b>Sua localização fica no aparelho.</b> Ela é usada para o ponto azul, o pedal e a chuva onde você está, e só sai do celular dentro dessas consultas.</li>
          <li><b>"Relatar problema"</b> gera um texto técnico sem coordenadas, e só é enviado se você mesmo copiar e mandar.</li>
          <li><b>Backup é com você.</b> Em Ajustes → Seus dados, dá para exportar tudo num arquivo e importar em outro aparelho. Limpar os dados do navegador apaga as informações do app.</li>
        </ul>
      </section>

      <section className="ld-sec ld-note">
        <p>A previsão vem de modelos meteorológicos com resolução de alguns quilômetros: ótima para tendência, mas pode errar o bairro exato. Para os próximos 30 a 60 minutos, confie mais no radar.</p>
        <p className="ld-credits">Dados: © colaboradores do OpenStreetMap, Open-Meteo, RainViewer, INMET, BRouter, CyclOSM.</p>
      </section>

      <div className="ld-sticky" data-show={stuck ? '1' : undefined} aria-hidden={!stuck}><button className="btn primary ld-cta" type="button" tabIndex={stuck ? 0 : -1} onClick={start}><Navigation className="i" />{cta}</button></div>
    </div>
  )
}

/** Ilustração: um trajeto colorido pela chuva, a bike e o cartão do veredito. */
function RouteArt() {
  return (
    <div className="ld-art" aria-hidden="true">
      <svg viewBox="0 0 320 260" role="presentation">
        <defs>
          <linearGradient id="ld-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1d3d73" /><stop offset="1" stopColor="#3f7fc4" /></linearGradient>
        </defs>
        <rect width="320" height="260" rx="26" fill="url(#ld-sky)" />
        <g fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" strokeLinecap="round">
          <path d="M-10 70 L330 40" /><path d="M-10 190 L330 220" /><path d="M90 -10 L120 270" /><path d="M230 -10 L210 270" />
        </g>
        <path d="M40 214 C 90 200, 100 150, 150 140 S 230 110, 280 52" fill="none" stroke="#0b1a1c" strokeOpacity=".35" strokeWidth="16" strokeLinecap="round" />
        <path d="M40 214 C 90 200, 100 150, 150 140" fill="none" stroke="#f0ad1c" strokeWidth="10" strokeLinecap="round" />
        <path d="M150 140 S 205 122, 236 96" fill="none" stroke="#2e84d4" strokeWidth="10" strokeLinecap="round" />
        <path d="M236 96 C 252 80, 266 66, 280 52" fill="none" stroke="#f0ad1c" strokeWidth="10" strokeLinecap="round" />
        <g transform="translate(196 74)">
          <path d="M-22 6h44a14 14 0 0 0 2-28 20 20 0 0 0-38 4 12 12 0 0 0-8 24z" fill="#eaf2fc" />
          <g stroke="#a9d6ff" strokeWidth="4" strokeLinecap="round"><path d="M-12 14l-4 8" /><path d="M0 14l-4 8" /><path d="M12 14l-4 8" /></g>
        </g>
        <circle cx="280" cy="52" r="11" fill="#e2662a" stroke="#fff" strokeWidth="4" />
        <circle cx="96" cy="182" r="17" fill="#ffc43d" stroke="#fff" strokeWidth="4" />
        <g transform="translate(96 182)" fill="none" stroke="#16284a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="-6" cy="3" r="4" /><circle cx="6" cy="3" r="4" /><path d="M-6 3l4-7h5l4 7M-2-4l-2-3" />
        </g>
      </svg>
      <div className="ld-art-card">
        <span className="ld-art-ic"><CloudRain className="i" /></span>
        <span><b>Chuva em 2,7 km</b><small>Garoa daqui a ~9 min, no km 6.</small></span>
      </div>
    </div>
  )
}
