import type { BriefingTemplate } from './types.ts'

// Modelos extraídos da planilha de planejamento original. Valores ilustrativos; não são preços de mercado.

export const initialPlan = [
  {
    "id": "plan-01",
    "week": "Semana 1",
    "title": "Escolher nome provisório",
    "goal": "Nome simples para divulgar, sem travar a criação",
    "priority": "Alta",
    "status": "nao-iniciado",
    "hours": 0.5,
    "nextStep": "Escreva 3 opções e escolha uma.",
    "notes": ""
  },
  {
    "id": "plan-02",
    "week": "Semana 1",
    "title": "Definir 3 serviços de entrada",
    "goal": "Convite digital, site de evento e página de negócio",
    "priority": "Alta",
    "status": "nao-iniciado",
    "hours": 1,
    "nextStep": "Escreva o que está incluso em cada um.",
    "notes": ""
  },
  {
    "id": "plan-03",
    "week": "Semana 1",
    "title": "Revisar convite já criado",
    "goal": "Separar imagens, link ou vídeo da demonstração",
    "priority": "Alta",
    "status": "nao-iniciado",
    "hours": 1,
    "nextStep": "Remova dados pessoais ou peça autorização para publicar.",
    "notes": ""
  },
  {
    "id": "plan-04",
    "week": "Semana 1",
    "title": "Criar vitrine 2",
    "goal": "Exemplo fictício de salão ou barbearia",
    "priority": "Alta",
    "status": "nao-iniciado",
    "hours": 4,
    "nextStep": "Inclua serviços, fotos ilustrativas e botão WhatsApp fictício.",
    "notes": ""
  },
  {
    "id": "plan-05",
    "week": "Semana 1",
    "title": "Criar vitrine 3",
    "goal": "Exemplo fictício de aniversário ou formatura",
    "priority": "Média",
    "status": "nao-iniciado",
    "hours": 3,
    "nextStep": "Coloque data e nomes fictícios.",
    "notes": ""
  },
  {
    "id": "plan-06",
    "week": "Semana 1",
    "title": "Abrir canal de atendimento",
    "goal": "WhatsApp Business com perfil e catálogo",
    "priority": "Alta",
    "status": "nao-iniciado",
    "hours": 1,
    "nextStep": "Cadastre 3 serviços e resposta inicial.",
    "notes": ""
  },
  {
    "id": "plan-07",
    "week": "Semana 2",
    "title": "Montar portfólio enxuto",
    "goal": "Uma página/link com seus 3 exemplos",
    "priority": "Alta",
    "status": "nao-iniciado",
    "hours": 2,
    "nextStep": "Diga DEMONSTRAÇÃO nos projetos fictícios.",
    "notes": ""
  },
  {
    "id": "plan-08",
    "week": "Semana 2",
    "title": "Criar perfil de divulgação",
    "goal": "Instagram profissional com bio e contato",
    "priority": "Alta",
    "status": "nao-iniciado",
    "hours": 1,
    "nextStep": "Bio curta + cidade + atendimento online.",
    "notes": ""
  },
  {
    "id": "plan-09",
    "week": "Semana 2",
    "title": "Publicar sua apresentação",
    "goal": "Post: quem sou, o que faço e como pedir orçamento",
    "priority": "Alta",
    "status": "nao-iniciado",
    "hours": 1,
    "nextStep": "Use o roteiro da aba PUBLICAÇÕES.",
    "notes": ""
  },
  {
    "id": "plan-10",
    "week": "Semana 2",
    "title": "Contar à rede próxima",
    "goal": "Falar com 10 pessoas sem pressionar ninguém",
    "priority": "Alta",
    "status": "nao-iniciado",
    "hours": 2,
    "nextStep": "Peça indicações e feedback do portfólio.",
    "notes": ""
  },
  {
    "id": "plan-11",
    "week": "Semana 3",
    "title": "Prospectar negócios locais",
    "goal": "Conversar com 10 empresas com abordagem personalizada",
    "priority": "Alta",
    "status": "nao-iniciado",
    "hours": 3,
    "nextStep": "Mostre 1 melhoria concreta para cada negócio.",
    "notes": ""
  },
  {
    "id": "plan-12",
    "week": "Semana 3",
    "title": "Organizar 3 orçamentos modelo",
    "goal": "Definir escopo, prazos, revisão, sinal e custos",
    "priority": "Alta",
    "status": "nao-iniciado",
    "hours": 2,
    "nextStep": "Use a aba SERVIÇOS E PREÇOS.",
    "notes": ""
  },
  {
    "id": "plan-13",
    "week": "Semana 3",
    "title": "Publicar bastidores",
    "goal": "Mostrar criação, benefícios e diferenças entre serviços",
    "priority": "Média",
    "status": "nao-iniciado",
    "hours": 2,
    "nextStep": "Publique 2 vezes na semana.",
    "notes": ""
  },
  {
    "id": "plan-14",
    "week": "Semana 3",
    "title": "Fazer retornos educados",
    "goal": "Responder interessados e mandar follow-up único",
    "priority": "Alta",
    "status": "nao-iniciado",
    "hours": 1,
    "nextStep": "Anote data e ação em CONTATOS.",
    "notes": ""
  },
  {
    "id": "plan-15",
    "week": "Semana 4",
    "title": "Fechar primeiro pedido",
    "goal": "Briefing + proposta + sinal antes de produzir",
    "priority": "Alta",
    "status": "nao-iniciado",
    "hours": 3,
    "nextStep": "Registre o serviço em PEDIDOS e CAIXA.",
    "notes": ""
  },
  {
    "id": "plan-16",
    "week": "Semana 4",
    "title": "Recolher retorno",
    "goal": "Pedir depoimento e autorização para portfólio",
    "priority": "Média",
    "status": "nao-iniciado",
    "hours": 1,
    "nextStep": "Se o cliente concordar, publique o resultado.",
    "notes": ""
  },
  {
    "id": "plan-17",
    "week": "Semana 4",
    "title": "Revisar o mês",
    "goal": "Contatos, orçamentos, pedidos e horas gastas",
    "priority": "Alta",
    "status": "nao-iniciado",
    "hours": 1,
    "nextStep": "Ajuste a oferta e preço para o próximo mês.",
    "notes": ""
  }
] as const


