/** Novidades mostradas uma vez para quem já usava o app. */
export const CURRENT_APP_VERSION = '2.28.0'
export const CHANGELOG = [
  {
    version: '2.28.0',
    title: 'Seu companheiro de pedal',
    items: [
      'Antes de sair: o checklist diz quanta água levar e quando vale um corta-vento ou casaco.',
      'Pista molhada: o cartão "Onde você está" e a voz no pedal avisam quando choveu há pouco.',
      'Em Seus pedais: exporte qualquer pedal em GPX para o Strava, Garmin ou Komoot.',
      'Conquistas: CO₂ que você deixou de emitir, calorias, dias seguidos pedalando, meta de km do mês e selos.',
      'Manutenção da bike: lembretes de lubrificar a corrente, calibrar os pneus e fazer a revisão, pelos km que você roda.',
      'Onde deixar a bike: no trajeto, bicicletários, bebedouros, pontos de conserto e lojas de bike perto do destino, também no mapa.',
      'Mapa sem sinal: o celular guarda mais do mapa que você já viu, e os trajetos de todo dia continuam aparecendo sem internet.',
    ],
  },
  {
    version: '2.27.0',
    title: 'Radar de chuva de volta no celular',
    items: [
      'As áreas de chuva do radar (a névoa azul no mapa) voltaram a aparecer no celular. A imagem do radar era esticada além do que o celular consegue desenhar.',
      'O cartão "Onde você está" agora confere o radar: se estiver chovendo aí e a previsão disser seco, ele mostra "Chovendo aqui agora".',
    ],
  },
  {
    version: '2.26.3',
    title: 'Botão de atualizar com rodinha',
    items: ['O botão de atualizar volta a girar enquanto atualiza, também na tela inicial, e ao terminar mostra "atualizado agora".'],
  },
  {
    version: '2.26.2',
    title: 'Marcar lugares no mapa, com satélite',
    items: [
      'Em Meus lugares, "Marcar no mapa" abre um mapinha onde você está: arraste o alfinete até o lugar, sem precisar buscar nem copiar nada.',
      'O mapinha tem vista de satélite: quando o lugar não aparece no mapa comum, dá para achar pelo telhado ou pelo estacionamento.',
      'O nome da rua do ponto marcado aparece sozinho.',
    ],
  },
  {
    version: '2.26.1',
    title: 'Código do lugar do Google Maps',
    items: [
      'Cole o código do lugar que o Google Maps mostra (como "2V8R+XG", ao lado do ícone de alvo) na busca ou em Meus lugares: o app acha a posição exata, sem internet.',
      'Novo botão "Colar do Google Maps" em Meus lugares, para colar com um toque o código ou o endereço copiado.',
      'Se chegar só o link curto do Google, o app explica o que copiar no lugar dele.',
    ],
  },
  {
    version: '2.26.0',
    title: 'Salve lugares direto do Google Maps',
    items: [
      'No Google Maps, toque em Compartilhar e escolha Pedágua: o lugar abre em Meus lugares, com o nome, pronto para salvar (precisa do app instalado).',
      'No iPhone ou sem o app instalado: copie o que o Google Maps compartilha e cole na busca do Pedágua.',
      'Antes de salvar, um mapinha com alfinete deixa você acertar o lugar exato (o endereço às vezes cai no quarteirão).',
    ],
  },
  {
    version: '2.25.2',
    title: 'Busca acha nomes escritos de outro jeito',
    items: [
      '"Smartfit", "Smart Fit" e "Smart-Fit" agora são a mesma coisa na busca, e o que fica perto de você aparece primeiro.',
      'Unidades de rede cadastradas só com a marca também aparecem.',
    ],
  },
  {
    version: '2.25.1',
    title: 'Busca consertada',
    items: [
      'A busca não fica mais carregando para sempre: cada serviço tem um tempo máximo, e o que responder primeiro já aparece.',
      'Nova busca de comércios pelo nome perto de você (academias, mercados, farmácias…). "Supermercado X" também acha um lugar cadastrado só como "X".',
    ],
  },
  {
    version: '2.25.0',
    title: 'Busca melhor e Meus lugares',
    items: [
      'Nova tela Meus lugares (estrela no topo): seus lugares organizados por tipo, como Academia, Mercado, Estudo, Família, Amigos, Comida e Saúde, cada um com ícone e cor, também nos atalhos e no mapa.',
      'Salve um lugar pela estrela ao lado de um resultado da busca ou segurando o dedo no mapa e tocando em "Salvar lugar". O tipo é sugerido pelo nome.',
      'A busca agora usa dois buscadores ao mesmo tempo (Photon e o Nominatim, do OpenStreetMap) e junta os resultados, sem repetir.',
      'Mostra primeiro o que fica perto de você, com a distância de cada resultado, e também acha lugares fora do DF.',
      'Seus lugares (Casa, Trabalho, salvos e recentes) aparecem na hora, enquanto você digita.',
      'Digite um CEP para achar a rua.',
      'A lista de sugestões não fica mais escondida atrás dos cartões de baixo.',
    ],
  },
  {
    version: '2.24.0',
    title: 'Tema claro, aviso de chegada e previsão com vento',
    items: [
      'Ajustes → Aparência: Automática, Clara ou Escura. Sob sol forte, a clara é mais fácil de ler no guidão.',
      'No pedal, o botão "Avisar" manda pelo WhatsApp (ou outro app) a hora em que você vai chegar.',
      'A chegada prevista agora considera o vento de cada trecho: com vento contra forte ela fica mais tarde, com vento a favor um pouco mais cedo.',
      'Seus dados mais protegidos: as cópias de rotas que o app guarda para abrir rápido agora têm limite e não ocupam mais o espaço dos seus pedais e ajustes.',
    ],
  },
  {
    version: '2.23.0',
    title: 'Sua rota: pelo histórico ou por um print',
    items: [
      'Cada pedal concluído agora guarda o caminho que você fez. Em Seus pedais, toque num pedal para ver o desenho do percurso.',
      'Fez um caminho melhor que as sugestões? Toque em "Usar como minha rota": da próxima vez que fizer esse trajeto (nos dois sentidos), ela aparece primeiro e já escolhida, com chuva e tempo calculados.',
      'Fez o caminho por outro app? Em Ajustes → Rotas salvas → Importar de um print: escolha de onde e para onde, envie o print do Google Maps (ou Waze, Strava) e toque no começo e no fim da linha. O app copia a rota para o mapa, ajustada às ruas.',
      'Gerencie as suas rotas em Ajustes → Rotas salvas. Elas entram no backup.',
    ],
  },
  {
    version: '2.22.1',
    title: 'Ajustes mais enxutos',
    items: ['O "Relatar problema" saiu dos Ajustes. Dúvidas e sugestões ficam pela página do projeto no GitHub, indicada em "Sobre, termos e privacidade".'],
  },
  {
    version: '2.22.0',
    title: 'Termos de uso, créditos e privacidade completa',
    items: [
      'A página "Sobre" agora deixa claro que o Pedágua é um projeto pessoal, gratuito e não comercial, construído sobre mapas e APIs de uso gratuito.',
      'Novas seções: Termos de uso e aviso legal, Serviços e créditos (o que cada serviço fornece e recebe) e Política de privacidade completa, organizada conforme a LGPD.',
    ],
  },
  {
    version: '2.21.1',
    title: 'Atalhos arrumados no computador',
    items: ['No computador, os atalhos de destino (Casa, Trabalho, lugares) quebram linha dentro do cartão, sem cortar nem precisar rolar para o lado.'],
  },
  {
    version: '2.21.0',
    title: 'Página de apresentação, privacidade e backup',
    items: [
      'Quem abre o link pela primeira vez vê uma página explicando o app e como instalar. Ela também fica em "Sobre e privacidade", no rodapé.',
      'A privacidade explica o que fica no seu celular e o que cada serviço de mapa e previsão recebe.',
      'Em Ajustes → Seus dados: exporte um backup dos seus lugares, rotina e histórico e importe em outro aparelho.',
      'Mais proteção: a página só carrega scripts próprios e só se conecta aos serviços que o app usa.',
    ],
  },
  {
    version: '2.20.1',
    title: 'Radar de volta ao normal',
    items: [
      'O radar voltou a carregar só a imagem mais recente no dia a dia; a última hora é carregada só quando você toca ▶. Pedir todas as imagens o tempo todo podia esbarrar no limite do serviço gratuito de radar e deixar o mapa sem a chuva.',
      'Se o servidor do radar não responder, o canto do mapa avisa, em vez de mostrar um radar vazio.',
    ],
  },
  {
    version: '2.20.0',
    title: 'Rotas pelo mapa, resumo da semana e radar mais claro',
    items: [
      'Escolha a rota tocando nela no mapa; para ir por outro caminho, toque na rota escolhida e arraste o ponto. O "Passar por" saiu dos Ajustes.',
      'Em "Seus pedais": km das últimas 8 semanas, sua média comparada com as semanas anteriores e o resumo da semana para compartilhar.',
      'Quando não há chuva na área do mapa, o canto do radar avisa "sem chuva por perto".',
    ],
  },
  {
    version: '2.19.0',
    title: 'Avisos de curva',
    items: [
      'No pedal, um cartão no topo do mapa mostra a próxima manobra: "250 m · vire à direita". Fica amarelo na hora de virar.',
      'Com a voz ligada, o app avisa "Em 250 metros, vire à direita" e "Agora, vire à direita", com uma vibração curta.',
      'Os avisos de curva têm prioridade: interrompem outro aviso que esteja sendo falado.',
    ],
  },
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
