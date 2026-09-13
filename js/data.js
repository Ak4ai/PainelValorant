// Dados dos Agentes de Valorant divididos por função
export const AGENTS = {
  Duelistas: [
    { name: 'Jett', role: 'Duelista', color: '#9df8f7' },
    { name: 'Raze', role: 'Duelista', color: '#fe7939' },
    { name: 'Reyna', role: 'Duelista', color: '#bd39ff' },
    { name: 'Neon', role: 'Duelista', color: '#00f7ff' },
    { name: 'Phoenix', role: 'Duelista', color: '#ff773d' },
    { name: 'Yoru', role: 'Duelista', color: '#2738ff' },
    { name: 'Iso', role: 'Duelista', color: '#a758ff' }
  ],
  Iniciadores: [
    { name: 'Sova', role: 'Iniciador', color: '#3873ff' },
    { name: 'Fade', role: 'Iniciador', color: '#202636' },
    { name: 'Breach', role: 'Iniciador', color: '#97451a' },
    { name: 'Skye', role: 'Iniciador', color: '#38c566' },
    { name: 'KAY/O', role: 'Iniciador', color: '#4494ff' },
    { name: 'Gekko', role: 'Iniciador', color: '#a3f338' }
  ],
  Controladores: [
    { name: 'Omen', role: 'Controlador', color: '#3b3bb6' },
    { name: 'Viper', role: 'Controlador', color: '#2ec550' },
    { name: 'Brimstone', role: 'Controlador', color: '#de6818' },
    { name: 'Astra', role: 'Controlador', color: '#7434eb' },
    { name: 'Harbor', role: 'Controlador', color: '#169fb6' },
    { name: 'Clove', role: 'Controlador', color: '#ff66c4' }
  ],
  Sentinelas: [
    { name: 'Killjoy', role: 'Sentinela', color: '#ffe600' },
    { name: 'Cypher', role: 'Sentinela', color: '#dedede' },
    { name: 'Sage', role: 'Sentinela', color: '#31e8b4' },
    { name: 'Chamber', role: 'Sentinela', color: '#cf9833' },
    { name: 'Deadlock', role: 'Sentinela', color: '#3b789e' },
    { name: 'Vyse', role: 'Sentinela', color: '#8d99ae' }
  ]
};

// Lista linear de todos os agentes para buscas rápidas
export const ALL_AGENTS = Object.values(AGENTS).flat();

export function getAgentColor(agentName) {
  const found = ALL_AGENTS.find(a => a.name.toLowerCase() === (agentName || '').toLowerCase());
  return found ? found.color : '#ff4655';
}

export function getAgentRole(agentName) {
  const found = ALL_AGENTS.find(a => a.name.toLowerCase() === (agentName || '').toLowerCase());
  return found ? found.role : 'Agente';
}