export const initialServices = [
  {
    "id": "service-01",
    "name": "Convite digital simples",
    "hours": 3,
    "hourlyRate": 30,
    "extras": 0,
    "contingency": 0.15,
    "scope": "1 arte/convite + 2 rodadas de ajustes",
    "exclusions": "Impressão, fotos, alterações ilimitadas",
    "availability": "Oferecer já"
  },
  {
    "id": "service-02",
    "name": "Convite interativo com links",
    "hours": 5,
    "hourlyRate": 30,
    "extras": 0,
    "contingency": 0.15,
    "scope": "Convite com links de mapa/WhatsApp + 2 revisões",
    "exclusions": "Hospedagem paga ou funcionalidades avançadas",
    "availability": "Oferecer já"
  },
  {
    "id": "service-03",
    "name": "Site de evento",
    "hours": 9,
    "hourlyRate": 30,
    "extras": 0,
    "contingency": 0.2,
    "scope": "1 página responsiva com informações e mapa",
    "exclusions": "RSVP complexo, domínio, hospedagem paga",
    "availability": "Oferecer já"
  },
  {
    "id": "service-04",
    "name": "Página de barbearia/salão",
    "hours": 10,
    "hourlyRate": 30,
    "extras": 0,
    "contingency": 0.2,
    "scope": "Página com serviços, endereço, contato e botão WhatsApp",
    "exclusions": "Sistema de agendamento integrado",
    "availability": "Oferecer já"
  },
  {
    "id": "service-05",
    "name": "Catálogo digital simples",
    "hours": 8,
    "hourlyRate": 30,
    "extras": 0,
    "contingency": 0.2,
    "scope": "Página com produtos/serviços e botão de contato",
    "exclusions": "Carrinho e pagamento online",
    "availability": "Fase 2"
  },
  {
    "id": "service-06",
    "name": "Site multipágina",
    "hours": 18,
    "hourlyRate": 30,
    "extras": 0,
    "contingency": 0.25,
    "scope": "Projeto detalhado após briefing específico",
    "exclusions": "Funcionalidades não definidas",
    "availability": "Sob consulta"
  },
  {
    "id": "service-07",
    "name": "Atualização pontual",
    "hours": 2,
    "hourlyRate": 30,
    "extras": 0,
    "contingency": 0.15,
    "scope": "Alteração combinada em site existente",
    "exclusions": "Nova página ou redesign total",
    "availability": "Fase 2"
  }
] as const


