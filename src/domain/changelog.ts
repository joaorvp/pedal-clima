/** Novidades mostradas uma vez para quem já usava o app. */
export const CURRENT_APP_VERSION = '2.40.0'
export const CHANGELOG = [
  {
    version: '2.40.0',
    title: 'GPX, tempo real das rotas e radar no pedal',
    items: [
      'Importar GPX: em Ajustes → Rotas salvas, traga uma rota do Strava, Komoot, Google My Maps ou de um amigo. Ela passa a aparecer nos trajetos, inteira ou como trecho.',
      'Tempo real: com 2 pedais ou mais por uma rota, o app mostra quanto você leva nela de verdade ("~27 min no seu ritmo"), já com sinais e paradas, e usa esse tempo na chegada.',
      'Radar ao vivo no pedal: a cada poucos minutos, o app confere a imagem do radar nos próximos ~6 km da rota e avisa ("Radar: chuva a ~2 km no seu caminho"), também por voz.',
    ],
  },
  {
    version: '2.39.3',
    title: 'Legenda do "pode chover" corrigida',
    items: [
      'A legenda "pode chover" e a barra do trajeto voltaram a mostrar os pontinhos azuis sobre o amarelo, como no mapa. Antes apareciam iguais a "seco".',
    ],
  },
  {
    version: '2.39.2',
    title: 'Melhor hora para sair: 12 horas',
    items: [
      'O cartão "Melhor hora para sair" agora mostra as próximas 12 horas, de 15 em 15 minutos. Arraste para o lado ou use as setas para ver os horários seguintes e toque numa barra para escolher a saída.',
    ],
  },
  {
    version: '2.39.1',
    title: 'Janela flutuante viva',
    items: [
      'A janela flutuante do pedal não fica mais parada quando você troca de app: o relógio e os números continuam andando.',
      'Fora do app, o Android pausa o GPS de apps da web. A janela segue por estimativa, no seu ritmo e pela rota, e avisa "estimado · GPS em pausa"; quando o GPS volta, os números voltam a ser os reais.',
      'Ao abrir a janela, o app avisa para ir à tela inicial ou a outro app: ela fica por cima.',
    ],
  },
  {
    version: '2.39.0',
    title: 'Semana do pedal, backup e volta para casa',
    items: [
      'Semana do pedal: na tela inicial (puxe a gaveta), a ida e a volta nos horários da sua rotina nos próximos dias úteis, com seco, pode chover ou chuva. Bom para decidir com antecedência.',
      'Lembrete de backup: seus dados ficam só no celular. Uma vez por mês, o app lembra de exportar um backup com um toque (ou adie por 7 dias).',
      'Chegou ao trabalho? O resumo mostra a previsão da volta para casa no seu horário e, se for chover, o melhor horário seco, com um botão para deixar a volta pronta.',
    ],
  },
  {
    version: '2.38.1',
    title: 'Data da previsão e da versão',
    items: [
      'A barra do topo mostra a data e a hora da previsão (ex.: "previsão 24/11 17:14"). Assim dá para ver na hora se os dados são de hoje.',
      'No fim da tela inicial aparecem a versão do app e a data em que ela foi publicada.',
    ],
  },
  {
    version: '2.38.0',
    title: 'Rotas salvas que cobrem só um trecho',
    items: [
      'Uma rota salva agora aparece mesmo quando cobre só parte do trajeto: o app usa o pedaço que serve e liga você até ele e dele até o destino.',
      'Novo "Usar uma rota salva" no trajeto, também com o pedal em curso: escolha qualquer rota salva e ela vira a rota em uso, a partir de onde você está.',
      'As dicas de uso só aparecem com a gaveta baixa (antes podiam sair do topo da tela).',
    ],
  },
  {
    version: '2.37.0',
    title: 'Chuvas evitadas',
    items: [
      'Quando você escolhe uma rota seca enquanto outra pegaria chuva, ou espera passar e sai depois, o pedal conta como "chuva evitada". O resumo da chegada mostra isso.',
      'Em Seus pedais → Conquistas: quantas chuvas você evitou no mês e no total. Com 5, vem o selo "Driblador de chuva".',
      'Respondeu "Choveu" no fim do pedal? Ele deixa de contar como chuva evitada.',
    ],
  },
  {
    version: '2.36.0',
    title: 'Dicas rápidas e lugares sem repetição',
    items: [
      'Dicas curtas mostram os gestos que não dá para adivinhar: puxar a gaveta, segurar no mapa (salvar lugar, "Estou aqui") e arrastar a rota. Cada uma aparece uma vez; para rever, use Ajustes → Aparência → "Mostrar as dicas de novo".',
      'Ao salvar um lugar no mesmo ponto (ou com o mesmo nome) da Casa, do Trabalho ou de outro lugar salvo, o app avisa antes. Dá para salvar mesmo assim.',
    ],
  },
  {
    version: '2.35.1',
    title: 'Gaveta mais baixa de verdade',
    items: [
      'A gaveta baixa agora ocupa no máximo 40% da tela (em geral, menos de um terço).',
      'Tela inicial: a gaveta mostra só a busca e os atalhos, e o clima de onde você está vira uma etiqueta sobre o mapa. Toque nela para abrir os detalhes.',
      'Trajeto: o aviso do INMET desceu para baixo do cartão do trajeto.',
    ],
  },
  {
    version: '2.35.0',
    title: 'Gaveta compacta em todo o app',
    items: [
      'Na tela inicial e montando o trajeto, a gaveta baixa também fica compacta: título, números e o botão principal. O mapa ganha espaço.',
      'Puxe a gaveta para ver o texto completo da previsão, os avisos de conforto, os horários de saída e o resto.',
    ],
  },
  {
    version: '2.34.0',
    title: 'Chance de chuva na linha da rota',
    items: [
      'Trechos com pouca chuva prevista, mas chance alta, aparecem com pontinhos azuis sobre o amarelo ("pode chover"), no mapa e na barra do trajeto. Antes a linha ficava toda "seca" enquanto o app pedia a capa por causa da chance.',
      'Nesses casos, as etiquetas no mapa, a lista de rotas e o cartão mostram a chance (ex.: "até 59%") em vez de "seco" ou "0 mm".',
    ],
  },
  {
    version: '2.33.0',
    title: 'Mais mapa no pedal',
    items: [
      'Durante o pedal, a gaveta fica baixa e compacta: o título, os números (faltam, chegada, chuva à frente e chance) e os botões. O mapa fica com quase toda a tela.',
      'Puxe a gaveta para cima para ver o texto da previsão, os avisos do INMET e a linha do tempo.',
    ],
  },
  {
    version: '2.32.0',
    title: 'Recalcular sem perder o que já pedalou',
    items: [
      'Quando a rota é refeita no meio do pedal, o caminho que você já fez continua no mapa (linha azul) e o "AO VIVO" mostra os km feitos. Tempo, distância e o caminho gravado nunca recomeçam.',
      'Na chegada, "Salvar este caminho como minha rota" guarda o trajeto que você fez de verdade, com desvios. Da próxima vez ele aparece primeiro.',
      'Encerrou o pedal a menos de 500 m do destino? Ele conta como chegada e entra no histórico.',
    ],
  },
  {
    version: '2.31.1',
    title: 'Salvar lugar sem susto',
    items: [
      'Em Meus lugares, com um ponto escolhido, o botão amarelo de baixo agora é "Salvar". Antes ele dizia "Pronto" e fechava sem salvar, e o botão de salvar ficava escondido mais acima.',
    ],
  },
  {
    version: '2.31.0',
    title: 'Corrija onde você está',
    items: [
      'O computador às vezes erra a sua posição (ele estima pelo Wi-Fi). Clique com o botão direito no mapa, no lugar certo, e escolha "Estou aqui" (no celular, toque e segure). O clima e os trajetos passam a sair dali.',
      'A posição marcada à mão vale por até 12 horas ou até você se deslocar de verdade. Para voltar antes, toque em "usar GPS" no cartão Onde você está.',
      'O aviso com "Desfazer" não fica mais espremido no canto da tela do celular.',
      'O QR code "Abrir no celular" saiu.',
    ],
  },
  {
    version: '2.30.0',
    title: 'Ajustes organizados e trajeto do computador para o celular',
    items: [
      'Ajustes em blocos que abrem e fecham (Casa e trabalho, Meus lugares, Rotas salvas, Rotina, Aparência, Seus dados): cada título mostra um resumo, sem precisar rolar tudo.',
      'No computador, monte o trajeto e toque no QR code ao lado do X: aponte a câmera do celular e o Pedágua abre com o mesmo trajeto. O trajeto vai dentro do link, sem passar por servidor.',
    ],
  },
  {
    version: '2.29.0',
    title: 'Atalhos no computador e mapa mais limpo',
    items: [
      'No computador: "/" vai direto para a busca, "R" atualiza a previsão e "Esc" fecha o trajeto. Passe o mouse nos botões para ver a tecla.',
      'No celular, os créditos do mapa saíram de baixo da barra do topo e ficam logo acima do painel, sem encostar nos cartões.',
    ],
  },
  {
    version: '2.28.2',
    title: 'Janelas no centro do desktop',
    items: [
      'No computador, Ajustes, Meus lugares e Seus pedais abrem no centro da tela, e não mais grudados no canto de cima.',
    ],
  },
  {
    version: '2.28.1',
    title: 'Ícones com cara de bike',
    items: [
      'Novos ícones no topo: a roda (atualizar, gira enquanto atualiza), o alfinete com estrela (Meus lugares), o velocímetro (Seus pedais) e a coroa da corrente (Ajustes).',
      'Saíram os cartões "Onde me abrigar" e "Onde deixar a bike": dependiam de dados de mapa que quase nunca tinham esses lugares cadastrados.',
    ],
  },
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
