/** Novidades mostradas uma vez para quem já usava o app. */
export const CURRENT_APP_VERSION = '2.18.0'
export const CHANGELOG = [
  {
    version: '2.18.0',
    title: 'Pedal que não se perde e desktop em tela cheia',
    items: [
      'Se o celular fechar o app no meio do pedal, ao reabrir aparece "Continuar o pedal": o tempo, a distância e a chuva seguem de onde pararam.',
      'No celular, segure o dedo num botão de ícone para ver o que ele faz.',
      'No computador, o mapa ocupa a tela toda e o painel ao lado rola sozinho.',
    ],
  },
  {
    version: '2.17.1',
    title: 'Animação do radar consertada',
    items: [
      'O botão ▶ do radar agora mostra a chuva se movendo na última hora: os quadros carregam antes e a animação para um instante no mais recente.',
      'Durante a animação, o horário de cada quadro aparece no canto do mapa.',
    ],
  },
  {
    version: '2.17.0',
    title: 'Telas mais limpas e dicas nos botões',
    items: [
      'O trajeto cabe numa linha só ("Você → Trabalho"), e o "Iniciar pedal" aparece logo de cara.',
      'Alertas do INMET aparecem por inteiro só na primeira vez; depois ficam numa linha, sem ocupar a tela.',
      'No computador, passe o mouse sobre um botão para ver o que ele faz.',
    ],
  },
  {
    version: '2.16.0',
    title: 'Velocímetro e mais mapa no pedal',
    items: [
      'Velocímetro sobre o mapa, com o vento contra ou a favor logo abaixo.',
      'O painel do pedal ficou mais enxuto: sobra mais mapa, e o "Encerrar pedal" fica sempre à vista, junto da voz e da janela flutuante.',
      'Com o mapa bússola, a bike fica mais para baixo na tela, mostrando mais do caminho à frente.',
      'O modo painel saiu: o mapa fica sempre visível.',
      'Encerrar o pedal agora pede confirmação, para um toque sem querer no guidão não acabar com o pedal.',
    ],
  },
  {
    version: '2.15.0',
    title: 'Fonte nova, com cara de ciclismo',
    items: [
      'Títulos e números em Barlow Condensed, no estilo dos ciclocomputadores e das provas de ciclismo.',
      'A fonte agora vem junto com o app: carrega na hora e funciona sem internet.',
    ],
  },
  {
    version: '2.14.0',
    title: 'Mapa bússola e recálculo automático',
    items: [
      'Pedalando, o mapa gira conforme a sua direção, como uma bússola. O botão de bússola volta para o norte para cima.',
      'Saiu da rota? Em poucos segundos o app recalcula sozinho a partir de onde você está.',
      'O visor do pedal mostra a chuva prevista no que falta e a chance de chuva.',
    ],
  },
  {
    version: '2.13.0',
    title: 'Rotas por ciclovia e chegada mais certa',
    items: [
      'As rotas de bike agora priorizam ciclovias e ciclofaixas, e cada uma mostra quanto do caminho é em ciclovia.',
      'A hora de chegada usa a sua média real de porta a porta (com semáforos e paradas), aprendida dos seus pedais.',
      'Pedalando, a chegada usa a média do próprio pedal, em vez da velocidade do momento.',
    ],
  },
  {
    version: '2.12.0',
    title: 'Calor, ar seco e qualidade do ar',
    items: [
      'O clima de onde você está agora mostra umidade e qualidade do ar, com aviso de calor forte e de ar muito seco.',
      'O checklist do trajeto avisa quando o ar estiver ruim ou seco demais.',
      'Algo estranho? Em Ajustes, "Relatar problema" gera um relatório para enviar (sem suas coordenadas).',
    ],
  },
  {
    version: '2.11.0',
    title: 'Seus pedais e o trajeto de amanhã',
    items: [
      'Novo botão de histórico no topo: totais da semana e do mês (km, pedais, tempo e pedais secos) e a lista dos seus pedais.',
      'No trajeto, toque em "Amanhã" para ver a chuva no caminho da manhã seguinte, no horário da sua rotina.',
    ],
  },
  {
    version: '2.10.0',
    title: 'Onde me abrigar',
    items: [
      'Com chuva no caminho, toque em "Procurar abrigos": pontos de ônibus cobertos, postos, estações e shoppings mais próximos.',
      '"Passar por aqui" refaz a rota passando pelo abrigo e seguindo para o destino.',
    ],
  },
  {
    version: '2.9.0',
    title: 'Atalhos e ciclovias',
    items: [
      'Segure o ícone do Pedágua na tela inicial: "Ir para o Trabalho" e "Ir para Casa" abrem o trajeto direto.',
      'Novo botão de bicicleta no mapa mostra ciclovias e ciclofaixas.',
    ],
  },
  {
    version: '2.8.0',
    title: 'Avise quando a chuva passar',
    items: [
      'Chovendo onde você está? Toque em "Me avise quando parar": com o app aberto, ele vibra e avisa quando a chuva passar.',
      'Removeu um lugar ou fechou um trajeto sem querer? Toque em "Desfazer".',
      'Antes de pedir a localização, o app explica para que ela serve.',
    ],
  },
  {
    version: '2.7.0',
    title: 'Modo painel para o guidão',
    items: [
      'No pedal, toque em "Modo painel": números enormes e alto contraste, em pé ou deitado.',
      'Os últimos destinos que você buscou aparecem como atalhos na tela inicial.',
      'Lugares salvos: toque no nome para renomear e use as setas para mudar a ordem.',
    ],
  },
  {
    version: '2.6.0',
    title: 'Saiu da rota? Recalcula.',
    items: [
      'Se você sair do caminho, o app avisa e oferece recalcular a partir de onde você está, sem encerrar o pedal.',
      'Ao chegar, um resumo mostra distância, tempo, média, chuva no caminho e bateria. Dá para compartilhar.',
    ],
  },
  {
    version: '2.5.0',
    title: 'Agora o app se chama Pedágua',
    items: [
      'Novo nome: Pedágua, pedal com previsão. Tudo o que você salvou continua aqui.',
      'Janela flutuante: no modo pedal, toque em "Janela flutuante" e saia do app. O painel com a chuva à frente e a chegada continua na tela.',
      'Avisos por voz: "Chuva em 300 metros", "Você chegou". Dá para desligar no próprio pedal.',
    ],
  },
  {
    version: '2.4.0',
    title: 'Mais à mão',
    items: [
      'Perto do seu horário, o app pergunta "Indo para o Trabalho?" e já monta o trajeto com a hora da saída.',
      'Botões do mapa e o Pronto dos Ajustes ficam ao alcance do polegar.',
      'O botão voltar do celular fecha o trajeto em vez de sair do app.',
      'Transições mais suaves entre a tela inicial e o trajeto.',
    ],
  },
  {
    version: '2.3.0',
    title: 'Monte o trajeto do seu jeito',
    items: [
      'Toque na origem ou no destino para trocar: busca, seus lugares, sua localização ou escolher no mapa.',
      'Toque e segure no mapa para ir até aquele ponto, sair dele ou salvá-lo como lugar.',
      'Cada rota mostra no mapa o tempo e a chuva prevista; toque na etiqueta para escolher.',
      'O ponto de passagem aparece no trajeto e pode ser removido.',
    ],
  },
  {
    version: '2.2.0',
    title: 'Comece de onde você está',
    items: [
      'O app abre com você no mapa e o clima de onde você está agora.',
      'Toque em "Para onde vamos?" ou num atalho (Casa, Trabalho, seus lugares) para montar o trajeto.',
      'Pedalando, uma bike mostra você no mapa em tempo real, girando no sentido em que você vai.',
      'O celular vibra ao iniciar, ao chegar e quando a chuva estiver a menos de 1 km.',
    ],
  },
  {
    version: '2.1.0',
    title: 'Cara nova e mais simples',
    items: [
      'Nova identidade: logo com a bike ao nascer do sol e cores de céu, asfalto e camisa de ciclista.',
      'Os avisos pelo app ntfy foram removidos.',
      'Abra o app e toque em Iniciar pedal: a tela fica acesa e mostra a chuva no trecho que falta.',
    ],
  },
  {
    version: '2.0.0',
    title: 'Agora é um app de verdade',
    items: [
      'Instale pelo navegador e abra pela tela inicial, como um app.',
      'Quando houver versão nova, um aviso pergunta se você quer atualizar.',
      'Mais rápido para abrir e mais estável sem sinal.',
      'Suas configurações, lugares e avaliações continuam aqui.',
    ],
  },
]