export const initialPublications = [
  {
    "id": "pub-01",
    "week": "Semana 2",
    "channel": "Instagram",
    "topic": "Apresentação",
    "copy": "Comecei a criar convites digitais e páginas para pequenos negócios. Quer ver exemplos?",
    "audience": "Rede local",
    "status": "planejado",
    "result": "",
    "url": ""
  },
  {
    "id": "pub-02",
    "week": "Semana 2",
    "channel": "WhatsApp Status",
    "topic": "Convite de casamento",
    "copy": "Criei este convite digital! Quer uma versão para seu evento?",
    "audience": "Eventos",
    "status": "planejado",
    "result": "",
    "url": ""
  },
  {
    "id": "pub-03",
    "week": "Semana 3",
    "channel": "Instagram",
    "topic": "Antes / depois fictício",
    "copy": "Veja como uma página pode organizar serviços e contatos de um salão.",
    "audience": "Beleza",
    "status": "planejado",
    "result": "",
    "url": ""
  },
  {
    "id": "pub-04",
    "week": "Semana 3",
    "channel": "WhatsApp Status",
    "topic": "Bastidores",
    "copy": "Um pedacinho do processo de criar um site para evento.",
    "audience": "Eventos",
    "status": "planejado",
    "result": "",
    "url": ""
  },
  {
    "id": "pub-05",
    "week": "Semana 4",
    "channel": "Instagram",
    "topic": "Explicação de serviço",
    "copy": "O que entra em um site simples para barbearia?",
    "audience": "Comércio local",
    "status": "planejado",
    "result": "",
    "url": ""
  },
  {
    "id": "pub-06",
    "week": "Semana 4",
    "channel": "WhatsApp Status",
    "topic": "Vagas de agenda",
    "copy": "Estou aceitando projetos de convites e páginas simples. Me chama para orçamento.",
    "audience": "Todos",
    "status": "planejado",
    "result": "",
    "url": ""
  },
  {
    "id": "pub-07",
    "week": "Semana 4",
    "channel": "Instagram",
    "topic": "FAQ",
    "copy": "Quanto tempo leva? O que preciso mandar para começar?",
    "audience": "Todos",
    "status": "planejado",
    "result": "",
    "url": ""
  }
] as const


