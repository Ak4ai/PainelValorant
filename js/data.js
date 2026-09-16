// Banco de Agentes de Valorant com URLs oficiais da Riot CDN
(() => {
const AGENTS = {
  Duelistas: [
    { 
      name: 'Jett', 
      role: 'Duelista', 
      color: '#9df8f7',
      icon: 'https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/fullportrait.png'
    },
    { 
      name: 'Raze', 
      role: 'Duelista', 
      color: '#fe7939',
      icon: 'https://media.valorant-api.com/agents/f94c3b30-42be-e959-889c-5aa313dba261/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/f94c3b30-42be-e959-889c-5aa313dba261/fullportrait.png'
    },
    { 
      name: 'Reyna', 
      role: 'Duelista', 
      color: '#bd39ff',
      icon: 'https://media.valorant-api.com/agents/a3bfb853-43b2-7238-a4f1-ad90e9e46bcc/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/a3bfb853-43b2-7238-a4f1-ad90e9e46bcc/fullportrait.png'
    },
    { 
      name: 'Neon', 
      role: 'Duelista', 
      color: '#00f7ff',
      icon: 'https://media.valorant-api.com/agents/bb2a4828-46eb-8cd1-e765-15848195d751/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/bb2a4828-46eb-8cd1-e765-15848195d751/fullportrait.png'
    },
    { 
      name: 'Phoenix', 
      role: 'Duelista', 
      color: '#ff773d',
      icon: 'https://media.valorant-api.com/agents/eb93336a-449b-9c1b-0a54-a891f7921d69/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/eb93336a-449b-9c1b-0a54-a891f7921d69/fullportrait.png'
    },
    { 
      name: 'Yoru', 
      role: 'Duelista', 
      color: '#2738ff',
      icon: 'https://media.valorant-api.com/agents/7f94d92c-4234-0a36-9646-3a87eb8b5c89/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/7f94d92c-4234-0a36-9646-3a87eb8b5c89/fullportrait.png'
    },
    { 
      name: 'Iso', 
      role: 'Duelista', 
      color: '#a758ff',
      icon: 'https://media.valorant-api.com/agents/0e38b510-41a8-5780-5e8f-568b2a4f2d6c/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/0e38b510-41a8-5780-5e8f-568b2a4f2d6c/fullportrait.png'
    },
    { 
      name: 'Waylay', 
      role: 'Duelista', 
      color: '#ff4081',
      icon: 'https://media.valorant-api.com/agents/df1cb487-4902-002e-5c17-d28e83e78588/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/df1cb487-4902-002e-5c17-d28e83e78588/fullportrait.png'
    }
  ],
  Iniciadores: [
    { 
      name: 'Sova', 
      role: 'Iniciador', 
      color: '#3873ff',
      icon: 'https://media.valorant-api.com/agents/320b2a48-4d9b-a075-30f1-1f93a9b638fa/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/320b2a48-4d9b-a075-30f1-1f93a9b638fa/fullportrait.png'
    },
    { 
      name: 'Fade', 
      role: 'Iniciador', 
      color: '#2b3648',
      icon: 'https://media.valorant-api.com/agents/dade69b4-4f5a-8528-247b-219e5a1facd6/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/dade69b4-4f5a-8528-247b-219e5a1facd6/fullportrait.png'
    },
    { 
      name: 'Breach', 
      role: 'Iniciador', 
      color: '#97451a',
      icon: 'https://media.valorant-api.com/agents/5f8d3a7f-467b-97f3-062c-13acf203c006/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/5f8d3a7f-467b-97f3-062c-13acf203c006/fullportrait.png'
    },
    { 
      name: 'Skye', 
      role: 'Iniciador', 
      color: '#38c566',
      icon: 'https://media.valorant-api.com/agents/6f2a04ca-43e0-be17-7f36-b3908627744d/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/6f2a04ca-43e0-be17-7f36-b3908627744d/fullportrait.png'
    },
    { 
      name: 'KAY/O', 
      role: 'Iniciador', 
      color: '#4494ff',
      icon: 'https://media.valorant-api.com/agents/601dbbe7-43ce-be57-2a40-4abd24953621/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/601dbbe7-43ce-be57-2a40-4abd24953621/fullportrait.png'
    },
    { 
      name: 'Gekko', 
      role: 'Iniciador', 
      color: '#a3f338',
      icon: 'https://media.valorant-api.com/agents/e370fa57-4757-3604-3648-499e1f642d3f/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/e370fa57-4757-3604-3648-499e1f642d3f/fullportrait.png'
    },
    { 
      name: 'Tejo', 
      role: 'Iniciador', 
      color: '#e57b32',
      icon: 'https://media.valorant-api.com/agents/b444168c-4e35-8076-db47-ef9bf368f384/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/b444168c-4e35-8076-db47-ef9bf368f384/fullportrait.png'
    }
  ],
  Controladores: [
    { 
      name: 'Omen', 
      role: 'Controlador', 
      color: '#3b3bb6',
      icon: 'https://media.valorant-api.com/agents/8e253930-4c05-31dd-1b6c-968525494517/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/8e253930-4c05-31dd-1b6c-968525494517/fullportrait.png'
    },
    { 
      name: 'Viper', 
      role: 'Controlador', 
      color: '#2ec550',
      icon: 'https://media.valorant-api.com/agents/707eab51-4836-f488-046a-cda6bf494859/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/707eab51-4836-f488-046a-cda6bf494859/fullportrait.png'
    },
    { 
      name: 'Brimstone', 
      role: 'Controlador', 
      color: '#de6818',
      icon: 'https://media.valorant-api.com/agents/9f0d8ba9-4140-b941-57d3-a7ad57c6b417/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/9f0d8ba9-4140-b941-57d3-a7ad57c6b417/fullportrait.png'
    },
    { 
      name: 'Astra', 
      role: 'Controlador', 
      color: '#7434eb',
      icon: 'https://media.valorant-api.com/agents/41fb69c1-4189-7b37-f117-bcaf1e96f1bf/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/41fb69c1-4189-7b37-f117-bcaf1e96f1bf/fullportrait.png'
    },
    { 
      name: 'Harbor', 
      role: 'Controlador', 
      color: '#169fb6',
      icon: 'https://media.valorant-api.com/agents/95b78ed7-4637-86d9-7e41-71ba8c293152/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/95b78ed7-4637-86d9-7e41-71ba8c293152/fullportrait.png'
    },
    { 
      name: 'Clove', 
      role: 'Controlador', 
      color: '#ff66c4',
      icon: 'https://media.valorant-api.com/agents/1dbf2edd-4729-0984-3115-daa5eed44993/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/1dbf2edd-4729-0984-3115-daa5eed44993/fullportrait.png'
    },
    { 
      name: 'Miks', 
      role: 'Controlador', 
      color: '#8c52ff',
      icon: 'https://media.valorant-api.com/agents/7c8a4701-4de6-9355-b254-e09bc2a34b72/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/7c8a4701-4de6-9355-b254-e09bc2a34b72/fullportrait.png'
    }
  ],
  Sentinelas: [
    { 
      name: 'Killjoy', 
      role: 'Sentinela', 
      color: '#ffe600',
      icon: 'https://media.valorant-api.com/agents/1e58de9c-4950-5125-93e9-a0aee9f98746/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/1e58de9c-4950-5125-93e9-a0aee9f98746/fullportrait.png'
    },
    { 
      name: 'Cypher', 
      role: 'Sentinela', 
      color: '#dedede',
      icon: 'https://media.valorant-api.com/agents/117ed9e3-49f3-6512-3ccf-0cada7e3823b/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/117ed9e3-49f3-6512-3ccf-0cada7e3823b/fullportrait.png'
    },
    { 
      name: 'Sage', 
      role: 'Sentinela', 
      color: '#31e8b4',
      icon: 'https://media.valorant-api.com/agents/569fdd95-4d10-43ab-ca70-79becc718b46/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/569fdd95-4d10-43ab-ca70-79becc718b46/fullportrait.png'
    },
    { 
      name: 'Chamber', 
      role: 'Sentinela', 
      color: '#cf9833',
      icon: 'https://media.valorant-api.com/agents/22697a3d-45bf-8dd7-4fec-84a9e28c69d7/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/22697a3d-45bf-8dd7-4fec-84a9e28c69d7/fullportrait.png'
    },
    { 
      name: 'Deadlock', 
      role: 'Sentinela', 
      color: '#3b789e',
      icon: 'https://media.valorant-api.com/agents/cc8b64c8-4b25-4ff9-6e7f-37b4da43d235/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/cc8b64c8-4b25-4ff9-6e7f-37b4da43d235/fullportrait.png'
    },
    { 
      name: 'Vyse', 
      role: 'Sentinela', 
      color: '#8d99ae',
      icon: 'https://media.valorant-api.com/agents/efba5359-4016-a1e5-7626-b1ae76895940/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/efba5359-4016-a1e5-7626-b1ae76895940/fullportrait.png'
    },
    { 
      name: 'Veto', 
      role: 'Sentinela', 
      color: '#00b4d8',
      icon: 'https://media.valorant-api.com/agents/92eeef5d-43b5-1d4a-8d03-b3927a09034b/displayicon.png',
      bust: 'https://media.valorant-api.com/agents/92eeef5d-43b5-1d4a-8d03-b3927a09034b/fullportrait.png'
    }
  ]
};

// Lista linear de todos os agentes para buscas rápidas
const ALL_AGENTS = Object.values(AGENTS).flat();

function getAgent(agentName) {
  return ALL_AGENTS.find(a => a.name.toLowerCase() === (agentName || '').toLowerCase());
}

function getAgentColor(agentName) {
  const found = getAgent(agentName);
  return found ? found.color : '#ff4655';
}

function getAgentRole(agentName) {
  const found = getAgent(agentName);
  return found ? found.role : 'Agente';
}

function getAgentIcon(agentName) {
  const found = getAgent(agentName);
  return found ? found.icon : 'https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/displayicon.png';
}

// Estrutura completa dos Mapas com URLs oficiais de Splash e ListView Icon
const MAPS_DATA = [
  // --- POOL DO CAMPEONATO (META) ---
  {
    id: 'ascent',
    name: 'Ascent',
    isMeta: true,
    accentColor: '#3a78c4',
    splash: 'https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/splash.png',
    listViewIcon: 'https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/listviewicon.png',
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
    isMeta: true,
    accentColor: '#cf5a32',
    splash: 'https://media.valorant-api.com/maps/2bee0dc9-4ffe-519b-1cbd-7fbe763a6047/splash.png',
    listViewIcon: 'https://media.valorant-api.com/maps/2bee0dc9-4ffe-519b-1cbd-7fbe763a6047/listviewicon.png',
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
    isMeta: true,
    accentColor: '#c9963e',
    splash: 'https://media.valorant-api.com/maps/2fe4ed3a-450a-948b-6d6b-e89a78e680a9/splash.png',
    listViewIcon: 'https://media.valorant-api.com/maps/2fe4ed3a-450a-948b-6d6b-e89a78e680a9/listviewicon.png',
    builds: [
      {
        title: 'Ex1 (Domínio)',
        tag: 'Domínio de Mapa',
        agents: ['Fade', 'Omen', 'Killjoy', 'Raze', 'Viper']
      },
      {
        title: 'Ex2 (Artilharia & Info)',
        tag: 'Controle Tejo',
        agents: ['Tejo', 'Omen', 'Cypher', 'Jett', 'KAY/O']
      },
      {
        title: 'Ex3 (Espaço & Sonic)',
        tag: 'Abertura de Espaço',
        agents: ['Skye', 'Miks', 'Killjoy', 'Waylay', 'Omen']
      }
    ]
  },
  {
    id: 'split',
    name: 'Split',
    isMeta: true,
    accentColor: '#30988e',
    splash: 'https://media.valorant-api.com/maps/d960549e-485c-e861-8d71-aa9d1aed12a2/splash.png',
    listViewIcon: 'https://media.valorant-api.com/maps/d960549e-485c-e861-8d71-aa9d1aed12a2/listviewicon.png',
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
    isMeta: true,
    accentColor: '#e07246',
    splash: 'https://media.valorant-api.com/maps/92584fbe-486a-b1b2-9faa-39b0f486b498/splash.png',
    listViewIcon: 'https://media.valorant-api.com/maps/92584fbe-486a-b1b2-9faa-39b0f486b498/listviewicon.png',
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
    name: 'Abyss',
    isMeta: true,
    accentColor: '#4f3dc4',
    splash: 'https://media.valorant-api.com/maps/224b0a95-48b9-f703-1bd8-67aca101a61f/splash.png',
    listViewIcon: 'https://media.valorant-api.com/maps/224b0a95-48b9-f703-1bd8-67aca101a61f/listviewicon.png',
    builds: [
      {
        title: 'Ex1 (Mobilidade)',
        tag: 'Mobilidade / Dash',
        agents: ['Jett', 'Omen', 'Cypher', 'Sova', 'KAY/O']
      },
      {
        title: 'Ex2 (Controle & Artilharia)',
        tag: 'Controle Tejo + Miks',
        agents: ['Raze', 'Viper', 'Killjoy', 'Tejo', 'Miks']
      },
      {
        title: 'Ex3 (Veto Defensivo)',
        tag: 'Interceptação & Stun',
        agents: ['Neon', 'Miks', 'Veto', 'Skye', 'Sova']
      }
    ]
  },

  // --- FORA DO META / FORA DA ROTAÇÃO (5 MAPAS) ---
  {
    id: 'bind',
    name: 'Bind',
    isMeta: false,
    accentColor: '#e89a3c',
    splash: 'https://media.valorant-api.com/maps/2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba/splash.png',
    listViewIcon: 'https://media.valorant-api.com/maps/2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba/listviewicon.png',
    builds: [
      {
        title: 'Ex1 (Meta Tradicional)',
        tag: 'Controle de TP',
        agents: ['Raze', 'Viper', 'Brimstone', 'Skye', 'Cypher']
      },
      {
        title: 'Ex2 (Duplo Duelista)',
        tag: 'Agressão Rápida',
        agents: ['Raze', 'Yoru', 'Fade', 'Brimstone', 'Cypher']
      },
      {
        title: 'Ex3 (Info & Utilitários)',
        tag: 'Controle de Espaço',
        agents: ['Raze', 'Viper', 'Brimstone', 'Gekko', 'Deadlock']
      }
    ]
  },
  {
    id: 'icebox',
    name: 'Icebox',
    isMeta: false,
    accentColor: '#5bc0be',
    splash: 'https://media.valorant-api.com/maps/e2ad5c54-4114-a870-9641-8ea21279579a/splash.png',
    listViewIcon: 'https://media.valorant-api.com/maps/e2ad5c54-4114-a870-9641-8ea21279579a/listviewicon.png',
    builds: [
      {
        title: 'Ex1 (Padrão Meta)',
        tag: 'Verticalidade / A-Site',
        agents: ['Jett', 'Viper', 'Sova', 'Killjoy', 'Sage']
      },
      {
        title: 'Ex2 (Lockdown)',
        tag: 'Trava B-Long',
        agents: ['Jett', 'Viper', 'Sova', 'Killjoy', 'Chamber']
      },
      {
        title: 'Ex3 (Pressão & Utilitários)',
        tag: 'Gekko & KAY/O',
        agents: ['Jett', 'Viper', 'Gekko', 'KAY/O', 'Killjoy']
      }
    ]
  },
  {
    id: 'breeze',
    name: 'Breeze',
    isMeta: false,
    accentColor: '#00b4d8',
    splash: 'https://media.valorant-api.com/maps/2fb9a4fd-47b8-4e7d-a969-74b4046ebd53/splash.png',
    listViewIcon: 'https://media.valorant-api.com/maps/2fb9a4fd-47b8-4e7d-a969-74b4046ebd53/listviewicon.png',
    builds: [
      {
        title: 'Ex1 (Meta Longa Distância)',
        tag: 'Controle Amplo',
        agents: ['Jett', 'Viper', 'Sova', 'Cypher', 'KAY/O']
      },
      {
        title: 'Ex2 (Flashes & Espaço)',
        tag: 'Abertura Rápida',
        agents: ['Yoru', 'Viper', 'Sova', 'Cypher', 'Skye']
      },
      {
        title: 'Ex3 (Duplo Controlador)',
        tag: 'Viper + Harbor',
        agents: ['Jett', 'Viper', 'Harbor', 'Sova', 'Cypher']
      }
    ]
  },
  {
    id: 'fracture',
    name: 'Fracture',
    isMeta: false,
    accentColor: '#7b2cbf',
    splash: 'https://media.valorant-api.com/maps/b529448b-4d60-346e-e89e-00a4c527a405/splash.png',
    listViewIcon: 'https://media.valorant-api.com/maps/b529448b-4d60-346e-e89e-00a4c527a405/listviewicon.png',
    builds: [
      {
        title: 'Ex1 (Meta Agressivo)',
        tag: 'Pincer Attack A/B',
        agents: ['Raze', 'Breach', 'Brimstone', 'Fade', 'Cypher']
      },
      {
        title: 'Ex2 (Neon Rush)',
        tag: 'Velocidade & Stun',
        agents: ['Neon', 'Breach', 'Brimstone', 'Fade', 'Killjoy']
      },
      {
        title: 'Ex3 (Duplo Sentinela)',
        tag: 'Travamento Flancos',
        agents: ['Raze', 'Breach', 'Brimstone', 'Cypher', 'Killjoy']
      }
    ]
  },
  {
    id: 'pearl',
    name: 'Pearl',
    isMeta: false,
    accentColor: '#3a86ff',
    splash: 'https://media.valorant-api.com/maps/fd267378-4d1d-484f-ff52-77821ed10dc2/splash.png',
    listViewIcon: 'https://media.valorant-api.com/maps/fd267378-4d1d-484f-ff52-77821ed10dc2/listviewicon.png',
    builds: [
      {
        title: 'Ex1 (Meta B-Long)',
        tag: 'Controle B-Long',
        agents: ['Jett', 'Astra', 'Fade', 'Killjoy', 'KAY/O']
      },
      {
        title: 'Ex2 (Domínio de Espaço)',
        tag: 'Astra + Viper',
        agents: ['Jett', 'Astra', 'Viper', 'Fade', 'Killjoy']
      },
      {
        title: 'Ex3 (Pressão no Meio)',
        tag: 'Iniciador Duplo',
        agents: ['Jett', 'Astra', 'Skye', 'Fade', 'Killjoy']
      }
    ]
  }
];

// Dados padrão iniciais para as jogadoras (5 Titulares + 4 Reservas com 3 Flex cada)
const DEFAULT_PLAYERS = [
  { id: 1, name: 'Player 1', titular: '', reserva: '', kd: '', rendimento: '', mostPlayed: [] },
  { id: 2, name: 'Player 2', titular: '', reserva: '', kd: '', rendimento: '', mostPlayed: [] },
  { id: 3, name: 'Player 3', titular: '', reserva: '', kd: '', rendimento: '', mostPlayed: [] },
  { id: 4, name: 'Player 4', titular: '', reserva: '', kd: '', rendimento: '', mostPlayed: [] },
  { id: 5, name: 'Player 5', titular: '', reserva: '', kd: '', rendimento: '', mostPlayed: [] },
  { id: 6, name: 'Reserva 1', isSub: true, flex1: '', flex2: '', flex3: '', kd: '', rendimento: '', mostPlayed: [] },
  { id: 7, name: 'Reserva 2', isSub: true, flex1: '', flex2: '', flex3: '', kd: '', rendimento: '', mostPlayed: [] },
  { id: 8, name: 'Reserva 3', isSub: true, flex1: '', flex2: '', flex3: '', kd: '', rendimento: '', mostPlayed: [] },
  { id: 9, name: 'Reserva 4', isSub: true, flex1: '', flex2: '', flex3: '', kd: '', rendimento: '', mostPlayed: [] }
];

// Banco padrão de jogadoras cadastradas para Autocomplete rápido
const DEFAULT_ROSTER = [
  {
    name: 'c0rt3z#0303',
    kd: '1.09',
    mostPlayed: ['Killjoy', 'Cypher', 'Omen'],
    role: 'Sentinela',
    overallRating: '7.5',
    mapRatings: {
      fracture: '10.0',
      ascent: '9.0',
      lotus: '8.3',
      sunset: '6.9',
      icebox: '5.4',
      haven: '5.3',
      breeze: '4.1',
      split: '7.5',
      bind: '7.5',
      pearl: '7.5',
      abyss: '7.5'
    }
  },
  { name: 'Julia#BR1', kd: '1.25', mostPlayed: ['Sova', 'Fade', 'Gekko'], role: 'Iniciadora', overallRating: '8.1' },
  { name: 'Bruna#BR1', kd: '1.10', mostPlayed: ['Omen', 'Astra', 'Viper'], role: 'Controladora', overallRating: '7.3' },
  { name: 'Mari#BR1', kd: '1.05', mostPlayed: ['Killjoy', 'Cypher', 'Deadlock'], role: 'Sentinela', overallRating: '7.0' },
  { name: 'Camila#BR1', kd: '1.12', mostPlayed: ['Raze', 'Jett', 'Neon'], role: 'Duelista', overallRating: '7.6' },
  { name: 'Bia#BR1', kd: '1.08', mostPlayed: ['Skye', 'Breach', 'KAY/O'], role: 'Flex', overallRating: '7.2' },
  { name: 'Carol#BR1', kd: '1.14', mostPlayed: ['Clove', 'Brimstone', 'Iso'], role: 'Flex', overallRating: '7.8' },
  { name: 'TejoMaster#BR1', kd: '1.21', mostPlayed: ['Tejo', 'Sova', 'Gekko'], role: 'Iniciador', overallRating: '8.0' },
  { name: 'MiksSonic#BR1', kd: '1.17', mostPlayed: ['Miks', 'Omen', 'Clove'], role: 'Controlador', overallRating: '7.7' },
  { name: 'VetoWall#BR1', kd: '1.10', mostPlayed: ['Veto', 'Killjoy', 'Vyse'], role: 'Sentinela', overallRating: '7.3' },
  { name: 'WaylayRush#BR1', kd: '1.24', mostPlayed: ['Waylay', 'Jett', 'Reyna'], role: 'Duelista', overallRating: '8.2' }
];

// Compatibilidade Universal (Global Window)
window.ValorantData = {
  AGENTS,
  ALL_AGENTS,
  MAPS_DATA,
  DEFAULT_PLAYERS,
  DEFAULT_ROSTER,
  getAgent,
  getAgentColor,
  getAgentRole,
  getAgentIcon
};
})();
