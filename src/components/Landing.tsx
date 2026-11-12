import { Bike, CloudRain, Download, Globe, History, Navigation, Radar, Scale, ShieldCheck, Smartphone, Umbrella, Volume2 } from 'lucide-react'
import { Fold, PrivacyText, ProvidersList, TermsText } from './Legal'
import { useEffect, useRef, useState } from 'react'
import { useSettings } from '../store/settings'
import { useTrip } from '../store/trip'

interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const FEATURES = [
  { icon: CloudRain, title: 'Chuva trecho a trecho', text: 'Cruza a sua rota com a previsão de 15 em 15 minutos e mostra onde vai chover na hora exata em que você passar.' },
  { icon: Bike, title: 'Rotas por ciclovia', text: 'Prioriza ciclovias e ruas calmas. Fez um caminho melhor? Use um pedal do histórico ou importe um print do Google Maps como sua rota, que passa a aparecer primeiro.' },
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
    const h = location.hash.slice(1)
    if (open && ['privacidade', 'termos', 'creditos'].includes(h)) requestAnimationFrame(() => ref.current?.querySelector('#' + h)?.scrollIntoView())
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
          <p className="ld-free">Projeto pessoal, gratuito e não comercial. Sem conta, sem anúncios, e seus dados ficam no seu celular.</p>
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

      <section className="ld-sec" id="termos" aria-labelledby="ld-terms">
        <h2 id="ld-terms"><Scale className="i" />Projeto pessoal e não comercial</h2>
        <div className="ld-callout">
          <p>O Pedágua é um projeto <b>pessoal, gratuito e sem fins comerciais</b>, feito para uso próprio e de amigos: sem venda, assinatura, anúncios ou patrocínio.</p>
          <p>Ele funciona sobre <b>mapas, dados abertos e APIs públicas de uso gratuito</b>, vários deles liberados só para uso pessoal ou não comercial. Por isso o app não pode ser usado para fins comerciais e pode mudar ou parar se algum desses serviços alterar as condições.</p>
          <p>Previsão e rotas são <b>estimativas</b>: não substituem os alertas oficiais nem a sua atenção no trânsito.</p>
        </div>
        <Fold title="Termos de uso e aviso legal"><TermsText /></Fold>
      </section>

      <section className="ld-sec" id="creditos" aria-labelledby="ld-cred">
        <h2 id="ld-cred"><Globe className="i" />Serviços e créditos</h2>
        <p className="ld-p">Tudo o que o app mostra vem destes serviços gratuitos e projetos abertos, a quem o Pedágua agradece. Cada um tem os próprios termos e política de privacidade.</p>
        <Fold title="Ver os serviços usados e o que cada um recebe"><ProvidersList /></Fold>
      </section>

      <section className="ld-sec" id="privacidade" aria-labelledby="ld-priv">
        <h2 id="ld-priv"><ShieldCheck className="i" />Privacidade</h2>
        <div className="ld-priv-grid">
          <div className="ld-card"><h3>Sem conta e sem servidor</h3><p>Não há cadastro, login nem banco de dados. Quem fez o app não recebe nem vê nenhum dado seu.</p></div>
          <div className="ld-card"><h3>Tudo no seu celular</h3><p>Casa, trabalho, lugares, rotina e histórico ficam guardados só no aparelho, sob o seu controle.</p></div>
          <div className="ld-card"><h3>Só o necessário sai do aparelho</h3><p>Os serviços de mapa e previsão recebem apenas os pontos de cada consulta, nunca o seu nome ou contato.</p></div>
          <div className="ld-card"><h3>Sem rastreamento</h3><p>Sem cookies de rastreamento, estatísticas de uso, anúncios ou perfis. Nada é vendido ou compartilhado.</p></div>
        </div>
        <Fold title="Política de privacidade completa (LGPD)"><PrivacyText /></Fold>
      </section>

      <section className="ld-sec ld-note">
        <p>A previsão vem de modelos meteorológicos com resolução de alguns quilômetros: ótima para tendência, mas pode errar o bairro exato. Para os próximos 30 a 60 minutos, confie mais no radar.</p>
        <p className="ld-credits">Dados de mapa © colaboradores do OpenStreetMap (ODbL). Previsão: Open-Meteo (CC BY 4.0), com dados do Copernicus. Radar: RainViewer. Alertas: INMET. Rotas: BRouter e OSRM. Mapa de ciclovias: CyclOSM.</p>
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