export const initialBriefing = [
  {
    "id": "brief-01",
    "phase": "Primeiro contato",
    "question": "Qual é o tipo de projeto que você quer?",
    "reason": "Entender se é convite, site ou catálogo.",
    "required": "Sim",
    "answer": "",
    "nextAction": "Registrar em CONTATOS",
    "notes": ""
  },
  {
    "id": "brief-02",
    "phase": "Primeiro contato",
    "question": "Qual é o objetivo principal da página/convite?",
    "reason": "Evitar criar algo que não resolve a necessidade.",
    "required": "Sim",
    "answer": "",
    "nextAction": "Resumir objetivo em uma frase",
    "notes": ""
  },
  {
    "id": "brief-03",
    "phase": "Prazo",
    "question": "Para quando você precisa do material pronto?",
    "reason": "Checar sua disponibilidade fora do emprego.",
    "required": "Sim",
    "answer": "",
    "nextAction": "Confirmar prazo possível",
    "notes": ""
  },
  {
    "id": "brief-04",
    "phase": "Conteúdo",
    "question": "Você já possui textos, logo, fotos e informações?",
    "reason": "Estimar retrabalho e tempo.",
    "required": "Sim",
    "answer": "",
    "nextAction": "Listar materiais pendentes",
    "notes": ""
  },
  {
    "id": "brief-05",
    "phase": "Conteúdo",
    "question": "Quais seções e botões deseja?",
    "reason": "Delimitar o que será entregue.",
    "required": "Sim",
    "answer": "",
    "nextAction": "Montar escopo",
    "notes": ""
  },
  {
    "id": "brief-06",
    "phase": "Estilo",
    "question": "Tem cores ou referências visuais de que gosta?",
    "reason": "Definir direção visual.",
    "required": "Opcional",
    "answer": "",
    "nextAction": "Pedir até 3 referências",
    "notes": ""
  },
  {
    "id": "brief-07",
    "phase": "Site",
    "question": "Já tem domínio e hospedagem?",
    "reason": "Separar custos e responsabilidades.",
    "required": "Se for site",
    "answer": "",
    "nextAction": "Explicar custo caso não tenha",
    "notes": ""
  },
  {
    "id": "brief-08",
    "phase": "Site",
    "question": "Deseja agendamento, pagamento ou formulário?",
    "reason": "Ver se foge do serviço simples.",
    "required": "Se for site",
    "answer": "",
    "nextAction": "Orçar por separado se for complexo",
    "notes": ""
  },
  {
    "id": "brief-09",
    "phase": "Evento",
    "question": "Qual nome, data, horário e endereço do evento?",
    "reason": "Garantir informações corretas.",
    "required": "Se for evento",
    "answer": "",
    "nextAction": "Conferir grafia e links",
    "notes": ""
  },
  {
    "id": "brief-10",
    "phase": "Evento",
    "question": "Quer confirmação de presença (RSVP)?",
    "reason": "Entender se precisa de ferramenta extra.",
    "required": "Se for evento",
    "answer": "",
    "nextAction": "Definir solução e custo",
    "notes": ""
  },
  {
    "id": "brief-11",
    "phase": "Pagamento",
    "question": "Podemos combinar entrada antes de começar?",
    "reason": "Evitar trabalhar sem compromisso formal.",
    "required": "Sim",
    "answer": "",
    "nextAction": "Registrar sinal no CAIXA",
    "notes": ""
  },
  {
    "id": "brief-12",
    "phase": "Aprovação",
    "question": "Quem aprova e quantas revisões serão incluídas?",
    "reason": "Evitar mudanças ilimitadas.",
    "required": "Sim",
    "answer": "",
    "nextAction": "Colocar na proposta",
    "notes": ""
  },
  {
    "id": "brief-13",
    "phase": "Entrega",
    "question": "Como o cliente terá acesso e quem atualiza depois?",
    "reason": "Alinhar responsabilidade depois da entrega.",
    "required": "Sim",
    "answer": "",
    "nextAction": "Registrar suporte e limites",
    "notes": ""
  }
] as const

const question = (
  id: string,
  label: string,
  type: BriefingTemplate['sections'][number]['questions'][number]['type'],
  example = '',
  required = false,
  options: string[] = [],
  condition: BriefingTemplate['sections'][number]['questions'][number]['condition'] = null,
) => ({ id, label, type, example, required, options, condition })