// Estrutura completa dos Mapas e Builds solicitadas
export const MAPS_DATA = [
  {
    id: 'ascent',
    name: 'Ascent',
    accentColor: '#3a78c4',
    bgImage: 'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt720054e797eb1c5e/5eb270a6c6e75a5e3057e4e8/ascent-featured.png',
    builds: [
      {
        title: 'Ex1 (Padrão)',
        tag: 'Padrão Meta',
        agents: ['Sova', 'Omen', 'Killjoy', 'Jett', 'KAY/O']
      },
      {
        title: 'Ex2 (Info)',
        tag: 'Informação',
        agents: ['Fade', 'Omen', 'Cypher', 'Raze', 'Skye']
      },
      {
        title: 'Ex3 (Duplo Iniciador)',
        tag: 'Pressão / Stun',
        agents: ['Sova', 'Omen', 'Killjoy', 'Jett', 'Breach']
      }
    ]
  },
  {
    id: 'haven',
    name: 'Haven',
    accentColor: '#cf5a32',
    bgImage: 'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt804797fbab1f3918/5eb27083a21db5642a8b301f/haven-featured.png',
    builds: [
      {
        title: 'Ex1 (Meta)',
        tag: 'Meta Sólido',
        agents: ['Sova', 'Omen', 'Killjoy', 'Jett', 'Breach']
      },
      {
        title: 'Ex2 (Global)',
        tag: 'Controle Global',
        agents: ['Fade', 'Viper', 'Cypher', 'Raze', 'Omen']
      },
      {
        title: 'Ex3 (Agressiva)',
        tag: 'Agressão / Rápida',
        agents: ['Skye', 'Omen', 'Killjoy', 'Neon', 'Sova']
      }
    ]
  },
  {
    id: 'lotus',
    name: 'Lotus',
    accentColor: '#c9963e',
    bgImage: 'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt2264ad450d03efaf/63b8bf930eb0c563e46c9c64/Lotus_1.jpg',
    builds: [
      {
        title: 'Ex1 (Domínio)',
        tag: 'Domínio de Mapa',
        agents: ['Fade', 'Omen', 'Killjoy', 'Raze', 'Viper']
      },
      {
        title: 'Ex2 (Info)',
        tag: 'Info & Retomada',
        agents: ['Sova', 'Omen', 'Cypher', 'Jett', 'KAY/O']
      },
      {
        title: 'Ex3 (Espaço)',
        tag: 'Abertura de Espaço',
        agents: ['Skye', 'Viper', 'Killjoy', 'Raze', 'Omen']
      }
    ]
  },
  {
    id: 'split',
    name: 'Split',
    accentColor: '#30988e',
    bgImage: 'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/bld2843aa5c4146a78/5eb27092921b346427357c32/split-featured.png',
    builds: [
      {
        title: 'Ex1 (Pressão)',
        tag: 'Pressão Meio/Sites',
        agents: ['Raze', 'Omen', 'Cypher', 'Skye', 'Viper']
      },
      {
        title: 'Ex2 (Execução)',
        tag: 'Execução Rápida',
        agents: ['Jett', 'Omen', 'Killjoy', 'Breach', 'Sova']
      },
      {
        title: 'Ex3 (Ret Defensive)',
        tag: 'Retomada Defensiva',
        agents: ['Raze', 'Astra', 'Sage', 'Skye', 'Cypher']
      }
    ]
  },
  {
    id: 'sunset',
    name: 'Sunset',
    accentColor: '#e07246',
    bgImage: 'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt81878b668f44ff5a/64e83713076a9173f40d99dc/Sunset_KeyArt_16-9.jpg',
    builds: [
      {
        title: 'Ex1 (Equilibrada)',
        tag: 'Equilibrada Meta',
        agents: ['Raze', 'Omen', 'Cypher', 'Fade', 'Breach']
      },
      {
        title: 'Ex2 (Sentinela)',
        tag: 'Postura Sentinela',
        agents: ['Jett', 'Omen', 'Killjoy', 'Sova', 'KAY/O']
      },
      {
        title: 'Ex3 (Utilitários)',
        tag: 'Overload Utilitários',
        agents: ['Neon', 'Omen', 'Cypher', 'Skye', 'Fade']
      }
    ]
  },
  {
    id: 'abyss',
    name: 'Abyss / Outros',
    accentColor: '#4f3dc4',
    bgImage: 'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt1f855a6d36e2f183/665f8a0ff6d1e4c7ba64005b/Abyss_KeyArt_16-9.jpg',
    builds: [
      {
        title: 'Ex1 (Mobilidade)',
        tag: 'Mobilidade / Dash',
        agents: ['Jett', 'Omen', 'Cypher', 'Sova', 'KAY/O']
      },
      {
        title: 'Ex2 (Controle)',
        tag: 'Controle de Quedas',
        agents: ['Raze', 'Viper', 'Killjoy', 'Fade', 'Omen']
      },
      {
        title: 'Ex3 (Explosiva)',
        tag: 'Agressão Explosiva',
        agents: ['Neon', 'Omen', 'Chamber', 'Skye', 'Sova']
      }
    ]
  }
];

// Dados padrão iniciais para cada jogador
export const DEFAULT_PLAYERS = [
  { id: 1, name: 'Player 1', titular: '', reserva: '' },
  { id: 2, name: 'Player 2', titular: '', reserva: '' },
  { id: 3, name: 'Player 3', titular: '', reserva: '' },
  { id: 4, name: 'Player 4', titular: '', reserva: '' },
  { id: 5, name: 'Player 5', titular: '', reserva: '' }
];
