import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { CURRENT_APP_VERSION } from '../domain/changelog'

/** Data da última revisão dos termos e da política (atualize junto com o texto). */
const LEGAL_UPDATED = '11 de novembro de 2026'

const A = ({ href, children }: { href: string; children: ReactNode }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>

/** Seção recolhível (fechada por padrão, para a página continuar leve). */
export function Fold({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <details className="ld-fold" id={id}>
      <summary><span>{title}</span><ChevronDown className="i" aria-hidden="true" /></summary>
      <div className="ld-fold-body">{children}</div>
    </details>
  )
}

/** Serviços de terceiros usados pelo app: o que cada um fornece, o que recebe e em que condições. */
const PROVIDERS: { name: string; role: string; gets: string; terms: string; href: string }[] = [
  { name: 'Open-Meteo', role: 'Previsão do tempo, altitude do trajeto e qualidade do ar', gets: 'coordenadas dos pontos da rota e de onde você está', terms: 'API gratuita para uso não comercial; dados sob licença CC BY 4.0. Inclui dados do Copernicus (CAMS e modelo digital de elevação).', href: 'https://open-meteo.com/en/terms' },
  { name: 'OpenStreetMap', role: 'Mapa de ruas e base de dados geográfica', gets: 'as imagens da região que você está vendo no mapa', terms: 'Dados © colaboradores do OpenStreetMap, sob licença ODbL; imagens do mapa sujeitas à política de uso da Fundação OpenStreetMap.', href: 'https://www.openstreetmap.org/copyright' },
  { name: 'CyclOSM / OpenStreetMap França', role: 'Mapa de ciclovias (opcional)', gets: 'as imagens da região que você está vendo, quando o mapa de ciclovias está ligado', terms: 'Estilo CyclOSM, hospedado pela OpenStreetMap França, com dados do OpenStreetMap.', href: 'https://www.cyclosm.org' },
  { name: 'Esri', role: 'Mapa reserva, se o mapa principal falhar', gets: 'as imagens da região que você está vendo', terms: 'Uso sujeito aos termos da Esri; fontes: Esri e colaboradores.', href: 'https://www.esri.com' },
  { name: 'RainViewer', role: 'Radar de chuva', gets: 'as imagens de radar da região que você está vendo', terms: 'API pública gratuita, com limite de uso e exigência de atribuição.', href: 'https://www.rainviewer.com/api.html' },
  { name: 'BRouter', role: 'Rotas de bicicleta (ciclovias e ruas calmas)', gets: 'origem, destino e ponto de passagem do trajeto e, ao importar uma rota de um print, alguns pontos do traçado para ajustá-lo às ruas', terms: 'Servidor público e gratuito mantido pelo projeto BRouter, com dados do OpenStreetMap.', href: 'https://brouter.de' },
  { name: 'OSRM (FOSSGIS e Project OSRM)', role: 'Rotas alternativas e reserva', gets: 'origem, destino e ponto de passagem do trajeto', terms: 'Servidores públicos de demonstração, para uso leve e não comercial.', href: 'https://project-osrm.org' },
  { name: 'Photon (Komoot)', role: 'Busca de endereços e nome do ponto marcado', gets: 'o texto que você digita na busca, a região aproximada onde você está (arredondada em cerca de 1 km, para mostrar primeiro o que fica perto) e o ponto marcado no mapa', terms: 'Serviço público gratuito, sujeito a uso razoável, com dados do OpenStreetMap.', href: 'https://photon.komoot.io' },
  { name: 'Nominatim (OpenStreetMap)', role: 'Busca de endereços, ruas e bairros (junto com o Photon)', gets: 'o texto que você digita na busca', terms: 'Serviço público da Fundação OpenStreetMap, para uso leve, sujeito à política de uso do Nominatim; dados do OpenStreetMap.', href: 'https://operations.osmfoundation.org/policies/nominatim/' },
  { name: 'ViaCEP', role: 'Endereço a partir do CEP', gets: 'o CEP que você digita na busca', terms: 'Serviço gratuito e público de consulta de CEP.', href: 'https://viacep.com.br' },
  { name: 'Overpass API', role: 'Abrigos (pontos de ônibus cobertos, postos, shoppings)', gets: 'a área onde a chuva começa, quando você toca em "Procurar abrigos"', terms: 'Instância pública e gratuita, com limite de uso, sobre dados do OpenStreetMap.', href: 'https://overpass-api.de' },
  { name: 'INMET', role: 'Alertas meteorológicos oficiais', gets: 'nenhuma localização (a lista de alertas é a mesma para todos)', terms: 'Dados públicos do Instituto Nacional de Meteorologia.', href: 'https://portal.inmet.gov.br' },
  { name: 'GitHub Pages', role: 'Hospedagem dos arquivos do app', gets: 'dados técnicos de acesso (como o endereço IP), como em qualquer site', terms: 'Serviço do GitHub, Inc., sujeito à declaração de privacidade do GitHub.', href: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement' },
]

export function ProvidersList() {
  return (
    <ul className="ld-prov">
      {PROVIDERS.map(p => (
        <li key={p.name}>
          <b><A href={p.href}>{p.name}</A></b>
          <span>{p.role}.</span>
          <small><em>Recebe:</em> {p.gets}. {p.terms}</small>
        </li>
      ))}
    </ul>
  )
}

/** Termos de uso e aviso legal. */
export function TermsText() {
  return <>
    <h4>1. Natureza do projeto</h4>
    <p>O Pedágua é um projeto pessoal, gratuito e <b>sem fins comerciais</b>, criado para uso próprio e compartilhado com amigos. Não há venda, assinatura, publicidade, patrocínio nem qualquer forma de monetização, e não há pessoa jurídica por trás dele.</p>
    <h4>2. Serviços de terceiros gratuitos</h4>
    <p>O app funciona sobre mapas, dados abertos e APIs públicas de uso gratuito, listados em "Serviços e créditos". Vários deles são oferecidos apenas para uso pessoal ou não comercial, ou com limites de uso. Por isso o Pedágua não pode ser usado para fins comerciais, revendido ou incorporado a produto ou serviço pago. Cada serviço tem seus próprios termos e políticas, que prevalecem sobre o uso feito pelo app. O Pedágua não é afiliado a nenhum desses serviços nem endossado por eles, e as marcas citadas pertencem aos seus titulares.</p>
    <h4>3. Sem garantia e disponibilidade</h4>
    <p>O app é oferecido "no estado em que se encontra", sem garantia de funcionamento contínuo, precisão ou adequação a um fim específico. Ele depende da disponibilidade e das condições de uso de terceiros e pode parar de funcionar, no todo ou em parte, ou ser alterado ou descontinuado a qualquer momento, sem aviso.</p>
    <h4>4. Previsão do tempo e alertas</h4>
    <p>As informações de chuva, vento, temperatura, qualidade do ar e radar são <b>estimativas</b> obtidas de modelos meteorológicos e de fontes de terceiros, com resolução de alguns quilômetros, e podem não refletir as condições reais do seu trajeto. Elas não substituem os avisos oficiais do INMET e da Defesa Civil. Em caso de tempestade, alagamento ou alerta oficial, siga a orientação das autoridades.</p>
    <h4>5. Rotas, navegação e trânsito</h4>
    <p>As rotas e os avisos de curva são sugestões automáticas baseadas em dados abertos e podem conter erros, trechos impróprios, interditados ou inseguros, e não consideram obras, iluminação, segurança pública nem as condições da via. A decisão sobre o caminho e a forma de conduzir é sempre de quem pedala, que deve respeitar a sinalização e o Código de Trânsito Brasileiro. Não manuseie o celular enquanto pedala: use o suporte de guidão e os avisos por voz, e pare em local seguro para interagir com o app.</p>
    <h4>6. Responsabilidade</h4>
    <p>Na máxima extensão permitida pela lei, o responsável pelo projeto não responde por danos, perdas, atrasos, multas ou acidentes decorrentes do uso do app ou da confiança nas informações exibidas, nem por falhas, indisponibilidade ou conteúdo de serviços de terceiros. O uso é voluntário e por conta e risco de cada pessoa.</p>
    <h4>7. Dados e backup</h4>
    <p>Os dados ficam apenas no seu aparelho (veja a Política de privacidade). Guardar backups é responsabilidade de quem usa: limpar os dados do navegador, trocar de aparelho ou desinstalar o app apaga as informações que não tiverem sido exportadas.</p>
    <h4>8. Alterações</h4>
    <p>Estes termos podem ser atualizados a qualquer momento. A versão vigente fica sempre nesta página, com a data da última atualização. Continuar usando o app depois de uma alteração significa concordar com a nova versão.</p>
    <p className="ld-upd">Última atualização: {LEGAL_UPDATED} · versão {CURRENT_APP_VERSION} do app.</p>
  </>
}

/** Política de privacidade, organizada conforme a LGPD (Lei nº 13.709/2018). */
export function PrivacyText() {
  return <>
    <h4>1. Quem trata os seus dados</h4>
    <p>O Pedágua não tem servidor, banco de dados, cadastro nem conta. O responsável pelo projeto <b>não coleta, não recebe, não armazena e não tem acesso</b> a dados pessoais de quem usa o app. Todo o tratamento descrito abaixo acontece no seu próprio aparelho, por iniciativa sua, ou diretamente entre o seu navegador e os serviços de terceiros listados em "Serviços e créditos".</p>
    <h4>2. Dados guardados no seu aparelho</h4>
    <p>Ficam no armazenamento local do navegador (localStorage) e servem apenas para o app funcionar:</p>
    <ul>
      <li><b>Endereços de casa, trabalho e lugares salvos</b>, e os últimos destinos buscados: para montar trajetos e atalhos.</li>
      <li><b>Rotina e preferências</b> (horários, velocidade, tipo de rota, voz, tema do mapa): para sugerir o trajeto na hora certa e manter as suas escolhas.</li>
      <li><b>Histórico de pedais</b> (data, destino, distância, duração, média, chuva prevista e, nos 30 mais recentes, o desenho do caminho percorrido) e avaliações "choveu ou não choveu": para o resumo da semana, a chegada prevista e a precisão da previsão.</li>
      <li><b>Pedal em andamento</b> (destino, início, distância e o caminho percorrido até ali): para continuar o pedal se o app fechar. É apagado ao encerrar ou chegar.</li>
      <li><b>Rotas salvas</b>: o desenho e o nome das rotas que você escolher salvar (a partir do histórico ou de um print), para sugeri-las nos próximos trajetos.</li>
      <li><b>Prints importados</b>: a imagem é lida só no aparelho para encontrar a linha da rota e não é guardada nem enviada a ninguém. Fica salvo apenas o traçado resultante.</li>
      <li><b>Cópias temporárias</b> de previsões, rotas e imagens do mapa: para abrir mais rápido e funcionar com sinal fraco. As imagens do mapa expiram em até 30 dias.</li>
    </ul>
    <h4>3. Localização</h4>
    <p>A localização só é usada com a sua permissão, dada no próprio navegador, que pode ser revogada a qualquer momento nas configurações dele. Ela serve para mostrar onde você está, acompanhar o pedal e consultar a chuva ao seu redor. Durante o pedal, o caminho percorrido é gravado só no aparelho. Ao chegar, ele fica no histórico (nos 30 pedais mais recentes) para você poder usá-lo como rota; se você encerrar antes de chegar, ele é descartado. O caminho nunca é enviado a ninguém. Sem a permissão, o app funciona com limitações, a partir dos endereços que você informar.</p>
    <h4>4. O que é enviado a terceiros</h4>
    <p>Para calcular rotas, previsão e mapa, o seu navegador consulta diretamente os serviços listados em "Serviços e créditos". Eles recebem apenas o necessário para responder a cada consulta (coordenadas, texto da busca ou região do mapa). Como em qualquer acesso à internet, também recebem dados técnicos, como o endereço IP e o tipo de navegador. O app não envia nome, e-mail, telefone, identificador do aparelho nem qualquer dado que identifique você. Cada serviço trata essas informações conforme a própria política de privacidade.</p>
    <h4>5. O que o app não faz</h4>
    <p>Não usa cookies de rastreamento, ferramentas de estatística ou de publicidade, nem perfis. Não vende nem compartilha dados, e não toma decisões automatizadas a seu respeito. Os avisos por voz são gerados pelo próprio aparelho.</p>
    <h4>6. Bases legais</h4>
    <p>Como o responsável pelo projeto não tem acesso aos dados, não há tratamento por ele. O uso da localização depende do seu consentimento, dado no navegador (art. 7º, I, da LGPD). Os demais dados são inseridos por você e permanecem sob o seu controle exclusivo, no seu aparelho.</p>
    <h4>7. Por quanto tempo</h4>
    <p>Os dados ficam no aparelho até você apagá-los: remova lugares e rotas salvas em Ajustes, use "Apagar histórico" em Seus pedais ou limpe os dados do site nas configurações do navegador. Desinstalar o app ou limpar os dados do navegador apaga tudo de uma vez.</p>
    <h4>8. Seus direitos</h4>
    <p>Os direitos previstos no art. 18 da LGPD (acesso, correção, eliminação e portabilidade, entre outros) são exercidos por você mesmo, diretamente no app: veja e corrija os dados em Ajustes, apague-os como descrito acima e exporte uma cópia em Ajustes → Seus dados → Exportar backup. O arquivo de backup contém os endereços de casa e trabalho e as rotas salvas: guarde-o em local seguro.</p>
    <h4>9. Segurança</h4>
    <p>O app é servido apenas por conexão segura (HTTPS), não tem servidor próprio que possa vazar dados e restringe de onde a página pode carregar scripts e para onde pode se conectar. A proteção do aparelho (bloqueio de tela, atualizações) cabe a quem o usa.</p>
    <h4>10. Alterações e contato</h4>
    <p>Esta política pode ser atualizada. A versão vigente fica sempre nesta página. Dúvidas podem ser enviadas pela página do projeto no <A href="https://github.com/joaorvp/pedal-clima">GitHub</A>.</p>
    <p className="ld-upd">Última atualização: {LEGAL_UPDATED} · versão {CURRENT_APP_VERSION} do app.</p>
  </>
}