export const initialBriefingTemplates: BriefingTemplate[] = [
  {
    id: 'brief-template-general', name: 'Briefing geral',
    description: 'Ponto de partida para serviços personalizados sem questionário específico.',
    sections: [
      { id: 'general-objective', title: 'Objetivo e público', description: 'Entenda o resultado esperado antes de iniciar a produção.', questions: [
        question('general-goal', 'O que você precisa criar ou atualizar?', 'long-text', 'Descreva o resultado esperado', true),
        question('general-audience', 'Quem vai usar ou acessar o material?', 'short-text', 'Público principal'),
        question('general-deadline', 'Para quando precisa da primeira versão?', 'date', 'Data desejada', true),
      ] },
      { id: 'general-content', title: 'Conteúdo e referências', description: 'Liste materiais, estilo e exemplos que ajudem a orientar a criação.', questions: [
        question('general-materials-ready', 'Os textos e materiais já estão disponíveis?', 'yes-no', '', true),
        question('general-materials-pending', 'O que ainda será enviado?', 'long-text', 'Textos, fotos, logotipo ou links', true, [], { questionId: 'general-materials-ready', operator: 'equals', value: 'Não' }),
        question('general-references', 'Quais referências ou estilos você prefere?', 'long-text', 'Cores, exemplos e o que chamou sua atenção'),
      ] },
      { id: 'general-approval', title: 'Contato e aprovação', description: 'Combine quem revisa e quais são os próximos passos.', questions: [
        question('general-contact', 'Quem será a pessoa de contato e aprovação?', 'short-text', 'Nome e melhor canal de contato', true),
        question('general-approval-count', 'Quem dará a aprovação final?', 'short-text', 'Nome ou função da pessoa responsável'),
      ] },
    ],
  },
  {
    id: 'brief-template-event', name: 'Convite e site de evento',
    description: 'Reúna dados do evento, referências e links com perguntas condicionais para RSVP e localização.',
    sections: [
      { id: 'event-about', title: 'Sobre o evento', description: 'Informações que precisam aparecer no convite ou site.', questions: [
        question('event-type', 'Qual é o tipo de evento?', 'single-choice', 'Ex.: casamento, aniversário, formatura', true, ['Casamento', 'Aniversário', 'Formatura', 'Outro']),
        question('event-title', 'Qual nome ou título deve aparecer?', 'short-text', 'Ex.: Ana e Caio', true),
        question('event-date', 'Qual é a data e o horário?', 'date', 'Selecione a data principal', true),
        question('event-address', 'Onde será o evento?', 'long-text', 'Endereço, salão e ponto de referência', true),
        question('event-map', 'Você tem um link do mapa?', 'url', 'https://maps.example/...'),
      ] },
      { id: 'event-guests', title: 'Convidados e confirmação', description: 'Perguntas extras aparecem conforme as escolhas do cliente.', questions: [
        question('event-rsvp', 'Precisa confirmar presença?', 'yes-no', '', true),
        question('event-rsvp-link', 'Qual link ou contato será usado para confirmar?', 'url', 'Link do formulário ou WhatsApp', true, [], { questionId: 'event-rsvp', operator: 'equals', value: 'Sim' }),
        question('event-dress-code', 'Há traje ou orientação para convidados?', 'long-text', 'Ex.: traje esporte fino'),
      ] },
      { id: 'event-style', title: 'Conteúdo e visual', description: 'Materiais para definir a direção visual e preparar a primeira versão.', questions: [
        question('event-colors', 'Quais cores ou referências você prefere?', 'long-text', 'Envie nomes de cores ou links de referência'),
        question('event-assets', 'Quais fotos, textos ou logotipos já estão prontos?', 'multiple-choice', '', false, ['Fotos', 'Texto', 'Logotipo', 'Ainda vou preparar']),
        question('event-contact', 'Qual contato deve receber dúvidas?', 'short-text', 'Nome e telefone/WhatsApp', true),
      ] },
    ],
  },
  {
    id: 'brief-template-business', name: 'Página para negócio local',
    description: 'Entenda o negócio, seus serviços, contatos, referências e recursos opcionais.',
    sections: [
      { id: 'business-profile', title: 'Negócio e objetivo', description: 'A base para apresentar a empresa com clareza.', questions: [
        question('business-name', 'Qual nome deve aparecer na página?', 'short-text', 'Nome comercial', true),
        question('business-description', 'Como você descreve o negócio?', 'long-text', 'O que oferece e para quem', true),
        question('business-goal', 'Qual é o principal objetivo da página?', 'single-choice', '', true, ['Receber contatos', 'Apresentar serviços', 'Aumentar agendamentos', 'Divulgar localização', 'Outro']),
        question('business-audience', 'Quem é o público principal?', 'short-text', 'Ex.: pessoas do bairro que buscam ...'),
      ] },
      { id: 'business-content', title: 'Serviços e identidade', description: 'Conteúdos e materiais que serão usados na página.', questions: [
        question('business-services', 'Quais serviços ou produtos precisam aparecer?', 'long-text', 'Liste nomes e uma breve descrição', true),
        question('business-brand', 'Você possui logotipo e fotos próprias?', 'single-choice', '', true, ['Sim, tenho os dois', 'Tenho apenas logotipo', 'Tenho apenas fotos', 'Ainda não']),
        question('business-style', 'Quais cores ou referências visuais prefere?', 'long-text', 'Links ou descrição do estilo'),
      ] },
      { id: 'business-contact', title: 'Contato e recursos', description: 'Links condicionais para recursos escolhidos pelo cliente.', questions: [
        question('business-contact-link', 'Qual WhatsApp ou contato deve receber mensagens?', 'short-text', 'DDD + número ou contato público', true),
        question('business-booking', 'Quer incluir agendamento?', 'yes-no', '', true),
        question('business-booking-link', 'Qual link de agendamento devemos usar?', 'url', 'Link da ferramenta atual', true, [], { questionId: 'business-booking', operator: 'equals', value: 'Sim' }),
        question('business-domain', 'Já possui domínio próprio?', 'yes-no'),
        question('business-domain-name', 'Qual é o domínio?', 'short-text', 'Ex.: seunegocio.com.br', true, [], { questionId: 'business-domain', operator: 'equals', value: 'Sim' }),
      ] },
    ],
  },
  {
    id: 'brief-template-catalog', name: 'Catálogo digital',
    description: 'Organize itens, categorias, imagens e o caminho para o cliente fazer um pedido.',
    sections: [
      { id: 'catalog-objective', title: 'Objetivo e público', description: 'Defina o que será apresentado e a ação esperada.', questions: [
        question('catalog-name', 'Qual é o nome do negócio?', 'short-text', 'Nome que aparece no catálogo', true),
        question('catalog-goal', 'Qual ação o visitante deve realizar?', 'single-choice', '', true, ['Pedir por WhatsApp', 'Solicitar orçamento', 'Visitar o local', 'Conhecer opções']),
        question('catalog-audience', 'Quem costuma comprar ou contratar?', 'long-text', 'Descreva clientes e necessidades comuns'),
      ] },
      { id: 'catalog-items', title: 'Produtos ou serviços', description: 'Registre o conteúdo que deve entrar na primeira versão.', questions: [
        question('catalog-items-list', 'Quais itens e categorias serão exibidos?', 'long-text', 'Nome, descrição e categoria de cada item', true),
        question('catalog-prices', 'Os preços devem aparecer?', 'yes-no', '', true),
        question('catalog-images', 'Você já possui fotos dos itens?', 'yes-no'),
        question('catalog-image-source', 'Como as imagens serão enviadas?', 'long-text', 'Link de pasta ou forma de compartilhamento', true, [], { questionId: 'catalog-images', operator: 'equals', value: 'Sim' }),
      ] },
      { id: 'catalog-delivery', title: 'Pedidos e contato', description: 'Escolha como os visitantes vão continuar a conversa.', questions: [
        question('catalog-contact', 'Qual contato recebe pedidos?', 'short-text', 'WhatsApp ou e-mail público', true),
        question('catalog-delivery-options', 'Há retirada ou entrega?', 'multiple-choice', '', false, ['Retirada', 'Entrega', 'Atendimento no local']),
        question('catalog-existing-link', 'Existe um link de pedido que deve ser usado?', 'url', 'Link atual de pedidos'),
      ] },
    ],
  },
  {
    id: 'brief-template-update', name: 'Atualização pontual de site',
    description: 'Defina a página afetada, a alteração solicitada, materiais e acessos necessários.',
    sections: [
      { id: 'update-site', title: 'Site e página', description: 'Identifique o site e o local da mudança.', questions: [
        question('update-url', 'Qual é o endereço do site?', 'url', 'https://seusite.com.br', true),
        question('update-page', 'Qual página ou seção deve ser atualizada?', 'short-text', 'Ex.: página de serviços'),
        question('update-change', 'O que deve mudar?', 'long-text', 'Descreva o estado atual e o resultado esperado', true),
      ] },
      { id: 'update-materials', title: 'Materiais e prazo', description: 'Combine conteúdo e janela para a publicação.', questions: [
        question('update-materials-ready', 'Os textos e imagens finais estão prontos?', 'yes-no', '', true),
        question('update-pending', 'Quais materiais ainda faltam?', 'long-text', 'Liste texto, imagem ou informação', true, [], { questionId: 'update-materials-ready', operator: 'equals', value: 'Não' }),
        question('update-deadline', 'Para quando a alteração deve estar publicada?', 'date', 'Data desejada'),
      ] },
      { id: 'update-access', title: 'Acesso e aprovação', description: 'Use somente os acessos indispensáveis e combine a validação.', questions: [
        question('update-access-ready', 'Você consegue conceder acesso temporário ao site?', 'yes-no', '', true),
        question('update-platform', 'Qual plataforma ou painel é usado?', 'short-text', 'Ex.: WordPress, Wix ou painel próprio', true, [], { questionId: 'update-access-ready', operator: 'equals', value: 'Sim' }),
        question('update-approver', 'Quem aprova a alteração?', 'short-text', 'Nome ou função', true),
      ] },
    ],
  },
]

export const serviceTaskTemplates: Record<string, string[]> = {
  'service-01': ['Confirmar texto e grafia do convite', 'Definir direção visual', 'Preparar primeira versão', 'Aplicar revisões combinadas', 'Entregar arquivo final'],
  'service-02': ['Confirmar conteúdo e links do evento', 'Definir direção visual', 'Preparar convite interativo', 'Testar links e leitura no celular', 'Aplicar revisões e entregar'],
  'service-03': ['Reunir conteúdo e materiais do evento', 'Organizar seções e links', 'Criar primeira versão responsiva', 'Revisar no celular e desktop', 'Aplicar ajustes e publicar'],
  'service-04': ['Reunir serviços, contatos e endereço', 'Organizar identidade e conteúdo', 'Criar página responsiva', 'Validar botões de contato', 'Aplicar ajustes e entregar'],
  'service-05': ['Organizar categorias e itens do catálogo', 'Preparar descrições e imagens', 'Montar catálogo responsivo', 'Testar caminho de contato e pedido', 'Aplicar ajustes e entregar'],
  'service-06': ['Definir mapa de páginas e escopo', 'Reunir conteúdo e referências', 'Criar páginas e navegação', 'Validar responsividade e links', 'Revisar e publicar'],
  'service-07': ['Confirmar página e alteração solicitada', 'Receber conteúdo e acesso temporário', 'Implementar atualização', 'Validar a alteração com o cliente', 'Publicar e registrar entrega'],
}

export const serviceBriefingTemplates: Record<string, string> = {
  'service-01': 'brief-template-event',
  'service-02': 'brief-template-event',
  'service-03': 'brief-template-event',
  'service-04': 'brief-template-business',
  'service-05': 'brief-template-catalog',
  'service-06': 'brief-template-business',
  'service-07': 'brief-template-update',
}

