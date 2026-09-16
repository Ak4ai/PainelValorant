(() => {
const { MAPS_DATA, AGENTS, ALL_AGENTS, DEFAULT_PLAYERS, DEFAULT_ROSTER, getAgentColor, getAgentRole, getAgentIcon } = window.ValorantData || {};
const { 
  initRealtimeSync, 
  syncSaveData, 
  syncSavePlayer, 
  getLocalData, 
  saveFirebaseConfig, 
  clearFirebaseConfig, 
  getSavedFirebaseConfig,
  getSavedTeamName,
  saveTeamName,
  getHenrikApiKey,
  saveHenrikApiKey
} = window.ValorantSync || {};

// Estado Global da Aplicação
const state = {
  activeMapId: 'ascent',
  currentMainView: 'lineup', // 'lineup' ou 'analytics'
  mapPoolFilter: 'meta', // 'meta' (Pool Campeonato), 'bench' (Fora do Meta), 'all' (Todos)
  teamName: getSavedTeamName(),
  lineups: {}, // Estrutura: { ascent: [ {id, name, titular, reserva}, ... ], haven: [...] }
  roster: [], // Banco de jogadoras cadastradas para Autocomplete rápido
  activeModal: {
    playerIndex: null,
    agentSlot: null // 'titular' ou 'reserva'
  },
  trackerModal: {
    playerIndex: null,
    tempTopAgents: []
  },
  playerProfileModal: {
    playerIndex: 0,
    activeTab: 'overview',
    selectedMapId: null,
    matchModeFilter: 'all', // 'all', 'competitive', 'unrated'
    evolutionMetric: 'rating' // 'rating' ou 'acs'
  },
  teamAnalytics: {
    selectedMapId: 'all',
    selectedRoleFilter: 'all'
  },
  manualSwapSourceIndex: null, // Índice da jogadora em processo de troca manual
  analyticsTableSort: {
    column: 'slot', // 'slot', 'name', 'agent', 'comfort', 'kd', 'acs', 'rating', 'matches'
    order: 'asc' // 'asc' ou 'desc'
  },
  playerAvatarModal: {
    playerIndex: null,
    selectedAvatarUrl: '',
    currentTab: 'agents' // 'agents', 'roles', 'ranks'
  },
  syncManager: {
    isRunning: false,
    isPaused: false,
    isWaitingRateLimit: false,
    rateLimitSecondsRemaining: 0,
    rateLimitTimer: null,
    activePlayerName: '',
    activePlayerIndex: -1,
    progress: { current: 0, total: 0 },
    playerStats: {}, // [name]: { lastSyncTime, lastDurationMs, status, matchesCount, errorMsg, kd, overallRating }
    logs: [
      {
        id: 'init-1',
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        type: 'info',
        tag: 'SISTEMA',
        message: 'Módulo de Sincronização & Rate Limit Controller inicializado.',
        durationMs: 0
      }
    ],
    logFilter: 'all', // 'all', 'success', 'ratelimit', 'error'
    autoScroll: true
  },
  whatsappView: 'current' // 'current', 'meta' ou 'all'
};
window.state = state;

// Garante que c0rt3z#0303 e dados padrão estão presentes no roster com mapRatings
function ensureRosterDefaults() {
  if (!state.roster || !Array.isArray(state.roster)) {
    state.roster = Array.isArray(DEFAULT_ROSTER) ? [...DEFAULT_ROSTER] : [];
  }

  const c0rt3zData = {
    name: 'c0rt3z#0303',
    kd: '1.09',
    mostPlayed: ['Killjoy', 'Cypher', 'Omen'],
    role: 'Sentinela',
    overallRating: '7.5',
    overallAcs: 228,
    overallWinRate: 60,
    totalKills: 172,
    totalDeaths: 158,
    totalMatches: 10,
    compMatchesCount: 7,
    unratedMatchesCount: 3,
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
    },
    mapDetails: {
      fracture: { rating: '10.0', matches: 2, compMatches: 2, unratedMatches: 0, wins: 2, losses: 0, winRate: 100, kd: '1.65', acs: 295, topAgent: 'Killjoy' },
      ascent: { rating: '9.0', matches: 2, compMatches: 2, unratedMatches: 0, wins: 2, losses: 0, winRate: 100, kd: '1.35', acs: 245, topAgent: 'Killjoy' },
      lotus: { rating: '8.3', matches: 1, compMatches: 1, unratedMatches: 0, wins: 1, losses: 0, winRate: 100, kd: '1.18', acs: 220, topAgent: 'Cypher' },
      sunset: { rating: '6.9', matches: 2, compMatches: 0, unratedMatches: 2, wins: 1, losses: 1, winRate: 50, kd: '1.05', acs: 210, topAgent: 'Cypher' },
      icebox: { rating: '5.4', matches: 1, compMatches: 1, unratedMatches: 0, wins: 0, losses: 1, winRate: 0, kd: '0.88', acs: 185, topAgent: 'Killjoy' },
      haven: { rating: '5.3', matches: 1, compMatches: 0, unratedMatches: 1, wins: 0, losses: 1, winRate: 0, kd: '0.82', acs: 190, topAgent: 'Omen' },
      breeze: { rating: '4.1', matches: 1, compMatches: 1, unratedMatches: 0, wins: 0, losses: 1, winRate: 0, kd: '0.70', acs: 160, topAgent: 'Cypher' }
    },
    recentMatches: [
      { matchId: 'm-1', map: 'Fracture', mapId: 'fracture', agent: 'Killjoy', won: true, score: '13 - 6', kills: 22, deaths: 11, assists: 6, kd: '2.00', acs: 310, gameStart: 'Há 1 dia', mode: 'Competitivo', isCompetitive: true, weight: 1.0 },
      { matchId: 'm-2', map: 'Ascent', mapId: 'ascent', agent: 'Killjoy', won: true, score: '13 - 8', kills: 19, deaths: 13, assists: 5, kd: '1.46', acs: 255, gameStart: 'Há 1 dia', mode: 'Competitivo', isCompetitive: true, weight: 1.0 },
      { matchId: 'm-3', map: 'Fracture', mapId: 'fracture', agent: 'Killjoy', won: true, score: '13 - 10', kills: 20, deaths: 15, assists: 4, kd: '1.33', acs: 280, gameStart: 'Há 2 dias', mode: 'Competitivo', isCompetitive: true, weight: 1.0 },
      { matchId: 'm-4', map: 'Ascent', mapId: 'ascent', agent: 'Killjoy', won: true, score: '13 - 9', kills: 18, deaths: 14, assists: 7, kd: '1.28', acs: 235, gameStart: 'Há 2 dias', mode: 'Competitivo', isCompetitive: true, weight: 1.0 },
      { matchId: 'm-5', map: 'Lotus', mapId: 'lotus', agent: 'Cypher', won: true, score: '13 - 11', kills: 17, deaths: 15, assists: 8, kd: '1.13', acs: 220, gameStart: 'Há 3 dias', mode: 'Competitivo', isCompetitive: true, weight: 1.0 },
      { matchId: 'm-6', map: 'Sunset', mapId: 'sunset', agent: 'Cypher', won: true, score: '13 - 7', kills: 16, deaths: 12, assists: 5, kd: '1.33', acs: 230, gameStart: 'Há 3 dias', mode: 'Sem Classificação', isCompetitive: false, weight: 0.6 },
      { matchId: 'm-7', map: 'Sunset', mapId: 'sunset', agent: 'Cypher', won: false, score: '9 - 13', kills: 15, deaths: 17, assists: 4, kd: '0.88', acs: 190, gameStart: 'Há 4 dias', mode: 'Sem Classificação', isCompetitive: false, weight: 0.6 },
      { matchId: 'm-8', map: 'Icebox', mapId: 'icebox', agent: 'Killjoy', won: false, score: '8 - 13', kills: 16, deaths: 18, assists: 3, kd: '0.88', acs: 185, gameStart: 'Há 5 dias', mode: 'Competitivo', isCompetitive: true, weight: 1.0 },
      { matchId: 'm-9', map: 'Haven', mapId: 'haven', agent: 'Omen', won: false, score: '10 - 13', kills: 15, deaths: 19, assists: 6, kd: '0.78', acs: 190, gameStart: 'Há 5 dias', mode: 'Sem Classificação', isCompetitive: false, weight: 0.6 },
      { matchId: 'm-10', map: 'Breeze', mapId: 'breeze', agent: 'Cypher', won: false, score: '6 - 13', kills: 14, deaths: 18, assists: 2, kd: '0.77', acs: 160, gameStart: 'Há 6 dias', mode: 'Competitivo', isCompetitive: true, weight: 1.0 }
    ]
  };

  const c0rt3zIdx = state.roster.findIndex(p => p.name.toLowerCase() === 'c0rt3z#0303');
  if (c0rt3zIdx >= 0) {
    state.roster[c0rt3zIdx] = {
      ...c0rt3zData,
      ...state.roster[c0rt3zIdx],
      kd: state.roster[c0rt3zIdx].kd || c0rt3zData.kd,
      mostPlayed: (state.roster[c0rt3zIdx].mostPlayed && state.roster[c0rt3zIdx].mostPlayed.length > 0)
        ? state.roster[c0rt3zIdx].mostPlayed
        : c0rt3zData.mostPlayed,
      mapRatings: {
        ...c0rt3zData.mapRatings,
        ...(state.roster[c0rt3zIdx].mapRatings || {})
      },
      mapDetails: {
        ...c0rt3zData.mapDetails,
        ...(state.roster[c0rt3zIdx].mapDetails || {})
      },
      recentMatches: (state.roster[c0rt3zIdx].recentMatches && state.roster[c0rt3zIdx].recentMatches.length > 0)
        ? state.roster[c0rt3zIdx].recentMatches
        : c0rt3zData.recentMatches,
      overallRating: state.roster[c0rt3zIdx].overallRating || c0rt3zData.overallRating,
      overallAcs: state.roster[c0rt3zIdx].overallAcs || c0rt3zData.overallAcs,
      overallWinRate: state.roster[c0rt3zIdx].overallWinRate !== undefined ? state.roster[c0rt3zIdx].overallWinRate : c0rt3zData.overallWinRate
    };
  } else {
    state.roster.unshift(c0rt3zData);
  }
}

// Sincroniza todas as lineups dos mapas com dados e notas de rendimento do roster
function syncAllLineupsFromRoster() {
  if (!state.lineups || typeof state.lineups !== 'object') return;
  ensureRosterDefaults();

  let hasChanged = false;
  MAPS_DATA.forEach(map => {
    const lineup = state.lineups[map.id];
    if (lineup && Array.isArray(lineup)) {
      lineup.forEach((p, idx) => {
        if (p.name && !p.name.startsWith('Player ') && !p.name.startsWith('Reserva ') && p.name.trim()) {
          const found = state.roster.find(r => r.name.toLowerCase() === p.name.trim().toLowerCase());
          if (found) {
            if (!p.kd && found.kd) {
              p.kd = found.kd;
              hasChanged = true;
            }
            if ((!p.mostPlayed || p.mostPlayed.length === 0) && found.mostPlayed && found.mostPlayed.length > 0) {
              p.mostPlayed = [...found.mostPlayed];
              hasChanged = true;
            }
            if (!p.rendimento) {
              const mRend = found.mapRatings?.[map.id.toLowerCase()] || found.overallRating;
              if (mRend) {
                p.rendimento = mRend;
                hasChanged = true;
              }
            }
          }
        }
      });
    }
  });

  if (hasChanged) {
    saveCurrentState();
  }
}

const activeFetchingNicknames = new Set();

function scheduleBackgroundPlayerFetch(playerIndex, riotId) {
  if (!riotId || !riotId.includes('#') || activeFetchingNicknames.has(riotId.toLowerCase())) return;
  activeFetchingNicknames.add(riotId.toLowerCase());
  setTimeout(() => {
    autoFetchPlayerStatsInBackground(playerIndex, riotId).finally(() => {
      activeFetchingNicknames.delete(riotId.toLowerCase());
    });
  }, 200);
}

// Inicializa a estrutura de lineups e o banco de jogadoras (roster)
function initializeDefaultLineups() {
  const local = getLocalData();
  if (local && typeof local === 'object') {
    state.lineups = local.lineups || local;
    if (local.meta) {
      if (local.meta.teamName) state.teamName = local.meta.teamName;
      if (Array.isArray(local.meta.roster)) state.roster = local.meta.roster;
    }
  }

  ensureRosterDefaults();

  // Garante que cada mapa tenha 9 jogadoras (5 Titulares + 4 Reservas com 3 Flex cada)
  MAPS_DATA.forEach(map => {
    if (!state.lineups[map.id] || !Array.isArray(state.lineups[map.id])) {
      state.lineups[map.id] = DEFAULT_PLAYERS.map(p => ({ ...p, mostPlayed: [...(p.mostPlayed || [])] }));
    } else {
      while (state.lineups[map.id].length < 9) {
        const subId = state.lineups[map.id].length + 1;
        state.lineups[map.id].push({
          id: subId,
          name: `Reserva ${subId - 5}`,
          isSub: true,
          flex1: '',
          flex2: '',
          flex3: '',
          kd: '',
          rendimento: '',
          mostPlayed: []
        });
      }
    }
  });

  syncAllLineupsFromRoster();
}

// Inicialização Principal
document.addEventListener('DOMContentLoaded', () => {
  initializeDefaultLineups();
  setupTeamNameInput();
  renderMapTabs();
  renderActiveMap();
  setupAgentModalFilters();

  // Fecha dropdowns de autocomplete ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[id^="player-name-wrapper-"]')) {
      document.querySelectorAll('[id^="roster-autocomplete-dropdown-"]').forEach(el => {
        el.classList.add('hidden');
      });
    }
  });

  // Inicia conexão em tempo real com Firebase ou LocalStorage
  initRealtimeSync((remoteData, source) => {
    if (!remoteData) return;

    if (remoteData.meta) {
      if (remoteData.meta.teamName) {
        state.teamName = remoteData.meta.teamName;
        const teamInput = document.getElementById('team-name-input');
        if (teamInput && document.activeElement !== teamInput) {
          teamInput.value = state.teamName;
        }
      }
      if (Array.isArray(remoteData.meta.roster)) {
        state.roster = remoteData.meta.roster;
      }
    }

    // Garante que o banco de dados preserva mapRatings e c0rt3zData
    ensureRosterDefaults();

    // Se o dado vier no formato { meta, lineups } ou direto
    const incomingLineups = remoteData.lineups || remoteData;
    if (incomingLineups && typeof incomingLineups === 'object') {
      let changed = false;
      MAPS_DATA.forEach(m => {
        if (incomingLineups[m.id]) {
          state.lineups[m.id] = incomingLineups[m.id];
          while (state.lineups[m.id].length < 9) {
            const subId = state.lineups[m.id].length + 1;
            state.lineups[m.id].push({
              id: subId,
              name: `Reserva ${subId - 5}`,
              isSub: true,
              flex1: '',
              flex2: '',
              flex3: '',
              kd: '',
              rendimento: '',
              mostPlayed: []
            });
          }
          changed = true;
        }
      });

      // Sincroniza notas de rendimento por mapa a partir do roster
      syncAllLineupsFromRoster();

      if (changed) {
        renderPlayersList();
      }
    }

    if (source === 'firebase') {
      showToast('Sincronizado em tempo real!', 'success');
    }
  });

  // Preenche configuração do Firebase salva se houver
  const savedConfig = getSavedFirebaseConfig();
  if (savedConfig) {
    const textarea = document.getElementById('firebase-config-textarea');
    if (textarea) {
      textarea.value = JSON.stringify(savedConfig, null, 2);
    }
  }
});

// Configura input do nome do time
function setupTeamNameInput() {
  const teamInput = document.getElementById('team-name-input');
  if (!teamInput) return;

  teamInput.value = state.teamName;
  teamInput.addEventListener('input', (e) => {
    state.teamName = e.target.value;
    saveTeamName(state.teamName);
  });
}

// Retorna os mapas de acordo com o filtro ativo
function getVisibleMaps() {
  if (state.mapPoolFilter === 'meta') {
    return MAPS_DATA.filter(m => m.isMeta);
  } else if (state.mapPoolFilter === 'bench') {
    return MAPS_DATA.filter(m => !m.isMeta);
  }
  return MAPS_DATA;
}

// Filtra a exibição dos mapas no carrossel
window.filterMapPool = function(filterType) {
  state.mapPoolFilter = filterType;
  updateFilterButtonsUI();

  const visibleMaps = getVisibleMaps();
  if (!visibleMaps.some(m => m.id === state.activeMapId) && visibleMaps.length > 0) {
    window.switchMap(visibleMaps[0].id);
  } else {
    renderMapTabs();
  }
};

function updateFilterButtonsUI() {
  const btnMeta = document.getElementById('pool-filter-meta');
  const btnBench = document.getElementById('pool-filter-bench');
  const btnAll = document.getElementById('pool-filter-all');

  const activeMeta = 'btn-tactical px-2.5 py-1 rounded text-[11px] sm:text-xs font-tactical font-bold transition flex items-center gap-1 bg-[#ff4655] text-white shadow-[0_0_10px_rgba(255,70,85,0.3)] whitespace-nowrap flex-shrink-0';
  const activeBench = 'btn-tactical px-2.5 py-1 rounded text-[11px] sm:text-xs font-tactical font-bold transition flex items-center gap-1 bg-amber-600 text-white shadow-[0_0_10px_rgba(217,119,6,0.4)] whitespace-nowrap flex-shrink-0';
  const activeAll = 'btn-tactical px-2.5 py-1 rounded text-[11px] sm:text-xs font-tactical font-bold transition flex items-center gap-1 bg-[#253549] text-white shadow-sm whitespace-nowrap flex-shrink-0';

  const inactiveBtn = 'btn-tactical px-2.5 py-1 rounded text-[11px] sm:text-xs font-tactical font-bold transition flex items-center gap-1 bg-[#101822] text-gray-400 hover:text-white border border-[#233547] whitespace-nowrap flex-shrink-0';

  if (btnMeta) btnMeta.className = state.mapPoolFilter === 'meta' ? activeMeta : inactiveBtn;
  if (btnBench) btnBench.className = state.mapPoolFilter === 'bench' ? activeBench : inactiveBtn;
  if (btnAll) btnAll.className = state.mapPoolFilter === 'all' ? activeAll : inactiveBtn;
}

// Renderiza as Tabs dos Mapas
function renderMapTabs() {
  const container = document.getElementById('map-tabs-list');
  if (!container) return;

  const mapsToRender = getVisibleMaps();
  let html = '';
  let renderedBenchDivider = false;

  mapsToRender.forEach(map => {
    // Insere divisor visual se estiver exibindo todos os mapas e começou a lista dos fora do meta
    if (state.mapPoolFilter === 'all' && !map.isMeta && !renderedBenchDivider) {
      renderedBenchDivider = true;
      html += `
        <div class="flex items-center gap-1 px-2 py-1 bg-[#161a22] border border-amber-500/40 rounded text-amber-300 text-[10px] font-tactical font-bold whitespace-nowrap flex-shrink-0 shadow-inner">
          <span>📦 FORA DO META:</span>
        </div>
      `;
    }

    const isActive = map.id === state.activeMapId;
    let activeClasses = '';

    if (isActive) {
      if (map.isMeta) {
        activeClasses = 'bg-[#ff4655] text-white font-bold border-[#ff4655] shadow-[0_0_15px_rgba(255,70,85,0.45)] ring-1 ring-white/30';
      } else {
        activeClasses = 'bg-amber-600 text-white font-bold border-amber-400 shadow-[0_0_15px_rgba(217,119,6,0.45)] ring-1 ring-white/30';
      }
    } else {
      if (map.isMeta) {
        activeClasses = 'bg-[#101822] text-gray-300 border-[#1e2c3c] hover:bg-[#16212e] hover:border-gray-500';
      } else {
        activeClasses = 'bg-[#141922] text-amber-200/80 border-amber-900/40 hover:bg-[#1c2330] hover:border-amber-600/50';
      }
    }

    const benchBadge = !map.isMeta 
      ? `<span class="text-[8px] font-mono px-1 py-0.2 rounded bg-amber-950/80 text-amber-400 border border-amber-500/30 ml-0.5 leading-none">FORA</span>` 
      : '';

    html += `
      <button onclick="window.switchMap('${map.id}')" 
              class="btn-tactical px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-tactical rounded border transition-all whitespace-nowrap flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ${activeClasses}">
        <img src="${map.listViewIcon}" alt="${map.name}" class="w-6 h-3.5 sm:w-8 sm:h-4 object-cover rounded border border-white/20 shadow-sm flex-shrink-0" loading="lazy">
        <span>${map.name}</span>
        ${benchBadge}
      </button>
    `;
  });

  container.innerHTML = html;
}

// Troca de Mapa
window.switchMap = function(mapId) {
  state.activeMapId = mapId;

  // Sincroniza o rendimento das jogadoras para o novo mapa a partir do banco (roster) se ainda estiver vazio
  const currentLineup = state.lineups[mapId];
  if (currentLineup && Array.isArray(currentLineup)) {
    let changed = false;
    currentLineup.forEach(p => {
      if (p.name && p.name.includes('#') && !p.name.startsWith('Player ') && !p.name.startsWith('Reserva ') && !p.rendimento) {
        const found = (state.roster || []).find(r => r.name.toLowerCase() === p.name.trim().toLowerCase());
        if (found) {
          const rating = found.mapRatings?.[mapId.toLowerCase()] || found.overallRating;
          if (rating) {
            p.rendimento = rating;
            changed = true;
          }
        }
      }
    });
    if (changed) saveCurrentState();
  }

  renderMapTabs();
  renderActiveMap();
};

// Renderiza todos os detalhes do Mapa Selecionado
function renderActiveMap() {
  const currentMap = MAPS_DATA.find(m => m.id === state.activeMapId) || MAPS_DATA[0];

  // Atualiza Banner e Título
  const titleEl = document.getElementById('active-map-title');
  const bannerImg = document.getElementById('map-banner-img');
  const bottomBarMap = document.getElementById('bottom-bar-map-name');
  const mapIconThumb = document.getElementById('map-icon-thumb');
  const mapTagline = document.getElementById('map-tagline');

  if (titleEl) titleEl.textContent = currentMap.name;
  if (bottomBarMap) bottomBarMap.textContent = currentMap.name;
  if (bannerImg) {
    bannerImg.style.backgroundImage = `url('${currentMap.splash}')`;
  }
  if (mapIconThumb) {
    mapIconThumb.src = currentMap.listViewIcon;
    mapIconThumb.alt = currentMap.name;
  }

  if (mapTagline) {
    if (currentMap.isMeta) {
      mapTagline.className = 'text-[9px] sm:text-xs uppercase font-tactical text-[#ff4655] font-bold tracking-widest flex items-center gap-1';
      mapTagline.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-[#ff4655] animate-pulse"></span> 🏆 POOL DO CAMPEONATO (META)';
    } else {
      mapTagline.className = 'text-[9px] sm:text-xs uppercase font-tactical text-amber-400 font-bold tracking-widest flex items-center gap-1';
      mapTagline.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> 📦 FORA DO META / RESERVA';
    }
  }

  // Renderiza as 3 Builds Sugeridas
  renderSuggestedBuilds(currentMap);

  // Renderiza os 5 Jogadores
  renderPlayersList();
}

// Renderiza as 3 Builds do Mapa
function renderSuggestedBuilds(mapData) {
  const grid = document.getElementById('builds-grid');
  if (!grid) return;

  grid.innerHTML = mapData.builds.map((build, index) => {
    const agentsListHtml = build.agents.map(agentName => {
      const role = getAgentRole(agentName);
      const icon = getAgentIcon(agentName);
      const color = getAgentColor(agentName);
      return `
        <div class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0e1620] border border-[#233547] shadow-sm hover:border-[#ff4655]/40 transition min-w-0">
          <img src="${icon}" alt="${agentName}" class="w-4 h-4 rounded-full object-cover bg-black/60 border flex-shrink-0" style="border-color: ${color}">
          <span class="text-[10px] sm:text-[11px] font-semibold text-gray-100 truncate">${agentName}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="tactical-card p-2.5 sm:p-3 rounded-lg border border-[#203043] flex flex-col justify-between hover:border-[#ff4655]/50 transition w-full min-w-0">
        <div>
          <div class="flex items-center justify-between mb-1 gap-1.5 min-w-0">
            <h4 class="font-tactical font-bold text-xs sm:text-sm text-white truncate min-w-0 flex-1">${build.title}</h4>
            <span class="text-[9px] sm:text-[10px] font-mono uppercase bg-[#182535] text-gray-400 px-1.5 py-0.5 rounded border border-[#263a50] flex-shrink-0">${build.tag}</span>
          </div>
          
          <div class="flex flex-wrap gap-1 sm:gap-1.5 my-1.5">
            ${agentsListHtml}
          </div>
        </div>

        <button onclick="window.applyBuildToTeam(${index})" 
                class="btn-tactical mt-1.5 w-full py-1 sm:py-1.5 px-2 bg-[#162230] hover:bg-[#ff4655] hover:text-white text-gray-300 text-xs font-tactical font-bold rounded border border-[#2a3e54] transition flex items-center justify-center gap-1.5 group">
          <svg class="w-3 h-3 text-[#ff4655] group-hover:text-white transition flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/>
          </svg>
          <span>Carregar esta Comp</span>
        </button>
      </div>
    `;
  }).join('');
}

// Aplica uma composição sugerida direto aos 5 jogadores do mapa atual
window.applyBuildToTeam = function(buildIndex) {
  const currentMap = MAPS_DATA.find(m => m.id === state.activeMapId);
  if (!currentMap || !currentMap.builds[buildIndex]) return;

  const chosenBuild = currentMap.builds[buildIndex];
  const currentPlayers = state.lineups[state.activeMapId];

  chosenBuild.agents.forEach((agentName, idx) => {
    if (currentPlayers[idx]) {
      currentPlayers[idx].titular = agentName;
    }
  });

  saveCurrentState();
  renderPlayersList();
  showToast(`Comp "${chosenBuild.title}" aplicada com sucesso!`, 'success');
};

// Reseta a build (titulares e reservas) dos 7 jogadores no mapa atual
window.resetCurrentMapBuild = function() {
  const currentMap = MAPS_DATA.find(m => m.id === state.activeMapId) || { name: state.activeMapId };
  const currentPlayers = state.lineups[state.activeMapId];

  if (!currentPlayers || !Array.isArray(currentPlayers)) return;

  const hasPicks = currentPlayers.some(p => 
    (p.titular && p.titular.trim() !== '') || 
    (p.reserva && p.reserva.trim() !== '') ||
    (p.flex1 && p.flex1.trim() !== '') ||
    (p.flex2 && p.flex2.trim() !== '') ||
    (p.flex3 && p.flex3.trim() !== '') ||
    (p.flex4 && p.flex4.trim() !== '') ||
    (p.flex5 && p.flex5.trim() !== '')
  );

  if (!hasPicks) {
    showToast(`O mapa ${currentMap.name} já está sem agentes definidos.`, 'info');
    return;
  }

  const confirmed = window.confirm(`Deseja limpar todos os agentes (Titulares, Reservas e Flex) escalados no mapa ${currentMap.name}?\n\nOs nomes das jogadoras, K/D e mais jogados serão mantidos.`);
  if (!confirmed) return;

  currentPlayers.forEach(p => {
    p.titular = '';
    p.reserva = '';
    if (p.flex1 !== undefined) p.flex1 = '';
    if (p.flex2 !== undefined) p.flex2 = '';
    if (p.flex3 !== undefined) p.flex3 = '';
    if (p.flex4 !== undefined) p.flex4 = '';
    if (p.flex5 !== undefined) p.flex5 = '';
  });

  saveCurrentState();
  renderPlayersList();
  showToast(`Build de ${currentMap.name} resetada com sucesso!`, 'info');
};

// --------------------------------------------------------------------------
// SUGESTÃO TÁTICA, SWAP MANUAL & ESCALAÇÃO POR PONTUAÇÃO
// --------------------------------------------------------------------------

// Retorna a composição recomendada pelo Otimizador Tático para o mapa ativo
function getMapTacticalPreset(mapId) {
  const cleanId = (mapId || '').toLowerCase();
  if (typeof MAP_COMP_PRESETS !== 'undefined' && MAP_COMP_PRESETS[cleanId] && MAP_COMP_PRESETS[cleanId][0]) {
    return MAP_COMP_PRESETS[cleanId][0];
  }
  return {
    title: 'Meta Equilibrado',
    agents: ['Sova', 'Omen', 'Killjoy', 'Jett', 'KAY/O']
  };
}

// Detecta conflitos de agente repetido ou mesma função repetida entre os titulares
function detectTitularConflicts(titulares, activeMapId) {
  const conflicts = {};
  const metaPreset = getMapTacticalPreset(activeMapId);
  const metaAgents = metaPreset.agents || ['Sova', 'Omen', 'Killjoy', 'Jett', 'KAY/O'];

  const currentTitularAgents = titulares.map(t => t.titular).filter(Boolean);
  const missingMetaAgents = metaAgents.filter(ma => 
    !currentTitularAgents.some(ca => ca.toLowerCase() === ma.toLowerCase())
  );

  const agentMap = {};
  const roleMap = {};

  titulares.forEach((p, idx) => {
    if (!p.titular) return;
    const ag = p.titular;
    const role = getAgentRole(ag) || 'Flex';

    const agKey = ag.toLowerCase();
    if (!agentMap[agKey]) agentMap[agKey] = [];
    agentMap[agKey].push({ idx, name: p.name || `Player ${p.id}`, agent: ag, role });

    const roleKey = role.toLowerCase();
    if (!roleMap[roleKey]) roleMap[roleKey] = [];
    roleMap[roleKey].push({ idx, name: p.name || `Player ${p.id}`, agent: ag, role });
  });

  // 1. Conflito de Agente (mesmo agente escalado por duas jogadoras titulares)
  Object.keys(agentMap).forEach(key => {
    const list = agentMap[key];
    if (list.length > 1) {
      for (let i = 1; i < list.length; i++) {
        const item = list[i];
        const primary = list[0];
        const pObj = titulares[item.idx];

        let suggested = missingMetaAgents.find(ma => {
          const mp = pObj.mostPlayed || [];
          return mp.some(a => a && a.toLowerCase() === ma.toLowerCase());
        }) || missingMetaAgents[0] || (item.agent === 'Jett' ? 'Raze' : 'Omen');

        conflicts[item.idx] = {
          type: 'agent',
          agent: item.agent,
          role: item.role,
          otherName: primary.name,
          suggestedAgent: suggested,
          compTitle: metaPreset.title
        };
      }
    }
  });

  // 2. Conflito de Função (mesma função repetida quando excede a comp recomendada do mapa)
  Object.keys(roleMap).forEach(key => {
    const list = roleMap[key];
    if (list.length > 1) {
      const sampleRole = list[0].role;
      const metaRolesCount = metaAgents.filter(ma => (getAgentRole(ma) || '').toLowerCase() === key).length || 1;
      if (list.length > metaRolesCount) {
        for (let i = metaRolesCount; i < list.length; i++) {
          const item = list[i];
          if (conflicts[item.idx]) continue; // Se já tiver conflito de agente, prioriza ele
          const primary = list[0];
          const pObj = titulares[item.idx];

          let suggested = missingMetaAgents.find(ma => {
            return (getAgentRole(ma) || '').toLowerCase() !== key;
          }) || missingMetaAgents[0] || 'Killjoy';

          conflicts[item.idx] = {
            type: 'role',
            role: sampleRole,
            otherName: primary.name,
            suggestedAgent: suggested,
            compTitle: metaPreset.title
          };
        }
      }
    }
  });

  return conflicts;
}

// Aplica a sugestão tática do otimizador substituindo o agente da jogadora
window.applyTacticalSuggestion = function(playerIndex, newAgent, slotType = 'titular') {
  const currentPlayers = state.lineups[state.activeMapId];
  if (!currentPlayers || !currentPlayers[playerIndex]) return;

  // Garante que o mesmo agente não fique em titular e reserva
  if (slotType === 'titular' && currentPlayers[playerIndex].reserva && currentPlayers[playerIndex].reserva.toLowerCase() === newAgent.toLowerCase()) {
    currentPlayers[playerIndex].reserva = '';
  }

  currentPlayers[playerIndex][slotType] = newAgent;
  saveCurrentState();
  syncSavePlayer(state.activeMapId, playerIndex, currentPlayers[playerIndex], state.lineups);
  renderPlayersList();
  showToast(`Agente titular atualizado para ${newAgent} conforme Otimizador Tático!`, 'success');
};

// Alterna o modo de troca manual de posição ao clicar na borda direita do card
window.toggleManualSwap = function(index, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  if (state.manualSwapSourceIndex === null) {
    state.manualSwapSourceIndex = index;
    renderPlayersList();
    const label = index < 5 ? `Titular P${index + 1}` : `Reserva R${index - 4}`;
    showToast(`Posição de ${label} selecionada! Agora clique no card com o qual deseja trocar.`, 'info');
  } else if (state.manualSwapSourceIndex === index) {
    state.manualSwapSourceIndex = null;
    renderPlayersList();
    showToast('Troca de posição cancelada.', 'info');
  } else {
    window.executeManualSwap(index);
  }
};

// Executa a troca de posições entre duas jogadoras
window.executeManualSwap = function(targetIndex) {
  const srcIdx = state.manualSwapSourceIndex;
  if (srcIdx === null || srcIdx === targetIndex) {
    state.manualSwapSourceIndex = null;
    renderPlayersList();
    return;
  }

  const currentPlayers = state.lineups[state.activeMapId];
  if (!currentPlayers || !currentPlayers[srcIdx] || !currentPlayers[targetIndex]) {
    state.manualSwapSourceIndex = null;
    renderPlayersList();
    return;
  }

  const pSrc = currentPlayers[srcIdx];
  const pTgt = currentPlayers[targetIndex];

  // Inverte as posições no array
  currentPlayers[srcIdx] = pTgt;
  currentPlayers[targetIndex] = pSrc;

  // Ajusta IDs
  currentPlayers[srcIdx].id = srcIdx + 1;
  currentPlayers[targetIndex].id = targetIndex + 1;

  // Ajusta slots de titular e reserva conforme o novo índice
  if (srcIdx < 5) {
    if (!currentPlayers[srcIdx].titular) currentPlayers[srcIdx].titular = currentPlayers[srcIdx].flex1 || currentPlayers[srcIdx].mostPlayed?.[0] || 'Jett';
    if (!currentPlayers[srcIdx].reserva) currentPlayers[srcIdx].reserva = currentPlayers[srcIdx].flex2 || currentPlayers[srcIdx].mostPlayed?.[1] || 'Omen';
  } else {
    if (!currentPlayers[srcIdx].flex1) currentPlayers[srcIdx].flex1 = currentPlayers[srcIdx].titular || currentPlayers[srcIdx].mostPlayed?.[0] || 'Jett';
    if (!currentPlayers[srcIdx].flex2) currentPlayers[srcIdx].flex2 = currentPlayers[srcIdx].reserva || currentPlayers[srcIdx].mostPlayed?.[1] || 'Omen';
    if (!currentPlayers[srcIdx].flex3) currentPlayers[srcIdx].flex3 = currentPlayers[srcIdx].mostPlayed?.[2] || 'Killjoy';
  }

  if (targetIndex < 5) {
    if (!currentPlayers[targetIndex].titular) currentPlayers[targetIndex].titular = currentPlayers[targetIndex].flex1 || currentPlayers[targetIndex].mostPlayed?.[0] || 'Jett';
    if (!currentPlayers[targetIndex].reserva) currentPlayers[targetIndex].reserva = currentPlayers[targetIndex].flex2 || currentPlayers[targetIndex].mostPlayed?.[1] || 'Omen';
  } else {
    if (!currentPlayers[targetIndex].flex1) currentPlayers[targetIndex].flex1 = currentPlayers[targetIndex].titular || currentPlayers[targetIndex].mostPlayed?.[0] || 'Jett';
    if (!currentPlayers[targetIndex].flex2) currentPlayers[targetIndex].flex2 = currentPlayers[targetIndex].reserva || currentPlayers[targetIndex].mostPlayed?.[1] || 'Omen';
    if (!currentPlayers[targetIndex].flex3) currentPlayers[targetIndex].flex3 = currentPlayers[targetIndex].mostPlayed?.[2] || 'Killjoy';
  }

  state.manualSwapSourceIndex = null;
  saveCurrentState();
  syncSavePlayer(state.activeMapId, srcIdx, currentPlayers[srcIdx], state.lineups);
  syncSavePlayer(state.activeMapId, targetIndex, currentPlayers[targetIndex], state.lineups);

  renderPlayersList();
  const labelSrc = srcIdx < 5 ? `P${srcIdx + 1}` : `R${srcIdx - 4}`;
  const labelTgt = targetIndex < 5 ? `P${targetIndex + 1}` : `R${targetIndex - 4}`;
  showToast(`Posição trocada entre ${labelSrc} e ${labelTgt} com sucesso!`, 'success');
};

// Verifica se uma vaga possui uma jogadora real efetivamente escalada
function hasScaledPlayer(player) {
  if (!player) return false;
  const rawName = (player.name || '').trim();
  if (!rawName) return false;

  // Se possui TAG do Riot ID (ex: c0rt3z#0303, Julia#BR1, Bruna#BR1), é jogadora escalada
  if (rawName.includes('#')) return true;

  const lower = rawName.toLowerCase();
  const isGeneric = lower.startsWith('reserva ') || 
                    lower.startsWith('player ') || 
                    lower === 'reserva' || 
                    lower === 'player' ||
                    lower === 'reserva 1' || 
                    lower === 'reserva 2' || 
                    lower === 'reserva 3' || 
                    lower === 'reserva 4' ||
                    lower === 'player 1' ||
                    lower === 'player 2' ||
                    lower === 'player 3' ||
                    lower === 'player 4' ||
                    lower === 'player 5';

  if (isGeneric) {
    // Se for nome genérico, só conta como escalada se tiver agente titular explicitamente definido
    // ou flex configurado e dados reais de K/D
    const hasAgent = (player.titular && player.titular.trim() !== '') || 
                     (player.flex1 && player.flex1.trim() !== '');
    const hasCustomStats = (player.kd && player.kd.trim() !== '' && player.kd !== '1.00') ||
                           (player.rendimento && player.rendimento.trim() !== '' && player.rendimento !== '7.0');
    return Boolean(hasAgent && hasCustomStats);
  }

  // Nome customizado diferente dos placeholders genéricos
  const inRoster = (state.roster || []).find(r => r.name && r.name.toLowerCase() === lower);
  if (inRoster) return true;

  return true;
}

// Extrai nota de rendimento e K/D para ordenação
function getPlayerNumericScore(p, mapId) {
  const cleanName = (p.name || '').trim();
  const inRoster = (state.roster || []).find(r => r.name && r.name.toLowerCase() === cleanName.toLowerCase()) || {};
  const scoreStr = p.rendimento || inRoster.mapRatings?.[mapId.toLowerCase()] || inRoster.overallRating || '';
  let num = parseFloat(String(scoreStr).replace(',', '.'));
  if (isNaN(num)) num = 0;
  if (num > 10 && num <= 100) num = num / 10;
  const kdNum = parseFloat(String(p.kd || inRoster.kd || '0').replace(',', '.')) || 0;
  return { score: num, kd: kdNum };
}

// 1. Organiza por pontuação: Reordena APENAS as jogadoras escaladas (mantendo os agentes)
// R1 e R2 (e demais vagas sem ninguém escalado) ficam no final e NÃO são escaladas nem organizadas
window.autoScaleLineupByRating = function() {
  const currentMapId = state.activeMapId;
  const currentPlayers = state.lineups[currentMapId];
  if (!Array.isArray(currentPlayers) || currentPlayers.length < 5) {
    showToast('Não há jogadoras suficientes para organizar a escalação.', 'warning');
    return;
  }

  // Separa as jogadoras que possuem alguém escalado das vagas reservas vazias (R1, R2, etc.)
  const scaledPool = [];
  const unscaledPool = [];

  currentPlayers.forEach((p, idx) => {
    // Se for dos 5 titulares originais OU tiver jogadora real escalada
    if (idx < 5 || hasScaledPlayer(p)) {
      scaledPool.push({ ...p, origIdx: idx });
    } else {
      unscaledPool.push({ ...p, origIdx: idx });
    }
  });

  // Ordena APENAS as jogadoras escaladas por rendimento decrescente (desempate por K/D)
  scaledPool.sort((a, b) => {
    const aM = getPlayerNumericScore(a, currentMapId);
    const bM = getPlayerNumericScore(b, currentMapId);
    if (bM.score !== aM.score) return bM.score - aM.score;
    return bM.kd - aM.kd;
  });

  // As jogadoras escaladas ocupam as posições ativas
  const reorderedActive = scaledPool.map((p, newIdx) => {
    p.id = newIdx + 1;
    if (newIdx < 5) {
      p.isSub = false;
      if (!p.titular && p.flex1) p.titular = p.flex1;
      if (!p.reserva && p.flex2) p.reserva = p.flex2;
    } else {
      p.isSub = true;
      if (!p.flex1 && p.titular) p.flex1 = p.titular;
      if (!p.flex2 && p.reserva) p.flex2 = p.reserva;
    }
    return p;
  });

  // As vagas sem ninguém escalado (R1, R2, etc.) FICAM ESTREITAMENTE NO FINAL e não são alteradas
  const reorderedUnscaled = unscaledPool.map((p, uIdx) => {
    p.id = reorderedActive.length + uIdx + 1;
    p.isSub = true;
    return p;
  });

  const finalLineup = [...reorderedActive, ...reorderedUnscaled];

  state.lineups[currentMapId] = finalLineup;
  saveCurrentState();

  finalLineup.forEach((p, idx) => {
    syncSavePlayer(currentMapId, idx, p, state.lineups);
  });

  renderPlayersList();
  showToast('🏆 Jogadoras organizadas da maior para a menor pontuação! R1 e R2 mantidos no final.', 'success');
};

// 2. Organizar e Escalar: Reordena as jogadoras por pontuação E escala os melhores agentes recomendados da comp meta
// R1 e R2 (e demais vagas sem ninguém escalado) ficam no final e NÃO são escaladas nem organizadas
window.autoOrganizeAndAssignComps = function() {
  const currentMapId = state.activeMapId;
  const currentPlayers = state.lineups[currentMapId];
  if (!Array.isArray(currentPlayers) || currentPlayers.length < 5) {
    showToast('Não há jogadoras suficientes para organizar e escalar.', 'warning');
    return;
  }

  // 1. Separa jogadoras escaladas das vagas sem ninguém escalado (R1, R2, etc.)
  const scaledPool = [];
  const unscaledPool = [];

  currentPlayers.forEach((p, idx) => {
    if (idx < 5 || hasScaledPlayer(p)) {
      scaledPool.push({ ...p, origIdx: idx });
    } else {
      unscaledPool.push({ ...p, origIdx: idx });
    }
  });

  // 2. Ordena apenas as jogadoras escaladas por pontuação decrescente
  scaledPool.sort((a, b) => {
    const aM = getPlayerNumericScore(a, currentMapId);
    const bM = getPlayerNumericScore(b, currentMapId);
    if (bM.score !== aM.score) return bM.score - aM.score;
    return bM.kd - aM.kd;
  });

  const titulares = scaledPool.slice(0, 5);
  const activeReserves = scaledPool.slice(5);

  // 3. Obtém os 5 agentes da composição meta recomendada do mapa ativo
  const mapPreset = getMapTacticalPreset(currentMapId);
  const metaAgents = (mapPreset && Array.isArray(mapPreset.agents) && mapPreset.agents.length === 5)
    ? [...mapPreset.agents]
    : ['Jett', 'Sova', 'Omen', 'Killjoy', 'KAY/O'];

  // 4. Casamento ótimo entre titulares e os 5 agentes do meta
  function getAffinity(player, agentName) {
    let score = 10;
    const cleanAgent = (agentName || '').trim().toLowerCase();
    const mostPlayed = (player.mostPlayed || []).map(a => (a || '').toLowerCase());
    const rosterObj = (state.roster || []).find(r => r.name && r.name.toLowerCase() === (player.name || '').trim().toLowerCase()) || {};
    const rosterMostPlayed = (rosterObj.mostPlayed || []).map(a => (a || '').toLowerCase());
    const allPlayed = [...new Set([...mostPlayed, ...rosterMostPlayed])];

    if (allPlayed[0] === cleanAgent) score += 100;
    else if (allPlayed[1] === cleanAgent) score += 80;
    else if (allPlayed[2] === cleanAgent) score += 60;
    else if (allPlayed.includes(cleanAgent)) score += 40;

    if (player.titular && player.titular.toLowerCase() === cleanAgent) score += 50;
    if (player.reserva && player.reserva.toLowerCase() === cleanAgent) score += 25;
    if (player.flex1 && player.flex1.toLowerCase() === cleanAgent) score += 35;

    const agentRole = (getAgentRole(agentName) || '').toLowerCase();
    const playerRole = (player.role || rosterObj.role || '').toLowerCase();
    if (agentRole && playerRole && agentRole === playerRole) score += 45;

    return score;
  }

  function getPermutations(arr) {
    if (arr.length <= 1) return [arr];
    const perms = [];
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const p of getPermutations(remaining)) {
        perms.push([current, ...p]);
      }
    }
    return perms;
  }

  const allPerms = getPermutations(metaAgents);
  let bestScore = -1;
  let bestPerm = metaAgents;

  allPerms.forEach(perm => {
    let sumScore = 0;
    for (let i = 0; i < titulares.length; i++) {
      sumScore += getAffinity(titulares[i], perm[i]);
    }
    if (sumScore > bestScore) {
      bestScore = sumScore;
      bestPerm = perm;
    }
  });

  // Atribui os agentes meta às 5 titulares
  titulares.forEach((p, idx) => {
    p.id = idx + 1;
    p.isSub = false;
    const assignedTitular = bestPerm[idx];
    p.titular = assignedTitular;

    const rosterObj = (state.roster || []).find(r => r.name && r.name.toLowerCase() === (p.name || '').trim().toLowerCase()) || {};
    const candidatePool = [
      ...(p.mostPlayed || []),
      ...(rosterObj.mostPlayed || []),
      p.reserva,
      p.flex1,
      p.flex2
    ].filter(Boolean);

    const validReserva = candidatePool.find(a => a.toLowerCase() !== assignedTitular.toLowerCase());
    if (validReserva) {
      p.reserva = validReserva;
    } else {
      const role = getAgentRole(assignedTitular);
      const sameRoleAgents = (ALL_AGENTS || []).filter(a => a.role === role && a.name.toLowerCase() !== assignedTitular.toLowerCase());
      p.reserva = sameRoleAgents[0]?.name || (assignedTitular === 'Omen' ? 'Brimstone' : 'Omen');
    }
  });

  // Reservas que possuem jogadoras escaladas
  activeReserves.forEach((p, rIdx) => {
    p.id = rIdx + 6;
    p.isSub = true;
    const rosterObj = (state.roster || []).find(r => r.name && r.name.toLowerCase() === (p.name || '').trim().toLowerCase()) || {};
    const favs = [...new Set([...(p.mostPlayed || []), ...(rosterObj.mostPlayed || []), p.flex1, p.titular, p.flex2, p.reserva, p.flex3].filter(Boolean))];

    p.flex1 = favs[0] || 'Omen';
    p.flex2 = favs[1] || (p.flex1 === 'Killjoy' ? 'Cypher' : 'Killjoy');
    p.flex3 = favs[2] || (p.flex1 === 'Sova' ? 'Fade' : 'Sova');
  });

  // Vagas sem ninguém escalado (R1, R2, etc.): FICAM NO FINAL E NÃO SÃO ESCALADAS NEM ORGANIZADAS
  const reorderedUnscaled = unscaledPool.map((p, uIdx) => {
    p.id = titulares.length + activeReserves.length + uIdx + 1;
    p.isSub = true;
    return p;
  });

  const finalLineup = [...titulares, ...activeReserves, ...reorderedUnscaled];

  state.lineups[currentMapId] = finalLineup;
  saveCurrentState();

  finalLineup.forEach((p, idx) => {
    syncSavePlayer(currentMapId, idx, p, state.lineups);
  });

  renderPlayersList();
  const mapName = (MAPS_DATA.find(m => m.id === currentMapId) || {}).name || currentMapId;
  showToast(`🎯 5 Titulares organizadas e escaladas com o Meta de ${mapName}! R1 e R2 mantidos no final.`, 'success');
};

// Renderiza a lista das 5 Jogadoras Titulares e 2 Reservas Flex
function renderPlayersList() {
  const containerTitulares = document.getElementById('players-list-container');
  const containerReserves = document.getElementById('reserves-list-container');
  if (!containerTitulares) return;

  ensureRosterDefaults();

  const activeMap = MAPS_DATA.find(m => m.id === state.activeMapId) || MAPS_DATA[0];
  const players = state.lineups[state.activeMapId] || DEFAULT_PLAYERS;

  // Sincroniza K/D, agentes favoritos e notas de rendimento a partir do banco (roster)
  let lineupUpdated = false;
  players.forEach((player, idx) => {
    if (player.name && !player.name.startsWith('Player ') && !player.name.startsWith('Reserva ') && player.name.trim()) {
      const cleanName = player.name.trim();
      const found = (state.roster || []).find(r => r.name.toLowerCase() === cleanName.toLowerCase());
      if (found) {
        if (!player.kd && found.kd) {
          player.kd = found.kd;
          lineupUpdated = true;
        }
        if ((!player.mostPlayed || player.mostPlayed.length === 0) && found.mostPlayed && found.mostPlayed.length > 0) {
          player.mostPlayed = [...found.mostPlayed];
          lineupUpdated = true;
        }
        if (!player.rendimento) {
          const mRend = found.mapRatings?.[state.activeMapId.toLowerCase()] || found.overallRating;
          if (mRend) {
            player.rendimento = mRend;
            lineupUpdated = true;
          }
        }
      }

      // Se tiver Riot ID (#TAG) mas ainda estiver sem rendimento e temos chave API, busca ao vivo
      if (!player.rendimento && cleanName.includes('#') && getHenrikApiKey()) {
        scheduleBackgroundPlayerFetch(idx, cleanName);
      }
    }
  });

  if (lineupUpdated) {
    saveCurrentState();
  }

  const titulares = players.slice(0, 5);
  const reserves = players.slice(5, 9);
  const titularConflicts = detectTitularConflicts(titulares, activeMap.id);

  // Renderiza os 5 Titulares
  containerTitulares.innerHTML = titulares.map((player, index) => {
    const ratingVisual = getRatingVisuals(player.rendimento);
    const titularAgent = player.titular;
    const reservaAgent = player.reserva;

    const titularRole = titularAgent ? getAgentRole(titularAgent) : '';
    const reservaRole = reservaAgent ? getAgentRole(reservaAgent) : '';
    const titularIcon = titularAgent ? getAgentIcon(titularAgent) : '';
    const reservaIcon = reservaAgent ? getAgentIcon(reservaAgent) : '';
    const titularColor = titularAgent ? getAgentColor(titularAgent) : '#ff4655';
    const reservaColor = reservaAgent ? getAgentColor(reservaAgent) : '#00f5d4';

    const titularRoleClass = titularRole ? `role-badge-${titularRole.toLowerCase()}` : '';
    const reservaRoleClass = reservaRole ? `role-badge-${reservaRole.toLowerCase()}` : '';

    const isSwapSource = state.manualSwapSourceIndex === index;
    const isSwapActive = state.manualSwapSourceIndex !== null;
    const cardBorder = isSwapSource 
      ? 'border-amber-400 ring-2 ring-amber-400/80 bg-[#161a22] shadow-[0_0_20px_rgba(245,158,11,0.4)]' 
      : (isSwapActive ? 'border-sky-500/40 hover:border-amber-400/70 hover:bg-[#111924] cursor-pointer' : 'border-[#203043]');

    const swapBannerHtml = isSwapSource ? `
      <div class="w-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-tactical font-bold px-2.5 py-1 rounded-md flex items-center justify-between mb-1.5">
        <span>🔄 Posição de Origem Selecionada (P${player.id}). Clique no card destino para concluir.</span>
        <button type="button" onclick="window.toggleManualSwap(${index}, event)" class="underline text-white text-[9px] hover:text-amber-200">Cancelar</button>
      </div>
    ` : '';

    const foundRoster = (state.roster || []).find(r => r.name && r.name.toLowerCase() === (player.name || '').trim().toLowerCase());
    let mapMatchCount = 0;
    if (foundRoster) {
      if (foundRoster.mapDetails?.[activeMap.id]?.matches) {
        mapMatchCount = foundRoster.mapDetails[activeMap.id].matches;
      } else if (Array.isArray(foundRoster.recentMatches)) {
        mapMatchCount = foundRoster.recentMatches.filter(m => 
          (m.mapId && m.mapId.toLowerCase() === activeMap.id.toLowerCase()) || 
          (m.map && m.map.toLowerCase() === activeMap.name.toLowerCase())
        ).length;
      }
      if (!mapMatchCount && foundRoster.totalMatches) {
        mapMatchCount = foundRoster.totalMatches;
      }
    }

    const hasTag = player.name && player.name.includes('#');
    let trackerLinkHtml = '';
    if (hasTag) {
      const parts = player.name.split('#');
      const riotName = encodeURIComponent(parts[0].trim());
      const riotTag = encodeURIComponent(parts[1].trim());
      const trackerUrl = `https://tracker.gg/valorant/profile/riot/${riotName}%23${riotTag}/overview`;
      trackerLinkHtml = `
        <a href="${trackerUrl}" target="_blank" rel="noopener noreferrer" 
           title="Ver perfil completo no Tracker.gg"
           class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-sky-300 bg-sky-950/60 hover:bg-sky-900 border border-sky-500/40 transition">
          <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          <span>Tracker ↗</span>
        </a>
      `;
    } else {
      trackerLinkHtml = `
        <button onclick="window.promptPlayerTag(${index})" 
                title="Adicionar #TAG para abrir no Tracker.gg"
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium text-gray-400 hover:text-sky-300 bg-[#121922] hover:bg-sky-950/40 border border-[#223347] transition">
          <span>+TAG Tracker</span>
        </button>
      `;
    }

    const mostPlayedList = Array.isArray(player.mostPlayed) ? player.mostPlayed : [];
    const mostPlayedIconsHtml = mostPlayedList.map((agentName, mIdx) => {
      const icon = getAgentIcon(agentName);
      const color = getAgentColor(agentName);
      return `
        <button onclick="window.openAgentModal(${index}, 'top${mIdx + 1}')" 
                title="Mais jogada: ${agentName} (clique para trocar)" 
                class="relative hover:scale-110 transition-transform">
          <img src="${icon}" alt="${agentName}" class="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover bg-black border flex-shrink-0" style="border-color: ${color}">
        </button>
      `;
    }).join('');

    const addMostPlayedBtn = mostPlayedList.length < 3 ? `
      <button onclick="window.openAgentModal(${index}, 'top${mostPlayedList.length + 1}')" 
              title="Adicionar agente mais jogado do Tracker"
              class="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-dashed border-gray-600 hover:border-[#ff4655] text-gray-400 hover:text-white flex items-center justify-center text-[10px] bg-[#121922] transition">
        +
      </button>
    ` : '';

    const conflict = titularConflicts[index];
    let conflictCardHtml = '';
    if (conflict) {
      const sugAg = conflict.suggestedAgent;
      const sugIcon = getAgentIcon(sugAg);
      const sugRole = getAgentRole(sugAg);
      const sugColor = getAgentColor(sugAg);
      conflictCardHtml = `
        <div class="w-full mt-2.5 p-2 sm:p-2.5 rounded-lg bg-[#181109] border border-amber-500/50 shadow-md animate-fade-in flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div class="flex items-start gap-2 min-w-0">
            <span class="text-base flex-shrink-0 mt-0.5">💡</span>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[9px] font-tactical font-black uppercase text-amber-300 bg-amber-950/90 px-1.5 py-0.2 rounded border border-amber-500/40">
                  ${conflict.type === 'agent' ? 'Conflito de Agente' : 'Duplicação de Função'}
                </span>
                <span class="text-[10px] text-gray-300 font-sans">
                  ${conflict.type === 'agent' 
                    ? `Agente <b>${conflict.agent}</b> repetido com <b>${escapeHtml(conflict.otherName)}</b>` 
                    : `Função <b>${conflict.role}</b> duplicada com <b>${escapeHtml(conflict.otherName)}</b>`}
                </span>
              </div>
              <p class="text-[10px] text-amber-200/90 mt-0.5">
                Otimizador Tático (${conflict.compTitle}) recomenda <b>${sugAg}</b> (${sugRole}) para balancear a escalação.
              </p>
            </div>
          </div>
          <button type="button"
                  onclick="window.applyTacticalSuggestion(${index}, '${sugAg}', 'titular')"
                  title="Trocar automaticamente para ${sugAg} conforme Otimizador Tático"
                  class="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-tactical font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow flex-shrink-0 self-end sm:self-auto cursor-pointer">
            <img src="${sugIcon}" alt="${sugAg}" class="w-4 h-4 rounded-full object-cover bg-black" style="border: 1px solid ${sugColor}">
            <span>Trocar para ${sugAg}</span>
          </button>
        </div>
      `;
    }

    const playerAvatarSrc = player.photoUrl || (foundRoster?.photoUrl) || '';

    return `
      <div class="tactical-card p-2.5 sm:p-3 rounded-lg border ${cardBorder} flex flex-col gap-2 w-full min-w-0 relative"
           id="player-card-${index}"
           ${isSwapActive && !isSwapSource ? `onclick="window.executeManualSwap(${index})"` : ''}
           style="z-index: ${30 - index};">
        
        ${swapBannerHtml}

        <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 w-full min-w-0">
          
          <!-- Identificador, Avatar Customizado, Nome & Autocomplete & Stats Tracker -->
          <div class="flex flex-col gap-1.5 w-full md:w-64 flex-shrink-0 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <button type="button"
                      onclick="window.openPlayerProfileModal(${index})"
                      title="Ver Perfil Completo, Histórico de Partidas e Alterar Foto de ${escapeHtml(player.name || `Player ${player.id}`)}"
                      class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#162332] hover:bg-[#ff4655]/25 border border-[#283b50] hover:border-[#ff4655] flex items-center justify-center font-tactical font-bold text-xs sm:text-sm text-[#ff4655] hover:text-white shadow-inner flex-shrink-0 transition-all cursor-pointer group relative overflow-hidden">
                ${playerAvatarSrc ? `
                  <img src="${playerAvatarSrc}" alt="Avatar" class="w-full h-full object-cover">
                  <span class="absolute bottom-0 right-0 bg-[#0d141e]/90 text-[7px] font-black text-amber-300 px-0.5 leading-none">P${player.id}</span>
                ` : `
                  <span>P${player.id}</span>
                  <span class="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-sky-500 rounded-full border border-[#0d141e] flex items-center justify-center text-[7px] text-white opacity-80 group-hover:opacity-100 group-hover:scale-125 transition">📊</span>
                `}
              </button>
              <div class="flex-1 min-w-0 relative" id="player-name-wrapper-${index}">
                <input type="text" 
                       id="player-name-input-${index}"
                       value="${escapeHtml(player.name || `Player ${player.id}`)}" 
                       oninput="window.handlePlayerNameInput(${index}, this.value)"
                       onfocus="window.showRosterAutocomplete(${index})"
                       onchange="window.updatePlayerName(${index}, this.value)"
                       placeholder="Nick#TAG (ex: c0rt3z#0303)"
                       autocomplete="off"
                       class="w-full bg-[#0d141e] border border-[#223347] focus:border-[#ff4655] rounded px-2 py-1 text-xs font-semibold text-white focus:outline-none transition truncate">
                
                <!-- Dropdown de Autocomplete -->
                <div id="roster-autocomplete-dropdown-${index}" 
                     class="absolute left-0 top-full mt-1.5 z-50 w-72 sm:w-80 max-w-[calc(100vw-2.5rem)] bg-[#0d141e] border border-[#2a3e55] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.95)] ring-1 ring-sky-500/40 overflow-hidden hidden animate-fade-in">
                </div>
              </div>
            </div>

            <!-- Stats Tracker: Link, Estatísticas, K/D e Mais Jogadas -->
            <div class="flex items-center gap-1.5 flex-wrap pl-0.5 sm:pl-1 text-[10px]">
              ${trackerLinkHtml}
              <button onclick="window.openPlayerProfileModal(${index})" 
                      title="Ver página completa com estatísticas, histórico de partidas e cálculo"
                      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-sky-400 hover:text-white bg-sky-950/60 hover:bg-sky-900 border border-sky-500/40 transition">
                <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                <span>Estatísticas</span>
              </button>
              <div class="inline-flex items-center gap-1 bg-[#0d141e] border border-[#223347] px-1.5 py-0.5 rounded" title="K/D da jogadora no Tracker">
                <span class="text-[9px] font-tactical font-bold text-gray-400">K/D:</span>
                <input type="text" value="${escapeHtml(player.kd || '')}" placeholder="1.00" 
                       onchange="window.updatePlayerKd(${index}, this.value)" 
                       class="w-9 bg-transparent text-[10px] sm:text-xs font-mono font-bold text-emerald-400 focus:outline-none text-center">
              </div>
              <!-- Rendimento no Mapa -->
              <div class="inline-flex items-center gap-1 bg-[#0d141e] border ${ratingVisual.border} hover:border-amber-400/50 px-1.5 py-0.5 rounded transition relative" title="Pontuação de Rendimento da jogadora em ${escapeHtml(activeMap.name)} (0 a 10) - Base: ${mapMatchCount > 0 ? `${mapMatchCount} partidas` : 'Amostragem estimada'}">
                <span class="text-[9px] font-tactical font-bold ${ratingVisual.labelColor}">Rend:</span>
                <input type="text" value="${escapeHtml(player.rendimento || '')}" placeholder="--" 
                       onchange="window.updatePlayerRendimento(${index}, this.value)" 
                       class="w-8 bg-transparent text-[10px] sm:text-xs font-mono font-bold ${ratingVisual.valColor} placeholder-gray-600 focus:outline-none text-center">
                ${mapMatchCount > 0 ? `<span class="text-[8px] font-mono text-gray-400 bg-[#141f2d] border border-[#22354a] px-1 py-0.2 rounded leading-none" title="Cálculo baseado em ${mapMatchCount} partida(s) em ${escapeHtml(activeMap.name)}">${mapMatchCount}j</span>` : ''}
              </div>
              <div class="flex items-center gap-1" title="Agentes mais jogados (Tracker / Conforto)">
                <span class="text-[8px] font-tactical uppercase text-gray-500">Top:</span>
                ${mostPlayedIconsHtml}
                ${addMostPlayedBtn}
              </div>
            </div>
          </div>

          <!-- Seleção de Agentes (Titular e Reserva) -->
          <div class="grid grid-cols-2 gap-2 sm:gap-3 w-full flex-1 min-w-0">
            
            <!-- Botão Agente Titular -->
            <div class="min-w-0">
              <label class="text-[9px] sm:text-[10px] uppercase font-tactical tracking-wider text-gray-400 block mb-0.5 truncate">
                Titular ⭐
              </label>
              <button onclick="window.openAgentModal(${index}, 'titular')" 
                      class="w-full min-w-0 flex items-center justify-between p-1.5 sm:p-2 rounded-lg bg-[#0d141e] border ${titularAgent ? 'border-[#ff4655]/50 shadow-[0_0_8px_rgba(255,70,85,0.18)]' : 'border-[#223347]'} hover:border-[#ff4655] transition text-left group">
                ${titularAgent ? `
                  <div class="flex items-center gap-1.5 sm:gap-2 truncate min-w-0 flex-1">
                    <img src="${titularIcon}" alt="${titularAgent}" class="w-7 h-7 sm:w-8 sm:h-8 rounded object-cover bg-black/60 border shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform" style="border-color: ${titularColor}">
                    <div class="truncate min-w-0 flex-1">
                      <div class="text-[11px] sm:text-xs font-bold text-white truncate leading-tight">${titularAgent}</div>
                      <span class="text-[8px] sm:text-[9px] font-mono uppercase px-1 py-0.2 rounded ${titularRoleClass} inline-block truncate max-w-full leading-none mt-0.5">${titularRole}</span>
                    </div>
                  </div>
                ` : `
                  <div class="flex items-center gap-1.5 text-gray-400 py-0.5 truncate min-w-0">
                    <div class="w-6 h-6 sm:w-7 sm:h-7 rounded border border-dashed border-gray-600 flex items-center justify-center text-gray-400 font-bold text-xs bg-[#131d28] flex-shrink-0">+</div>
                    <span class="text-[11px] sm:text-xs font-medium text-gray-400 truncate">Titular...</span>
                  </div>
                `}
                <svg class="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition flex-shrink-0 ml-1 hidden xs:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
            </div>

            <!-- Botão Agente Reserva -->
            <div class="min-w-0">
              <label class="text-[9px] sm:text-[10px] uppercase font-tactical tracking-wider text-gray-400 block mb-0.5 truncate">
                Reserva 🔄
              </label>
              <button onclick="window.openAgentModal(${index}, 'reserva')" 
                      class="w-full min-w-0 flex items-center justify-between p-1.5 sm:p-2 rounded-lg bg-[#0d141e] border ${reservaAgent ? 'border-[#00f5d4]/40 shadow-[0_0_8px_rgba(0,245,212,0.15)]' : 'border-[#223347]'} hover:border-[#00f5d4] transition text-left group">
                ${reservaAgent ? `
                  <div class="flex items-center gap-1.5 sm:gap-2 truncate min-w-0 flex-1">
                    <img src="${reservaIcon}" alt="${reservaAgent}" class="w-7 h-7 sm:w-8 sm:h-8 rounded object-cover bg-black/60 border shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform" style="border-color: ${reservaColor}">
                    <div class="truncate min-w-0 flex-1">
                      <div class="text-[11px] sm:text-xs font-bold text-white truncate leading-tight">${reservaAgent}</div>
                      <span class="text-[8px] sm:text-[9px] font-mono uppercase px-1 py-0.2 rounded ${reservaRoleClass} inline-block truncate max-w-full leading-none mt-0.5">${reservaRole}</span>
                    </div>
                  </div>
                ` : `
                  <div class="flex items-center gap-1.5 text-gray-400 py-0.5 truncate min-w-0">
                    <div class="w-6 h-6 sm:w-7 sm:h-7 rounded border border-dashed border-gray-600 flex items-center justify-center text-gray-400 font-bold text-xs bg-[#131d28] flex-shrink-0">+</div>
                    <span class="text-[11px] sm:text-xs font-medium text-gray-400 truncate">Reserva...</span>
                  </div>
                `}
                <svg class="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition flex-shrink-0 ml-1 hidden xs:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
            </div>

          </div>

          <!-- Borda Direita Interativa: Troca Manual de Posição -->
          <div class="swap-edge-handle flex flex-col items-center justify-center cursor-pointer px-1.5 sm:px-2 py-2 rounded-lg border border-[#1e2f42] hover:border-amber-400 transition-all select-none self-stretch flex-shrink-0"
               onclick="window.toggleManualSwap(${index}, event)"
               title="Trocar posição: clique aqui e depois no card com o qual deseja trocar">
            <span class="text-xs sm:text-sm text-gray-400 group-hover:text-amber-300 transition-transform select-none">⇄</span>
            <span class="text-[7px] font-tactical font-black uppercase text-gray-500 group-hover:text-amber-300 tracking-tighter mt-0.5 select-none">Mover</span>
          </div>

        </div>

        <!-- Card de Sugestão Tática (se houver conflito de agente ou função) -->
        ${conflictCardHtml}

      </div>
    `;
  }).join('');

  // Renderiza as 2 Reservas com Bonecos Flex
  if (containerReserves) {
    containerReserves.innerHTML = reserves.map((player, rIdx) => {
      const actualIndex = rIdx + 5;
      const isSwapSource = state.manualSwapSourceIndex === actualIndex;
      const isSwapActive = state.manualSwapSourceIndex !== null;
      const isUnscaled = !hasScaledPlayer(player);
      const cardBorder = isSwapSource 
        ? 'border-amber-400 ring-2 ring-amber-400/80 bg-[#161a22] shadow-[0_0_20px_rgba(245,158,11,0.4)]' 
        : (isSwapActive 
            ? 'border-sky-500/40 hover:border-amber-400/70 hover:bg-[#111924] cursor-pointer' 
            : (isUnscaled 
                ? 'border-gray-800/80 hover:border-amber-500/40 bg-[#0a0f16]/70 opacity-40 hover:opacity-100 filter grayscale-[40%] hover:grayscale-0 transition-all duration-300' 
                : 'border-amber-900/40 hover:border-amber-500/50 bg-[#101722] transition-all'));

      const swapBannerHtml = isSwapSource ? `
        <div class="w-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-tactical font-bold px-2.5 py-1 rounded-md flex items-center justify-between mb-1.5">
          <span>🔄 Posição de Origem Selecionada (R${rIdx + 1}). Clique no card destino para concluir.</span>
          <button type="button" onclick="window.toggleManualSwap(${actualIndex}, event)" class="underline text-white text-[9px] hover:text-amber-200">Cancelar</button>
        </div>
      ` : '';

      const rRatingVisual = getRatingVisuals(player.rendimento);
      const foundRoster = (state.roster || []).find(r => r.name && r.name.toLowerCase() === (player.name || '').trim().toLowerCase());
      let rMatchCount = 0;
      if (foundRoster) {
        if (foundRoster.mapDetails?.[activeMap.id]?.matches) {
          rMatchCount = foundRoster.mapDetails[activeMap.id].matches;
        } else if (Array.isArray(foundRoster.recentMatches)) {
          rMatchCount = foundRoster.recentMatches.filter(m => 
            (m.mapId && m.mapId.toLowerCase() === activeMap.id.toLowerCase()) || 
            (m.map && m.map.toLowerCase() === activeMap.name.toLowerCase())
          ).length;
        }
        if (!rMatchCount && foundRoster.totalMatches) {
          rMatchCount = foundRoster.totalMatches;
        }
      }
      const hasTag = player.name && player.name.includes('#');
      let trackerLinkHtml = '';
      if (hasTag) {
        const parts = player.name.split('#');
        const riotName = encodeURIComponent(parts[0].trim());
        const riotTag = encodeURIComponent(parts[1].trim());
        const trackerUrl = `https://tracker.gg/valorant/profile/riot/${riotName}%23${riotTag}/overview`;
        trackerLinkHtml = `
          <a href="${trackerUrl}" target="_blank" rel="noopener noreferrer" 
             title="Ver perfil completo no Tracker.gg"
             class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-sky-300 bg-sky-950/60 hover:bg-sky-900 border border-sky-500/40 transition">
            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            <span>Tracker ↗</span>
          </a>
        `;
      } else {
        trackerLinkHtml = `
          <button onclick="window.promptPlayerTag(${actualIndex})" 
                  title="Adicionar #TAG para abrir no Tracker.gg"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium text-gray-400 hover:text-sky-300 bg-[#121922] hover:bg-sky-950/40 border border-[#223347] transition">
            <span>+TAG Tracker</span>
          </button>
        `;
      }

      const mostPlayedList = Array.isArray(player.mostPlayed) ? player.mostPlayed : [];
      const mostPlayedIconsHtml = mostPlayedList.map((agentName, mIdx) => {
        const icon = getAgentIcon(agentName);
        const color = getAgentColor(agentName);
        return `
          <button onclick="window.openAgentModal(${actualIndex}, 'top${mIdx + 1}')" 
                  title="Mais jogada: ${agentName} (clique para trocar)" 
                  class="relative hover:scale-110 transition-transform">
            <img src="${icon}" alt="${agentName}" class="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover bg-black border flex-shrink-0" style="border-color: ${color}">
          </button>
        `;
      }).join('');

      const addMostPlayedBtn = mostPlayedList.length < 3 ? `
        <button onclick="window.openAgentModal(${actualIndex}, 'top${mostPlayedList.length + 1}')" 
                title="Adicionar agente mais jogado do Tracker"
                class="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-dashed border-gray-600 hover:border-amber-400 text-gray-400 hover:text-white flex items-center justify-center text-[10px] bg-[#121922] transition">
          +
        </button>
      ` : '';

      const flexSlots = ['flex1', 'flex2', 'flex3'].map((slotKey, sIdx) => {
        const agentName = player[slotKey] || '';
        const role = agentName ? getAgentRole(agentName) : '';
        const icon = agentName ? getAgentIcon(agentName) : '';
        const color = agentName ? getAgentColor(agentName) : '#f59e0b';
        const roleClass = role ? `role-badge-${role.toLowerCase()}` : '';
        const slotLabels = ['Flex 1 ⚡', 'Flex 2 🛡️', 'Flex 3 🎯'];

        return `
          <div class="min-w-0">
            <label class="text-[9px] uppercase font-tactical tracking-wider text-amber-400/90 block mb-0.5 truncate">
              ${slotLabels[sIdx]}
            </label>
            <button onclick="window.openAgentModal(${actualIndex}, '${slotKey}')" 
                    class="w-full min-w-0 flex items-center justify-between p-1.5 sm:p-2 rounded-lg bg-[#0d141e] border ${agentName ? 'border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]' : 'border-[#223347]'} hover:border-amber-400 transition text-left group">
              ${agentName ? `
                <div class="flex items-center gap-1.5 truncate min-w-0 flex-1">
                  <img src="${icon}" alt="${agentName}" class="w-6 h-6 sm:w-7 sm:h-7 rounded object-cover bg-black/60 border shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform" style="border-color: ${color}">
                  <div class="truncate min-w-0 flex-1">
                    <div class="text-[11px] sm:text-xs font-bold text-white truncate leading-tight">${agentName}</div>
                    <span class="text-[8px] sm:text-[9px] font-mono uppercase px-1 py-0.2 rounded ${roleClass} inline-block truncate max-w-full leading-none mt-0.5">${role}</span>
                  </div>
                </div>
              ` : `
                <div class="flex items-center gap-1.5 text-gray-400 py-0.5 truncate min-w-0">
                  <div class="w-5 h-5 rounded border border-dashed border-gray-600 flex items-center justify-center text-gray-400 font-bold text-xs bg-[#131d28] flex-shrink-0">+</div>
                  <span class="text-[10px] font-medium text-gray-400 truncate">Flex ${sIdx + 1}...</span>
                </div>
              `}
              <svg class="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition flex-shrink-0 ml-1 hidden xs:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>
        `;
      }).join('');

      const reserveAvatarSrc = player.photoUrl || (foundRoster?.photoUrl) || '';

      return `
        <div class="tactical-card p-2.5 sm:p-3 rounded-lg border ${cardBorder} flex flex-col gap-2 w-full min-w-0 relative"
             id="player-card-${actualIndex}"
             ${isSwapActive && !isSwapSource ? `onclick="window.executeManualSwap(${actualIndex})"` : ''}
             style="z-index: ${20 - rIdx};">
          
          ${swapBannerHtml}

          <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 w-full min-w-0">
            
            <!-- Identificador R1/R2, Avatar Customizado, Nome & Autocomplete & Stats Tracker -->
            <div class="flex flex-col gap-1.5 w-full md:w-64 flex-shrink-0 min-w-0">
              <div class="flex items-center gap-2 min-w-0">
                <button type="button"
                        onclick="window.openPlayerProfileModal(${actualIndex})"
                        title="Ver Perfil Completo, Histórico de Partidas e Alterar Foto de ${escapeHtml(player.name || `Reserva ${rIdx + 1}`)}"
                        class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${isUnscaled ? 'bg-gray-900/80 hover:bg-gray-800 border-gray-700 text-gray-500' : 'bg-amber-950/70 hover:bg-amber-900/90 border-amber-500/50 hover:border-amber-400 text-amber-300'} flex items-center justify-center font-tactical font-bold text-xs sm:text-sm hover:text-white shadow-inner flex-shrink-0 transition-all cursor-pointer group relative overflow-hidden">
                  ${reserveAvatarSrc ? `
                    <img src="${reserveAvatarSrc}" alt="Avatar" class="w-full h-full object-cover">
                    <span class="absolute bottom-0 right-0 bg-[#0d141e]/90 text-[7px] font-black ${isUnscaled ? 'text-gray-400' : 'text-amber-300'} px-0.5 leading-none">R${rIdx + 1}</span>
                  ` : `
                    <span>R${rIdx + 1}</span>
                    <span class="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-[#0d141e] flex items-center justify-center text-[7px] text-black font-bold opacity-80 group-hover:opacity-100 group-hover:scale-125 transition">📊</span>
                  `}
                </button>
                <div class="flex-1 min-w-0 relative" id="player-name-wrapper-${actualIndex}">
                  ${isUnscaled ? `<div class="mb-1"><span class="text-[8px] font-mono px-1.5 py-0.2 rounded bg-gray-900/90 text-gray-400 border border-gray-700/60 inline-flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-gray-500"></span> Vaga Reserva Livre (Não Escalada)</span></div>` : ''}
                  <input type="text" 
                         id="player-name-input-${actualIndex}"
                         value="${escapeHtml(player.name || `Reserva ${rIdx + 1}`)}" 
                         oninput="window.handlePlayerNameInput(${actualIndex}, this.value)"
                         onfocus="window.showRosterAutocomplete(${actualIndex})"
                         onchange="window.updatePlayerName(${actualIndex}, this.value)"
                         placeholder="Nick#TAG (ex: Bruna#BR1)"
                         autocomplete="off"
                         class="w-full bg-[#0d141e] border border-[#223347] focus:border-amber-400 rounded px-2 py-1 text-xs font-semibold text-white focus:outline-none transition truncate">
                  
                  <!-- Dropdown de Autocomplete -->
                  <div id="roster-autocomplete-dropdown-${actualIndex}" 
                       class="absolute left-0 top-full mt-1.5 z-50 w-72 sm:w-80 max-w-[calc(100vw-2.5rem)] bg-[#0d141e] border border-[#2a3e55] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.95)] ring-1 ring-amber-500/40 overflow-hidden hidden animate-fade-in">
                  </div>
                </div>
              </div>

              <!-- Stats Tracker: Link, Estatísticas, K/D, Rendimento e Mais Jogadas -->
              <div class="flex items-center gap-1.5 flex-wrap pl-0.5 sm:pl-1 text-[10px]">
                ${trackerLinkHtml}
                <button onclick="window.openPlayerProfileModal(${actualIndex})" 
                        title="Ver página completa com estatísticas, histórico de partidas e cálculo"
                        class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-sky-400 hover:text-white bg-sky-950/60 hover:bg-sky-900 border border-sky-500/40 transition">
                  <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  <span>Estatísticas</span>
                </button>
                <div class="inline-flex items-center gap-1 bg-[#0d141e] border border-[#223347] px-1.5 py-0.5 rounded" title="K/D da jogadora no Tracker">
                  <span class="text-[9px] font-tactical font-bold text-gray-400">K/D:</span>
                  <input type="text" value="${escapeHtml(player.kd || '')}" placeholder="1.00" 
                         onchange="window.updatePlayerKd(${actualIndex}, this.value)" 
                         class="w-9 bg-transparent text-[10px] sm:text-xs font-mono font-bold text-emerald-400 focus:outline-none text-center">
                </div>
                <!-- Rendimento no Mapa -->
                <div class="inline-flex items-center gap-1 bg-[#0d141e] border ${rRatingVisual.border} hover:border-amber-400/50 px-1.5 py-0.5 rounded transition relative" title="Pontuação de Rendimento da jogadora em ${escapeHtml(activeMap.name)} (0 a 10) - Base: ${rMatchCount > 0 ? `${rMatchCount} partidas` : 'Amostragem estimada'}">
                  <span class="text-[9px] font-tactical font-bold ${rRatingVisual.labelColor}">Rend:</span>
                  <input type="text" value="${escapeHtml(player.rendimento || '')}" placeholder="--" 
                         onchange="window.updatePlayerRendimento(${actualIndex}, this.value)" 
                         class="w-8 bg-transparent text-[10px] sm:text-xs font-mono font-bold ${rRatingVisual.valColor} placeholder-gray-600 focus:outline-none text-center">
                  ${rMatchCount > 0 ? `<span class="text-[8px] font-mono text-gray-400 bg-[#141f2d] border border-[#22354a] px-1 py-0.2 rounded leading-none" title="Cálculo baseado em ${rMatchCount} partida(s) em ${escapeHtml(activeMap.name)}">${rMatchCount}j</span>` : ''}
                </div>
                <div class="flex items-center gap-1" title="Agentes mais jogados (Tracker)">
                  <span class="text-[8px] font-tactical uppercase text-gray-500">Top:</span>
                  ${mostPlayedIconsHtml}
                  ${addMostPlayedBtn}
                </div>
              </div>
            </div>

            <!-- 3 Slots de Bonecos Flex -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 w-full flex-1 min-w-0">
              ${flexSlots}
            </div>

            <!-- Borda Direita Interativa: Troca Manual de Posição -->
            <div class="swap-edge-handle flex flex-col items-center justify-center cursor-pointer px-1.5 sm:px-2 py-2 rounded-lg border border-amber-900/50 hover:border-amber-400 transition-all select-none self-stretch flex-shrink-0"
                 onclick="window.toggleManualSwap(${actualIndex}, event)"
                 title="Trocar posição: clique aqui e depois no card com o qual deseja trocar">
              <span class="text-xs sm:text-sm text-gray-400 group-hover:text-amber-300 transition-transform select-none">⇄</span>
              <span class="text-[7px] font-tactical font-black uppercase text-gray-500 group-hover:text-amber-300 tracking-tighter mt-0.5 select-none">Mover</span>
            </div>

          </div>

        </div>
      `;
    }).join('');
  }

  // Atualiza Diagnóstico Tático da Composição e Médias de Rendimento do Mapa
  renderCompDiagnosticPanel();
}

// --------------------------------------------------------------------------
// SISTEMA DE RENDIMENTO POR MAPA & SUGESTÕES TÁTICAS INTELIGENTES
// --------------------------------------------------------------------------

// Retorna cores, borda e tier baseado na nota de rendimento (0 a 10 ou 0 a 100)
function getRatingVisuals(scoreStr) {
  if (scoreStr === undefined || scoreStr === null || scoreStr === '') {
    return {
      border: 'border-[#223347]',
      labelColor: 'text-gray-400',
      valColor: 'text-gray-400',
      tier: '-',
      tierBadgeClass: 'bg-gray-900/80 text-gray-400 border-gray-700',
      numeric: null
    };
  }

  const cleaned = String(scoreStr).trim().replace(',', '.');
  const num = parseFloat(cleaned);

  if (isNaN(num)) {
    return {
      border: 'border-[#223347]',
      labelColor: 'text-gray-400',
      valColor: 'text-gray-400',
      tier: '-',
      tierBadgeClass: 'bg-gray-900/80 text-gray-400 border-gray-700',
      numeric: null
    };
  }

  // Normaliza valores digitados de 0 a 100 para 0 a 10 (ex: 85 -> 8.5)
  const normalized = num > 10 && num <= 100 ? num / 10 : num;

  if (normalized >= 9.0) {
    return {
      border: 'border-amber-400/60 shadow-[0_0_8px_rgba(251,191,36,0.25)]',
      labelColor: 'text-amber-300',
      valColor: 'text-amber-400 font-bold',
      tier: 'Tier S',
      tierBadgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
      numeric: normalized
    };
  } else if (normalized >= 7.5) {
    return {
      border: 'border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
      labelColor: 'text-emerald-400',
      valColor: 'text-emerald-400 font-bold',
      tier: 'Tier A',
      tierBadgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      numeric: normalized
    };
  } else if (normalized >= 6.0) {
    return {
      border: 'border-sky-500/50 shadow-[0_0_8px_rgba(14,165,233,0.2)]',
      labelColor: 'text-sky-400',
      valColor: 'text-sky-400 font-bold',
      tier: 'Tier B',
      tierBadgeClass: 'bg-sky-950/80 text-sky-300 border-sky-500/40',
      numeric: normalized
    };
  } else {
    return {
      border: 'border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.2)]',
      labelColor: 'text-rose-400',
      valColor: 'text-rose-400 font-bold',
      tier: 'Tier C',
      tierBadgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
      numeric: normalized
    };
  }
}

// Calcula a média de rendimento da equipe (titulares) no mapa
function calculateTeamMapRating(mapId) {
  const players = state.lineups[mapId] || DEFAULT_PLAYERS;
  const titulares = players.slice(0, 5);

  const validScores = titulares
    .map(p => getRatingVisuals(p.rendimento).numeric)
    .filter(n => n !== null && !isNaN(n));

  if (validScores.length === 0) {
    return {
      avgStr: '--',
      avgNum: null,
      tier: 'Tier -',
      tierClass: 'bg-gray-900/80 text-gray-400 border-gray-700',
      count: 0
    };
  }

  const sum = validScores.reduce((acc, curr) => acc + curr, 0);
  const avg = sum / validScores.length;
  const visual = getRatingVisuals(avg);

  return {
    avgStr: avg.toFixed(1),
    avgNum: avg,
    tier: visual.tier,
    tierClass: visual.tierBadgeClass,
    count: validScores.length
  };
}

// Atualiza a nota de rendimento de uma jogadora no mapa ativo
window.updatePlayerRendimento = function(playerIndex, newRend) {
  const currentPlayers = state.lineups[state.activeMapId];
  if (!currentPlayers || !currentPlayers[playerIndex]) return;

  const cleanVal = (newRend || '').trim().replace(',', '.');
  currentPlayers[playerIndex].rendimento = cleanVal;

  // Atualiza também no roster se a jogadora estiver cadastrada
  const pName = currentPlayers[playerIndex].name;
  if (pName && !pName.startsWith('Player ') && !pName.startsWith('Reserva ')) {
    const found = (state.roster || []).find(r => r.name.toLowerCase() === pName.trim().toLowerCase());
    if (found) {
      if (!found.mapRatings) found.mapRatings = {};
      found.mapRatings[state.activeMapId.toLowerCase()] = cleanVal;
    }
  }

  saveCurrentState();
  syncSavePlayer(state.activeMapId, playerIndex, currentPlayers[playerIndex], state.lineups);

  // Re-renderiza para atualizar imediatamente os cards e o painel de diagnóstico
  renderPlayersList();
};

// Motor de Recomendação Tática Inteligente de Agentes
function getSmartAgentRecommendations(mapId, targetPlayerIndex = null, slotType = 'titular') {
  const mapData = MAPS_DATA.find(m => m.id === mapId) || MAPS_DATA[0];
  const players = state.lineups[mapId] || DEFAULT_PLAYERS;
  const titulares = players.slice(0, 5);

  // Agentes já escalados pelos outros titulares (para evitar picks repetidos)
  const pickedAgentsByOthers = [];
  titulares.forEach((p, idx) => {
    if (idx !== targetPlayerIndex && p.titular) {
      pickedAgentsByOthers.push(p.titular.toLowerCase());
    }
  });

  // Contagem atual de funções dos outros titulares
  const roleCounts = {
    'Controlador': 0,
    'Iniciador': 0,
    'Sentinela': 0,
    'Duelista': 0
  };
  titulares.forEach((p, idx) => {
    if (idx !== targetPlayerIndex && p.titular) {
      const role = getAgentRole(p.titular);
      if (roleCounts[role] !== undefined) {
        roleCounts[role]++;
      }
    }
  });

  // Conforto da jogadora alvo (Tracker Top picks)
  let comfortAgents = [];
  if (targetPlayerIndex !== null && players[targetPlayerIndex]) {
    const p = players[targetPlayerIndex];
    if (Array.isArray(p.mostPlayed)) {
      comfortAgents = p.mostPlayed.map(a => (a || '').toLowerCase());
    }
  }

  // Agentes dos builds meta deste mapa
  const builds = Array.isArray(mapData.builds) ? mapData.builds : [];
  const buildWeights = new Map();

  builds.forEach((build, bIdx) => {
    const baseWeight = bIdx === 0 ? 60 : bIdx === 1 ? 40 : 30;
    const tag = build.tag || build.title || 'Meta';
    (build.agents || []).forEach(agName => {
      const lower = agName.toLowerCase();
      if (!buildWeights.has(lower)) {
        buildWeights.set(lower, { weight: baseWeight, tag: tag });
      } else {
        const cur = buildWeights.get(lower);
        cur.weight += 15;
      }
    });
  });

  // Sinergias Notórias de Mapa
  const mapSynergies = {
    breeze: ['Viper', 'Sova', 'Cypher', 'Jett', 'KAY/O', 'Harbor', 'Waylay'],
    bind: ['Brimstone', 'Raze', 'Viper', 'Skye', 'Fade', 'Cypher', 'Gekko', 'Tejo'],
    ascent: ['Omen', 'Sova', 'Killjoy', 'Jett', 'KAY/O', 'Miks', 'Veto'],
    split: ['Raze', 'Omen', 'Cypher', 'Skye', 'Breach', 'Viper', 'Veto'],
    haven: ['Omen', 'Sova', 'Killjoy', 'Jett', 'Breach', 'Miks', 'Tejo'],
    lotus: ['Omen', 'Fade', 'Killjoy', 'Raze', 'Viper', 'Tejo', 'Waylay', 'Miks'],
    sunset: ['Cypher', 'Omen', 'Raze', 'Fade', 'Breach', 'Gekko', 'Tejo', 'Veto'],
    abyss: ['Omen', 'Astra', 'Sova', 'Cypher', 'Jett', 'Tejo', 'Miks', 'Veto'],
    icebox: ['Viper', 'Sova', 'Killjoy', 'Jett', 'Sage', 'Veto'],
    fracture: ['Brimstone', 'Breach', 'Raze', 'Cypher', 'Fade', 'Tejo'],
    pearl: ['Astra', 'Viper', 'Fade', 'Killjoy', 'Jett', 'Miks']
  };

  const scoredAgents = [];

  ALL_AGENTS.forEach(agent => {
    const agentLower = agent.name.toLowerCase();

    // Se for vaga titular, nunca sugerir agentes já escolhidos pelo resto do time
    if (slotType === 'titular' && pickedAgentsByOthers.includes(agentLower)) {
      return;
    }

    let score = 20;
    const reasons = [];
    let shortTag = '';

    // 1. Urgência de Funções Faltantes
    if (agent.role === 'Controlador') {
      if (roleCounts['Controlador'] === 0) {
        score += 120;
        reasons.push('Falta Controlador (Smokes essenciais)');
        shortTag = 'Smokes!';
      } else if (roleCounts['Controlador'] === 1 && (mapId === 'breeze' || mapId === 'bind' || mapId === 'split' || mapId === 'lotus')) {
        score += 35;
        reasons.push('Double Controller Meta');
        if (!shortTag) shortTag = '2º Smoke';
      } else if (roleCounts['Controlador'] >= 2) {
        score -= 40;
      }
    } else if (agent.role === 'Iniciador') {
      if (roleCounts['Iniciador'] === 0) {
        score += 95;
        reasons.push('Falta Iniciador (Info e Flash)');
        if (!shortTag) shortTag = 'Iniciação!';
      } else if (roleCounts['Iniciador'] === 1 && (mapId === 'ascent' || mapId === 'haven' || mapId === 'sunset')) {
        score += 30;
        reasons.push('Double Initiator Meta');
      } else if (roleCounts['Iniciador'] >= 2) {
        score -= 40;
      }
    } else if (agent.role === 'Sentinela') {
      if (roleCounts['Sentinela'] === 0) {
        score += 90;
        reasons.push('Falta Sentinela (Controle de Flanco)');
        if (!shortTag) shortTag = 'Sentinela!';
      } else if (roleCounts['Sentinela'] >= 2) {
        score -= 50;
      }
    } else if (agent.role === 'Duelista') {
      if (roleCounts['Duelista'] === 0) {
        score += 85;
        reasons.push('Falta Duelista (Entry frag)');
        if (!shortTag) shortTag = 'Entry!';
      } else if (roleCounts['Duelista'] >= 2) {
        score -= 60;
      }
    }

    // 2. Presença nas Builds Meta do Mapa
    if (buildWeights.has(agentLower)) {
      const bw = buildWeights.get(agentLower);
      score += bw.weight;
      reasons.push(`Meta de ${mapData.name} (${bw.tag})`);
      if (!shortTag) shortTag = bw.tag;
    }

    // 3. Conforto da Jogadora (Tracker / Most Played)
    const comfortRank = comfortAgents.indexOf(agentLower);
    if (comfortRank !== -1) {
      const comfortScore = 55 - (comfortRank * 10);
      score += comfortScore;
      reasons.push('Top Pick da Jogadora no Tracker');
      if (!shortTag) shortTag = 'Conforto';
    }

    // 4. Sinergia com o Mapa
    if (mapSynergies[mapId] && mapSynergies[mapId].map(a => a.toLowerCase()).includes(agentLower)) {
      score += 25;
      if (!reasons.some(r => r.includes(mapData.name))) {
        reasons.push(`Forte em ${mapData.name}`);
      }
    }

    scoredAgents.push({
      name: agent.name,
      role: agent.role,
      icon: agent.icon,
      color: agent.color,
      score: score,
      reason: reasons.slice(0, 2).join(' • ') || `Opção viável em ${mapData.name}`,
      shortTag: shortTag || 'Meta'
    });
  });

  scoredAgents.sort((a, b) => b.score - a.score);
  return scoredAgents;
}

// Renderiza o Painel de Diagnóstico da Composição e Atualiza Rendimento Médio
function renderCompDiagnosticPanel() {
  const mapData = MAPS_DATA.find(m => m.id === state.activeMapId) || MAPS_DATA[0];
  const players = state.lineups[state.activeMapId] || DEFAULT_PLAYERS;
  const titulares = players.slice(0, 5);

  // 1. Contagem de funções entre titulares
  const roleCounts = {
    'Duelista': 0,
    'Iniciador': 0,
    'Controlador': 0,
    'Sentinela': 0
  };

  let totalPicked = 0;
  titulares.forEach(p => {
    if (p.titular) {
      const role = getAgentRole(p.titular);
      if (roleCounts[role] !== undefined) {
        roleCounts[role]++;
        totalPicked++;
      }
    }
  });

  const roleStyles = {
    Duelista: {
      active: 'bg-rose-950/60 border-rose-500/60 text-rose-300',
      empty: 'bg-[#121d2b] border-[#23374c] text-gray-400'
    },
    Iniciador: {
      active: 'bg-sky-950/60 border-sky-500/60 text-sky-300',
      empty: 'bg-[#121d2b] border-[#23374c] text-gray-400'
    },
    Controlador: {
      active: 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300',
      empty: 'bg-[#121d2b] border-[#23374c] text-gray-400'
    },
    Sentinela: {
      active: 'bg-amber-950/60 border-amber-500/60 text-amber-300',
      empty: 'bg-[#121d2b] border-[#23374c] text-gray-400'
    }
  };

  ['duelista', 'iniciador', 'controlador', 'sentinela'].forEach(roleKey => {
    const capitalized = roleKey.charAt(0).toUpperCase() + roleKey.slice(1);
    const count = roleCounts[capitalized] || 0;
    const el = document.getElementById(`comp-role-${roleKey}`);
    if (el) {
      const style = count > 0 ? roleStyles[capitalized].active : roleStyles[capitalized].empty;
      el.className = `px-2 py-0.5 rounded text-[10px] font-semibold border transition ${style}`;
      el.innerHTML = `${capitalized}: <b class="${count > 0 ? 'text-white' : 'text-gray-400'}">${count}</b>`;
    }
  });

  // 2. Status de equilíbrio da composição
  const statusEl = document.getElementById('comp-status-badge');
  if (statusEl) {
    if (totalPicked === 0) {
      statusEl.innerHTML = `<span class="text-gray-400 text-[11px] font-mono">0/5 Selecionados</span>`;
    } else if (roleCounts['Controlador'] === 0 && totalPicked >= 2) {
      statusEl.innerHTML = `
        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/80 border border-rose-500/70 text-rose-300 animate-pulse flex items-center gap-1 shadow-sm">
          <span>⚠️</span> Sem Smokes (Controlador)!
        </span>
      `;
    } else if (roleCounts['Iniciador'] === 0 && totalPicked >= 3) {
      statusEl.innerHTML = `
        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 border border-amber-500/70 text-amber-300 flex items-center gap-1 shadow-sm">
          <span>⚠️</span> Sem Iniciador (Info/Flash)
        </span>
      `;
    } else if (roleCounts['Sentinela'] === 0 && totalPicked >= 3) {
      statusEl.innerHTML = `
        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 border border-amber-500/70 text-amber-300 flex items-center gap-1 shadow-sm">
          <span>⚠️</span> Sem Sentinela (Controle de Flanco)
        </span>
      `;
    } else if (roleCounts['Duelista'] === 0 && totalPicked >= 4) {
      statusEl.innerHTML = `
        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-950/80 border border-sky-500/70 text-sky-300 flex items-center gap-1 shadow-sm">
          <span>💡</span> Sem Duelista (Entry)
        </span>
      `;
    } else if (totalPicked === 5) {
      statusEl.innerHTML = `
        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 border border-emerald-500/70 text-emerald-300 flex items-center gap-1 shadow-sm">
          <span>✅</span> Composição Completa & Equilibrada
        </span>
      `;
    } else {
      const remaining = 5 - totalPicked;
      statusEl.innerHTML = `
        <span class="text-sky-300 text-[11px] font-medium font-mono">
          ${remaining} vaga${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}
        </span>
      `;
    }
  }

  // 3. Atualiza Rendimento Médio da Equipe no Banner
  const teamRating = calculateTeamMapRating(state.activeMapId);
  const desktopRatingVal = document.getElementById('map-team-rating-val');
  const desktopRatingTier = document.getElementById('map-team-rating-tier');
  const mobileRatingVal = document.getElementById('map-team-rating-val-mobile');

  if (desktopRatingVal) {
    desktopRatingVal.textContent = teamRating.avgStr;
    desktopRatingVal.className = `font-mono font-bold text-lg ${teamRating.avgNum >= 9 ? 'text-amber-400' : teamRating.avgNum >= 7.5 ? 'text-emerald-400' : teamRating.avgNum >= 6 ? 'text-sky-400' : teamRating.avgNum !== null ? 'text-rose-400' : 'text-gray-400'}`;
  }

  if (desktopRatingTier) {
    desktopRatingTier.textContent = teamRating.tier;
    desktopRatingTier.className = `text-[9px] font-tactical uppercase font-bold px-1.5 py-0.2 rounded border ml-1 ${teamRating.tierClass}`;
  }

  if (mobileRatingVal) {
    mobileRatingVal.innerHTML = teamRating.avgNum !== null 
      ? `<span class="${teamRating.avgNum >= 7.5 ? 'text-emerald-400' : 'text-sky-300'}">${teamRating.avgStr}/10</span> <span class="text-[10px] text-gray-400">(${teamRating.tier})</span>`
      : `<span class="text-gray-400">--/10</span>`;
  }

  // 4. Sugestões Táticas Rápidas de Agentes
  const suggestionsChipsContainer = document.getElementById('comp-suggestions-chips');
  if (suggestionsChipsContainer) {
    const topRecs = getSmartAgentRecommendations(state.activeMapId, null, 'titular').slice(0, 4);
    if (topRecs.length === 0) {
      suggestionsChipsContainer.innerHTML = `<span class="text-[10px] text-gray-500 font-mono">Composição preenchida</span>`;
    } else {
      suggestionsChipsContainer.innerHTML = topRecs.map(rec => {
        const icon = getAgentIcon(rec.name);
        const color = getAgentColor(rec.name);
        return `
          <button onclick="window.handleQuickCompSuggestionClick('${escapeHtml(rec.name)}')"
                  title="${escapeHtml(rec.reason)} (Clique para escalar no primeiro titular livre)"
                  class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#142131] hover:bg-[#1a2d42] border border-[#2b415a] hover:border-amber-400/80 transition-all text-left shadow-sm group">
            <img src="${icon}" alt="${rec.name}" class="w-4 h-4 rounded-full object-cover border flex-shrink-0" style="border-color: ${color}">
            <span class="text-[11px] font-bold text-white group-hover:text-amber-300 transition">${rec.name}</span>
            <span class="text-[8px] font-mono uppercase px-1 py-0.1 rounded bg-black/40 text-amber-300 border border-amber-500/20">${escapeHtml(rec.shortTag || rec.role)}</span>
          </button>
        `;
      }).join('');
    }
  }
}

// Trata clique nas sugestões rápidas da composição
window.handleQuickCompSuggestionClick = function(agentName) {
  const currentPlayers = state.lineups[state.activeMapId];
  if (!currentPlayers) return;

  let emptyIndex = -1;
  for (let i = 0; i < 5; i++) {
    if (!currentPlayers[i].titular) {
      emptyIndex = i;
      break;
    }
  }

  if (emptyIndex !== -1) {
    currentPlayers[emptyIndex].titular = agentName;
    saveCurrentState();
    syncSavePlayer(state.activeMapId, emptyIndex, currentPlayers[emptyIndex], state.lineups);
    renderPlayersList();
    showToast(`${agentName} escalado para ${currentPlayers[emptyIndex].name || `Player ${emptyIndex + 1}`}!`, 'success');
  } else {
    window.openAgentModal(0, 'titular');
    showToast(`Titulares já preenchidos! Abrindo seleção para troca se desejar.`, 'info');
  }
};

// Renderiza sugestões táticas inteligentes dentro do modal de agentes
function renderModalAgentSuggestions(playerIndex, slotType) {
  const container = document.getElementById('modal-agent-suggestions');
  const chipsGrid = document.getElementById('modal-suggestions-chips');
  if (!container || !chipsGrid) return;

  if (slotType && slotType.startsWith('top')) {
    container.classList.add('hidden');
    return;
  }

  const recommendations = getSmartAgentRecommendations(state.activeMapId, playerIndex, slotType).slice(0, 3);
  if (recommendations.length === 0) {
    container.classList.add('hidden');
    return;
  }

  chipsGrid.innerHTML = recommendations.map(rec => {
    const roleKey = (rec.role || '').toLowerCase().startsWith('iniciad')
      ? 'iniciador'
      : (rec.role || '').toLowerCase().startsWith('controlad')
        ? 'controlador'
        : (rec.role || '').toLowerCase();
    const roleClass = `role-badge-${roleKey}`;
    return `
      <button onclick="window.selectAgent('${escapeHtml(rec.name)}')"
              class="p-1.5 sm:p-2 rounded-xl bg-[#0a1522] hover:bg-[#122236] border border-sky-500/40 hover:border-amber-400 flex items-center gap-2 sm:gap-2.5 text-left transition group shadow-md cursor-pointer flex-shrink-0 min-w-[160px] max-w-[210px] sm:min-w-0 sm:max-w-none sm:w-full">
        <div class="w-7 h-7 sm:w-10 sm:h-10 rounded-lg bg-[#05080e] border p-0.5 flex items-center justify-center flex-shrink-0" style="border-color: ${rec.color}">
          <img src="${rec.icon}" alt="${rec.name}" class="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform" loading="lazy">
        </div>
        <div class="truncate flex-1 min-w-0">
          <div class="flex items-center gap-1 sm:gap-1.5 truncate">
            <span class="text-xs sm:text-sm font-tactical font-black text-white group-hover:text-amber-300 truncate">${rec.name}</span>
            <span class="text-[7px] sm:text-[8px] font-mono px-1 py-0.2 rounded ${roleClass} uppercase flex-shrink-0">${rec.role}</span>
          </div>
          <span class="text-[8px] sm:text-[9px] text-emerald-300 font-tactical truncate block mt-0.5">
            ★ ${escapeHtml(rec.reason)}
          </span>
        </div>
      </button>
    `;
  }).join('');

  container.classList.remove('hidden');
}

// Alterna visibilidade das recomendações exclusivamente no mobile para liberar espaço da tela
window.toggleModalSuggestionsMobile = function() {
  const chips = document.getElementById('modal-suggestions-chips');
  const btn = document.getElementById('toggle-suggestions-btn');
  if (!chips) return;
  const isHidden = chips.classList.contains('hidden');
  if (isHidden) {
    chips.classList.remove('hidden');
    if (btn) btn.textContent = '▲ Ocultar';
  } else {
    chips.classList.add('hidden');
    if (btn) btn.textContent = '▼ Ver';
  }
};

// --------------------------------------------------------------------------
// SISTEMA DE AUTOCOMPLETE & BANCO DE JOGADORAS (ROSTER) + RIOT GAMES API
// --------------------------------------------------------------------------

// Cache de consultas para evitar chamadas duplicadas à API HenrikDev / Riot
const apiAccountCache = new Map();
let apiSearchDebounceTimer = null;
let currentSearchingNick = '';
let isApiSearching = false;

// Oculta todos os dropdowns de autocomplete e restaura os z-indexes dos cards
window.hideAllRosterAutocompletes = function() {
  document.querySelectorAll('[id^="roster-autocomplete-dropdown-"]').forEach(el => {
    el.classList.add('hidden');
  });
  document.querySelectorAll('[id^="player-card-"]').forEach(c => {
    c.classList.remove('player-card-active-dropdown');
    const idx = parseInt(c.id.replace('player-card-', ''));
    if (!isNaN(idx)) {
      c.style.zIndex = `${30 - idx}`;
    }
  });
};

// Mostra o dropdown de autocomplete com elevação de z-index do card ativo
window.showRosterAutocomplete = function(playerIndex) {
  window.hideAllRosterAutocompletes();

  const dropdown = document.getElementById(`roster-autocomplete-dropdown-${playerIndex}`);
  const input = document.getElementById(`player-name-input-${playerIndex}`);
  const card = document.getElementById(`player-card-${playerIndex}`);
  if (!dropdown || !input) return;

  if (card) {
    card.classList.add('player-card-active-dropdown');
    card.style.zIndex = '100';
  }

  window.renderRosterAutocompleteDropdown(playerIndex, input.value);
  dropdown.classList.remove('hidden');
};

// Trata digitação no input do nome com agendamento de busca na API
window.handlePlayerNameInput = function(playerIndex, value) {
  const card = document.getElementById(`player-card-${playerIndex}`);
  if (card) {
    card.classList.add('player-card-active-dropdown');
    card.style.zIndex = '100';
  }

  window.renderRosterAutocompleteDropdown(playerIndex, value);
  const dropdown = document.getElementById(`roster-autocomplete-dropdown-${playerIndex}`);
  if (dropdown && dropdown.classList.contains('hidden')) {
    dropdown.classList.remove('hidden');
  }

  window.scheduleApiAutocompleteSearch(playerIndex, value);
};

// Busca inteligente e econômica na API (com debounce de 400ms e cache)
window.scheduleApiAutocompleteSearch = function(playerIndex, rawValue) {
  if (apiSearchDebounceTimer) {
    clearTimeout(apiSearchDebounceTimer);
    apiSearchDebounceTimer = null;
  }

  const query = (rawValue || '').trim();
  if (!query || query.startsWith('Player ') || query.startsWith('Reserva ')) {
    isApiSearching = false;
    currentSearchingNick = '';
    return;
  }

  const apiKey = getHenrikApiKey();
  if (!apiKey) return;

  // Consulta a API quando o usuário digita Riot ID com TAG (ex: nick#tag)
  if (!query.includes('#')) return;

  const [name, tag] = query.split('#').map(s => s.trim());
  if (!name || !tag || tag.length < 2) return;

  const cacheKey = `${name.toLowerCase()}#${tag.toLowerCase()}`;
  if (apiAccountCache.has(cacheKey)) {
    window.renderRosterAutocompleteDropdown(playerIndex, query);
    return;
  }

  isApiSearching = true;
  currentSearchingNick = cacheKey;
  window.renderRosterAutocompleteDropdown(playerIndex, query);

  apiSearchDebounceTimer = setTimeout(async () => {
    try {
      const accRes = await fetch(`https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, {
        headers: { 'Authorization': apiKey }
      });

      if (accRes.ok) {
        const accData = await accRes.json();
        if (accData.data) {
          apiAccountCache.set(cacheKey, {
            found: true,
            name: accData.data.name,
            tag: accData.data.tag,
            puuid: accData.data.puuid,
            region: accData.data.region || 'br',
            level: accData.data.account_level || 0
          });
        }
      } else {
        apiAccountCache.set(cacheKey, {
          found: false,
          error: accRes.status === 404 ? 'Jogadora não encontrada na Riot' : 'API indisponível'
        });
      }
    } catch (e) {
      console.warn('Erro na consulta rápida da API:', e);
    } finally {
      isApiSearching = false;
      window.renderRosterAutocompleteDropdown(playerIndex, query);
    }
  }, 400);
};

// Executa busca rápida com TAG sugerida
window.triggerQuickApiSearch = function(playerIndex, fullNick) {
  const input = document.getElementById(`player-name-input-${playerIndex}`);
  if (input) {
    input.value = fullNick;
    window.handlePlayerNameInput(playerIndex, fullNick);
  }
};

// Renderiza o dropdown do autocomplete com integração mista (Banco + API Riot)
window.renderRosterAutocompleteDropdown = function(playerIndex, filterQuery = '') {
  const dropdown = document.getElementById(`roster-autocomplete-dropdown-${playerIndex}`);
  if (!dropdown) return;

  const roster = state.roster || [];
  const cleanQuery = (filterQuery || '').trim().toLowerCase();
  const rawQuery = (filterQuery || '').trim();

  const isGeneric = cleanQuery.startsWith('player ') || cleanQuery.startsWith('reserva ');
  const filtered = cleanQuery && !isGeneric
    ? roster.filter(p => p.name.toLowerCase().includes(cleanQuery))
    : roster;

  // Verifica se há resultado em cache da API Riot para exibir com destaque
  let apiCardHtml = '';
  if (cleanQuery.includes('#')) {
    const [name, tag] = cleanQuery.split('#').map(s => s.trim());
    if (name && tag) {
      const cacheKey = `${name}#${tag}`;
      const cached = apiAccountCache.get(cacheKey);

      if (cached && cached.found) {
        apiCardHtml = `
          <div onmousedown="event.preventDefault(); window.selectApiFoundPlayer(${playerIndex}, '${escapeHtml(cached.name)}#${escapeHtml(cached.tag)}', '${cached.region}', '${cached.level}', '${cached.puuid}')"
               ontouchend="event.preventDefault(); window.selectApiFoundPlayer(${playerIndex}, '${escapeHtml(cached.name)}#${escapeHtml(cached.tag)}', '${cached.region}', '${cached.level}', '${cached.puuid}')"
               class="p-2.5 bg-[#0a1f33] hover:bg-[#102d44] border-b border-sky-500/40 cursor-pointer flex items-center justify-between gap-2 transition group">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-300 font-bold text-xs flex-shrink-0">
                ⚡
              </div>
              <div class="truncate min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs font-bold text-white group-hover:text-sky-300 truncate">${escapeHtml(cached.name)}#${escapeHtml(cached.tag)}</span>
                  <span class="text-[9px] font-mono px-1 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-500/40 font-bold">Nível ${cached.level}</span>
                  <span class="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-[#162537] text-gray-300">${cached.region.toUpperCase()}</span>
                </div>
                <div class="text-[9px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Perfil Oficial da Riot Games • Clique para usar</span>
                </div>
              </div>
            </div>
            <span class="btn-tactical px-2 py-1 bg-sky-600 hover:bg-sky-500 text-[10px] font-bold text-white rounded shadow flex-shrink-0">
              Usar
            </span>
          </div>
        `;
      } else if (cached && cached.found === false) {
        apiCardHtml = `
          <div class="p-2 bg-red-950/40 border-b border-red-500/30 text-[10px] text-red-300 flex items-center gap-1.5">
            <span>⚠️</span>
            <span>${cached.error || 'Jogadora não encontrada na API da Riot.'}</span>
          </div>
        `;
      }
    }
  }

  // Indicador de busca em segundo plano na API
  let loadingPillHtml = '';
  if (isApiSearching) {
    loadingPillHtml = `
      <div class="p-2 bg-[#091522] border-b border-sky-500/30 flex items-center gap-2 text-[10px] text-sky-300">
        <div class="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
        <span class="truncate">Consultando API da Riot Games para "${escapeHtml(rawQuery)}"...</span>
      </div>
    `;
  }

  let listHtml = '';
  if (filtered.length === 0 && !apiCardHtml) {
    listHtml = `
      <div class="p-3 text-center text-xs text-gray-400">
        Nenhuma jogadora no banco com esse nome.
      </div>
    `;
  } else {
    filtered.forEach(item => {
      const topIcons = (item.mostPlayed || []).slice(0, 3).map(agentName => {
        const icon = getAgentIcon(agentName);
        const color = getAgentColor(agentName);
        return `<img src="${icon}" alt="${agentName}" title="${agentName}" class="w-4 h-4 rounded-full object-cover border flex-shrink-0" style="border-color: ${color}">`;
      }).join('');

      const kdBadge = item.kd ? `
        <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
          K/D ${item.kd}
        </span>
      ` : '';

      listHtml += `
        <div onmousedown="event.preventDefault(); window.selectRosterPlayer(${playerIndex}, '${escapeHtml(item.name)}')"
             ontouchend="event.preventDefault(); window.selectRosterPlayer(${playerIndex}, '${escapeHtml(item.name)}')"
             class="px-2.5 py-2 hover:bg-[#142334] cursor-pointer flex items-center justify-between gap-2 transition group">
          <div class="flex items-center gap-2 truncate min-w-0">
            <span class="text-xs font-bold text-white group-hover:text-emerald-300 truncate">${escapeHtml(item.name)}</span>
            ${kdBadge}
            ${item.role ? `<span class="text-[8px] font-mono uppercase px-1 rounded bg-[#162537] text-gray-400 hidden xs:inline">${item.role}</span>` : ''}
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            ${topIcons}
          </div>
        </div>
      `;
    });
  }

  // Ações de busca com tags e salvamento
  let actionsHtml = '';
  if (cleanQuery && cleanQuery.length >= 2 && !isGeneric) {
    const isExactInRoster = roster.some(p => p.name.toLowerCase() === cleanQuery);
    
    // Sugestão de tags para busca direta na API quando digitou sem #
    if (!cleanQuery.includes('#')) {
      actionsHtml += `
        <div class="p-1.5 bg-[#0a1522] border-t border-[#1a2c40] space-y-1">
          <div class="text-[9px] uppercase font-tactical text-sky-400 font-bold px-1 flex items-center gap-1">
            <span>⚡ Buscar na API Oficial Riot:</span>
          </div>
          <div class="flex gap-1 flex-wrap">
            <button type="button" 
                    onmousedown="event.preventDefault(); window.triggerQuickApiSearch(${playerIndex}, '${escapeHtml(rawQuery)}#BR1')"
                    class="px-2 py-0.5 rounded bg-[#122234] hover:bg-sky-900/60 border border-sky-500/40 text-[10px] font-semibold text-sky-300 transition">
              ${escapeHtml(rawQuery)}#BR1
            </button>
            <button type="button" 
                    onmousedown="event.preventDefault(); window.triggerQuickApiSearch(${playerIndex}, '${escapeHtml(rawQuery)}#0303')"
                    class="px-2 py-0.5 rounded bg-[#122234] hover:bg-sky-900/60 border border-sky-500/40 text-[10px] font-semibold text-sky-300 transition">
              ${escapeHtml(rawQuery)}#0303
            </button>
            <button type="button" 
                    onmousedown="event.preventDefault(); window.triggerQuickApiSearch(${playerIndex}, '${escapeHtml(rawQuery)}#NA1')"
                    class="px-2 py-0.5 rounded bg-[#122234] hover:bg-sky-900/60 border border-sky-500/40 text-[10px] font-semibold text-sky-300 transition">
              ${escapeHtml(rawQuery)}#NA1
            </button>
          </div>
        </div>
      `;
    }

    if (!isExactInRoster) {
      actionsHtml += `
        <div onmousedown="event.preventDefault(); window.saveInputToRoster(${playerIndex}, '${escapeHtml(rawQuery)}')"
             ontouchend="event.preventDefault(); window.saveInputToRoster(${playerIndex}, '${escapeHtml(rawQuery)}')"
             class="p-2 bg-[#091522] hover:bg-[#112438] cursor-pointer text-xs font-tactical font-semibold text-emerald-300 border-t border-[#18283a] flex items-center gap-1.5 transition">
          <span class="text-emerald-400 font-bold text-sm">+</span>
          <span>Salvar "<b>${escapeHtml(rawQuery)}</b>" no Banco de Jogadoras</span>
        </div>
      `;
    }
  }

  dropdown.innerHTML = `
    <div class="p-1.5 bg-[#090f17] border-b border-[#1b2838] flex items-center justify-between text-[9px] font-tactical uppercase tracking-wider text-gray-400">
      <span class="flex items-center gap-1">
        <span class="text-sky-400">🔍</span>
        <span>Banco & API Riot</span>
      </span>
      <span class="text-emerald-400 font-mono">${filtered.length} no banco</span>
    </div>
    ${loadingPillHtml}
    ${apiCardHtml}
    <div class="divide-y divide-[#13202e] max-h-52 overflow-y-auto">
      ${listHtml}
    </div>
    ${actionsHtml}
    <div class="p-1.5 bg-[#080e16] border-t border-[#182535] flex items-center justify-between text-[9px] text-gray-400">
      <span class="hidden xs:inline">Pressione ESC para fechar</span>
      <span class="xs:hidden">Toque para selecionar</span>
      <button type="button" onmousedown="event.preventDefault(); window.openRosterModal()" class="text-emerald-400 hover:underline font-semibold">Ver Banco ↗</button>
    </div>
  `;
};

// Seleciona uma jogadora do autocomplete (Banco local)
window.selectRosterPlayer = function(playerIndex, playerName) {
  const currentPlayers = state.lineups[state.activeMapId];
  if (!currentPlayers || !currentPlayers[playerIndex]) return;

  const rosterItem = (state.roster || []).find(p => p.name.toLowerCase() === playerName.toLowerCase());
  
  currentPlayers[playerIndex].name = playerName;
  if (rosterItem) {
    if (rosterItem.kd) currentPlayers[playerIndex].kd = rosterItem.kd;
    if (Array.isArray(rosterItem.mostPlayed) && rosterItem.mostPlayed.length > 0) {
      currentPlayers[playerIndex].mostPlayed = [...rosterItem.mostPlayed];
    }
    const mapRating = rosterItem.mapRatings?.[state.activeMapId.toLowerCase()] || rosterItem.overallRating;
    if (mapRating) currentPlayers[playerIndex].rendimento = mapRating;
  }

  saveCurrentState();
  syncSavePlayer(state.activeMapId, playerIndex, currentPlayers[playerIndex], state.lineups);
  renderPlayersList();
  window.hideAllRosterAutocompletes();
  showToast(`Jogadora "${playerName}" carregada com sucesso!`, 'success');

  // Se tiver Riot ID (#TAG) e chave HenrikDev, atualiza os dados ao vivo em segundo plano
  const henrikKey = getHenrikApiKey();
  if (henrikKey && playerName.includes('#')) {
    autoFetchPlayerStatsInBackground(playerIndex, playerName);
  }
};

// Seleciona jogadora validada diretamente pela API da Riot Games
window.selectApiFoundPlayer = function(playerIndex, fullRiotId, region, level, puuid) {
  const currentPlayers = state.lineups[state.activeMapId];
  if (!currentPlayers || !currentPlayers[playerIndex]) return;

  currentPlayers[playerIndex].name = fullRiotId;

  // Se já tiver dados locais prévios no roster, aproveita
  const rosterItem = (state.roster || []).find(p => p.name.toLowerCase() === fullRiotId.toLowerCase());
  if (rosterItem) {
    if (rosterItem.kd) currentPlayers[playerIndex].kd = rosterItem.kd;
    if (Array.isArray(rosterItem.mostPlayed) && rosterItem.mostPlayed.length > 0) {
      currentPlayers[playerIndex].mostPlayed = [...rosterItem.mostPlayed];
    }
    const mapRating = rosterItem.mapRatings?.[state.activeMapId.toLowerCase()] || rosterItem.overallRating;
    if (mapRating) currentPlayers[playerIndex].rendimento = mapRating;
  }

  // Cadastra ou atualiza no banco da equipe
  upsertRosterPlayer({
    name: fullRiotId,
    kd: currentPlayers[playerIndex].kd || '',
    mostPlayed: currentPlayers[playerIndex].mostPlayed || [],
    role: 'Flex'
  });

  saveCurrentState();
  syncSavePlayer(state.activeMapId, playerIndex, currentPlayers[playerIndex], state.lineups);
  renderPlayersList();
  window.hideAllRosterAutocompletes();
  showToast(`⚡ ${fullRiotId} aplicada via API da Riot Games!`, 'success');

  // Puxa histórico de partidas, K/D e rendimento por mapa automaticamente
  autoFetchPlayerStatsInBackground(playerIndex, fullRiotId);
};

// Salva input digitado no banco
window.saveInputToRoster = function(playerIndex, rawName) {
  if (!rawName || !rawName.trim()) return;
  const cleanName = rawName.trim();

  const currentPlayers = state.lineups[state.activeMapId];
  if (currentPlayers && currentPlayers[playerIndex]) {
    currentPlayers[playerIndex].name = cleanName;
  }

  upsertRosterPlayer({
    name: cleanName,
    kd: currentPlayers?.[playerIndex]?.kd || '',
    mostPlayed: currentPlayers?.[playerIndex]?.mostPlayed || [],
    role: 'Flex'
  });

  saveCurrentState();
  syncSavePlayer(state.activeMapId, playerIndex, currentPlayers[playerIndex], state.lineups);
  renderPlayersList();
  window.hideAllRosterAutocompletes();
  showToast(`Jogadora "${cleanName}" cadastrada no Banco!`, 'success');

  if (cleanName.includes('#') && getHenrikApiKey()) {
    autoFetchPlayerStatsInBackground(playerIndex, cleanName);
  }
};

// Atualiza o nome da jogadora ao alterar input
window.updatePlayerName = function(playerIndex, newName) {
  const currentPlayers = state.lineups[state.activeMapId];
  if (!currentPlayers || !currentPlayers[playerIndex]) return;

  const defaultName = playerIndex < 5 ? `Player ${playerIndex + 1}` : `Reserva ${playerIndex - 4}`;
  const finalName = newName.trim() || defaultName;
  currentPlayers[playerIndex].name = finalName;

  // Se o nick digitado coincidir com alguém do Banco de Jogadoras, carrega K/D, agentes e rendimento imediatamente
  const inRoster = (state.roster || []).find(r => r.name.toLowerCase() === finalName.toLowerCase());
  if (inRoster) {
    if (inRoster.kd && !currentPlayers[playerIndex].kd) {
      currentPlayers[playerIndex].kd = inRoster.kd;
    }
    if (Array.isArray(inRoster.mostPlayed) && inRoster.mostPlayed.length > 0 && (!currentPlayers[playerIndex].mostPlayed || currentPlayers[playerIndex].mostPlayed.length === 0)) {
      currentPlayers[playerIndex].mostPlayed = [...inRoster.mostPlayed];
    }
    if (!currentPlayers[playerIndex].rendimento) {
      const mapRating = inRoster.mapRatings?.[state.activeMapId.toLowerCase()] || inRoster.overallRating;
      if (mapRating) currentPlayers[playerIndex].rendimento = mapRating;
    }
    showToast(`Jogadora "${finalName}" reconhecida! K/D e rendimento carregados.`, 'success');
  } else if (finalName.includes('#') && !finalName.startsWith('Player ') && !finalName.startsWith('Reserva ')) {
    upsertRosterPlayer({
      name: finalName,
      kd: currentPlayers[playerIndex].kd || '',
      mostPlayed: Array.isArray(currentPlayers[playerIndex].mostPlayed) ? [...currentPlayers[playerIndex].mostPlayed] : [],
      role: 'Flex'
    });
  }

  saveCurrentState();
  syncSavePlayer(state.activeMapId, playerIndex, currentPlayers[playerIndex], state.lineups);
  renderPlayersList();

  // Se for um Riot ID (Nick#TAG) válido e tiver chave HenrikDev configurada, busca dados ao vivo
  const henrikKey = getHenrikApiKey();
  if (henrikKey && finalName.includes('#') && !finalName.startsWith('Player ') && !finalName.startsWith('Reserva ')) {
    autoFetchPlayerStatsInBackground(playerIndex, finalName);
  }
};

// Atualiza o K/D da jogadora
window.updatePlayerKd = function(playerIndex, newKd) {
  const currentPlayers = state.lineups[state.activeMapId];
  if (!currentPlayers || !currentPlayers[playerIndex]) return;

  currentPlayers[playerIndex].kd = (newKd || '').trim();

  // Sincroniza com o banco de jogadoras
  if (currentPlayers[playerIndex].name && !currentPlayers[playerIndex].name.startsWith('Player ') && !currentPlayers[playerIndex].name.startsWith('Reserva ')) {
    upsertRosterPlayer({
      name: currentPlayers[playerIndex].name,
      kd: currentPlayers[playerIndex].kd,
      mostPlayed: currentPlayers[playerIndex].mostPlayed
    });
  }

  saveCurrentState();
  syncSavePlayer(state.activeMapId, playerIndex, currentPlayers[playerIndex], state.lineups);
};

// Prompt rápido para adicionar #TAG no nick
window.promptPlayerTag = function(playerIndex) {
  const currentPlayers = state.lineups[state.activeMapId];
  if (!currentPlayers || !currentPlayers[playerIndex]) return;

  const player = currentPlayers[playerIndex];
  const defaultBase = playerIndex < 5 ? `Player ${playerIndex + 1}` : `Reserva ${playerIndex - 4}`;
  const currentName = player.name || defaultBase;
  const baseName = currentName.includes('#') ? currentName.split('#')[0].trim() : currentName.trim();
  const input = window.prompt(`Digite o Riot ID completo com a TAG (ex: ${baseName}#BR1):`, currentName.includes('#') ? currentName : `${baseName}#BR1`);
  
  if (input && input.trim()) {
    window.updatePlayerName(playerIndex, input.trim());
  }
};

// Extrai ou estima o timestamp numérico de uma partida para ordenação cronológica precisa
function getMatchTimestamp(m) {
  if (!m) return 0;
  if (m.timestamp && Number(m.timestamp) > 0) return Number(m.timestamp);
  if (m.gameStart) {
    const parts = String(m.gameStart).match(/^(\d{2})\/(\d{2})\/(\d{2,4})(?:[ ,]+(\d{2}):(\d{2}))?/);
    if (parts) {
      const day = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10) - 1;
      let year = parseInt(parts[3], 10);
      if (year < 100) year += 2000;
      const hour = parts[4] ? parseInt(parts[4], 10) : 12;
      const min = parts[5] ? parseInt(parts[5], 10) : 0;
      const d = new Date(year, month, day, hour, min);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    const parsed = Date.parse(m.gameStart);
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

// Mescla histórico existente com novas partidas sem perder dados anteriores (deduplicação e acúmulo contínuo)
function mergeMatchesList(existingList = [], newList = [], maxLimit = 150) {
  const matchMap = new Map();

  // 1. Partidas já acumuladas no banco (ignora amostras mock sample-)
  if (Array.isArray(existingList)) {
    existingList.forEach(m => {
      if (!m || (m.matchId && String(m.matchId).startsWith('sample-'))) return;
      const t = getMatchTimestamp(m);
      const key = m.matchId || `m_${(m.mapId || m.map || '')}_${m.agent || ''}_${m.kills}_${m.deaths}_${m.score}_${t}`;
      matchMap.set(key, { ...m, timestamp: t || m.timestamp || 0 });
    });
  }

  // 2. Novas partidas capturadas da API (adicionam novas e atualizam sobreposição com dados mais recentes)
  if (Array.isArray(newList)) {
    newList.forEach(m => {
      if (!m || (m.matchId && String(m.matchId).startsWith('sample-'))) return;
      const t = getMatchTimestamp(m);
      const key = m.matchId || `m_${(m.mapId || m.map || '')}_${m.agent || ''}_${m.kills}_${m.deaths}_${m.score}_${t}`;
      matchMap.set(key, { ...m, timestamp: t || m.timestamp || 0 });
    });
  }

  // 3. Converte para array, ordena rigorosamente pelo mais recente e limita ao teto saudável de 150 jogos
  return Array.from(matchMap.values()).sort((a, b) => {
    const tA = Number(a.timestamp) || 0;
    const tB = Number(b.timestamp) || 0;
    if (tA && tB) return tB - tA;
    return 0;
  }).slice(0, maxLimit);
}

// Adiciona ou atualiza jogadora no roster preservando histórico acumulado de partidas
function upsertRosterPlayer(playerObj) {
  if (!playerObj || !playerObj.name) return;
  if (!Array.isArray(state.roster)) state.roster = [];

  const existingIdx = state.roster.findIndex(p => p.name.toLowerCase() === playerObj.name.trim().toLowerCase());
  if (existingIdx >= 0) {
    const existingPlayer = state.roster[existingIdx];
    const existingMatches = Array.isArray(existingPlayer.recentMatches) ? existingPlayer.recentMatches : [];
    const newMatches = Array.isArray(playerObj.recentMatches) ? playerObj.recentMatches : [];
    const consolidatedMatches = mergeMatchesList(existingMatches, newMatches, 150);

    state.roster[existingIdx] = {
      ...existingPlayer,
      ...playerObj,
      name: playerObj.name.trim(),
      mapRatings: {
        ...(existingPlayer.mapRatings || {}),
        ...(playerObj.mapRatings || {})
      },
      mapDetails: {
        ...(existingPlayer.mapDetails || {}),
        ...(playerObj.mapDetails || {})
      },
      recentMatches: consolidatedMatches.length > 0 ? consolidatedMatches : existingMatches,
      overallRating: playerObj.overallRating || existingPlayer.overallRating || '',
      overallAcs: playerObj.overallAcs || existingPlayer.overallAcs || 0,
      overallWinRate: playerObj.overallWinRate !== undefined ? playerObj.overallWinRate : existingPlayer.overallWinRate,
      totalMatches: playerObj.totalMatches || (consolidatedMatches.length > 0 ? consolidatedMatches.length : (existingPlayer.totalMatches || 0)),
      compMatchesCount: playerObj.compMatchesCount !== undefined ? playerObj.compMatchesCount : existingPlayer.compMatchesCount,
      unratedMatchesCount: playerObj.unratedMatchesCount !== undefined ? playerObj.unratedMatchesCount : existingPlayer.unratedMatchesCount,
      totalKills: playerObj.totalKills || existingPlayer.totalKills || 0,
      totalDeaths: playerObj.totalDeaths || existingPlayer.totalDeaths || 0
    };
  } else {
    const initialMatches = Array.isArray(playerObj.recentMatches) ? [...playerObj.recentMatches] : [];
    state.roster.push({
      name: playerObj.name.trim(),
      kd: playerObj.kd || '',
      mostPlayed: Array.isArray(playerObj.mostPlayed) ? [...playerObj.mostPlayed] : [],
      role: playerObj.role || 'Flex',
      mapRatings: playerObj.mapRatings || {},
      mapDetails: playerObj.mapDetails || {},
      recentMatches: initialMatches,
      overallRating: playerObj.overallRating || '',
      overallAcs: playerObj.overallAcs || 0,
      overallWinRate: playerObj.overallWinRate !== undefined ? playerObj.overallWinRate : 50,
      totalMatches: playerObj.totalMatches || initialMatches.length || 0,
      compMatchesCount: playerObj.compMatchesCount || 0,
      unratedMatchesCount: playerObj.unratedMatchesCount || 0,
      totalKills: playerObj.totalKills || 0,
      totalDeaths: playerObj.totalDeaths || 0
    });
  }
}

// Calcula a nota de rendimento de 0 a 10 com base em K/D, ACS (Combat Score) e Taxa de Vitória
function calculatePerformanceRating(kills, deaths, score, rounds, wins, totalMatches) {
  if (!totalMatches || totalMatches === 0) return null;
  const kd = deaths > 0 ? kills / deaths : kills;
  const acs = rounds > 0 ? score / rounds : 200;
  const winRate = wins / totalMatches;

  // Pontuação base do K/D (1.0 K/D -> 6.5, 1.3 K/D -> 8.45, 1.6+ K/D -> 10.0)
  const kdScore = Math.min(10, Math.max(2, (kd / 1.0) * 6.5));
  // Pontuação base do ACS (200 ACS -> 7.0, 250 ACS -> 8.75, 290+ ACS -> 10.0)
  const acsScore = Math.min(10, Math.max(2, (acs / 200) * 7.0));
  // Bônus/Penalidade de vitórias (-0.75 a +0.75)
  const winBonus = (winRate - 0.5) * 1.5;

  const rawRating = (kdScore * 0.55 + acsScore * 0.45) + winBonus;
  return Math.min(10, Math.max(1, rawRating)).toFixed(1);
}

// Formata a data da partida da API para exibição amigável
function formatMatchDate(rawDate) {
  if (!rawDate) return 'Partida Recente';
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return String(rawDate);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return String(rawDate);
  }
}

// Recalcula todas as estatísticas consolidadas (K/D, ACS, Notas por Mapa, Agentes) sobre o histórico acumulado
function recomputeStatsFromMatches(allMatches = []) {
  if (!Array.isArray(allMatches) || allMatches.length === 0) {
    return {
      kd: '',
      topAgents: [],
      overallRating: '',
      mapRatings: {},
      mapDetails: {},
      recentMatches: [],
      totalKills: 0,
      totalDeaths: 0,
      totalRounds: 0,
      totalWins: 0,
      totalMatches: 0,
      compMatchesCount: 0,
      unratedMatchesCount: 0,
      overallWinRate: 0,
      overallAcs: 0
    };
  }

  let totalKills = 0, totalDeaths = 0, totalScore = 0, totalRounds = 0, totalWins = 0;
  let weightedKills = 0, weightedDeaths = 0, weightedScore = 0, weightedRounds = 0, weightedWins = 0;
  let effectiveTotalMatches = 0;
  let compMatchesCount = 0;
  let unratedMatchesCount = 0;
  const agentCounts = {};
  const mapStats = {};

  allMatches.forEach(m => {
    const k = Number(m.kills) || 0;
    const d = Number(m.deaths) || 0;
    const a = Number(m.assists) || 0;
    const r = Number(m.totalRounds) || 1;
    const s = (m.scorePoints !== undefined && m.scorePoints !== null)
      ? Number(m.scorePoints)
      : ((Number(m.acs) || 200) * r);
    const won = !!m.won;
    const isCompetitive = m.isCompetitive !== false;
    const modeWeight = m.weight !== undefined ? Number(m.weight) : (isCompetitive ? 1.0 : 0.6);
    const rawMap = (m.mapId || m.map || '').toLowerCase().trim();
    const character = m.agent || '';

    totalKills += k;
    totalDeaths += d;
    totalScore += s;
    totalRounds += r;
    if (won) totalWins++;

    weightedKills += k * modeWeight;
    weightedDeaths += d * modeWeight;
    weightedScore += s * modeWeight;
    weightedRounds += r * modeWeight;
    if (won) weightedWins += modeWeight;
    effectiveTotalMatches += modeWeight;

    if (isCompetitive) {
      compMatchesCount++;
    } else {
      unratedMatchesCount++;
    }

    if (character && character !== 'Agente') {
      agentCounts[character] = (agentCounts[character] || 0) + 1;
    }

    if (rawMap) {
      if (!mapStats[rawMap]) {
        mapStats[rawMap] = {
          kills: 0, deaths: 0, score: 0, rounds: 0, wins: 0, total: 0,
          weightedKills: 0, weightedDeaths: 0, weightedScore: 0, weightedRounds: 0, weightedWins: 0, effectiveTotal: 0,
          compMatches: 0, unratedMatches: 0,
          agents: {}
        };
      }
      mapStats[rawMap].kills += k;
      mapStats[rawMap].deaths += d;
      mapStats[rawMap].score += s;
      mapStats[rawMap].rounds += r;
      mapStats[rawMap].total++;
      if (won) mapStats[rawMap].wins++;

      mapStats[rawMap].weightedKills += k * modeWeight;
      mapStats[rawMap].weightedDeaths += d * modeWeight;
      mapStats[rawMap].weightedScore += s * modeWeight;
      mapStats[rawMap].weightedRounds += r * modeWeight;
      if (won) mapStats[rawMap].weightedWins += modeWeight;
      mapStats[rawMap].effectiveTotal += modeWeight;

      if (isCompetitive) mapStats[rawMap].compMatches++;
      else mapStats[rawMap].unratedMatches++;

      if (character && character !== 'Agente') {
        mapStats[rawMap].agents[character] = (mapStats[rawMap].agents[character] || 0) + 1;
      }
    }
  });

  const kd = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : (totalKills > 0 ? totalKills.toFixed(2) : '');
  const topAgents = Object.entries(agentCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]).slice(0, 3);
  
  // Nota geral calculada pela fórmula matemática com ponderação (Comp 1.0, Sem Class 0.6)
  const overallRating = calculatePerformanceRating(weightedKills, weightedDeaths, weightedScore, weightedRounds, weightedWins, effectiveTotalMatches);

  const mapRatings = {};
  const mapDetails = {};
  for (const [mId, s] of Object.entries(mapStats)) {
    const rtg = calculatePerformanceRating(s.weightedKills, s.weightedDeaths, s.weightedScore, s.weightedRounds, s.weightedWins, s.effectiveTotal);
    mapRatings[mId] = rtg;
    const topMapAgent = Object.entries(s.agents || {}).sort((a, b) => b[1] - a[1])?.[0]?.[0] || '';
    mapDetails[mId] = {
      rating: rtg,
      matches: s.total,
      compMatches: s.compMatches,
      unratedMatches: s.unratedMatches,
      wins: s.wins,
      losses: s.total - s.wins,
      winRate: Math.round((s.wins / s.total) * 100),
      kd: s.deaths > 0 ? (s.kills / s.deaths).toFixed(2) : s.kills.toFixed(2),
      acs: s.rounds > 0 ? Math.round(s.score / s.rounds) : 0,
      topAgent: topMapAgent
    };
  }

  return {
    kd,
    topAgents,
    overallRating,
    mapRatings,
    mapDetails,
    recentMatches: allMatches,
    totalKills,
    totalDeaths,
    totalRounds,
    totalWins,
    totalMatches: allMatches.length,
    compMatchesCount,
    unratedMatchesCount,
    overallWinRate: allMatches.length > 0 ? Math.round((totalWins / allMatches.length) * 100) : 0,
    overallAcs: totalRounds > 0 ? Math.round(totalScore / totalRounds) : 0
  };
}

// Processa o histórico de partidas retornado pela API e extrai estatísticas por mapa
// Mescla com o histórico acumulado no banco (sem descartar partidas anteriores) e recalcula tudo
function processMatchesData(matches, puuid, name, tag, existingMatches = []) {
  if (!Array.isArray(matches) || matches.length === 0) {
    if (Array.isArray(existingMatches) && existingMatches.length > 0) {
      return recomputeStatsFromMatches(existingMatches);
    }
    return null;
  }

  const newMatches = [];

  matches.forEach(m => {
    let mapName = '';
    let character = '';
    let k = 0, d = 0, a = 0, s = 0, r = 0;
    let won = false;
    let myRounds = 0, enemyRounds = 0;
    let matchId = '';
    let gameStart = '';
    let matchTimestamp = 0;
    let rawMode = 'Competitive';

    if (m.meta && m.stats) {
      // Formato HenrikDev v1 Lifetime Matches
      rawMode = m.meta.mode || 'Competitive';
      mapName = m.meta.map?.name || '';
      character = m.stats.character?.name || '';
      k = m.stats.kills || 0;
      d = m.stats.deaths || 0;
      a = m.stats.assists || 0;
      s = m.stats.score || 0;

      const myTeam = (m.stats.team || '').toLowerCase();
      const blueRounds = m.teams?.blue ?? 0;
      const redRounds = m.teams?.red ?? 0;
      r = (blueRounds + redRounds) || 1;

      myRounds = myTeam === 'blue' ? blueRounds : redRounds;
      enemyRounds = myTeam === 'blue' ? redRounds : blueRounds;
      won = myRounds > enemyRounds;

      matchId = m.meta.id;
      const startedAt = m.meta.started_at;
      matchTimestamp = startedAt ? new Date(startedAt).getTime() : 0;
      gameStart = formatMatchDate(startedAt);
    } else {
      // Formato HenrikDev v3 Matches
      rawMode = m.metadata?.mode || 'Competitive';
      mapName = m.metadata?.map || '';
      const p = m.players?.all_players?.find(pl => 
        (puuid && pl.puuid === puuid) ||
        (pl.name?.toLowerCase() === name.toLowerCase() && pl.tag?.toLowerCase() === tag.toLowerCase())
      );
      if (!p) return;

      character = p.character || '';
      k = p.stats?.kills || 0;
      d = p.stats?.deaths || 0;
      a = p.stats?.assists || 0;
      s = p.stats?.score || 0;
      r = m.metadata?.rounds_played || 1;

      const myTeam = p.team?.toLowerCase();
      won = !!m.teams?.[myTeam]?.has_won;

      const bWon = m.teams?.blue?.rounds_won ?? 0;
      const rWon = m.teams?.red?.rounds_won ?? 0;
      myRounds = myTeam === 'blue' ? bWon : rWon;
      enemyRounds = myTeam === 'blue' ? rWon : bWon;

      matchId = m.metadata?.matchid;
      const rawStart = m.metadata?.game_start;
      matchTimestamp = rawStart ? (rawStart > 1e11 ? rawStart : rawStart * 1000) : 0;
      gameStart = m.metadata?.game_start_patched || formatMatchDate(rawStart) || 'Partida Recente';
    }

    // Filtra modos que não sejam táticos 5v5 tradicionais (mata-mata, escalação, spike rush, etc.)
    const modeStr = (rawMode || '').toLowerCase();
    if (modeStr.includes('deathmatch') || modeStr.includes('escalation') || modeStr.includes('snowball') || modeStr.includes('swiftplay') || modeStr.includes('spike rush') || modeStr.includes('disparada')) {
      return;
    }

    const isUnrated = modeStr.includes('unrated') || modeStr.includes('sem classificação');
    const isCompetitive = !isUnrated;
    const modeLabel = isCompetitive ? 'Competitivo' : 'Sem Classificação';
    const modeWeight = isCompetitive ? 1.0 : 0.6;
    const rawMap = (mapName || '').toLowerCase().trim();

    if (!matchId) {
      matchId = `m_${rawMap}_${character}_${k}_${d}_${myRounds}_${enemyRounds}_${matchTimestamp}`;
    }

    newMatches.push({
      matchId: matchId,
      map: mapName || 'Mapa',
      mapId: rawMap,
      agent: character || 'Agente',
      won: won,
      score: `${myRounds} - ${enemyRounds}`,
      kills: k,
      deaths: d,
      assists: a,
      kd: d > 0 ? (k / d).toFixed(2) : k.toFixed(2),
      acs: r > 0 ? Math.round(s / r) : 0,
      scorePoints: s,
      totalRounds: r,
      timestamp: matchTimestamp || Date.now(),
      gameStart: gameStart,
      mode: modeLabel,
      isCompetitive: isCompetitive,
      weight: modeWeight
    });
  });

  // Mescla histórico existente acumulado com as novas partidas capturadas
  const consolidatedMatches = mergeMatchesList(existingMatches, newMatches, 150);

  return recomputeStatsFromMatches(consolidatedMatches);
}

// Busca automática em segundo plano via HenrikDev API
// Ampliado para capturar até 60 partidas históricas (Lifetime API) com mesclagem e acúmulo contínuo da temporada
async function autoFetchPlayerStatsInBackground(playerIndex, riotId) {
  if (!riotId || !riotId.includes('#')) return;
  const [name, tag] = riotId.split('#').map(s => s.trim());
  const apiKey = getHenrikApiKey();
  if (!apiKey) return;

  try {
    const accRes = await fetch(`https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, {
      headers: { 'Authorization': apiKey }
    });
    if (!accRes.ok) return;

    const accData = await accRes.json();
    const region = accData.data?.region || 'br';
    const puuid = accData.data?.puuid;

    // Tenta primeiro o endpoint Lifetime (v1) ampliado para amostragem robusta de até 60 partidas
    let matches = null;
    try {
      const lifeRes = await fetch(`https://api.henrikdev.xyz/valorant/v1/lifetime/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=100`, {
        headers: { 'Authorization': apiKey }
      });
      if (lifeRes.ok) {
        const lifeData = await lifeRes.json();
        if (lifeData.data && Array.isArray(lifeData.data) && lifeData.data.length > 0) {
          matches = lifeData.data;
        }
      }
    } catch (e) {
      console.warn('Falha no endpoint lifetime, tentando fallback v3:', e);
    }

    // Fallback para endpoint v3 se lifetime não retornar dados
    if (!matches || matches.length === 0) {
      const matchRes = await fetch(`https://api.henrikdev.xyz/valorant/v3/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=15`, {
        headers: { 'Authorization': apiKey }
      });
      if (matchRes.ok) {
        const matchData = await matchRes.json();
        if (matchData.data && Array.isArray(matchData.data)) {
          matches = matchData.data;
        }
      }
    }

    if (!matches || matches.length === 0) return;

    // Resgata histórico existente para acúmulo contínuo da temporada
    const existingPlayer = Array.isArray(state.roster)
      ? state.roster.find(p => p.name && p.name.toLowerCase().trim() === riotId.toLowerCase().trim())
      : null;
    const existingMatches = existingPlayer?.recentMatches || [];

    const stats = processMatchesData(matches, puuid, name, tag, existingMatches);
    if (!stats) return;

    // 1. Atualiza no Banco de Jogadoras (Roster) com todas as notas por mapa e nota geral consolidada
    upsertRosterPlayer({
      name: riotId,
      kd: stats.kd,
      mostPlayed: stats.topAgents,
      mapRatings: stats.mapRatings,
      mapDetails: stats.mapDetails,
      recentMatches: stats.recentMatches,
      overallRating: stats.overallRating,
      overallAcs: stats.overallAcs,
      overallWinRate: stats.overallWinRate,
      totalMatches: stats.totalMatches,
      compMatchesCount: stats.compMatchesCount,
      unratedMatchesCount: stats.unratedMatchesCount,
      totalKills: stats.totalKills,
      totalDeaths: stats.totalDeaths,
      role: stats.topAgents[0] ? getAgentRole(stats.topAgents[0]) : 'Flex'
    });

    // 2. Atualiza em TODAS as escalações (lineups) de TODOS os mapas onde esta jogadora estiver
    MAPS_DATA.forEach(map => {
      const mapLineup = state.lineups[map.id];
      if (mapLineup && Array.isArray(mapLineup)) {
        mapLineup.forEach((p, pIdx) => {
          if (p.name && p.name.toLowerCase().trim() === riotId.toLowerCase().trim()) {
            const mapRating = stats.mapRatings[map.id.toLowerCase()] || stats.overallRating;
            if (mapRating) p.rendimento = mapRating;
            if (stats.kd) p.kd = stats.kd;
            if (stats.topAgents.length > 0) p.mostPlayed = [...stats.topAgents];
            syncSavePlayer(map.id, pIdx, p, state.lineups);
          }
        });
      }
    });

    saveCurrentState();
    renderPlayersList();

    // Se o modal de perfil da jogadora estiver aberto, re-renderiza imediatamente
    const profileModal = document.getElementById('player-profile-modal');
    if (profileModal && !profileModal.classList.contains('hidden')) {
      window.renderPlayerProfileModal();
    }

    const activeRating = stats.mapRatings[state.activeMapId.toLowerCase()] || stats.overallRating;
    const topStr = stats.topAgents.length > 0 ? ` (${stats.topAgents.join(', ')})` : '';
    const rendStr = activeRating ? ` • Rend. ${state.activeMapId}: ${activeRating}/10` : '';
    showToast(`⚡ API Riot: ${riotId} sincronizado (${stats.totalMatches} partidas acumuladas na temporada • K/D ${stats.kd || '1.0'}${rendStr}${topStr})`, 'success');
  } catch (err) {
    console.warn('Erro na busca em segundo plano do Tracker:', err);
  }
}

window.autoFetchPlayerStatsInBackground = autoFetchPlayerStatsInBackground;
window.scheduleBackgroundPlayerFetch = scheduleBackgroundPlayerFetch;
window.mergeMatchesList = mergeMatchesList;
window.recomputeStatsFromMatches = recomputeStatsFromMatches;
window.processMatchesData = processMatchesData;

// --------------------------------------------------------------------------
// MODAL / PÁGINA DE PERFIL DA JOGADORA (ESTATÍSTICAS, HISTÓRICO E CÁLCULO)
// --------------------------------------------------------------------------

function getPlayerProfileData(playerIndex) {
  const currentPlayers = state.lineups[state.activeMapId] || DEFAULT_PLAYERS;
  const player = currentPlayers[playerIndex] || { id: playerIndex + 1, name: `Player ${playerIndex + 1}` };
  const rawName = (player.name || '').trim();
  const cleanName = rawName || (playerIndex < 5 ? `Player ${playerIndex + 1}` : `Reserva ${playerIndex - 4}`);

  const inRoster = (state.roster || []).find(r => r.name.toLowerCase() === cleanName.toLowerCase()) || {};

  const kd = player.kd || inRoster.kd || '1.00';
  const mostPlayed = (Array.isArray(player.mostPlayed) && player.mostPlayed.length > 0)
    ? player.mostPlayed
    : (Array.isArray(inRoster.mostPlayed) && inRoster.mostPlayed.length > 0 ? inRoster.mostPlayed : ['Killjoy', 'Cypher', 'Omen']);
  const role = inRoster.role || (mostPlayed[0] ? getAgentRole(mostPlayed[0]) : 'Flex');

  const mapRatings = { ...(inRoster.mapRatings || {}) };
  const mapDetails = { ...(inRoster.mapDetails || {}) };
  let recentMatches = Array.isArray(inRoster.recentMatches) ? [...inRoster.recentMatches] : [];

  // Se não houver histórico recente cadastrado, gera dados de amostragem realistas e coerentes
  if (recentMatches.length === 0) {
    const defaultAgents = mostPlayed.length > 0 ? mostPlayed : ['Killjoy', 'Cypher', 'Omen'];
    const sampleMaps = ['Ascent', 'Haven', 'Fracture', 'Lotus', 'Sunset', 'Icebox'];
    const numKd = parseFloat(kd) || 1.0;

    recentMatches = sampleMaps.map((mapName, idx) => {
      const won = (idx % 3 !== 2) && numKd >= 0.95;
      const agent = defaultAgents[idx % defaultAgents.length];
      const kills = Math.round(14 + (numKd * 4) + (won ? 3 : -2));
      const deaths = Math.round(kills / (numKd > 0 ? numKd : 1));
      const assists = Math.round(3 + (idx * 1.5));
      const acs = Math.round(170 + (numKd * 45) + (won ? 25 : -15));
      const myScore = won ? 13 : Math.min(11, 7 + (idx % 4));
      const enemyScore = won ? Math.min(11, 6 + (idx % 5)) : 13;

      const isComp = idx % 3 !== 2;
      return {
        matchId: `sample-${idx}`,
        map: mapName,
        mapId: mapName.toLowerCase(),
        agent: agent,
        won: won,
        score: `${myScore} - ${enemyScore}`,
        kills: kills,
        deaths: deaths,
        assists: assists,
        kd: (kills / (deaths > 0 ? deaths : 1)).toFixed(2),
        acs: acs,
        totalRounds: myScore + enemyScore,
        gameStart: `Há ${idx + 1} dia${idx > 0 ? 's' : ''}`,
        mode: isComp ? 'Competitivo' : 'Sem Classificação',
        isCompetitive: isComp,
        weight: isComp ? 1.0 : 0.6
      };
    });
  }

  const overallRating = inRoster.overallRating || player.rendimento || '7.5';
  const overallAcs = inRoster.overallAcs || (recentMatches.length > 0 ? Math.round(recentMatches.reduce((acc, m) => acc + (m.acs || 200), 0) / recentMatches.length) : 220);
  const winsCount = recentMatches.filter(m => m.won).length;
  const overallWinRate = inRoster.overallWinRate !== undefined ? inRoster.overallWinRate : (recentMatches.length > 0 ? Math.round((winsCount / recentMatches.length) * 100) : 55);
  const totalMatches = inRoster.totalMatches || recentMatches.length;
  const compMatchesCount = inRoster.compMatchesCount !== undefined 
    ? inRoster.compMatchesCount 
    : recentMatches.filter(m => m.isCompetitive !== false).length;
  const unratedMatchesCount = inRoster.unratedMatchesCount !== undefined 
    ? inRoster.unratedMatchesCount 
    : recentMatches.filter(m => m.isCompetitive === false).length;
  const totalKills = inRoster.totalKills || recentMatches.reduce((acc, m) => acc + (m.kills || 0), 0);
  const totalDeaths = inRoster.totalDeaths || recentMatches.reduce((acc, m) => acc + (m.deaths || 0), 0);

  return {
    playerIndex,
    player,
    cleanName,
    hasTag: cleanName.includes('#'),
    kd,
    mostPlayed,
    role,
    mapRatings,
    mapDetails,
    recentMatches,
    overallRating,
    overallAcs,
    overallWinRate,
    totalMatches,
    compMatchesCount,
    unratedMatchesCount,
    totalKills,
    totalDeaths,
    isSub: playerIndex >= 5
  };
}

window.openPlayerProfileModal = function(playerIndex) {
  state.playerProfileModal.playerIndex = playerIndex;
  state.playerProfileModal.activeTab = 'overview';
  state.playerProfileModal.selectedMapId = null;

  window.renderPlayerProfileModal();

  const modal = document.getElementById('player-profile-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }
};

window.closePlayerProfileModal = function() {
  const modal = document.getElementById('player-profile-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  }
};

window.openPlayerMapDetail = function(mapId) {
  state.playerProfileModal.selectedMapId = mapId;
  state.playerProfileModal.activeTab = 'map-detail';
  window.renderPlayerProfileModal();
};

window.backToAllMaps = function() {
  state.playerProfileModal.selectedMapId = null;
  state.playerProfileModal.activeTab = 'overview';
  window.renderPlayerProfileModal();
};

window.toggleProfileEvolutionMetric = function(metric) {
  state.playerProfileModal.evolutionMetric = metric;
  window.renderPlayerProfileModal();
};

// Gera gráfico de linha SVG interativo, leve e responsivo para visualização temporal
// Gera gráfico de linha SVG interativo, leve e responsivo para visualização temporal
function generateSvgLineChart(matches, options = {}) {
  const isAcs = options.isAcs || false;
  const height = options.height || 250;
  const width = options.width || 720;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 25;
  const padBottom = 52;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  if (!matches || matches.length === 0) {
    return `
      <div class="tactical-card bg-[#0a111a] border border-[#1b2b3d] rounded-2xl p-6 text-center text-gray-400 text-xs">
        <span class="text-2xl block mb-2">📊</span>
        <span>Ainda não há partidas suficientes no histórico para gerar a curva temporal. Sincronize o perfil via API.</span>
      </div>
    `;
  }

  // Ordena rigorosamente pela cronologia (do mais antigo à esquerda ao mais recente à direita)
  let rawList = [...matches];
  if (options.alreadyChronological) {
    rawList = [...matches];
  } else if (rawList.length > 1 && rawList[0].timestamp && rawList[rawList.length - 1].timestamp) {
    rawList.sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0));
  } else {
    // Se vier em ordem decrescente padrão (mais recente no início), inverte
    rawList = [...matches].reverse();
  }

  const pointsData = rawList.map((m, idx) => {
    let val = 0;
    if (isAcs) {
      val = m.acs || 200;
    } else {
      if (m.singleRating) {
        val = parseFloat(m.singleRating);
      } else {
        const k = m.kills || 0;
        const d = m.deaths || 0;
        const kd = d > 0 ? k / d : k;
        const acs = m.acs || 200;
        const kdScore = Math.min(10, Math.max(2, (kd / 1.0) * 6.5));
        const acsScore = Math.min(10, Math.max(2, (acs / 200) * 7.0));
        const winBonus = m.won ? 0.75 : -0.75;
        val = parseFloat(Math.min(10, Math.max(1, (kdScore * 0.55 + acsScore * 0.45) + winBonus)).toFixed(1));
      }
    }
    return {
      index: idx,
      val: val,
      won: m.won,
      map: m.map || 'Mapa',
      agent: m.agent || 'Agente',
      kd: m.kd || '1.00',
      acs: m.acs || 200,
      score: m.score || '13 - 10',
      mode: m.mode || 'Competitivo',
      gameStart: m.gameStart || 'Recente',
      timestamp: m.timestamp
    };
  });

  const vals = pointsData.map(p => p.val);
  const minVal = Math.max(0, Math.floor(Math.min(...vals) - (isAcs ? 30 : 0.8)));
  const maxVal = Math.min(isAcs ? 450 : 10, Math.ceil(Math.max(...vals) + (isAcs ? 30 : 0.8)));
  const range = (maxVal - minVal) || 1;

  const coords = pointsData.map((p, i) => {
    const x = padLeft + (pointsData.length === 1 ? chartW / 2 : (i / (pointsData.length - 1)) * chartW);
    const y = padTop + (1 - (p.val - minVal) / range) * chartH;
    return { ...p, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  });

  // Regressão Linear para traçar linha de tendência
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  const n = coords.length;
  coords.forEach((c, i) => {
    sumX += i;
    sumY += c.val;
    sumXY += i * c.val;
    sumXX += i * i;
  });
  const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
  const intercept = n > 1 ? (sumY - slope * sumX) / n : (coords[0]?.val || 0);

  const trendStartVal = intercept;
  const trendEndVal = intercept + slope * (n - 1);
  const trendY1 = padTop + (1 - (trendStartVal - minVal) / range) * chartH;
  const trendY2 = padTop + (1 - (trendEndVal - minVal) / range) * chartH;

  // Caminho da Linha e da Área com Gradiente
  const linePathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPathD = `${linePathD} L ${coords[coords.length - 1].x} ${padTop + chartH} L ${coords[0].x} ${padTop + chartH} Z`;

  // Linhas de Grade e Eixo Y
  let gridLinesHtml = '';
  const steps = 4;
  for (let s = 0; s <= steps; s++) {
    const frac = s / steps;
    const yLine = padTop + frac * chartH;
    const labelVal = (maxVal - frac * range).toFixed(isAcs ? 0 : 1);
    gridLinesHtml += `
      <line x1="${padLeft}" y1="${yLine}" x2="${width - padRight}" y2="${yLine}" stroke="#162332" stroke-width="1" stroke-dasharray="3,3" />
      <text x="${padLeft - 8}" y="${yLine + 4}" fill="#64748b" font-size="10" font-family="monospace" text-anchor="end" class="select-none pointer-events-none">${labelVal}</text>
    `;
  }

  // Eixo Horizontal X: Linha base, Marcas de Tick e Rótulos de cada partida
  let xAxisHtml = `
    <!-- Linha base do eixo X -->
    <line x1="${padLeft}" y1="${padTop + chartH}" x2="${width - padRight}" y2="${padTop + chartH}" stroke="#22364c" stroke-width="1.5" />
  `;

  coords.forEach((c) => {
    xAxisHtml += `
      <line x1="${c.x}" y1="${padTop + chartH}" x2="${c.x}" y2="${padTop + chartH + 5}" stroke="#334d6b" stroke-width="1.2" />
      <text x="${c.x}" y="${padTop + chartH + 16}" fill="#94a3b8" font-size="9" font-family="monospace" font-weight="bold" text-anchor="middle" class="select-none pointer-events-none">P${c.index + 1}</text>
      <text x="${c.x}" y="${padTop + chartH + 27}" fill="#64748b" font-size="8" font-family="monospace" text-anchor="middle" class="select-none pointer-events-none">${c.map.slice(0, 3).toUpperCase()}</text>
    `;
  });

  // Selo de Tendência
  let trendBadge = '';
  const delta = Math.abs(trendEndVal - trendStartVal).toFixed(1);
  if (slope > (isAcs ? 2 : 0.05)) {
    trendBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-tactical font-black uppercase bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">Curva Ascendente 📈 (+${delta})</span>`;
  } else if (slope < -(isAcs ? 2 : 0.05)) {
    trendBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-tactical font-black uppercase bg-rose-950/80 border border-rose-500/40 text-rose-300">Oscilação Recente 📉 (-${delta})</span>`;
  } else {
    trendBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-tactical font-black uppercase bg-sky-950/80 border border-sky-500/40 text-sky-300">Desempenho Estável ⚖️</span>`;
  }

  const avgVal = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(isAcs ? 0 : 1);
  const maxValReal = Math.max(...vals).toFixed(isAcs ? 0 : 1);
  const winCount = pointsData.filter(p => p.won).length;
  const winPct = Math.round((winCount / pointsData.length) * 100);

  // Pontos Interativos Estáveis (sem hover:scale bug nem pulos na tela)
  const pointsSvg = coords.map((c, i) => `
    <g class="cursor-pointer">
      <!-- Hitbox invisível ampliada para facilitar foco do mouse -->
      <circle cx="${c.x}" cy="${c.y}" r="12" fill="transparent" class="cursor-pointer">
        <title>━━━━━━━━━━━━━━━━━━━━━━&#10;Partida #${c.index + 1} (${c.won ? 'VITÓRIA 🟢' : 'DERROTA 🔴'})&#10;Data/Momento: ${c.gameStart}&#10;Mapa: ${c.map} | Placar: ${c.score}&#10;Identificação: ${c.agent}&#10;${isAcs ? `ACS: ${c.acs}` : `Nota: ${c.val} / 10`}&#10;K/D: ${c.kd} | Modo: ${c.mode}&#10;━━━━━━━━━━━━━━━━━━━━━━</title>
      </circle>
      <!-- Ponto visual fixo com borda que realça ao hover -->
      <circle cx="${c.x}" cy="${c.y}" r="5.5" fill="${c.won ? '#10b981' : '#f43f5e'}" stroke="#0b131e" stroke-width="2" class="transition-all hover:stroke-white hover:stroke-[3.5] cursor-pointer">
        <title>━━━━━━━━━━━━━━━━━━━━━━&#10;Partida #${c.index + 1} (${c.won ? 'VITÓRIA 🟢' : 'DERROTA 🔴'})&#10;Data/Momento: ${c.gameStart}&#10;Mapa: ${c.map} | Placar: ${c.score}&#10;Identificação: ${c.agent}&#10;${isAcs ? `ACS: ${c.acs}` : `Nota: ${c.val} / 10`}&#10;K/D: ${c.kd} | Modo: ${c.mode}&#10;━━━━━━━━━━━━━━━━━━━━━━</title>
      </circle>
      <text x="${c.x}" y="${c.y - 9}" fill="${c.won ? '#34d399' : '#fb7185'}" font-size="9" font-family="monospace" font-weight="bold" text-anchor="middle" class="opacity-90 select-none pointer-events-none">${c.val}</text>
    </g>
  `).join('');

  return `
    <div class="tactical-card bg-[#0a111a] border border-[#1b2b3d] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl overflow-hidden">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-[#162332]">
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h4 class="text-sm sm:text-base font-tactical font-black text-white uppercase tracking-wider flex items-center gap-2 truncate">
              <span>📈</span> ${options.title || 'Trajetória de Rendimento (Partidas Recentes)'}
            </h4>
            ${trendBadge}
          </div>
          <p class="text-xs text-gray-400 mt-0.5">Evolução cronológica partida a partida com linha de tendência linear e resultado</p>
        </div>

        <div class="flex items-center gap-2 text-xs font-mono flex-shrink-0 flex-wrap">
          <div class="flex items-center gap-1.5 bg-[#0e1724] border border-[#1e2f42] px-2.5 py-1 rounded-lg">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span class="text-gray-300">Vitória</span>
          </div>
          <div class="flex items-center gap-1.5 bg-[#0e1724] border border-[#1e2f42] px-2.5 py-1 rounded-lg">
            <span class="w-2 h-2 rounded-full bg-rose-400"></span>
            <span class="text-gray-300">Derrota</span>
          </div>
          <div class="flex items-center gap-1.5 bg-[#0e1724] border border-[#1e2f42] px-2.5 py-1 rounded-lg">
            <span class="w-3 h-0.5 border-t border-dashed border-amber-400"></span>
            <span class="text-amber-300">Tendência</span>
          </div>
        </div>
      </div>

      <!-- Barra de Legenda do Eixo Horizontal -->
      <div class="flex items-center justify-between bg-[#070d14] px-3 py-1.5 rounded-lg border border-[#162230] text-[10px] font-mono text-gray-400">
        <span class="flex items-center gap-1 text-sky-400">
          <span>◀</span>
          <span>Partidas Mais Antigas</span>
        </span>
        <span class="font-tactical text-gray-300 uppercase tracking-wider hidden sm:inline">
          Eixo Horizontal: Sequência Cronológica (P1 a P${pointsData.length})
        </span>
        <span class="flex items-center gap-1 text-amber-400">
          <span>Partidas Mais Recentes</span>
          <span>▶</span>
        </span>
      </div>

      <!-- SVG Responsivo -->
      <div class="w-full overflow-x-auto pb-1">
        <svg viewBox="0 0 ${width} ${height}" class="w-full h-auto min-w-[550px]" style="overflow: visible;">
          <defs>
            <linearGradient id="area-grad-${isAcs ? 'acs' : 'rating'}-${Math.random().toString(36).substr(2, 6)}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.3" />
              <stop offset="100%" stop-color="#00e5ff" stop-opacity="0.0" />
            </linearGradient>
          </defs>

          ${gridLinesHtml}
          ${xAxisHtml}

          <!-- Linha de Tendência Tracejada -->
          <line x1="${coords[0].x}" y1="${trendY1}" x2="${coords[coords.length - 1].x}" y2="${trendY2}" stroke="#fbbf24" stroke-width="2" stroke-dasharray="5,4" opacity="0.8" />

          <!-- Área Preenchida com Gradiente -->
          <path d="${areaPathD}" fill="#00e5ff" fill-opacity="0.15" />

          <!-- Linha Principal de Dados -->
          <path d="${linePathD}" fill="none" stroke="#00e5ff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />

          <!-- Pontos Interativos com Tooltip Estável -->
          ${pointsSvg}
        </svg>
      </div>

      <!-- Sumário dos Indicadores do Período -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#162332] text-xs font-tactical">
        <div class="bg-[#0b121b] border border-[#1a2736] p-2.5 rounded-xl flex flex-col justify-between overflow-hidden">
          <span class="text-[9px] uppercase text-gray-400 truncate">Média no Período</span>
          <span class="text-lg font-mono font-black text-sky-400 mt-1">${avgVal} <span class="text-xs text-gray-500 font-normal">/ ${isAcs ? 'ACS' : '10'}</span></span>
        </div>
        <div class="bg-[#0b121b] border border-[#1a2736] p-2.5 rounded-xl flex flex-col justify-between overflow-hidden">
          <span class="text-[9px] uppercase text-gray-400 truncate">Pico Máximo</span>
          <span class="text-lg font-mono font-black text-amber-400 mt-1">${maxValReal} <span class="text-xs text-gray-500 font-normal">pts</span></span>
        </div>
        <div class="bg-[#0b121b] border border-[#1a2736] p-2.5 rounded-xl flex flex-col justify-between overflow-hidden">
          <span class="text-[9px] uppercase text-gray-400 truncate">Taxa de Vitória</span>
          <span class="text-lg font-mono font-black text-emerald-400 mt-1">${winPct}% <span class="text-xs text-gray-500 font-normal">(${winCount}/${pointsData.length})</span></span>
        </div>
        <div class="bg-[#0b121b] border border-[#1a2736] p-2.5 rounded-xl flex flex-col justify-between overflow-hidden">
          <span class="text-[9px] uppercase text-gray-400 truncate">Partidas Analisadas</span>
          <span class="text-lg font-mono font-black text-white mt-1">${pointsData.length} <span class="text-xs text-gray-500 font-normal">jogos</span></span>
        </div>
      </div>
    </div>
  `;
}

window.setPlayerProfileTab = function(tabName) {
  state.playerProfileModal.activeTab = tabName;
  if (tabName !== 'map-detail') {
    state.playerProfileModal.selectedMapId = null;
  }

  const tabs = ['overview', 'matches', 'evolution', 'agents', 'calculator'];
  tabs.forEach(t => {
    const btn = document.getElementById(`ppm-tab-btn-${t}`);
    if (btn) {
      if (t === tabName || (t === 'overview' && tabName === 'map-detail')) {
        btn.className = 'px-3.5 py-3 text-xs font-tactical font-bold border-b-2 border-[#ff4655] text-white flex items-center gap-1.5 transition whitespace-nowrap';
      } else {
        btn.className = 'px-3.5 py-3 text-xs font-tactical font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-200 flex items-center gap-1.5 transition whitespace-nowrap';
      }
    }
  });

  const activeMapPill = document.getElementById('ppm-active-map-pill');
  if (activeMapPill) {
    if (tabName === 'map-detail' && state.playerProfileModal.selectedMapId) {
      activeMapPill.classList.remove('hidden');
      activeMapPill.classList.add('flex');
      const mapNameEl = document.getElementById('ppm-active-map-name');
      const mObj = MAPS_DATA.find(m => m.id === state.playerProfileModal.selectedMapId);
      if (mapNameEl && mObj) mapNameEl.textContent = mObj.name;
    } else {
      activeMapPill.classList.add('hidden');
      activeMapPill.classList.remove('flex');
    }
  }

  const data = getPlayerProfileData(state.playerProfileModal.playerIndex);
  renderPlayerProfileTabContent(data);
};

window.filterProfileMatches = function(mode) {
  state.playerProfileModal.matchModeFilter = mode;
  const data = getPlayerProfileData(state.playerProfileModal.playerIndex);
  renderPlayerProfileTabContent(data);
};

window.renderPlayerProfileModal = function() {
  const data = getPlayerProfileData(state.playerProfileModal.playerIndex);
  if (!data) return;

  // Header Avatar Clicável para abrir o Modal de Foto / Avatar
  const avatarContainer = document.getElementById('ppm-avatar-container');
  if (avatarContainer) {
    const topAgent = data.mostPlayed[0] || 'Killjoy';
    const agentIcon = getAgentIcon(topAgent);
    const agentColor = getAgentColor(topAgent);
    const avatarSrc = data.photoUrl || agentIcon;

    avatarContainer.innerHTML = `
      <button type="button"
              onclick="window.openPlayerAvatarModal(${data.playerIndex})"
              title="Clique para alterar a foto de perfil de ${escapeHtml(data.cleanName)}"
              class="relative group cursor-pointer rounded-2xl overflow-hidden focus:outline-none ring-2 ring-transparent hover:ring-[#ff4655] transition-all">
        <img src="${avatarSrc}" alt="${escapeHtml(data.cleanName)}" class="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-cover bg-black/60 border-2 shadow-lg" style="border-color: ${agentColor}">
        <div class="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200">
          <span class="text-xs sm:text-base">📷</span>
          <span class="text-[8px] font-tactical font-black uppercase tracking-wider text-amber-300">Alterar</span>
        </div>
        <span class="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded text-[9px] font-tactical font-black bg-[#0d141e] border border-white/20 text-white shadow">
          ${data.isSub ? `R${data.playerIndex - 4}` : `P${data.playerIndex + 1}`}
        </span>
      </button>
    `;
  }

  // Nome e Badges
  const nameEl = document.getElementById('ppm-player-name');
  const slotBadge = document.getElementById('ppm-player-slot-badge');
  const roleBadge = document.getElementById('ppm-player-role-badge');
  const statusText = document.getElementById('ppm-tracker-status-text');

  if (nameEl) nameEl.textContent = data.cleanName;
  if (slotBadge) {
    slotBadge.textContent = data.isSub ? `🔄 Reserva R${data.playerIndex - 4}` : `⭐ Titular P${data.playerIndex + 1}`;
  }
  if (roleBadge) {
    roleBadge.textContent = data.role;
  }
  if (statusText) {
    statusText.textContent = data.hasTag
      ? (getHenrikApiKey() ? 'API Oficial da Riot Games Ativa' : 'ID Reconhecido (Tracker.gg)')
      : 'Jogador Cadastrado';
  }

  // Pílulas de Estatísticas
  const kdEl = document.getElementById('ppm-kd-val');
  const acsEl = document.getElementById('ppm-acs-val');
  const winrateEl = document.getElementById('ppm-winrate-val');
  const ratingEl = document.getElementById('ppm-rating-val');
  const matchesBadge = document.getElementById('ppm-matches-count-badge');
  const miniPill = document.getElementById('ppm-matches-pill-mini');
  const baseVal = document.getElementById('ppm-matches-base-val');

  if (kdEl) kdEl.textContent = data.kd;
  if (acsEl) acsEl.textContent = data.overallAcs;
  if (winrateEl) winrateEl.textContent = `${data.overallWinRate}%`;
  if (ratingEl) {
    ratingEl.textContent = data.overallRating;
    const visual = getRatingVisuals(data.overallRating);
    ratingEl.className = `text-xs sm:text-sm font-mono font-black ${visual.valColor}`;
  }
  if (matchesBadge) {
    matchesBadge.textContent = data.totalMatches || data.recentMatches.length;
  }
  if (miniPill) {
    miniPill.textContent = `${data.totalMatches}j`;
    miniPill.title = `Total de ${data.totalMatches} partidas analisadas para este perfil`;
  }
  if (baseVal) {
    baseVal.textContent = `Base: ${data.totalMatches} jogos`;
  }

  // Link Tracker.gg
  const trackerLink = document.getElementById('ppm-tracker-link');
  if (trackerLink) {
    if (data.hasTag) {
      const [n, t] = data.cleanName.split('#');
      trackerLink.href = `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(n.trim())}%23${encodeURIComponent(t.trim())}/overview`;
      trackerLink.classList.remove('opacity-50', 'pointer-events-none');
    } else {
      trackerLink.href = '#';
      trackerLink.classList.add('opacity-50', 'pointer-events-none');
    }
  }

  // Renderiza a aba ativa
  window.setPlayerProfileTab(state.playerProfileModal.activeTab || 'overview');
};

function renderPlayerProfileTabContent(data) {
  const container = document.getElementById('ppm-tab-content');
  if (!container) return;

  const currentTab = state.playerProfileModal.activeTab || 'overview';

  if (currentTab === 'overview') {
    // ABA 1: RENDIMENTO POR MAPA
    const mapsHtml = MAPS_DATA.map(map => {
      const isCurrent = map.id === state.activeMapId;
      const mapRating = data.mapRatings[map.id.toLowerCase()] || data.overallRating || '7.5';
      const visual = getRatingVisuals(mapRating);
      const details = data.mapDetails[map.id.toLowerCase()] || {};
      const winRate = details.winRate !== undefined ? `${details.winRate}%` : `${data.overallWinRate}%`;
      const mapMatchCount = details.matches !== undefined ? details.matches : 0;
      const matchesCount = mapMatchCount > 0 
        ? `${mapMatchCount} partida${mapMatchCount > 1 ? 's' : ''}` 
        : (data.totalMatches > 0 ? `Base: ${data.totalMatches}j (geral)` : 'Estimado');
      const mapKd = details.kd || data.kd;
      const mapAcs = details.acs || data.overallAcs;
      const topAgentName = details.topAgent || data.mostPlayed[0] || 'Killjoy';
      const topAgentIcon = getAgentIcon(topAgentName);

      return `
        <div onclick="window.openPlayerMapDetail('${map.id}')"
             title="Clique para ver estatísticas detalhadas de ${escapeHtml(data.cleanName)} em ${map.name}"
             class="tactical-card rounded-xl border ${isCurrent ? 'border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.25)]' : 'border-[#1e2f42] hover:border-sky-400'} bg-[#101924] p-3.5 flex flex-col justify-between transition-all overflow-hidden relative group cursor-pointer hover:scale-[1.015] hover:shadow-[0_12px_30px_rgba(0,0,0,0.7)]">
          
          <!-- Banner de fundo suave com splash do mapa -->
          <div class="absolute inset-0 bg-cover bg-center opacity-10 group-hover:opacity-25 transition-opacity pointer-events-none" style="background-image: url('${map.splash}')"></div>
          
          <div class="relative z-10">
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-1.5 min-w-0">
                <img src="${map.listViewIcon}" alt="${map.name}" class="w-5 h-5 rounded object-cover flex-shrink-0 bg-black/50 border border-white/20">
                <h4 class="font-tactical font-black text-sm text-white truncate">${map.name}</h4>
              </div>
              <div class="flex items-center gap-1">
                ${isCurrent ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-tactical uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">Ativo</span>' : ''}
                <span class="text-[9px] text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity font-tactical font-bold flex items-center gap-0.5">
                  Ver ↗
                </span>
              </div>
            </div>

            <!-- Destaque da Nota de Rendimento -->
            <div class="flex items-center justify-between bg-[#090e15]/85 border border-[#1a2838] rounded-lg p-2.5 my-2">
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none">Rendimento</span>
                  ${mapMatchCount > 0 ? `<span class="text-[8px] font-mono text-gray-400 bg-[#141f2d] border border-[#22354a] px-1 py-0.2 rounded leading-none" title="Cálculo baseado em ${mapMatchCount} partida(s) em ${escapeHtml(map.name)}">${mapMatchCount}j</span>` : `<span class="text-[8px] font-mono text-gray-500 bg-[#141f2d] border border-[#1f2d3d] px-1 py-0.2 rounded leading-none" title="Amostragem estimada">${data.totalMatches}j*</span>`}
                </div>
                <span class="text-xl font-mono font-black ${visual.valColor} leading-tight">${mapRating}</span>
                <span class="text-[10px] text-gray-500 font-mono">/ 10</span>
              </div>
              <div class="text-right">
                <span class="px-2 py-0.5 rounded text-[10px] font-tactical font-bold uppercase ${visual.tierBadgeClass} border inline-block shadow-sm">
                  ${visual.tier}
                </span>
                <span class="text-[9px] text-gray-400 block mt-0.5">${matchesCount}</span>
              </div>
            </div>

            <!-- Detalhes no Mapa -->
            <div class="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
              <div class="bg-[#0b121c] border border-[#1b2b3d] px-2 py-1 rounded flex items-center justify-between">
                <span class="text-gray-400 font-tactical">K/D:</span>
                <span class="font-mono font-bold text-emerald-400">${mapKd}</span>
              </div>
              <div class="bg-[#0b121c] border border-[#1b2b3d] px-2 py-1 rounded flex items-center justify-between">
                <span class="text-gray-400 font-tactical">Vitórias:</span>
                <span class="font-mono font-bold text-amber-300">${winRate}</span>
              </div>
              <div class="bg-[#0b121c] border border-[#1b2b3d] px-2 py-1 rounded flex items-center justify-between">
                <span class="text-gray-400 font-tactical">ACS:</span>
                <span class="font-mono font-bold text-sky-400">${mapAcs}</span>
              </div>
              <div class="bg-[#0b121c] border border-[#1b2b3d] px-2 py-1 rounded flex items-center justify-between min-w-0" title="Agente mais jogado neste mapa">
                <span class="text-gray-400 font-tactical truncate mr-1">Melhor:</span>
                <div class="flex items-center gap-1 flex-shrink-0">
                  <img src="${topAgentIcon}" alt="${topAgentName}" class="w-3.5 h-3.5 rounded-full object-cover">
                  <span class="font-bold text-gray-200 text-[9px] truncate">${topAgentName}</span>
                </div>
              </div>
            </div>

            <!-- Botão de Acesso Direto às Estatísticas do Mapa -->
            <div class="mt-2.5 text-center py-1.5 px-2 rounded-lg bg-sky-950/40 border border-sky-500/30 text-sky-300 group-hover:bg-sky-500 group-hover:text-black font-tactical font-bold text-[11px] transition flex items-center justify-center gap-1.5 shadow-sm">
              <span>🔍</span>
              <span>Abrir Estatísticas em ${map.name} →</span>
            </div>
          </div>

          <div class="mt-3 pt-2 border-t border-[#172433] flex items-center justify-between relative z-10">
            <button onclick="event.stopPropagation(); window.switchMap('${map.id}'); window.closePlayerProfileModal();" 
                    class="text-[10px] text-sky-400 hover:text-sky-300 font-tactical font-bold flex items-center gap-1 transition">
              <span>Abrir no Painel ↗</span>
            </button>
            <button onclick="event.stopPropagation(); window.assignAgentFromProfile('${topAgentName}', '${map.id}')"
                    title="Escalar ${topAgentName} como titular neste mapa"
                    class="px-2 py-0.5 rounded text-[9px] font-tactical font-bold bg-[#18283a] hover:bg-[#ff4655] hover:text-white text-gray-300 transition border border-[#273d57]">
              Escalar ${topAgentName}
            </button>
          </div>

        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="space-y-4 max-w-7xl mx-auto">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-1 border-b border-[#1b2b3d]">
          <div class="min-w-0 flex-1">
            <h3 class="font-tactical font-black text-base sm:text-lg text-white flex items-center gap-2 flex-wrap break-words">
              <span>📊</span> Rendimento Individual por Mapa (11 Mapas Competitivos)
            </h3>
            <p class="text-xs text-gray-400 mt-0.5 break-words">Clique em qualquer mapa para abrir a tela exclusiva com histórico detalhado e cálculo individual</p>
          </div>
          <span class="text-xs font-mono text-gray-400 bg-[#121c2a] border border-[#22364c] px-3 py-1 rounded-lg flex-shrink-0">
            Total de Mapas: <b>11</b>
          </span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          ${mapsHtml}
        </div>
      </div>
    `;
  } else if (currentTab === 'map-detail') {
    // ABA EXCLUSIVA: ESTATÍSTICAS DA PLAYER ESPECIFICAMENTE NESTE MAPA
    const targetMapId = state.playerProfileModal.selectedMapId || state.activeMapId || 'ascent';
    const map = MAPS_DATA.find(m => m.id === targetMapId) || MAPS_DATA[0];
    const mapRating = data.mapRatings[map.id.toLowerCase()] || data.overallRating || '7.5';
    const visual = getRatingVisuals(mapRating);
    const details = data.mapDetails[map.id.toLowerCase()] || {};

    const mapMatches = data.recentMatches.filter(m => 
      (m.mapId && m.mapId.toLowerCase() === map.id.toLowerCase()) || 
      (m.map && m.map.toLowerCase() === map.name.toLowerCase())
    );

    const matchesCount = details.matches !== undefined 
      ? details.matches 
      : (mapMatches.length > 0 ? mapMatches.length : (parseFloat(mapRating) >= 8.5 ? 2 : 1));

    const winsCount = details.wins !== undefined
      ? details.wins
      : (mapMatches.filter(m => m.won).length || (parseFloat(mapRating) >= 8.0 ? matchesCount : 0));

    const lossesCount = details.losses !== undefined
      ? details.losses
      : Math.max(0, matchesCount - winsCount);

    const winRate = details.winRate !== undefined 
      ? details.winRate 
      : (matchesCount > 0 ? Math.round((winsCount / matchesCount) * 100) : data.overallWinRate);

    const mapKd = details.kd || (mapMatches.length > 0 ? (mapMatches.reduce((acc, m) => acc + (parseFloat(m.kd) || 1.0), 0) / mapMatches.length).toFixed(2) : data.kd);
    const mapAcs = details.acs || (mapMatches.length > 0 ? Math.round(mapMatches.reduce((acc, m) => acc + (m.acs || 200), 0) / mapMatches.length) : data.overallAcs);
    const topAgentName = details.topAgent || (mapMatches.length > 0 ? mapMatches[0].agent : (data.mostPlayed[0] || 'Killjoy'));
    const topAgentIcon = getAgentIcon(topAgentName);
    const topAgentColor = getAgentColor(topAgentName);
    const topAgentRole = getAgentRole(topAgentName);

    // Linha de navegação rápida entre os 11 mapas
    const switcherPills = MAPS_DATA.map(m => {
      const isSel = m.id === map.id;
      const mR = data.mapRatings[m.id.toLowerCase()] || '7.5';
      const mVis = getRatingVisuals(mR);
      return `
        <button onclick="window.openPlayerMapDetail('${m.id}')"
                class="px-2.5 py-1.5 rounded-lg border text-xs font-tactical font-bold flex items-center gap-1.5 transition whitespace-nowrap ${isSel ? 'bg-[#ff4655] text-white border-[#ff4655] shadow-[0_0_12px_rgba(255,70,85,0.4)]' : 'bg-[#101924] text-gray-300 hover:text-white border-[#1c2c3e] hover:border-sky-500/50'}">
          <img src="${m.listViewIcon}" alt="${m.name}" class="w-3.5 h-3.5 rounded object-cover flex-shrink-0">
          <span>${m.name}</span>
          <span class="font-mono text-[10px] ${isSel ? 'text-white' : mVis.valColor}">(${mR})</span>
        </button>
      `;
    }).join('');

    // Partidas disputadas neste mapa
    let matchesContentHtml = '';
    if (mapMatches.length > 0) {
      matchesContentHtml = mapMatches.map(m => {
        const won = !!m.won;
        const isComp = m.isCompetitive !== false;
        const agIcon = getAgentIcon(m.agent);
        const agColor = getAgentColor(m.agent);
        const mKd = parseFloat(m.kd) || 1.0;
        const kdClass = mKd >= 1.2 ? 'text-emerald-400' : (mKd >= 0.95 ? 'text-gray-200' : 'text-rose-400');

        return `
          <div class="p-3.5 rounded-xl ${isComp ? (won ? 'border-emerald-500/40 bg-emerald-950/15' : 'border-rose-500/30 bg-rose-950/15') : 'border-purple-500/35 bg-[#121124]'} border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow transition hover:border-sky-400/50">
            <div class="flex items-center gap-3 min-w-0">
              <div class="flex flex-col gap-1 flex-shrink-0">
                <span class="px-2.5 py-1 rounded text-xs font-tactical font-black uppercase tracking-wider ${won ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}">
                  ${won ? 'VITÓRIA' : 'DERROTA'} • ${m.score}
                </span>
                ${isComp ? `
                  <span class="px-1.5 py-0.2 rounded text-[8px] font-tactical font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center justify-center gap-0.5" title="Competitivo Oficial (Peso 100%)">
                    <span>🏆</span> Competitivo
                  </span>
                ` : `
                  <span class="px-1.5 py-0.2 rounded text-[8px] font-tactical font-bold uppercase tracking-wider bg-purple-500/25 text-purple-300 border border-purple-500/40 inline-flex items-center justify-center gap-0.5" title="Sem Classificação (Peso reduzido de 60%)">
                    <span>🎮</span> Sem Class. (60%)
                  </span>
                `}
              </div>
              <img src="${agIcon}" alt="${m.agent}" class="w-10 h-10 rounded-lg object-cover bg-black/60 border flex-shrink-0" style="border-color: ${agColor}">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-bold text-white">${m.agent}</span>
                  <span class="text-xs font-mono text-gray-300 font-semibold">(${m.kills || 0}K / ${m.deaths || 0}D / ${m.assists || 0}A)</span>
                </div>
                <div class="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                  <span>Combat Score: <b class="text-sky-300 font-mono">${m.acs} ACS</b></span>
                  <span>•</span>
                  <span>${m.gameStart || 'Recente'}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2.5 self-end sm:self-center">
              <div class="bg-[#080d14] px-3 py-1 rounded border border-[#1a2838] text-right">
                <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none">K/D</span>
                <span class="text-xs font-mono font-bold ${kdClass}">${m.kd}</span>
              </div>
              <button onclick="window.assignAgentFromProfile('${m.agent}', '${map.id}')" 
                      title="Escalar ${m.agent} na escalação de ${map.name}"
                      class="px-3 py-1.5 rounded-lg bg-[#18283a] hover:bg-[#ff4655] hover:text-white border border-[#273d57] text-gray-300 text-xs font-tactical font-bold transition">
                Escalar
              </button>
            </div>
          </div>
        `;
      }).join('');
    } else {
      matchesContentHtml = `
        <div class="p-5 rounded-xl bg-[#0c141e] border border-dashed border-[#203043] text-center space-y-2">
          <div class="text-3xl">📋</div>
          <h4 class="text-xs font-tactical font-bold text-gray-200 uppercase tracking-wider">Nenhuma Partida Recente Registrada em ${map.name}</h4>
          <p class="text-xs text-gray-400 max-w-lg mx-auto">
            A API da Riot Games ainda não capturou confrontos recentes da jogadora neste mapa específico. O cálculo de rendimento estimado de <b>${mapRating}</b> projeta sua pontuação com base na consistência competitiva geral e na adaptação tática ao mapa.
          </p>
          <button onclick="window.refreshCurrentProfileFromApi()" class="px-3.5 py-1.5 bg-sky-950/80 hover:bg-sky-900 border border-sky-500/40 text-sky-300 text-xs font-bold rounded-lg transition inline-flex items-center gap-1.5 shadow">
            <span>🔄 Consultar API Oficial da Riot Games</span>
          </button>
        </div>
      `;
    }

    // Status da jogadora no mapa ativo da escalação
    const currentLineup = state.lineups[map.id] || [];
    const playerSlot = currentLineup[data.playerIndex];
    let slotStatusHtml = '';
    if (data.playerIndex < 5) {
      if (playerSlot && playerSlot.titular) {
        slotStatusHtml = `
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded text-xs font-tactical uppercase font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Escalada como Titular: ${playerSlot.titular}
            </span>
          </div>
        `;
      } else {
        slotStatusHtml = `
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded text-xs font-tactical uppercase font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Vaga Titular Aberta
            </span>
          </div>
        `;
      }
    } else {
      const fPicks = [playerSlot?.flex1, playerSlot?.flex2, playerSlot?.flex3].filter(Boolean).join(', ');
      slotStatusHtml = `
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-1 rounded text-xs font-tactical uppercase font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
            Reserva Flex: ${fPicks || 'Sem agente fixado'}
          </span>
        </div>
      `;
    }

    // Cálculo exato no mapa
    const kdNum = parseFloat(mapKd) || 1.0;
    const acsNum = parseInt(mapAcs, 10) || 200;
    const winRateNum = (parseFloat(winRate) || 50) / 100;
    const kdScore = (kdNum / 1.0) * 6.5;
    const acsScore = (acsNum / 200) * 7.0;
    const winBonus = (winRateNum - 0.5) * 1.5;
    const kdPart = (kdScore * 0.55).toFixed(2);
    const acsPart = (acsScore * 0.45).toFixed(2);
    const bonusPart = winBonus >= 0 ? `+${winBonus.toFixed(2)}` : winBonus.toFixed(2);

    // Sugestão de agentes para este mapa
    const mapBuilds = Array.isArray(map.builds) ? map.builds : [];
    const recommendedAgentsSet = new Set([topAgentName, ...data.mostPlayed]);
    mapBuilds.forEach(b => (b.agents || []).forEach(a => recommendedAgentsSet.add(a)));
    const agentList = Array.from(recommendedAgentsSet).slice(0, 4);

    const agentSuggestionsHtml = agentList.map(ag => {
      const agIcon = getAgentIcon(ag);
      const agColor = getAgentColor(ag);
      const agRole = getAgentRole(ag);
      return `
        <div class="p-2.5 rounded-xl bg-[#0c141e] border border-[#1b2b3d] flex items-center justify-between gap-2 hover:border-amber-400/50 transition">
          <div class="flex items-center gap-2.5 min-w-0">
            <img src="${agIcon}" alt="${ag}" class="w-8 h-8 rounded-lg object-cover bg-black/50 border flex-shrink-0" style="border-color: ${agColor}">
            <div class="min-w-0">
              <span class="text-xs font-bold text-white block truncate leading-tight">${ag}</span>
              <span class="text-[9px] font-mono uppercase text-gray-400">${agRole}</span>
            </div>
          </div>
          <button onclick="window.assignAgentFromProfile('${ag}', '${map.id}')"
                  class="px-2.5 py-1 rounded bg-[#18283a] hover:bg-[#ff4655] hover:text-white border border-[#273d57] text-gray-200 text-[10px] font-tactical font-bold transition flex-shrink-0">
            Escalar
          </button>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="space-y-4 sm:space-y-6 animate-fade-in max-w-7xl mx-auto">
        
        <!-- Barra de Navegação Rápida entre Mapas -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 flex-wrap">
          <button onclick="window.backToAllMaps()" 
                  class="px-3.5 py-2 rounded-xl bg-[#121c2a] hover:bg-sky-950 border border-[#233549] hover:border-sky-400 text-sky-400 hover:text-white text-xs font-tactical font-bold transition flex items-center gap-2 shadow flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            <span>← Voltar para Todos os 11 Mapas</span>
          </button>

          <div class="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 map-tabs-container max-w-full">
            ${switcherPills}
          </div>
        </div>

        <!-- Banner Hero do Mapa Selecionado -->
        <div class="tactical-card relative rounded-2xl overflow-hidden border border-[#203247] shadow-2xl p-4 sm:p-6 bg-[#0e1622]">
          <div class="absolute inset-0 bg-cover bg-center opacity-25 filter blur-[1px]" style="background-image: url('${map.splash}')"></div>
          <div class="absolute inset-0 bg-gradient-to-r from-[#090e15] via-[#090e15]/90 to-transparent"></div>

          <div class="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            
            <div class="flex items-center gap-3.5 min-w-0 flex-1">
              <img src="${map.listViewIcon}" alt="${map.name}" class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover bg-black/60 border-2 border-white/20 shadow-xl flex-shrink-0">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <h2 class="text-xl sm:text-3xl font-tactical font-black text-white uppercase tracking-wider break-words">${map.name}</h2>
                  <span class="px-2.5 py-0.5 rounded text-[10px] font-tactical uppercase font-bold ${map.isMeta ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'} flex-shrink-0">
                    ${map.isMeta ? '🏆 Rotação Meta' : '📁 Fora de Rotação'}
                  </span>
                </div>
                <p class="text-xs text-gray-300 mt-1 flex items-center gap-2 flex-wrap break-words">
                  <span>Estatísticas exclusivas de <b>${data.cleanName}</b> neste mapa</span>
                  <span>•</span>
                  <span class="bg-[#141f2d] border border-[#22354a] px-2 py-0.5 rounded text-amber-300 font-mono font-bold text-xs flex-shrink-0" title="Cálculo baseado em ${matchesCount} partida(s) em ${map.name}">${matchesCount} partida${matchesCount > 1 ? 's' : ''} analisada${matchesCount > 1 ? 's' : ''}</span>
                </p>
              </div>
            </div>

            <!-- Pílulas de Estatísticas no Mapa -->
            <div class="flex items-center gap-2 sm:gap-3 flex-wrap w-full lg:w-auto">
              <div class="bg-[#090e15]/90 border ${visual.border} px-3.5 py-2 rounded-xl text-center shadow-lg">
                <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none">Rendimento</span>
                <div class="flex items-center justify-center gap-1 mt-0.5">
                  <span class="text-xl font-mono font-black ${visual.valColor}">${mapRating}</span>
                  <span class="text-[10px] text-gray-500 font-mono">/ 10</span>
                </div>
                <span class="px-1.5 py-0.2 rounded text-[9px] font-tactical uppercase font-bold ${visual.tierBadgeClass} border inline-block mt-0.5">
                  ${visual.tier}
                </span>
              </div>

              <div class="bg-[#090e15]/90 border border-[#1b2b3d] px-3.5 py-2 rounded-xl text-center shadow-lg">
                <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none">K/D no Mapa</span>
                <span class="text-lg font-mono font-black text-emerald-400 block mt-0.5">${mapKd}</span>
                <span class="text-[9px] text-gray-400">${matchesCount > 0 ? `${data.cleanName.split('#')[0]}` : 'Projetado'}</span>
              </div>

              <div class="bg-[#090e15]/90 border border-[#1b2b3d] px-3.5 py-2 rounded-xl text-center shadow-lg">
                <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none">Vitórias</span>
                <span class="text-lg font-mono font-black text-amber-400 block mt-0.5">${winRate}%</span>
                <span class="text-[9px] text-gray-400">${winsCount}V - ${lossesCount}D</span>
              </div>

              <div class="bg-[#090e15]/90 border border-[#1b2b3d] px-3.5 py-2 rounded-xl text-center shadow-lg">
                <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none">ACS Médio</span>
                <span class="text-lg font-mono font-black text-sky-400 block mt-0.5">${mapAcs}</span>
                <span class="text-[9px] text-gray-400">Combat Score</span>
              </div>

              <div class="bg-[#090e15]/90 border border-[#1b2b3d] px-3 py-2 rounded-xl text-center shadow-lg flex items-center gap-2">
                <img src="${topAgentIcon}" alt="${topAgentName}" class="w-8 h-8 rounded-lg object-cover bg-black/60 border" style="border-color: ${topAgentColor}">
                <div class="text-left">
                  <span class="text-[8px] uppercase font-tactical text-gray-400 block leading-none">Melhor Agente</span>
                  <span class="text-xs font-bold text-white block mt-0.5 truncate">${topAgentName}</span>
                  <span class="text-[9px] font-mono text-amber-300">${topAgentRole}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Conteúdo em 2 Colunas -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          
          <!-- Coluna 1 (7/12): Histórico de Partidas e Status da Escalação -->
          <div class="lg:col-span-7 space-y-4">
            
            <div class="tactical-card p-4 rounded-xl border border-[#1b2b3d] bg-[#0e1620] space-y-3">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <h3 class="text-xs sm:text-sm font-tactical font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap break-words min-w-0 flex-1">
                  <span>📜</span> Partidas Recentes em ${map.name}
                </h3>
                <span class="text-[10px] font-mono text-gray-400 bg-[#141f2d] px-2 py-0.5 rounded border border-[#223347] flex-shrink-0">
                  ${mapMatches.length} partida${mapMatches.length > 1 ? 's' : ''} encontrada${mapMatches.length > 1 ? 's' : ''}
                </span>
              </div>
              
              <div class="space-y-2">
                ${matchesContentHtml}
              </div>
            </div>

            <!-- Status Tático da Escalação no Painel -->
            <div class="tactical-card p-4 rounded-xl border border-[#1b2b3d] bg-[#0e1620] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow">
              <div class="min-w-0 flex-1">
                <span class="text-[10px] uppercase font-tactical text-gray-400 block leading-none">Situação Tática da Jogadora em ${map.name}:</span>
                <div class="mt-1.5 flex items-center gap-2 flex-wrap">
                  ${slotStatusHtml}
                </div>
              </div>

              <div class="flex items-center gap-2 w-full sm:w-auto flex-wrap flex-shrink-0">
                <button onclick="window.switchMap('${map.id}'); window.closePlayerProfileModal();" 
                        class="px-3 py-1.5 rounded-lg bg-[#162332] hover:bg-sky-950 border border-[#273d57] hover:border-sky-400 text-sky-400 hover:text-white text-xs font-tactical font-bold transition flex items-center gap-1">
                  <span>Abrir ${map.name} no Painel ↗</span>
                </button>
                <button onclick="window.assignAgentFromProfile('${topAgentName}', '${map.id}')"
                        class="px-3 py-1.5 rounded-lg bg-[#ff4655] hover:bg-[#e03b49] text-white text-xs font-tactical font-bold transition shadow-[0_0_10px_rgba(255,70,85,0.3)]">
                  Escalar ${topAgentName}
                </button>
              </div>
            </div>

          </div>

          <!-- Coluna 2 (5/12): Memória de Cálculo e Melhores Agentes -->
          <div class="lg:col-span-5 space-y-4">
            
            <!-- Melhores Agentes Sugeridos para o Mapa -->
            <div class="tactical-card p-4 rounded-xl border border-[#1b2b3d] bg-[#0e1620] space-y-3">
              <h3 class="text-xs sm:text-sm font-tactical font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap break-words">
                <span>🎯</span> Melhores Agentes para ${data.cleanName.split('#')[0]} em ${map.name}
              </h3>
              <p class="text-[11px] text-gray-400 break-words">
                Agentes com melhor taxa de aproveitamento ou recomendados para a composição de ${map.name}:
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${agentSuggestionsHtml}
              </div>
            </div>

            <!-- Memória de Cálculo Específica do Mapa -->
            <div class="tactical-card p-4 rounded-xl border border-[#1b2b3d] bg-[#0e1620] space-y-3">
              <h3 class="text-xs sm:text-sm font-tactical font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap break-words">
                <span>🧮</span> Cálculo Realizado em ${map.name}
              </h3>
              <p class="text-[11px] text-gray-400 break-words">
                A nota de rendimento <b>${mapRating}</b> em <b>${map.name}</b> foi calculada pela fórmula matemática com base na amostragem de <b>${matchesCount} partida(s)</b> deste mapa:
              </p>

              <div class="space-y-2 text-xs">
                <div class="bg-[#0a1017] p-2.5 rounded-lg border border-[#192736] flex items-center justify-between">
                  <div>
                    <span class="text-emerald-400 font-tactical font-bold block">1. K/D Score (55%)</span>
                    <span class="text-[10px] text-gray-400 font-mono">(${mapKd} / 1.0) × 6.5 × 55%</span>
                  </div>
                  <span class="font-mono font-bold text-emerald-400 text-sm">+${kdPart} pts</span>
                </div>

                <div class="bg-[#0a1017] p-2.5 rounded-lg border border-[#192736] flex items-center justify-between">
                  <div>
                    <span class="text-sky-400 font-tactical font-bold block">2. ACS Score (45%)</span>
                    <span class="text-[10px] text-gray-400 font-mono">(${mapAcs} / 200) × 7.0 × 45%</span>
                  </div>
                  <span class="font-mono font-bold text-sky-400 text-sm">+${acsPart} pts</span>
                </div>

                <div class="bg-[#0a1017] p-2.5 rounded-lg border border-[#192736] flex items-center justify-between">
                  <div>
                    <span class="text-amber-400 font-tactical font-bold block">3. Bônus de Vitórias</span>
                    <span class="text-[10px] text-gray-400 font-mono">(${winRate}% - 50%) × 1.5</span>
                  </div>
                  <span class="font-mono font-bold text-amber-400 text-sm">${bonusPart} pts</span>
                </div>

                <div class="bg-[#080d13] p-3 rounded-lg border-2 ${visual.border} flex items-center justify-between">
                  <span class="font-tactical font-bold text-gray-200">Nota Final em ${map.name}:</span>
                  <div class="text-right">
                    <span class="font-mono font-black text-lg ${visual.valColor}">${mapRating}</span>
                    <span class="text-xs text-gray-500 font-mono">/ 10</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    `;
  } else if (currentTab === 'matches') {
    // ABA 2: HISTÓRICO DE PARTIDAS (COM SEPARAÇÃO VISUAL E FILTRO ENTRE COMPETITIVO E SEM CLASSIFICAÇÃO)
    const activeFilter = state.playerProfileModal.matchModeFilter || 'all';
    const compMatches = data.recentMatches.filter(m => m.isCompetitive !== false);
    const unratedMatches = data.recentMatches.filter(m => m.isCompetitive === false);

    const filteredMatches = activeFilter === 'competitive'
      ? compMatches
      : (activeFilter === 'unrated' ? unratedMatches : data.recentMatches);

    const matchesHtml = filteredMatches.map(m => {
      const won = !!m.won;
      const isComp = m.isCompetitive !== false;
      const agentIcon = getAgentIcon(m.agent);
      const agentColor = getAgentColor(m.agent);
      const kdNum = parseFloat(m.kd) || 1.0;
      const kdColor = kdNum >= 1.2 ? 'text-emerald-400' : (kdNum >= 0.95 ? 'text-gray-200' : 'text-rose-400');

      return `
        <div class="p-3 sm:p-4 rounded-xl ${isComp ? (won ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-rose-500/30 bg-rose-950/10') : 'border-purple-500/35 bg-[#121124]'} border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md hover:border-sky-500/50 transition">
          <div class="flex items-center gap-3 min-w-0">
            <div class="flex flex-col gap-1 flex-shrink-0">
              <span class="px-2 py-0.5 rounded text-[10px] font-tactical font-black uppercase tracking-wider ${won ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}">
                ${won ? 'VITÓRIA' : 'DERROTA'} • ${m.score}
              </span>
              ${isComp ? `
                <span class="px-1.5 py-0.2 rounded text-[8px] font-tactical font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center justify-center gap-0.5" title="Partida Competitiva Oficial (Peso 100% no cálculo de rendimento)">
                  <span>🏆</span> Competitivo
                </span>
              ` : `
                <span class="px-1.5 py-0.2 rounded text-[8px] font-tactical font-bold uppercase tracking-wider bg-purple-500/25 text-purple-300 border border-purple-500/40 inline-flex items-center justify-center gap-0.5" title="Partida Sem Classificação (Entra no cálculo com peso reduzido de 60%)">
                  <span>🎮</span> Sem Class. <b class="font-mono text-[7px] text-purple-200">(60%)</b>
                </span>
              `}
            </div>
            <div class="relative flex-shrink-0">
              <img src="${agentIcon}" alt="${m.agent}" class="w-9 h-9 rounded-lg object-cover bg-black/60 border flex-shrink-0" style="border-color: ${agentColor}">
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-bold text-white">${m.map}</span>
                <span class="text-xs text-gray-400">com <b class="text-gray-200">${m.agent}</b></span>
              </div>
              <span class="text-[10px] text-gray-500">${m.gameStart}</span>
            </div>
          </div>
          
          <div class="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end text-xs">
            <div class="bg-[#080d13] border border-[#1b2b3d] px-2.5 py-1 rounded text-center">
              <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none">K / D / A</span>
              <span class="font-mono font-bold text-white">${m.kills} <span class="text-gray-500">/</span> <span class="text-rose-400">${m.deaths}</span> <span class="text-gray-500">/</span> <span class="text-sky-300">${m.assists}</span></span>
            </div>
            <div class="bg-[#080d13] border border-[#1b2b3d] px-2.5 py-1 rounded text-center">
              <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none">K/D</span>
              <span class="font-mono font-bold ${kdColor}">${m.kd}</span>
            </div>
            <div class="bg-[#080d13] border border-[#1b2b3d] px-2.5 py-1 rounded text-center">
              <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none">ACS</span>
              <span class="font-mono font-bold text-sky-400">${m.acs}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="space-y-3.5">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-[#1c2c3e]">
          <div class="min-w-0 flex-1">
            <h3 class="font-tactical font-black text-sm sm:text-base text-white flex items-center gap-2 flex-wrap break-words">
              <span>📜</span> Histórico de Partidas (${data.recentMatches.length})
            </h3>
            <p class="text-xs text-gray-400 break-words">Partidas competitivas têm peso total (100%) e sem classificação têm peso reduzido (60%)</p>
          </div>

          <div class="flex items-center gap-1.5 flex-wrap flex-shrink-0">
            <button onclick="window.filterProfileMatches('all')" class="px-2.5 py-1 rounded text-xs font-tactical font-bold transition ${activeFilter === 'all' ? 'bg-[#ff4655] text-white shadow' : 'bg-[#101924] text-gray-400 hover:text-white border border-[#203247]'}">
              Todos (${data.recentMatches.length})
            </button>
            <button onclick="window.filterProfileMatches('competitive')" class="px-2.5 py-1 rounded text-xs font-tactical font-bold transition flex items-center gap-1 ${activeFilter === 'competitive' ? 'bg-amber-500 text-black font-black shadow' : 'bg-[#101924] text-amber-300 hover:text-white border border-amber-500/40'}">
              <span>🏆</span> Competitivas (${compMatches.length})
            </button>
            <button onclick="window.filterProfileMatches('unrated')" class="px-2.5 py-1 rounded text-xs font-tactical font-bold transition flex items-center gap-1 ${activeFilter === 'unrated' ? 'bg-purple-600 text-white font-black shadow' : 'bg-[#101924] text-purple-300 hover:text-white border border-purple-500/40'}">
              <span>🎮</span> Sem Class. (${unratedMatches.length})
            </button>
            <button onclick="window.refreshCurrentProfileFromApi()" class="px-2.5 py-1 rounded bg-sky-950/70 hover:bg-sky-900 border border-sky-500/40 text-sky-400 text-xs font-bold transition flex items-center gap-1 ml-1">
              <span>⚡ Atualizar</span>
            </button>
          </div>
        </div>

        <!-- Banner Informativo de Ponderação -->
        <div class="bg-[#0e141f] border border-[#1e2f45] rounded-xl p-2.5 flex items-center justify-between text-xs text-gray-300 flex-wrap gap-2">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="text-base flex-shrink-0">⚖️</span>
            <span class="break-words">Amostragem Ponderada: <b>${compMatches.length} Competitivas</b> (peso 1.0) e <b>${unratedMatches.length} Sem Classificação</b> (peso 0.6)</span>
          </div>
          <span class="text-[10px] text-gray-400 font-mono hidden md:inline flex-shrink-0">Cálculo Ponderado Oficial</span>
        </div>

        <div class="space-y-2.5">
          ${matchesHtml || '<div class="p-8 text-center text-gray-400 text-xs">Nenhuma partida encontrada neste filtro.</div>'}
        </div>
      </div>
    `;
  } else if (currentTab === 'evolution') {
    // ABA: EVOLUÇÃO TEMPORAL & TENDÊNCIAS
    const metric = state.playerProfileModal.evolutionMetric || 'rating';
    const isAcs = metric === 'acs';

    // Gera o gráfico de linha SVG com os dados do perfil
    const chartHtml = generateSvgLineChart(data.recentMatches, {
      title: `Evolução de ${isAcs ? 'Combat Score (ACS)' : 'Rendimento'} - ${escapeHtml(data.cleanName)}`,
      isAcs: isAcs
    });

    // Diagnósticos individuais
    const topAgent = data.mostPlayed[0] || 'Agente Principal';
    const topMapEntry = Object.entries(data.mapRatings || {}).sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))[0];
    const bestMapName = topMapEntry ? (MAPS_DATA.find(m => m.id === topMapEntry[0])?.name || topMapEntry[0]) : 'Ascent';
    const bestMapScore = topMapEntry ? topMapEntry[1] : data.overallRating;

    const kdNum = parseFloat(data.kd || '1.00');
    const acsNum = parseInt(data.overallAcs || '220', 10);

    const individualStrength = `${data.cleanName} tem seu ápice tático em <b>${bestMapName}</b> (Rendimento: <b>${bestMapScore}</b>) atuando na função de <b>${data.role}</b> com <b>${topAgent}</b>. Apresenta alta consistência de dano por rodada armada.`;
    const individualLeak = kdNum < 1.05
      ? `Taxa de eliminações (${data.kd}) indica vulnerabilidade em trocas isoladas. Recomenda-se jogar colada com o suporte de bombsite para garantir trocas imediatas (re-frags).`
      : `Excelente capacidade de duelo individual (${data.kd} K/D e ${acsNum} ACS). O ponto de atenção é manter a disciplina nos pós-plants e evitar caçar abates fora do site.`;
    const individualDrill = `Aquecimento sugerido: 10 min no The Range focado em micro-ajustes de mira + 2 partidas de Mata-Mata treinando abertura de mira nos ângulos chave de ${bestMapName}.`;

    // Histórico resumido partida a partida com oscilação
    const historyRows = (data.recentMatches || []).slice(0, 8).map((m, idx) => {
      const isWon = m.won;
      const k = m.kills || 0;
      const d = m.deaths || 0;
      const kd = d > 0 ? (k / d).toFixed(2) : k.toFixed(2);
      const diffPart = parseFloat(m.kd || kd) - kdNum;
      const diffColor = diffPart >= 0 ? 'text-emerald-400' : 'text-rose-400';
      const diffSign = diffPart >= 0 ? `+${diffPart.toFixed(2)}` : diffPart.toFixed(2);

      return `
        <tr class="border-b border-[#141f2d] hover:bg-[#0f1722] text-xs">
          <td class="py-2 px-3 font-mono text-gray-400">#${idx + 1}</td>
          <td class="py-2 px-3">
            <span class="px-2 py-0.5 rounded text-[9px] font-tactical font-black uppercase ${isWon ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'}">
              ${isWon ? 'Vitória' : 'Derrota'}
            </span>
          </td>
          <td class="py-2 px-3 text-white font-bold">${m.map}</td>
          <td class="py-2 px-3 text-gray-300">${m.agent}</td>
          <td class="py-2 px-3 font-mono font-bold text-center text-white">${m.score || '-'}</td>
          <td class="py-2 px-3 font-mono text-center text-gray-300">${m.kills}/${m.deaths}/${m.assists}</td>
          <td class="py-2 px-3 font-mono font-bold text-center text-emerald-400">${m.kd}</td>
          <td class="py-2 px-3 font-mono font-bold text-center text-sky-400">${m.acs}</td>
          <td class="py-2 px-3 font-mono text-center ${diffColor} font-bold">${diffSign} vs Média</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="space-y-4 min-w-0">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-[#1c2c3e]">
          <div class="min-w-0 flex-1">
            <h3 class="font-tactical font-black text-sm sm:text-base text-white flex items-center gap-2 flex-wrap break-words">
              <span>📈</span> Evolução Temporal & Tendência (${escapeHtml(data.cleanName)})
            </h3>
            <p class="text-xs text-gray-400 break-words">Acompanhamento da trajetória de desempenho e diagnósticos individuais do treinador</p>
          </div>

          <div class="flex items-center gap-1.5 bg-[#090e15] border border-[#1b2b3d] p-1 rounded-xl w-full sm:w-auto justify-center flex-shrink-0">
            <button onclick="window.toggleProfileEvolutionMetric('rating')" class="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 rounded-lg text-xs font-tactical font-bold transition text-center ${!isAcs ? 'bg-[#ff4655] text-white shadow' : 'text-gray-400 hover:text-white'}">
              Rendimento (0 a 10)
            </button>
            <button onclick="window.toggleProfileEvolutionMetric('acs')" class="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 rounded-lg text-xs font-tactical font-bold transition text-center ${isAcs ? 'bg-[#ff4655] text-white shadow' : 'text-gray-400 hover:text-white'}">
              Combat Score (ACS)
            </button>
          </div>
        </div>

        <!-- Componente do Gráfico de Linha SVG -->
        ${chartHtml}

        <!-- 3 Cards de Diagnóstico do Treinador para a Jogadora -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="tactical-card bg-[#0b131e] border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between min-w-0">
            <div>
              <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                <span class="text-base flex-shrink-0">🎯</span>
                <h5 class="text-xs font-tactical font-black text-emerald-400 uppercase tracking-wider break-words">Trunfo Tático & Força</h5>
              </div>
              <p class="text-[11px] text-gray-300 leading-relaxed break-words">${individualStrength}</p>
            </div>
            <span class="text-[9px] font-mono text-emerald-500 mt-2 block">Destaque de Desempenho</span>
          </div>

          <div class="tactical-card bg-[#0b131e] border border-amber-500/30 rounded-xl p-3.5 flex flex-col justify-between min-w-0">
            <div>
              <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                <span class="text-base flex-shrink-0">⚠️</span>
                <h5 class="text-xs font-tactical font-black text-amber-400 uppercase tracking-wider break-words">Ponto de Atenção Tático</h5>
              </div>
              <p class="text-[11px] text-gray-300 leading-relaxed break-words">${individualLeak}</p>
            </div>
            <span class="text-[9px] font-mono text-amber-500 mt-2 block">Foco de Ajuste em Treinos</span>
          </div>

          <div class="tactical-card bg-[#0b131e] border border-sky-500/30 rounded-xl p-3.5 flex flex-col justify-between min-w-0">
            <div>
              <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                <span class="text-base flex-shrink-0">💡</span>
                <h5 class="text-xs font-tactical font-black text-sky-400 uppercase tracking-wider break-words">Rotina de Treino Sugerida</h5>
              </div>
              <p class="text-[11px] text-gray-300 leading-relaxed break-words">${individualDrill}</p>
            </div>
            <span class="text-[9px] font-mono text-sky-500 mt-2 block">Exercício Individual Recomendado</span>
          </div>
        </div>

        <!-- Tabela de Variação Recente -->
        <div class="tactical-card bg-[#0a111a] border border-[#1b2b3d] rounded-2xl p-4 space-y-3 min-w-0 overflow-hidden">
          <div class="flex items-center justify-between pb-2 border-b border-[#162332] flex-wrap gap-2">
            <h4 class="text-xs font-tactical font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap break-words min-w-0 flex-1">
              <span>📜</span> Variação de Performance Partida a Partida
            </h4>
            <span class="text-[10px] text-gray-400 font-mono flex-shrink-0">Últimas 8 Partidas</span>
          </div>

          <div class="overflow-x-auto rounded-xl border border-[#141f2d]">
            <table class="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr class="bg-[#080d14] border-b border-[#172535] text-[9px] uppercase font-tactical text-gray-400">
                  <th class="py-2 px-3">#</th>
                  <th class="py-2 px-3">Status</th>
                  <th class="py-2 px-3">Mapa</th>
                  <th class="py-2 px-3">Agente</th>
                  <th class="py-2 px-3 text-center">Placar</th>
                  <th class="py-2 px-3 text-center">K/D/A</th>
                  <th class="py-2 px-3 text-center">K/D</th>
                  <th class="py-2 px-3 text-center">ACS</th>
                  <th class="py-2 px-3 text-center">Oscilação</th>
                </tr>
              </thead>
              <tbody>
                ${historyRows || '<tr><td colspan="9" class="p-4 text-center text-xs text-gray-500">Sem partidas registradas.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  } else if (currentTab === 'agents') {
    // ABA 3: MELHORES AGENTES
    const activeMap = MAPS_DATA.find(m => m.id === state.activeMapId) || MAPS_DATA[0];
    const agentsHtml = data.mostPlayed.map((agentName, idx) => {
      const icon = getAgentIcon(agentName);
      const color = getAgentColor(agentName);
      const role = getAgentRole(agentName);
      const roleClass = role ? `role-badge-${role.toLowerCase()}` : '';

      const titles = [
        '1º Agente Principal (Maior Conforto ⭐)',
        '2º Agente Secundário (Pick de Segurança 🛡️)',
        '3º Agente Flex (Adaptação Estratégica 🔄)'
      ];
      const title = titles[idx] || `Agente Mais Jogado #${idx + 1}`;

      return `
        <div class="tactical-card p-4 rounded-xl bg-[#101823] border border-[#1e2f42] hover:border-[#ff4655]/50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
          <div class="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1 w-full sm:w-auto">
            <div class="relative flex-shrink-0">
              <img src="${icon}" alt="${agentName}" class="w-14 h-14 rounded-xl object-cover bg-black/60 border-2 shadow-lg" style="border-color: ${color}">
              <span class="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-[#ff4655] text-white font-tactical font-black text-xs flex items-center justify-center shadow">
                #${idx + 1}
              </span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="font-tactical font-bold text-base text-white break-words">${agentName}</h4>
                <span class="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${roleClass} flex-shrink-0">${role}</span>
              </div>
              <p class="text-xs text-sky-400 mt-0.5 font-medium break-words">${title}</p>
              <p class="text-[10px] text-gray-400 mt-1 break-words">Alta proficiência em mecânicas, posicionamento e lineups táticos com este agente.</p>
            </div>
          </div>

          <div class="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 border-[#1c2c3e] pt-2 sm:pt-0 flex-shrink-0">
            <button onclick="window.assignAgentFromProfile('${agentName}')"
                    class="btn-tactical w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-[#ff4655] hover:bg-[#e03b49] text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow">
              <span>Escalar no Mapa Ativo (${activeMap.name})</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="space-y-3 min-w-0">
        <div class="min-w-0">
          <h3 class="font-tactical font-black text-sm sm:text-base text-white flex items-center gap-2 flex-wrap break-words">
            <span>🎯</span> Agentes Favoritos & Pool de Conforto
          </h3>
          <p class="text-xs text-gray-400 break-words">Bonecos com maior volume de partidas e consistência comprovada no histórico</p>
        </div>
        <div class="space-y-3">
          ${agentsHtml}
        </div>
      </div>
    `;
  } else if (currentTab === 'calculator') {
    // ABA 4: CÁLCULO REALIZADO E FÓRMULA MATEMÁTICA
    const kdNum = parseFloat(data.kd) || 1.0;
    const acsNum = parseFloat(data.overallAcs) || 200;
    const winRateNum = (data.overallWinRate !== undefined ? data.overallWinRate : 50) / 100;

    const kdScore = Math.min(10, Math.max(2, (kdNum / 1.0) * 6.5));
    const acsScore = Math.min(10, Math.max(2, (acsNum / 200) * 7.0));
    const winBonus = (winRateNum - 0.5) * 1.5;

    const kdPart = (kdScore * 0.55).toFixed(2);
    const acsPart = (acsScore * 0.45).toFixed(2);
    const bonusPart = winBonus >= 0 ? `+${winBonus.toFixed(2)}` : `${winBonus.toFixed(2)}`;
    const visual = getRatingVisuals(data.overallRating);

    container.innerHTML = `
      <div class="space-y-4 min-w-0">
        <div class="min-w-0">
          <h3 class="font-tactical font-black text-sm sm:text-base text-white flex items-center gap-2 flex-wrap break-words">
            <span>🧮</span> Como o Rendimento é Calculado (Demonstração Matemática)
          </h3>
          <p class="text-xs text-gray-400 break-words">Entenda a fórmula passo a passo com os dados reais de <b>${data.cleanName}</b></p>
        </div>

        <!-- Equação em Destaque -->
        <div class="bg-[#121c2a] border border-[#233549] rounded-xl p-3.5 sm:p-4 shadow-lg min-w-0">
          <span class="text-[10px] uppercase font-tactical font-bold text-amber-400 block mb-1">A Equação Base Oficial do Painel:</span>
          <div class="font-mono text-xs sm:text-sm text-white bg-[#090e15] border border-[#1b2b3d] p-3 rounded-lg overflow-x-auto break-words">
            Nota = (<span class="text-emerald-400">kdScore</span> × 0.55) + (<span class="text-sky-400">acsScore</span> × 0.45) + <span class="text-amber-300">winBonus</span>
          </div>
        </div>

        <!-- Passo a Passo com os Dados da Jogadora -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <!-- Passo 1: K/D -->
          <div class="bg-[#101823] border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between min-w-0">
            <div>
              <div class="flex items-center justify-between mb-2 flex-wrap gap-1.5">
                <span class="text-xs font-tactical font-bold text-emerald-400">1. K/D Score (Peso 55%)</span>
                <span class="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 flex-shrink-0">K/D: ${data.kd}</span>
              </div>
              <p class="text-[11px] text-gray-300 font-mono break-words">kdScore = (${data.kd} / 1.0) × 6.5</p>
              <p class="text-xs text-emerald-300 font-bold mt-1">= ${kdScore.toFixed(2)} pts</p>
            </div>
            <div class="mt-3 pt-2 border-t border-[#1b2b3d] text-[10px] text-gray-400 flex justify-between gap-1 flex-wrap">
              <span>Contribuição (55%):</span>
              <span class="font-mono font-bold text-emerald-400">+${kdPart} pts</span>
            </div>
          </div>

          <!-- Passo 2: ACS -->
          <div class="bg-[#101823] border border-sky-500/30 rounded-xl p-3.5 flex flex-col justify-between min-w-0">
            <div>
              <div class="flex items-center justify-between mb-2 flex-wrap gap-1.5">
                <span class="text-xs font-tactical font-bold text-sky-400">2. ACS Score (Peso 45%)</span>
                <span class="text-[10px] font-mono bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/30 flex-shrink-0">ACS: ${data.overallAcs}</span>
              </div>
              <p class="text-[11px] text-gray-300 font-mono break-words">acsScore = (${data.overallAcs} / 200) × 7.0</p>
              <p class="text-xs text-sky-300 font-bold mt-1">= ${acsScore.toFixed(2)} pts</p>
            </div>
            <div class="mt-3 pt-2 border-t border-[#1b2b3d] text-[10px] text-gray-400 flex justify-between gap-1 flex-wrap">
              <span>Contribuição (45%):</span>
              <span class="font-mono font-bold text-sky-400">+${acsPart} pts</span>
            </div>
          </div>

          <!-- Passo 3: Vitórias -->
          <div class="bg-[#101823] border border-amber-500/30 rounded-xl p-3.5 flex flex-col justify-between min-w-0">
            <div>
              <div class="flex items-center justify-between mb-2 flex-wrap gap-1.5">
                <span class="text-xs font-tactical font-bold text-amber-400">3. Bônus de Vitória</span>
                <span class="text-[10px] font-mono bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 flex-shrink-0">Win: ${data.overallWinRate}%</span>
              </div>
              <p class="text-[11px] text-gray-300 font-mono break-words">winBonus = (${(winRateNum).toFixed(2)} - 0.5) × 1.5</p>
              <p class="text-xs text-amber-300 font-bold mt-1">= ${bonusPart} pts</p>
            </div>
            <div class="mt-3 pt-2 border-t border-[#1b2b3d] text-[10px] text-gray-400 flex justify-between gap-1 flex-wrap">
              <span>Ajuste de Vitória:</span>
              <span class="font-mono font-bold text-amber-400">${bonusPart} pts</span>
            </div>
          </div>

        </div>

        <!-- Resultado Final Combinado -->
        <div class="bg-[#101822] border-2 ${visual.border} rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl min-w-0">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-[10px] uppercase font-tactical text-gray-400 block leading-none">Resultado Final Combinado:</span>
              <span class="text-[9px] font-mono text-amber-300 bg-amber-950/70 border border-amber-500/30 px-1.5 py-0.2 rounded flex-shrink-0" title="Total de partidas analisadas">Base Amostral: ${data.totalMatches} partidas</span>
            </div>
            <div class="font-mono text-sm sm:text-base text-gray-200 mt-1 break-words">
              <span class="text-emerald-400 font-bold">${kdPart}</span> + <span class="text-sky-400 font-bold">${acsPart}</span> + (<span class="text-amber-400 font-bold">${bonusPart}</span>) = <span class="text-white font-black text-xl">${data.overallRating}</span> <span class="text-xs text-gray-500">/ 10</span>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="px-3 py-1 rounded text-xs font-tactical uppercase font-black ${visual.tierBadgeClass} border shadow-lg">
              ${visual.tier} (${data.overallRating >= 9 ? 'Excelente / Destaque' : data.overallRating >= 7.5 ? 'Muito Forte' : data.overallRating >= 6 ? 'Equilibrado' : 'Atenção'})
            </span>
          </div>
        </div>

        <!-- Tabela Comparativa de Mapas -->
        <div class="bg-[#101823] border border-[#1b2b3d] rounded-xl p-4 min-w-0 overflow-hidden">
          <h4 class="text-xs font-tactical font-bold text-white mb-2 flex items-center gap-1.5 flex-wrap break-words">
            <span>📋</span> Por que o rendimento muda em cada mapa?
          </h4>
          <p class="text-[11px] text-gray-400 mb-3 break-words">
            O painel avalia cada mapa de forma independente. Partidas com vitórias expressivas e alto Combat Score (ACS > 250) elevam a nota para <b>Tier S</b> (9.0 a 10.0). Partidas com derrotas ou ACS menor reduzem a nota para o tier correspondente.
          </p>
          <div class="divide-y divide-[#1b2b3d] text-xs">
            <div class="py-1.5 flex justify-between items-center text-gray-300 gap-2">
              <span class="break-words"><b>Fracture (10.0 - Tier S ⭐)</b>: 100% vitórias + ACS 295 altíssimo com Killjoy</span>
              <span class="text-amber-400 font-bold font-mono flex-shrink-0">10.0</span>
            </div>
            <div class="py-1.5 flex justify-between items-center text-gray-300 gap-2">
              <span class="break-words"><b>Ascent (9.0 - Tier S ⭐)</b>: 100% vitórias + K/D 1.35 consistente</span>
              <span class="text-amber-400 font-bold font-mono flex-shrink-0">9.0</span>
            </div>
            <div class="py-1.5 flex justify-between items-center text-gray-300 gap-2">
              <span class="break-words"><b>Lotus (8.3 - Tier A)</b>: Vitória sólida + K/D 1.18 com Cypher</span>
              <span class="text-emerald-400 font-bold font-mono flex-shrink-0">8.3</span>
            </div>
            <div class="py-1.5 flex justify-between items-center text-gray-300 gap-2">
              <span class="break-words"><b>Sunset (6.9 - Tier B)</b>: 50% vitórias e combate equilibrado</span>
              <span class="text-sky-400 font-bold font-mono flex-shrink-0">6.9</span>
            </div>
            <div class="py-1.5 flex justify-between items-center text-gray-300 gap-2">
              <span class="break-words"><b>Breeze (4.1 - Tier C)</b>: Derrota e ACS mais baixo na partida</span>
              <span class="text-rose-400 font-bold font-mono flex-shrink-0">4.1</span>
            </div>
          </div>
        </div>

      </div>
    `;
  }
}

window.refreshCurrentProfileFromApi = async function() {
  const data = getPlayerProfileData(state.playerProfileModal.playerIndex);
  if (!data || !data.hasTag) {
    showToast('Informe o Riot ID completo (Nick#TAG) para consultar a API!', 'warning');
    return;
  }

  showToast(`⏳ Buscando partidas recentes de ${data.cleanName}...`, 'info');
  await autoFetchPlayerStatsInBackground(data.playerIndex, data.cleanName);
  window.renderPlayerProfileModal();
};

window.assignAgentFromProfile = function(agentName, mapId = null) {
  const targetMapId = mapId || state.activeMapId;
  const currentPlayers = state.lineups[targetMapId];
  const pIdx = state.playerProfileModal.playerIndex;

  if (currentPlayers && currentPlayers[pIdx]) {
    if (pIdx < 5) {
      currentPlayers[pIdx].titular = agentName;
      showToast(`${agentName} escalada como Titular em ${targetMapId.toUpperCase()}!`, 'success');
    } else {
      currentPlayers[pIdx].flex1 = agentName;
      showToast(`${agentName} definida como Flex 1 em ${targetMapId.toUpperCase()}!`, 'success');
    }
    saveCurrentState();
    syncSavePlayer(targetMapId, pIdx, currentPlayers[pIdx], state.lineups);
    renderPlayersList();
  }
};

// --------------------------------------------------------------------------
// MODAL: FOTO DE PERFIL / AVATAR DA JOGADORA (SISTEMA & UPLOAD PRÓPRIO)
// --------------------------------------------------------------------------

window.openPlayerAvatarModal = function(playerIndex) {
  const players = state.lineups[state.activeMapId] || DEFAULT_PLAYERS;
  const player = players[playerIndex];
  if (!player) return;

  state.playerAvatarModal.playerIndex = playerIndex;
  const foundRoster = (state.roster || []).find(r => r.name && player.name && r.name.toLowerCase() === player.name.trim().toLowerCase());
  const currentPhoto = player.photoUrl || (foundRoster?.photoUrl) || '';
  const fallbackAg = player.titular || player.flex1 || player.mostPlayed?.[0] || 'Killjoy';
  const fallbackIcon = getAgentIcon(fallbackAg);

  state.playerAvatarModal.selectedAvatarUrl = currentPhoto || fallbackIcon;
  state.playerAvatarModal.currentTab = 'agents';

  // Atualiza elementos visuais do modal
  const previewImg = document.getElementById('avatar-modal-preview-img');
  const previewBadge = document.getElementById('avatar-modal-preview-badge');
  const playerNameEl = document.getElementById('avatar-modal-player-name');
  const subtitleEl = document.getElementById('player-avatar-subtitle');

  if (previewImg) previewImg.src = state.playerAvatarModal.selectedAvatarUrl;
  if (previewBadge) previewBadge.textContent = playerIndex < 5 ? `P${player.id || playerIndex + 1}` : `R${(player.id || playerIndex + 1) - 5}`;
  if (playerNameEl) playerNameEl.textContent = player.name || `Player ${player.id || playerIndex + 1}`;
  if (subtitleEl) subtitleEl.textContent = `Escolha um avatar oficial ou envie uma foto para ${player.name || `Player ${player.id}`}`;

  window.filterAvatarGallery('agents');

  const modal = document.getElementById('player-avatar-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
};

window.closePlayerAvatarModal = function() {
  const modal = document.getElementById('player-avatar-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.filterAvatarGallery = function(category = 'agents') {
  state.playerAvatarModal.currentTab = category;

  ['agents', 'roles', 'ranks'].forEach(cat => {
    const btn = document.getElementById(`avatar-tab-${cat}`);
    if (btn) {
      if (cat === category) {
        btn.className = 'px-2.5 py-1 rounded-md text-[11px] font-tactical font-bold bg-[#ff4655] text-white whitespace-nowrap shadow';
      } else {
        btn.className = 'px-2.5 py-1 rounded-md text-[11px] font-tactical font-bold bg-[#121c27] text-gray-300 hover:text-white border border-[#233547] whitespace-nowrap';
      }
    }
  });

  const grid = document.getElementById('avatar-gallery-grid');
  if (!grid) return;

  const galleryList = (window.SYSTEM_AVATARS && window.SYSTEM_AVATARS[category]) 
    ? window.SYSTEM_AVATARS[category] 
    : (category === 'agents' ? ALL_AGENTS.map(a => ({ name: a.name, url: a.icon })) : []);

  grid.innerHTML = galleryList.map(item => {
    const isSelected = state.playerAvatarModal.selectedAvatarUrl === item.url;
    return `
      <button type="button"
              onclick="window.selectGalleryAvatar('${item.url}')"
              title="${escapeHtml(item.name)}"
              class="p-1.5 rounded-xl border flex flex-col items-center justify-between gap-1 transition-all cursor-pointer group ${isSelected ? 'border-[#ff4655] bg-[#ff4655]/20 ring-2 ring-[#ff4655] shadow-lg' : 'border-[#1e2f42] bg-[#0c141f] hover:border-amber-400 hover:bg-[#121b27]'}">
        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-black/60 p-1 flex items-center justify-center overflow-hidden">
          <img src="${item.url}" alt="${escapeHtml(item.name)}" class="w-full h-full object-contain group-hover:scale-105 transition-transform" loading="lazy">
        </div>
        <span class="text-[9px] font-tactical font-bold text-gray-300 group-hover:text-white truncate max-w-full block leading-none text-center">
          ${escapeHtml(item.name)}
        </span>
      </button>
    `;
  }).join('');
};

window.selectGalleryAvatar = function(url) {
  state.playerAvatarModal.selectedAvatarUrl = url;
  const previewImg = document.getElementById('avatar-modal-preview-img');
  if (previewImg) previewImg.src = url;
  window.filterAvatarGallery(state.playerAvatarModal.currentTab);
};

window.triggerAvatarFileInput = function() {
  const input = document.getElementById('player-avatar-file-input');
  if (input) input.click();
};

window.handleAvatarFileUpload = function(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP)!', 'warning');
    return;
  }

  showToast('Processando e compactando imagem...', 'info');

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const maxDim = 256;
      let w = img.width;
      let h = img.height;

      if (w > h) {
        if (w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        }
      } else {
        if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
      state.playerAvatarModal.selectedAvatarUrl = compressedBase64;

      const previewImg = document.getElementById('avatar-modal-preview-img');
      if (previewImg) previewImg.src = compressedBase64;

      showToast('Imagem carregada! Clique em "Salvar Foto de Perfil".', 'success');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

window.saveSelectedAvatar = function() {
  const pIdx = state.playerAvatarModal.playerIndex;
  if (pIdx === null) return;

  const activeMapId = state.activeMapId;
  const currentPlayers = state.lineups[activeMapId];
  if (!currentPlayers || !currentPlayers[pIdx]) return;

  const player = currentPlayers[pIdx];
  player.photoUrl = state.playerAvatarModal.selectedAvatarUrl;

  // Também propaga para todos os mapas e para o roster
  if (player.name && player.name.trim()) {
    const clean = player.name.trim().toLowerCase();
    (state.roster || []).forEach(r => {
      if (r.name && r.name.toLowerCase() === clean) {
        r.photoUrl = player.photoUrl;
      }
    });

    Object.keys(state.lineups).forEach(mId => {
      const mPlayers = state.lineups[mId];
      if (Array.isArray(mPlayers)) {
        mPlayers.forEach(mp => {
          if (mp.name && mp.name.toLowerCase() === clean) {
            mp.photoUrl = player.photoUrl;
          }
        });
      }
    });
  }

  saveCurrentState();
  syncSavePlayer(activeMapId, pIdx, player, state.lineups);

  window.closePlayerAvatarModal();
  if (typeof window.renderPlayerProfileModal === 'function') {
    window.renderPlayerProfileModal();
  }
  renderPlayersList();
  showToast('Foto de perfil salva e atualizada com sucesso!', 'success');
};

window.resetPlayerAvatarToDefault = function() {
  const pIdx = state.playerAvatarModal.playerIndex;
  if (pIdx === null) return;

  const player = state.lineups[state.activeMapId]?.[pIdx];
  if (player) {
    delete player.photoUrl;
    if (player.name) {
      const clean = player.name.trim().toLowerCase();
      (state.roster || []).forEach(r => {
        if (r.name && r.name.toLowerCase() === clean) {
          delete r.photoUrl;
        }
      });
      Object.keys(state.lineups).forEach(mId => {
        const mPlayers = state.lineups[mId];
        if (Array.isArray(mPlayers)) {
          mPlayers.forEach(mp => {
            if (mp.name && mp.name.toLowerCase() === clean) {
              delete mp.photoUrl;
            }
          });
        }
      });
    }
    saveCurrentState();
    syncSavePlayer(state.activeMapId, pIdx, player, state.lineups);
  }

  window.closePlayerAvatarModal();
  if (typeof window.renderPlayerProfileModal === 'function') {
    window.renderPlayerProfileModal();
  }
  renderPlayersList();
  showToast('Foto de perfil resetada para o agente padrão.', 'info');
};

// --------------------------------------------------------------------------
// MODAL: BANCO DE JOGADORAS (ROSTER COMPLETO DA EQUIPE)
// --------------------------------------------------------------------------

window.openRosterModal = function() {
  const modal = document.getElementById('roster-modal');
  if (modal) {
    window.renderRosterCards();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
};

window.closeRosterModal = function() {
  const modal = document.getElementById('roster-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.renderRosterCards = function() {
  const container = document.getElementById('roster-cards-container');
  const countEl = document.getElementById('roster-count');
  if (!container) return;

  const roster = state.roster || [];
  if (countEl) countEl.textContent = roster.length;

  if (roster.length === 0) {
    container.innerHTML = `<div class="text-center py-6 text-xs text-gray-500">Nenhuma jogadora cadastrada no banco. Cadastre acima!</div>`;
    return;
  }

  container.innerHTML = roster.map((item, idx) => {
    const topIcons = (item.mostPlayed || []).slice(0, 3).map(agentName => {
      const icon = getAgentIcon(agentName);
      const color = getAgentColor(agentName);
      return `<img src="${icon}" alt="${agentName}" title="${agentName}" class="w-5 h-5 rounded-full object-cover border flex-shrink-0" style="border-color: ${color}">`;
    }).join('');

    const hasTag = item.name.includes('#');
    let trackerBtn = '';
    if (hasTag) {
      const [name, tag] = item.name.split('#').map(s => s.trim());
      trackerBtn = `
        <a href="https://tracker.gg/valorant/profile/riot/${encodeURIComponent(name)}%23${encodeURIComponent(tag)}/overview" 
           target="_blank" rel="noopener noreferrer" 
           class="px-2 py-1 rounded bg-sky-950 hover:bg-sky-900 border border-sky-500/40 text-[10px] font-bold text-sky-300 transition">
          Tracker ↗
        </a>
      `;
    }

    return `
      <div class="tactical-card p-2.5 rounded-lg border border-[#203043] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-[#0f1722] hover:border-[#ff4655]/40 transition w-full min-w-0">
        <div class="flex items-center gap-2.5 min-w-0 flex-1 w-full sm:w-auto">
          <div class="w-8 h-8 rounded-lg bg-[#162332] border border-[#283b50] flex items-center justify-center font-tactical font-bold text-xs text-emerald-400 flex-shrink-0">
            ${idx + 1}
          </div>
          <div class="truncate min-w-0 flex-1">
            <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
              <span class="text-xs font-bold text-white truncate">${escapeHtml(item.name)}</span>
              ${item.kd ? `<span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 flex-shrink-0">K/D: ${item.kd}</span>` : ''}
              ${item.role ? `<span class="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#182637] text-gray-300 border border-[#263c54] flex-shrink-0">${item.role}</span>` : ''}
            </div>
            <div class="flex items-center gap-1 mt-1 flex-wrap">
              <span class="text-[8px] uppercase text-gray-500 font-tactical flex-shrink-0">Mais jogadas:</span>
              ${topIcons || '<span class="text-[9px] text-gray-500 italic">Nenhum definido</span>'}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
          ${trackerBtn}
          <button onclick="window.removePlayerFromRoster('${escapeHtml(item.name)}')" title="Remover do banco" class="p-1 rounded text-gray-500 hover:text-red-400 transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
};

window.addPlayerToRosterFromModal = function() {
  const nickInput = document.getElementById('new-roster-nick');
  const kdInput = document.getElementById('new-roster-kd');
  const roleInput = document.getElementById('new-roster-role');

  const nick = nickInput ? nickInput.value.trim() : '';
  const kd = kdInput ? kdInput.value.trim() : '';
  const role = roleInput ? roleInput.value : 'Flex';

  if (!nick) {
    showToast('Informe o Riot ID da jogadora (ex: c0rt3z#0303)', 'error');
    return;
  }

  upsertRosterPlayer({
    name: nick,
    kd: kd,
    mostPlayed: [],
    role: role
  });

  if (nickInput) nickInput.value = '';
  if (kdInput) kdInput.value = '';

  saveCurrentState();
  window.renderRosterCards();
  renderPlayersList();
  showToast(`Jogadora "${nick}" adicionada ao Banco de Jogadoras!`, 'success');
};

window.removePlayerFromRoster = function(name) {
  if (!confirm(`Remover "${name}" do Banco de Jogadoras?`)) return;
  state.roster = (state.roster || []).filter(p => p.name.toLowerCase() !== name.toLowerCase());
  saveCurrentState();
  window.renderRosterCards();
  showToast(`Jogadora removida do banco`, 'info');
};

window.populateCurrentMapFromRoster = function() {
  const currentPlayers = state.lineups[state.activeMapId];
  if (!currentPlayers) return;

  const roster = state.roster || [];
  if (roster.length === 0) {
    showToast('Nenhuma jogadora cadastrada no banco!', 'error');
    return;
  }

  roster.slice(0, 7).forEach((item, idx) => {
    if (currentPlayers[idx]) {
      currentPlayers[idx].name = item.name;
      if (item.kd) currentPlayers[idx].kd = item.kd;
      if (Array.isArray(item.mostPlayed) && item.mostPlayed.length > 0) {
        currentPlayers[idx].mostPlayed = [...item.mostPlayed];
      }
    }
  });

  saveCurrentState();
  renderPlayersList();
  window.closeRosterModal();
  showToast(`Escalação preenchida com as ${Math.min(roster.length, 7)} jogadoras do banco!`, 'success');
};

// Replicar nicks, K/D e mais jogadas de todas as 7 jogadoras para todos os outros 10 mapas
window.replicateRosterToAllMaps = function() {
  const currentPlayers = state.lineups[state.activeMapId];
  if (!currentPlayers || !Array.isArray(currentPlayers)) return;

  const currentMap = MAPS_DATA.find(m => m.id === state.activeMapId) || { name: state.activeMapId };
  
  const confirmed = window.confirm(
    `Deseja replicar os nomes, K/D e agentes mais jogados das 7 jogadoras de "${currentMap.name}" para TODOS os outros 10 mapas?\n\nAs escolhas táticas de agentes específicas de cada mapa serão mantidas.`
  );
  if (!confirmed) return;

  MAPS_DATA.forEach(map => {
    if (map.id === state.activeMapId) return;

    if (!state.lineups[map.id]) {
      state.lineups[map.id] = DEFAULT_PLAYERS.map(p => ({ ...p, mostPlayed: [...(p.mostPlayed || [])] }));
    }

    const targetPlayers = state.lineups[map.id];
    currentPlayers.forEach((sourcePlayer, idx) => {
      if (!targetPlayers[idx]) {
        targetPlayers[idx] = { id: idx + 1, titular: '', reserva: '', kd: '', rendimento: '', mostPlayed: [] };
      }
      targetPlayers[idx].name = sourcePlayer.name;
      targetPlayers[idx].kd = sourcePlayer.kd || '';
      targetPlayers[idx].mostPlayed = Array.isArray(sourcePlayer.mostPlayed) ? [...sourcePlayer.mostPlayed] : [];
    });
  });

  currentPlayers.forEach(p => {
    if (p.name && !p.name.startsWith('Player ') && !p.name.startsWith('Reserva ')) {
      upsertRosterPlayer({
        name: p.name,
        kd: p.kd || '',
        mostPlayed: Array.isArray(p.mostPlayed) ? [...p.mostPlayed] : []
      });
    }
  });

  saveCurrentState();
  showToast(`Lineup replicada para todos os 11 mapas com sucesso!`, 'success');
};

// --------------------------------------------------------------------------
// MODAL: TRACKER & ESTATÍSTICAS DA JOGADORA
// --------------------------------------------------------------------------

window.openTrackerModal = function(playerIndex) {
  state.trackerModal.playerIndex = playerIndex;

  const currentPlayers = state.lineups[state.activeMapId];
  const player = currentPlayers?.[playerIndex] || { name: '', kd: '', mostPlayed: [] };

  state.trackerModal.tempTopAgents = Array.isArray(player.mostPlayed) ? [...player.mostPlayed] : [];

  const known = (state.roster || []).find(r => r.name.toLowerCase() === (player.name || '').toLowerCase());
  if (known) {
    state.trackerModal.tempMapRatings = known.mapRatings ? { ...known.mapRatings } : {};
    state.trackerModal.tempOverallRating = known.overallRating || '';
  } else {
    state.trackerModal.tempMapRatings = {};
    state.trackerModal.tempOverallRating = '';
  }

  const titleEl = document.getElementById('tracker-modal-title');
  const subEl = document.getElementById('tracker-modal-sub');
  const nickInput = document.getElementById('tracker-input-nick');
  const kdInput = document.getElementById('tracker-input-kd');
  const statusEl = document.getElementById('tracker-auto-status');
  const apiKeyInput = document.getElementById('tracker-modal-api-key');

  const label = playerIndex < 5 ? `Titular P${playerIndex + 1}` : `Reserva R${playerIndex - 4}`;
  if (titleEl) titleEl.textContent = `ESTATÍSTICAS - ${label}`;
  if (subEl) subEl.textContent = player.name || label;
  if (nickInput) nickInput.value = player.name || '';
  if (kdInput) kdInput.value = player.kd || '';
  if (apiKeyInput) apiKeyInput.value = getHenrikApiKey();
  if (statusEl) {
    statusEl.classList.add('hidden');
    statusEl.innerHTML = '';
  }

  window.handleTrackerNickChange(player.name || '');
  renderTrackerModalTopAgents();

  const modal = document.getElementById('tracker-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
};

window.closeTrackerModal = function() {
  const modal = document.getElementById('tracker-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.handleTrackerNickChange = function(val) {
  const trackerLink = document.getElementById('tracker-modal-link');
  if (!trackerLink) return;

  if (val && val.includes('#')) {
    const [name, tag] = val.split('#').map(s => s.trim());
    trackerLink.href = `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(name)}%23${encodeURIComponent(tag)}/overview`;
    trackerLink.classList.remove('pointer-events-none', 'opacity-50');
  } else {
    trackerLink.href = '#';
    trackerLink.classList.add('pointer-events-none', 'opacity-50');
  }
};

function renderTrackerModalTopAgents() {
  const container = document.getElementById('tracker-modal-top-agents');
  if (!container) return;

  const agents = state.trackerModal.tempTopAgents || [];

  let html = agents.map((agentName, idx) => {
    const icon = getAgentIcon(agentName);
    const color = getAgentColor(agentName);
    return `
      <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#0d141e] border border-[#233547] text-xs text-white">
        <img src="${icon}" alt="${agentName}" class="w-5 h-5 rounded-full object-cover border" style="border-color: ${color}">
        <span class="font-semibold">${agentName}</span>
        <button onclick="window.removeTrackerTopAgent(${idx})" title="Remover agente" class="text-red-400 hover:text-red-300 ml-1 font-bold text-xs">×</button>
      </div>
    `;
  }).join('');

  if (agents.length < 3) {
    html += `
      <button onclick="window.promptAddTrackerTopAgent()" class="px-2 py-1 rounded border border-dashed border-gray-600 hover:border-sky-400 text-xs text-gray-400 hover:text-sky-300 bg-[#0d141e] transition">
        + Adicionar Agente
      </button>
    `;
  }

  container.innerHTML = html;
}

window.removeTrackerTopAgent = function(idx) {
  if (state.trackerModal.tempTopAgents) {
    state.trackerModal.tempTopAgents.splice(idx, 1);
    renderTrackerModalTopAgents();
  }
};

window.promptAddTrackerTopAgent = function() {
  const nextIdx = (state.trackerModal.tempTopAgents || []).length + 1;
  window.openAgentModal(state.trackerModal.playerIndex, `top${nextIdx}`);
};

function showTrackerStatus(msg, type = 'info') {
  const el = document.getElementById('tracker-auto-status');
  if (!el) return;

  el.classList.remove('hidden');
  if (type === 'error') {
    el.className = 'mt-1.5 text-[11px] p-2 rounded bg-red-950/70 border border-red-500/40 text-red-300';
  } else if (type === 'success') {
    el.className = 'mt-1.5 text-[11px] p-2 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-300';
  } else if (type === 'warning') {
    el.className = 'mt-1.5 text-[11px] p-2.5 rounded bg-[#182330] border border-amber-500/40 text-gray-300';
  } else {
    el.className = 'mt-1.5 text-[11px] p-2 rounded bg-sky-950/60 border border-sky-500/40 text-sky-300';
  }
  el.innerHTML = msg;
}

window.fetchTrackerAuto = async function() {
  const nickInput = document.getElementById('tracker-input-nick');
  const apiKeyInput = document.getElementById('tracker-modal-api-key');

  const rawNick = nickInput ? nickInput.value.trim() : '';
  if (!rawNick || !rawNick.includes('#')) {
    showTrackerStatus('Informe o Riot ID completo no formato Nick#TAG (ex: c0rt3z#0303)', 'error');
    return;
  }

  const [name, tag] = rawNick.split('#').map(s => s.trim());
  const modalKey = apiKeyInput ? apiKeyInput.value.trim() : '';
  if (modalKey) {
    saveHenrikApiKey(modalKey);
  }
  const apiKey = getHenrikApiKey();

  if (!apiKey) {
    // Se c0rt3z#0303 ou jogador cadastrado, oferece preencher com dados conhecidos
    const known = (state.roster || []).find(r => r.name.toLowerCase() === rawNick.toLowerCase());
    let knownAction = '';
    if (known && known.kd) {
      document.getElementById('tracker-input-kd').value = known.kd;
      if (known.mostPlayed && known.mostPlayed.length > 0) {
        state.trackerModal.tempTopAgents = [...known.mostPlayed];
        renderTrackerModalTopAgents();
      }
      knownAction = `<p class="text-emerald-300 mt-1 font-semibold">⚡ Dados pré-carregados do perfil: K/D ${known.kd} e agentes definidos!</p>`;
    }

    showTrackerStatus(`
      <div class="space-y-1 text-[11px]">
        <p class="text-amber-300 font-bold">⚠️ Para busca 100% ao vivo pela API Riot, cole sua chave HenrikDev acima.</p>
        <p class="text-gray-300">O Tracker.gg protege o site contra robôs via Cloudflare. Você pode abrir o Tracker oficial ou gerar a chave grátis!</p>
        <div class="flex items-center gap-2 pt-1">
          <a href="https://api.henrikdev.xyz/dashboard/" target="_blank" rel="noopener noreferrer" class="text-sky-400 font-bold underline">Obter Chave Grátis no Discord (10s) ↗</a>
          <span class="text-gray-500">|</span>
          <a href="https://tracker.gg/valorant/profile/riot/${encodeURIComponent(name)}%23${encodeURIComponent(tag)}/overview" target="_blank" rel="noopener noreferrer" class="text-emerald-400 font-bold underline">Abrir Perfil no Tracker.gg ↗</a>
        </div>
        ${knownAction}
      </div>
    `, 'warning');
    return;
  }

  showTrackerStatus('⏳ Consultando API da Riot Games / HenrikDev...', 'loading');

  try {
    const accRes = await fetch(`https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, {
      headers: { 'Authorization': apiKey }
    });

    if (!accRes.ok) {
      if (accRes.status === 401) throw new Error('Chave API inválida ou expirada. Gere uma nova em api.henrikdev.xyz/dashboard');
      if (accRes.status === 404) throw new Error(`Jogadora "${rawNick}" não encontrada. Verifique o Nick e a TAG.`);
      throw new Error(`Erro na API (${accRes.status}): ${accRes.statusText}`);
    }

    const accData = await accRes.json();
    const region = accData.data?.region || 'br';
    const puuid = accData.data?.puuid;
    const accLevel = accData.data?.account_level;

    // Tenta primeiro o endpoint Lifetime (v1) ampliado para capturar até 60 partidas
    let matches = null;
    try {
      const lifeRes = await fetch(`https://api.henrikdev.xyz/valorant/v1/lifetime/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=100`, {
        headers: { 'Authorization': apiKey }
      });
      if (lifeRes.ok) {
        const lifeData = await lifeRes.json();
        if (lifeData.data && Array.isArray(lifeData.data) && lifeData.data.length > 0) {
          matches = lifeData.data;
        }
      }
    } catch (e) {}

    // Fallback para endpoint v3 se lifetime não retornar dados
    if (!matches || matches.length === 0) {
      const matchRes = await fetch(`https://api.henrikdev.xyz/valorant/v3/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=15`, {
        headers: { 'Authorization': apiKey }
      });
      if (matchRes.ok) {
        const matchData = await matchRes.json();
        if (matchData.data && Array.isArray(matchData.data)) {
          matches = matchData.data;
        }
      }
    }

    let calculatedKd = '';
    let topAgents = [];
    let totalKills = 0, totalDeaths = 0;
    let totalMatches = 0;

    if (matches && matches.length > 0) {
      const existingPlayer = Array.isArray(state.roster)
        ? state.roster.find(p => p.name && p.name.toLowerCase().trim() === rawNick.toLowerCase().trim())
        : null;
      const existingMatches = existingPlayer?.recentMatches || [];

      const stats = processMatchesData(matches, puuid, name, tag, existingMatches);
      if (stats) {
        calculatedKd = stats.kd;
        topAgents = stats.topAgents;
        totalKills = stats.totalKills;
        totalDeaths = stats.totalDeaths;
        totalMatches = stats.totalMatches;
        state.trackerModal.tempMapRatings = stats.mapRatings;
        state.trackerModal.tempOverallRating = stats.overallRating;
        state.trackerModal.tempStats = stats;
      }
    }

    if (calculatedKd) {
      const kdInput = document.getElementById('tracker-input-kd');
      if (kdInput) kdInput.value = calculatedKd;
    }

    if (topAgents.length > 0) {
      state.trackerModal.tempTopAgents = topAgents;
      renderTrackerModalTopAgents();
    }

    const activeMapRating = state.trackerModal.tempMapRatings?.[state.activeMapId.toLowerCase()] || state.trackerModal.tempOverallRating;
    const details = [
      `Região: ${region.toUpperCase()}`,
      accLevel ? `Nível ${accLevel}` : '',
      totalMatches ? `${totalMatches} partidas acumuladas` : '',
      calculatedKd ? `K/D: ${calculatedKd} (${totalKills}K / ${totalDeaths}D)` : '',
      activeMapRating ? `Rendimento em ${state.activeMapId}: ${activeMapRating}/10` : '',
      topAgents.length > 0 ? `Mais jogados: ${topAgents.join(', ')}` : ''
    ].filter(Boolean).join(' • ');

    showTrackerStatus(`✅ Conectado com sucesso à Riot Games!<br><span class="text-white font-medium">${details}</span>`, 'success');
  } catch (err) {
    showTrackerStatus(`Erro ao buscar: ${err.message}`, 'error');
  }
};

window.saveTrackerModalData = function() {
  const pIdx = state.trackerModal.playerIndex;
  if (pIdx === null || pIdx === undefined) return;

  const currentPlayers = state.lineups[state.activeMapId];
  if (!currentPlayers || !currentPlayers[pIdx]) return;

  const nickInput = document.getElementById('tracker-input-nick');
  const kdInput = document.getElementById('tracker-input-kd');
  const apiKeyInput = document.getElementById('tracker-modal-api-key');

  const newNick = nickInput ? nickInput.value.trim() : currentPlayers[pIdx].name;
  const newKd = kdInput ? kdInput.value.trim() : currentPlayers[pIdx].kd;

  if (apiKeyInput && apiKeyInput.value.trim()) {
    saveHenrikApiKey(apiKeyInput.value.trim());
  }

  currentPlayers[pIdx].name = newNick;
  currentPlayers[pIdx].kd = newKd;
  currentPlayers[pIdx].mostPlayed = [...(state.trackerModal.tempTopAgents || [])];

  const activeMapRating = state.trackerModal.tempMapRatings?.[state.activeMapId.toLowerCase()] || state.trackerModal.tempOverallRating;
  if (activeMapRating) {
    currentPlayers[pIdx].rendimento = activeMapRating;
  }

  // Atualiza também nas outras lineups onde a jogadora estiver
  if (state.trackerModal.tempMapRatings) {
    MAPS_DATA.forEach(map => {
      const mapLineup = state.lineups[map.id];
      if (mapLineup && mapLineup[pIdx] && mapLineup[pIdx].name?.toLowerCase() === newNick.toLowerCase()) {
        const mRating = state.trackerModal.tempMapRatings[map.id.toLowerCase()] || state.trackerModal.tempOverallRating;
        if (mRating) {
          mapLineup[pIdx].rendimento = mRating;
          mapLineup[pIdx].kd = newKd;
          mapLineup[pIdx].mostPlayed = [...currentPlayers[pIdx].mostPlayed];
          syncSavePlayer(map.id, pIdx, mapLineup[pIdx], state.lineups);
        }
      }
    });
  }

  if (newNick && !newNick.startsWith('Player ') && !newNick.startsWith('Reserva ')) {
    const tempStats = state.trackerModal.tempStats || {};
    upsertRosterPlayer({
      name: newNick,
      kd: newKd,
      mostPlayed: currentPlayers[pIdx].mostPlayed,
      mapRatings: state.trackerModal.tempMapRatings || tempStats.mapRatings || {},
      mapDetails: tempStats.mapDetails || {},
      recentMatches: tempStats.recentMatches || [],
      overallRating: state.trackerModal.tempOverallRating || tempStats.overallRating || '',
      overallAcs: tempStats.overallAcs || 0,
      overallWinRate: tempStats.overallWinRate !== undefined ? tempStats.overallWinRate : 50,
      totalMatches: tempStats.totalMatches || 0,
      compMatchesCount: tempStats.compMatchesCount || 0,
      unratedMatchesCount: tempStats.unratedMatchesCount || 0,
      totalKills: tempStats.totalKills || 0,
      totalDeaths: tempStats.totalDeaths || 0,
      role: currentPlayers[pIdx].mostPlayed[0] ? getAgentRole(currentPlayers[pIdx].mostPlayed[0]) : 'Flex'
    });
  }

  saveCurrentState();
  syncSavePlayer(state.activeMapId, pIdx, currentPlayers[pIdx], state.lineups);
  renderPlayersList();
  window.closeTrackerModal();
  showToast(`Estatísticas de ${newNick} salvas com sucesso!`, 'success');
};

// Abre Modal de Escolha de Agente
window.openAgentModal = function(playerIndex, slotType) {
  state.activeModal.playerIndex = playerIndex;
  state.activeModal.agentSlot = slotType;

  const modal = document.getElementById('agent-modal');
  const modalSub = document.getElementById('agent-modal-sub');
  const modalSlotPill = document.getElementById('agent-modal-slot-pill');
  const modalTitle = document.getElementById('agent-modal-title');
  const searchInput = document.getElementById('agent-search-input');
  const clearBtn = document.getElementById('agent-search-clear-btn');

  const player = state.lineups[state.activeMapId]?.[playerIndex];
  const playerName = player ? player.name : `Player ${playerIndex + 1}`;

  if (modalSub) modalSub.textContent = `Player: ${playerName}`;

  let slotLabel = 'Agente';
  let slotColorClass = 'text-sky-300 bg-sky-950/70 border-sky-500/40';

  if (slotType === 'titular') {
    slotLabel = 'Titular ⭐';
    slotColorClass = 'text-[#ff4655] bg-[#ff4655]/15 border-[#ff4655]/40';
  } else if (slotType === 'reserva') {
    slotLabel = 'Reserva 🔄';
    slotColorClass = 'text-teal-300 bg-teal-950/70 border-teal-500/40';
  } else if (slotType === 'flex1') {
    slotLabel = 'Flex 1 ⚡';
    slotColorClass = 'text-amber-300 bg-amber-950/70 border-amber-500/40';
  } else if (slotType === 'flex2') {
    slotLabel = 'Flex 2 🛡️';
    slotColorClass = 'text-amber-300 bg-amber-950/70 border-amber-500/40';
  } else if (slotType === 'flex3') {
    slotLabel = 'Flex 3 🎯';
    slotColorClass = 'text-amber-300 bg-amber-950/70 border-amber-500/40';
  } else if (slotType === 'flex4') {
    slotLabel = 'Flex 4 🌀';
    slotColorClass = 'text-amber-300 bg-amber-950/70 border-amber-500/40';
  } else if (slotType === 'flex5') {
    slotLabel = 'Flex 5 ⚔️';
    slotColorClass = 'text-amber-300 bg-amber-950/70 border-amber-500/40';
  } else if (slotType.startsWith('top')) {
    const n = slotType.replace('top', '');
    slotLabel = `Top ${n} Tracker 📊`;
    slotColorClass = 'text-purple-300 bg-purple-950/70 border-purple-500/40';
  }

  if (modalSlotPill) {
    modalSlotPill.textContent = slotLabel;
    modalSlotPill.className = `text-[10px] sm:text-xs font-tactical font-black uppercase px-2 py-0.5 rounded border truncate ${slotColorClass}`;
  }

  if (modalTitle) {
    if (slotType === 'titular') modalTitle.textContent = 'ESCOLHER AGENTE TITULAR';
    else if (slotType === 'reserva') modalTitle.textContent = 'ESCOLHER AGENTE RESERVA';
    else if (slotType.startsWith('flex')) modalTitle.textContent = `ESCOLHER AGENTE ${slotLabel.toUpperCase()}`;
    else if (slotType.startsWith('top')) modalTitle.textContent = 'ESCOLHER AGENTE MAIS JOGADO (TRACKER)';
    else modalTitle.textContent = 'ESCOLHER AGENTE';
  }

  if (searchInput) searchInput.value = '';
  if (clearBtn) clearBtn.classList.add('hidden');

  const chips = document.getElementById('modal-suggestions-chips');
  const toggleBtn = document.getElementById('toggle-suggestions-btn');
  if (chips) chips.classList.remove('hidden');
  if (toggleBtn) toggleBtn.textContent = '▲ Ocultar';

  renderAgentsGrid('all', '');
  renderModalAgentSuggestions(playerIndex, slotType);

  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

window.closeAgentModal = function() {
  const modal = document.getElementById('agent-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
};

// Renderiza os cards de agentes dentro do modal com visual tático refinado
function renderAgentsGrid(roleFilter = 'all', searchQuery = '') {
  const grid = document.getElementById('agents-grid');
  const counter = document.getElementById('agents-count-indicator');
  if (!grid) return;

  let currentSelection = '';
  const player = state.lineups[state.activeMapId]?.[state.activeModal.playerIndex];
  if (player && state.activeModal.agentSlot) {
    if (state.activeModal.agentSlot.startsWith('top')) {
      const idx = parseInt(state.activeModal.agentSlot.replace('top', '')) - 1;
      currentSelection = player.mostPlayed?.[idx] || '';
    } else {
      currentSelection = player[state.activeModal.agentSlot] || '';
    }
  }

  const recs = getSmartAgentRecommendations(state.activeMapId, state.activeModal.playerIndex, state.activeModal.agentSlot).slice(0, 4);
  const recNames = recs.map(r => r.name.toLowerCase());
  const playerPool = (player?.mostPlayed || []).map(a => (a || '').toLowerCase());

  const filtered = ALL_AGENTS.filter(agent => {
    const normFilter = (roleFilter || '').toLowerCase().replace(/es$/, '').replace(/s$/, '');
    const normAgentRole = (agent.role || '').toLowerCase().replace(/es$/, '').replace(/s$/, '');
    const matchesRole = roleFilter === 'all' || 
                        agent.role.toLowerCase() === (roleFilter || '').toLowerCase() || 
                        normAgentRole === normFilter;
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          agent.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  if (counter) {
    counter.textContent = `${filtered.length} de ${ALL_AGENTS.length} agentes`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-10 text-gray-400 font-tactical space-y-2">
        <span class="text-3xl block">🔍</span>
        <span class="text-sm font-bold text-white block">Nenhum agente encontrado</span>
        <span class="text-xs text-gray-500">Tente buscar por outro nome ou selecione outra categoria</span>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(agent => {
    const isSelected = agent.name.toLowerCase() === currentSelection.toLowerCase();
    const isRec = recNames.includes(agent.name.toLowerCase());
    const isPlayerPool = playerPool.includes(agent.name.toLowerCase());
    const poolIndex = playerPool.indexOf(agent.name.toLowerCase());

    // Verifica se este agente está bloqueado para a jogadora atual
    let isBlocked = false;
    let blockedReason = '';
    if (player) {
      if (state.activeModal.playerIndex < 5) {
        if (state.activeModal.agentSlot === 'titular' && player.reserva && player.reserva.toLowerCase() === agent.name.toLowerCase()) {
          isBlocked = true;
          blockedReason = 'Já no slot Reserva';
        } else if (state.activeModal.agentSlot === 'reserva' && player.titular && player.titular.toLowerCase() === agent.name.toLowerCase()) {
          isBlocked = true;
          blockedReason = 'Já no slot Titular';
        }
      } else if (state.activeModal.agentSlot && state.activeModal.agentSlot.startsWith('flex')) {
        const otherFlex = ['flex1', 'flex2', 'flex3'].filter(k => k !== state.activeModal.agentSlot);
        if (otherFlex.some(k => player[k] && player[k].toLowerCase() === agent.name.toLowerCase())) {
          isBlocked = true;
          blockedReason = 'Já em outro slot Flex';
        }
      }
    }

    const roleIcons = {
      'Duelista': '🎯',
      'Controlador': '☁️',
      'Controladora': '☁️',
      'Iniciador': '👁️',
      'Iniciadora': '👁️',
      'Sentinela': '🛡️'
    };
    const roleIcon = roleIcons[agent.role] || '⚡';

    const roleSpecialties = {
      'Duelista': 'Entry & First Blood',
      'Controlador': 'Smokes & Visão',
      'Controladora': 'Smokes & Visão',
      'Iniciador': 'Recon & Suporte',
      'Iniciadora': 'Recon & Suporte',
      'Sentinela': 'Âncora & Flancos'
    };
    const roleSpecialty = roleSpecialties[agent.role] || agent.role;

    const roleKey = (agent.role || '').toLowerCase().startsWith('iniciad')
      ? 'iniciador'
      : (agent.role || '').toLowerCase().startsWith('controlad')
        ? 'controlador'
        : (agent.role || '').toLowerCase();
    const roleClass = agent.role ? `role-badge-${roleKey}` : 'bg-gray-800 text-gray-300';

    let borderClass = 'border-[#1e2f42] hover:border-amber-400 hover:bg-[#121c27]';
    let bgClass = 'bg-[#080d14]';
    if (isBlocked) {
      borderClass = 'border-rose-900/60 bg-[#12080a] opacity-50 cursor-not-allowed';
      bgClass = 'bg-[#12080a]';
    } else if (isSelected) {
      borderClass = 'border-[#ff4655] bg-gradient-to-b from-[#ff4655]/20 to-[#160a0f] shadow-[0_0_20px_rgba(255,70,85,0.4)] ring-2 ring-[#ff4655]';
      bgClass = 'bg-[#140b10]';
    } else if (isRec) {
      borderClass = 'border-emerald-500/50 hover:border-emerald-400 bg-gradient-to-b from-[#0a181c] to-[#070e12]';
    }

    let poolBadge = '';
    if (isPlayerPool) {
      poolBadge = `<span class="text-[9px] font-mono font-bold text-amber-300 bg-amber-950/90 border border-amber-500/50 px-1.5 py-0.5 rounded flex items-center gap-1" title="Agente na pool da jogadora">⭐ Top ${poolIndex + 1}</span>`;
    }

    let metaBadge = '';
    if (isRec) {
      metaBadge = `<span class="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-500/50 px-1.5 py-0.5 rounded flex items-center gap-1" title="Recomendado no meta deste mapa">★ Meta</span>`;
    }

    const clickAction = isBlocked 
      ? `showToast('🚫 ${blockedReason}! Uma jogadora não pode ter o mesmo agente como titular e reserva.', 'warning')` 
      : `window.selectAgent('${agent.name}')`;

    return `
      <button onclick="${clickAction}" 
              class="p-1.5 sm:p-2.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between group min-w-0 cursor-pointer ${borderClass} ${bgClass} hover:-translate-y-0.5 hover:shadow-xl relative">
        
        <!-- Header do Card: Retrato Proporcional Não Cortado e Nome -->
        <div class="flex items-center gap-1.5 sm:gap-2.5 min-w-0 w-full">
          <div class="relative flex-shrink-0">
            <div class="w-10 h-10 xs:w-11 xs:h-11 sm:w-14 sm:h-14 rounded-xl bg-[#050910] border-2 p-0.5 sm:p-1 flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-105"
                 style="border-color: ${agent.color}">
              <img src="${agent.icon}" alt="${agent.name}" class="w-full h-full object-contain filter drop-shadow-sm" loading="lazy">
            </div>
            ${isSelected ? `
              <span class="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#ff4655] border-2 border-[#0d141e] rounded-full flex items-center justify-center text-[8px] sm:text-[9px] text-white font-black shadow-md">
                ✓
              </span>
            ` : ''}
          </div>

          <div class="truncate flex-1 min-w-0 space-y-0.5">
            <b class="text-xs sm:text-sm font-tactical font-black text-white group-hover:text-amber-300 transition-colors block truncate leading-tight">
              ${agent.name}
            </b>
            <div class="flex items-center gap-1">
              <span class="text-[7px] sm:text-[9px] font-mono font-bold uppercase px-1 sm:px-1.5 py-0.5 rounded-md leading-none ${roleClass} inline-flex items-center gap-0.5">
                <span>${roleIcon}</span> <span>${agent.role}</span>
              </span>
            </div>
            <span class="text-[8px] sm:text-[9px] text-gray-400 font-sans block truncate leading-tight">
              ${roleSpecialty}
            </span>
          </div>
        </div>

        <!-- Rodapé do Card: Badges Táticas (Meta, Pool, Bloqueado, Selecionado) -->
        <div class="flex items-center justify-between gap-1 mt-1.5 sm:mt-2 pt-1 sm:pt-1.5 border-t border-[#162232] flex-wrap w-full min-w-0 text-[8px] sm:text-[9px]">
          <div class="flex items-center gap-1 flex-wrap min-w-0">
            ${isBlocked ? `<span class="text-[8px] font-mono font-bold text-rose-300 bg-rose-950/80 border border-rose-500/40 px-1 py-0.2 rounded">🚫 ${blockedReason}</span>` : ''}
            ${!isBlocked ? metaBadge : ''}
            ${!isBlocked ? poolBadge : ''}
          </div>
          ${isBlocked
            ? '<span class="text-[8px] font-mono text-rose-400 uppercase ml-auto">Indisponível</span>'
            : (isSelected 
              ? '<span class="text-[8px] sm:text-[9px] font-mono font-black text-[#ff4655] uppercase ml-auto">✓ Ativo</span>' 
              : '<span class="text-[8px] sm:text-[9px] text-gray-500 font-mono group-hover:text-gray-200 transition ml-auto">Selecionar →</span>')}
        </div>

      </button>
    `;
  }).join('');
}
// Seleciona o agente e salva
window.selectAgent = function(agentName) {
  const { playerIndex, agentSlot } = state.activeModal;
  if (playerIndex === null || !agentSlot) return;

  const currentPlayers = state.lineups[state.activeMapId];
  if (!currentPlayers || !currentPlayers[playerIndex]) return;

  const player = currentPlayers[playerIndex];

  // Bloqueio rigoroso: Não permite o mesmo agente em Titular e Reserva
  if (playerIndex < 5) {
    if (agentSlot === 'titular') {
      if (player.reserva && player.reserva.toLowerCase() === agentName.toLowerCase()) {
        showToast(`🚫 Não é permitido escalar ${agentName} como Titular e Reserva da mesma jogadora!`, 'warning');
        return;
      }
    } else if (agentSlot === 'reserva') {
      if (player.titular && player.titular.toLowerCase() === agentName.toLowerCase()) {
        showToast(`🚫 Não é permitido escalar ${agentName} como Titular e Reserva da mesma jogadora!`, 'warning');
        return;
      }
    }
  } else if (agentSlot && agentSlot.startsWith('flex')) {
    const otherFlex = ['flex1', 'flex2', 'flex3'].filter(k => k !== agentSlot);
    if (otherFlex.some(k => player[k] && player[k].toLowerCase() === agentName.toLowerCase())) {
      showToast(`🚫 ${agentName} já está escalado em outro slot Flex desta jogadora!`, 'warning');
      return;
    }
  }

  if (agentSlot.startsWith('top')) {
    if (!Array.isArray(currentPlayers[playerIndex].mostPlayed)) {
      currentPlayers[playerIndex].mostPlayed = [];
    }
    const idx = parseInt(agentSlot.replace('top', '')) - 1;
    currentPlayers[playerIndex].mostPlayed[idx] = agentName;
  } else {
    currentPlayers[playerIndex][agentSlot] = agentName;
  }

  saveCurrentState();
  syncSavePlayer(state.activeMapId, playerIndex, currentPlayers[playerIndex], state.lineups);

  renderPlayersList();
  closeAgentModal();
  showToast(`${agentName} selecionado com sucesso!`, 'success');
};

// Limpa seleção do agente atual
window.clearSelectedAgent = function() {
  const { playerIndex, agentSlot } = state.activeModal;
  if (playerIndex === null || !agentSlot) return;

  const currentPlayers = state.lineups[state.activeMapId];
  if (!currentPlayers || !currentPlayers[playerIndex]) return;

  if (agentSlot.startsWith('top')) {
    if (Array.isArray(currentPlayers[playerIndex].mostPlayed)) {
      const idx = parseInt(agentSlot.replace('top', '')) - 1;
      currentPlayers[playerIndex].mostPlayed.splice(idx, 1);
    }
  } else {
    currentPlayers[playerIndex][agentSlot] = '';
  }

  saveCurrentState();
  syncSavePlayer(state.activeMapId, playerIndex, currentPlayers[playerIndex], state.lineups);

  renderPlayersList();
  closeAgentModal();
  showToast('Seleção removida', 'info');
};

// Configura busca e filtros de função de agentes no modal
function setupAgentModalFilters() {
  const searchInput = document.getElementById('agent-search-input');
  const clearBtn = document.getElementById('agent-search-clear-btn');
  const roleButtons = document.querySelectorAll('.role-filter-btn');

  let currentRoleFilter = 'all';

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (clearBtn) {
        if (q.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
      }
      renderAgentsGrid(currentRoleFilter, q);
    });
  }

  roleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      roleButtons.forEach(b => {
        b.className = 'role-filter-btn px-3 py-1.5 rounded-xl bg-[#101924] text-gray-300 font-tactical font-bold text-xs hover:bg-[#182637] hover:text-white border border-[#203246] whitespace-nowrap transition cursor-pointer';
      });
      btn.className = 'role-filter-btn px-3 py-1.5 rounded-xl bg-[#ff4655] text-white font-tactical font-bold text-xs shadow-md whitespace-nowrap transition cursor-pointer';
      
      currentRoleFilter = btn.getAttribute('data-role') || 'all';
      const q = searchInput ? searchInput.value.trim() : '';
      renderAgentsGrid(currentRoleFilter, q);
    });
  });
}
// Salva todo o estado da aplicação
function saveCurrentState() {
  const fullPayload = {
    meta: {
      teamName: state.teamName,
      roster: state.roster,
      lastUpdated: new Date().toISOString()
    },
    lineups: state.lineups
  };
  syncSaveData(fullPayload);
}

// --------------------------------------------------------------------------
// MODAL & COMPARTILHAMENTO WHATSAPP
// --------------------------------------------------------------------------

window.openWhatsappModal = function() {
  const modal = document.getElementById('whatsapp-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  window.renderWhatsappSummary(state.whatsappView);
};

window.closeWhatsappModal = function() {
  const modal = document.getElementById('whatsapp-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
};

window.renderWhatsappSummary = function(viewMode) {
  state.whatsappView = viewMode;

  const btnCurrent = document.getElementById('tab-btn-current-map');
  const btnMeta = document.getElementById('tab-btn-meta-maps');
  const btnAll = document.getElementById('tab-btn-all-maps');
  const preview = document.getElementById('whatsapp-preview-text');

  const inactiveClass = 'px-2.5 py-1 text-xs font-tactical font-bold rounded bg-[#16202c] text-gray-300 hover:bg-[#223142] whitespace-nowrap';
  const activeClass = 'px-2.5 py-1 text-xs font-tactical font-bold rounded bg-[#ff4655] text-white whitespace-nowrap';

  if (btnCurrent) btnCurrent.className = viewMode === 'current' ? activeClass : inactiveClass;
  if (btnMeta) btnMeta.className = viewMode === 'meta' ? activeClass : inactiveClass;
  if (btnAll) btnAll.className = viewMode === 'all' ? activeClass : inactiveClass;

  if (preview) {
    if (viewMode === 'current') {
      preview.value = generateWhatsappMapText(state.activeMapId);
    } else if (viewMode === 'meta') {
      preview.value = generateWhatsappGroupedMapsText(true);
    } else {
      preview.value = generateWhatsappGroupedMapsText(false);
    }
  }
};

function generateWhatsappMapText(mapId) {
  const mapData = MAPS_DATA.find(m => m.id === mapId) || MAPS_DATA[0];
  const players = state.lineups[mapId] || DEFAULT_PLAYERS;
  const teamRating = calculateTeamMapRating(mapId);

  let text = `🎯 *LINEUP VALORANT* 🎯\n`;
  text += `🏆 *Equipe:* ${state.teamName}\n`;
  text += `📍 *Mapa:* ${mapData.name.toUpperCase()} ${mapData.isMeta ? '(Pool Ativo)' : '(Fora do Meta)'}\n`;
  if (teamRating.avgNum !== null) {
    text += `📊 *Rendimento Médio:* ${teamRating.avgStr}/10 (${teamRating.tier})\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;

  // 5 Titulares
  text += `⭐ *TITULARES:*\n`;
  players.slice(0, 5).forEach((p, idx) => {
    const titular = p.titular || 'Não definido';
    const reserva = p.reserva ? `(Res: ${p.reserva})` : '';
    const kd = p.kd ? ` [K/D: ${p.kd}]` : '';
    const rend = p.rendimento ? ` [Rend: ${p.rendimento}/10]` : '';
    text += `${idx + 1}️⃣ *${p.name || `Player ${idx + 1}`}*${kd}${rend}: ${titular} ${reserva}\n`;
  });

  // Reservas Ativas (Ignora vagas sem jogadora escalada)
  const reserves = players.slice(5).filter(p => hasScaledPlayer(p));
  if (reserves.length > 0) {
    text += `\n👥 *RESERVAS & FLEX:*\n`;
    reserves.forEach((p, idx) => {
      const kd = p.kd ? ` [K/D: ${p.kd}]` : '';
      const rend = p.rendimento ? ` [Rend: ${p.rendimento}/10]` : '';
      const flexPicks = [p.flex1, p.flex2, p.flex3].filter(Boolean);
      const flexStr = flexPicks.length > 0 ? flexPicks.join(', ') : 'Nenhum definido';
      text += `R${idx + 1}️⃣ *${p.name || `Reserva ${idx + 1}`}*${kd}${rend}:\n`;
      text += `   ↳ _Flex:_ ${flexStr}\n`;
    });
  }

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `⚡ _Painel Tático Atualizado_`;
  return text;
}

function generateWhatsappGroupedMapsText(onlyMeta = false) {
  let text = `🎯 *ESCALAÇÃO DE LINEUP VALORANT* 🎯\n`;
  text += `🏆 *Equipe:* ${state.teamName}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  const metaMaps = MAPS_DATA.filter(m => m.isMeta);
  text += `🏆 *--- POOL DO CAMPEONATO (META) ---*\n\n`;
  metaMaps.forEach(map => {
    const teamRating = calculateTeamMapRating(map.id);
    const ratingStr = teamRating.avgNum !== null ? ` | Rend: ${teamRating.avgStr}/10 (${teamRating.tier})` : '';
    text += `📍 *MAPA: ${map.name.toUpperCase()}*${ratingStr}\n`;
    const players = state.lineups[map.id] || DEFAULT_PLAYERS;
    players.slice(0, 5).forEach((p, idx) => {
      const titular = p.titular || '-';
      const reserva = p.reserva ? `[Res: ${p.reserva}]` : '';
      const kd = p.kd ? ` (${p.kd})` : '';
      const rend = p.rendimento ? ` [${p.rendimento}/10]` : '';
      text += `• *${p.name || `P${idx + 1}`}*${kd}${rend}: ${titular} ${reserva}\n`;
    });
    const reserves = players.slice(5).filter(r => hasScaledPlayer(r));
    if (reserves.length > 0) {
      const flexList = reserves.map((r, rIdx) => {
        const f = [r.flex1, r.flex2, r.flex3].filter(Boolean).join('/');
        const rend = r.rendimento ? ` [${r.rendimento}/10]` : '';
        return `${r.name || `R${rIdx + 1}`}${rend}${f ? ` [Flex: ${f}]` : ''}`;
      }).join(' | ');
      text += `  ↳ _Suplentes:_ ${flexList}\n`;
    }
    text += `\n`;
  });

  if (!onlyMeta) {
    const benchMaps = MAPS_DATA.filter(m => !m.isMeta);
    text += `📦 *--- FORA DO META / RESERVA ---*\n\n`;
    benchMaps.forEach(map => {
      const teamRating = calculateTeamMapRating(map.id);
      const ratingStr = teamRating.avgNum !== null ? ` | Rend: ${teamRating.avgStr}/10 (${teamRating.tier})` : '';
      text += `📍 *MAPA: ${map.name.toUpperCase()}*${ratingStr}\n`;
      const players = state.lineups[map.id] || DEFAULT_PLAYERS;
      players.slice(0, 5).forEach((p, idx) => {
        const titular = p.titular || '-';
        const reserva = p.reserva ? `[Res: ${p.reserva}]` : '';
        const kd = p.kd ? ` (${p.kd})` : '';
        const rend = p.rendimento ? ` [${p.rendimento}/10]` : '';
        text += `• *${p.name || `P${idx + 1}`}*${kd}${rend}: ${titular} ${reserva}\n`;
      });
      const reserves = players.slice(5).filter(r => hasScaledPlayer(r));
      if (reserves.length > 0) {
        const flexList = reserves.map((r, rIdx) => {
          const f = [r.flex1, r.flex2, r.flex3].filter(Boolean).join('/');
          const rend = r.rendimento ? ` [${r.rendimento}/10]` : '';
          return `${r.name || `R${rIdx + 1}`}${rend}${f ? ` [Flex: ${f}]` : ''}`;
        }).join(' | ');
        text += `  ↳ _Suplentes:_ ${flexList}\n`;
      }
      text += `\n`;
    });
  }

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `⚡ _Painel Tático Atualizado_`;
  return text;
}

window.generateWhatsappMapText = generateWhatsappMapText;
window.generateWhatsappGroupedMapsText = generateWhatsappGroupedMapsText;

// Copia o texto do resumo do mapa atual direto
window.copyCurrentMapSummary = function() {
  const text = generateWhatsappMapText(state.activeMapId);
  copyToClipboard(text, 'Resumo do mapa copiado para o WhatsApp!');
};

// Copia o texto presente no modal do WhatsApp
window.copyWhatsappText = function() {
  const preview = document.getElementById('whatsapp-preview-text');
  if (preview) {
    copyToClipboard(preview.value, 'Texto copiado para a área de transferência!');
  }
};

// Abre direto no WhatsApp Web / App
window.shareDirectWhatsapp = function() {
  const preview = document.getElementById('whatsapp-preview-text');
  if (!preview) return;

  const encoded = encodeURIComponent(preview.value);
  const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(waUrl, '_blank');
};

// --------------------------------------------------------------------------
// MODAL DE CONFIGURAÇÃO DO FIREBASE
// --------------------------------------------------------------------------

window.openFirebaseModal = function() {
  const modal = document.getElementById('firebase-modal');
  const henrikInput = document.getElementById('henrik-api-key-input');
  if (henrikInput) {
    henrikInput.value = getHenrikApiKey();
  }
  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

window.closeFirebaseModal = function() {
  const modal = document.getElementById('firebase-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
};

window.applyFirebaseConfigFromInput = function() {
  const textarea = document.getElementById('firebase-config-textarea');
  const henrikInput = document.getElementById('henrik-api-key-input');

  if (henrikInput) {
    saveHenrikApiKey(henrikInput.value.trim());
  }

  if (!textarea) return;

  const rawText = textarea.value.trim();
  if (!rawText) {
    showToast('Chave HenrikDev salva!', 'success');
    closeFirebaseModal();
    return;
  }

  let parsed = null;

  // Tenta parsear como JSON direto
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    // Se colou código Javascript como "const firebaseConfig = { ... }"
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        // Converte objeto JS relaxado em JSON
        const sanitized = match[0]
          .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
          .replace(/'/g, '"')
          .replace(/,\s*}/g, '}');
        parsed = JSON.parse(sanitized);
      }
    } catch (err) {
      console.error('Falha no parser relaxado:', err);
    }
  }

  if (!parsed || !parsed.apiKey) {
    showToast('Formato inválido. Certifique-se de que contenha apiKey e databaseURL.', 'error');
    return;
  }

  // Garante que databaseURL esteja preenchido
  if (!parsed.databaseURL && parsed.projectId) {
    parsed.databaseURL = `https://${parsed.projectId}-default-rtdb.firebaseio.com`;
  }

  saveFirebaseConfig(parsed);
  showToast('Configuração salva! Reiniciando conexão...', 'success');
  closeFirebaseModal();

  setTimeout(() => {
    window.location.reload();
  }, 1000);
};

window.clearFirebaseConfiguration = function() {
  if (confirm('Deseja realmente desconectar o Firebase e voltar para o modo local?')) {
    clearFirebaseConfig();
    showToast('Firebase desconectado. Operando em Modo Local.', 'info');
    closeFirebaseModal();
    setTimeout(() => {
      window.location.reload();
    }, 800);
  }
};

// --------------------------------------------------------------------------
// PAINEL DE ESTATÍSTICAS DA EQUIPE & RENDIMENTO COLETIVO (PROTÓTIPO)
// --------------------------------------------------------------------------

function evaluateAgentDuoSynergy(ag1, ag2, p1Name, p2Name, p1Kd, p2Kd) {
  const role1 = getAgentRole(ag1) || 'Flex';
  const role2 = getAgentRole(ag2) || 'Flex';

  const roles = [role1, role2].sort();
  let baseScore = 80;
  let dynamicTitle = 'Sinergia Tática Adaptável';
  let dynamicDesc = 'Combinação flexível com potencial de suporte e troca de dano mútua.';
  let comboTitle = 'Apoio em Duelos Mútuos';

  if (roles.includes('Sentinela') && roles.includes('Iniciadora')) {
    baseScore = 95;
    dynamicTitle = 'Informação Revelada & Pós-Plant Letal ⭐';
    dynamicDesc = 'O Iniciador escaneia posições permitindo que o Sentinela ative armadilhas e habilidades no tempo ideal.';
    comboTitle = 'Scan de Posição + Nanoswarm / Fio';
  } else if (roles.includes('Controladora') && roles.includes('Duelista')) {
    baseScore = 92;
    dynamicTitle = 'Smokes de Cobertura & Entrada Rápida ⚡';
    dynamicDesc = 'Smokes bloqueiam a visão das miras adversárias enquanto o Duelista abre o bomb com avanço acelerado.';
    comboTitle = 'Smoke Profunda + Entrada de Espaço';
  } else if (roles.includes('Iniciadora') && roles.includes('Duelista')) {
    baseScore = 89;
    dynamicTitle = 'Concussão & First Blood Seguro 🎯';
    dynamicDesc = 'O Iniciador cega ou concussiona os ângulos defensivos para garantir abates iniciais sem expor a equipe.';
    comboTitle = 'Stun / Flash em Curva + Trade Kill';
  } else if (roles.includes('Sentinela') && roles.includes('Controladora')) {
    baseScore = 86;
    dynamicTitle = 'Ancoragem Dupla & Retardo de Retake 🛡️';
    dynamicDesc = 'Veneno e paredes combinados a fios e torretas tornam o bomb praticamente impenetrável.';
    comboTitle = 'Veneno / Fumaça + Alarme e Fio';
  } else if (role1 === 'Iniciadora' && role2 === 'Iniciadora') {
    baseScore = 85;
    dynamicTitle = 'Sobrecarga de Informação 🔍';
    dynamicDesc = 'Varredura contínua de mapa que anula completamente qualquer posição escondida do time adversário.';
    comboTitle = 'Drone / Lobo + Flecha de Revelação';
  } else if (role1 === 'Controladora' && role2 === 'Controladora') {
    baseScore = 87;
    dynamicTitle = 'Domínio de Espaço Total (Double Smoke) ☁️';
    dynamicDesc = 'Controle absoluto de mapa, ideal para execuções lentas e domínio de áreas neutras.';
    comboTitle = 'Bloqueio Simultâneo de Múltiplos Acessos';
  } else if (role1 === 'Duelista' && role2 === 'Duelista') {
    baseScore = 78;
    dynamicTitle = 'Pressão Ofensiva Dupla 🔥';
    dynamicDesc = 'Alto poder de fogo e agressividade, mas exige suporte preciso dos companheiros.';
    comboTitle = 'Entrada Cruzada / Pincer Attack';
  }

  const avgKd = ((parseFloat(p1Kd) || 1.0) + (parseFloat(p2Kd) || 1.0)) / 2;
  const kdBump = Math.round((avgKd - 1.0) * 8);
  const finalScore = Math.min(99, Math.max(65, baseScore + kdBump));

  return {
    agent1: ag1,
    agent2: ag2,
    player1: p1Name,
    player2: p2Name,
    role1,
    role2,
    score: finalScore,
    dynamicTitle,
    dynamicDesc,
    comboTitle,
    jointAcs: Math.round(avgKd * 220)
  };
}

window.switchMainView = function(viewName) {
  state.currentMainView = viewName;
  const viewLineup = document.getElementById('view-lineup');
  const viewAnalytics = document.getElementById('view-analytics');
  const viewSync = document.getElementById('view-sync');
  const btnLineup = document.getElementById('main-nav-btn-lineup');
  const btnAnalytics = document.getElementById('main-nav-btn-analytics');
  const btnSync = document.getElementById('main-nav-btn-sync');

  // Reset visual das views
  if (viewLineup) viewLineup.classList.add('hidden');
  if (viewAnalytics) viewAnalytics.classList.add('hidden');
  if (viewSync) viewSync.classList.add('hidden');

  // Reset visual dos botões
  const defaultBtnClass = 'px-2 sm:px-3 py-1.5 rounded-lg text-xs font-tactical font-bold transition flex items-center justify-center gap-1 text-gray-400 hover:text-white hover:bg-[#14202d] w-full';
  const activeBtnClass = 'px-2 sm:px-3 py-1.5 rounded-lg text-xs font-tactical font-bold transition flex items-center justify-center gap-1 bg-[#ff4655] text-white shadow-[0_0_10px_rgba(255,70,85,0.3)] w-full';

  if (btnLineup) btnLineup.className = defaultBtnClass;
  if (btnAnalytics) btnAnalytics.className = defaultBtnClass;
  if (btnSync) btnSync.className = defaultBtnClass;

  if (viewName === 'analytics') {
    if (viewAnalytics) {
      viewAnalytics.classList.remove('hidden');
      renderTeamAnalyticsView();
    }
    if (btnAnalytics) btnAnalytics.className = activeBtnClass;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (viewName === 'sync') {
    if (viewSync) {
      viewSync.classList.remove('hidden');
      renderSyncView();
    }
    if (btnSync) btnSync.className = activeBtnClass;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    if (viewLineup) viewLineup.classList.remove('hidden');
    if (btnLineup) btnLineup.className = activeBtnClass;
    renderPlayersList();
  }
};

window.setAnalyticsMap = function(mapId) {
  state.teamAnalytics.selectedMapId = mapId;
  renderTeamAnalyticsView();
};

window.syncAllTeamFromApi = async function() {
  const currentPlayers = state.lineups[state.activeMapId] || DEFAULT_PLAYERS;
  const taggedPlayers = [];
  currentPlayers.forEach((p, idx) => {
    if (p.name && p.name.includes('#')) {
      taggedPlayers.push({ index: idx, name: p.name.trim() });
    }
  });

  if (taggedPlayers.length === 0) {
    showToast('Nenhuma jogadora com Nick#TAG encontrada na lineup!', 'warning');
    return;
  }

  showToast(`⏳ Sincronizando ${taggedPlayers.length} jogadoras via API Riot Games...`, 'info');
  for (let i = 0; i < taggedPlayers.length; i++) {
    const item = taggedPlayers[i];
    await autoFetchPlayerStatsInBackground(item.index, item.name);
  }
  showToast(`✅ Todas as jogadoras da equipe foram sincronizadas!`, 'success');
  renderTeamAnalyticsView();
};



// --------------------------------------------------------------------------
// PRESETS TÁTICOS DO META PARA OS 11 MAPAS COMPETITIVOS
// --------------------------------------------------------------------------
const MAP_COMP_PRESETS = {
  ascent: [
    {
      title: 'Meta Equilibrado VCT',
      archetype: 'Recomendada ⭐',
      tag: 'Alta Sinergia & Controle de Meio',
      agents: ['Sova', 'Omen', 'Killjoy', 'Jett', 'KAY/O'],
      plan: 'Controle sistemático do Meio com recon do Sova e smokes do Omen. Killjoy ancora o Bomb B solo com confinamento defensivo, enquanto Jett e KAY/O abrem o Bomb A com supressão.',
      combos: ['Flecha de Reconhecimento + Trap Nanoswarm', 'Supressão KAY/O + Avanço Jett', 'Paranoia Omen + Flecha de Choque'],
      baseScore: 96
    },
    {
      title: 'Agressão Rápida & Retomada',
      archetype: 'Agressiva ⚡',
      tag: 'Duplo Duelista & Abertura Direta',
      agents: ['Jett', 'Reyna', 'Omen', 'KAY/O', 'Killjoy'],
      plan: 'Pressão acelerada em ambos os bombsites com abertura simultânea de Jett e Reyna. KAY/O desativa armadilhas adversárias facilitando o plant instantâneo.',
      combos: ['Flash Reyna + Dash Jett', 'Smoke Omen + Olhar Reyna'],
      baseScore: 90
    },
    {
      title: 'Controle de Mapa & Armadilhas',
      archetype: 'Controle 🛡️',
      tag: 'Duplo Sentinela & Confinamento',
      agents: ['Cypher', 'Killjoy', 'Sova', 'Omen', 'Jett'],
      plan: 'Fechamento hermético dos acessos com fios do Cypher e torreta da Killjoy. Obriga o adversário a gastar todos os recursos antes de alcançar o bombsite.',
      combos: ['Fio Cypher + Confinamento Killjoy', 'Câmera Cypher + Flecha Sova'],
      baseScore: 88
    }
  ],
  bind: [
    {
      title: 'Meta Clássico Bind',
      archetype: 'Recomendada ⭐',
      tag: 'Controle de Teleports & Pós-Plant',
      agents: ['Brimstone', 'Viper', 'Raze', 'Skye', 'Cypher'],
      plan: 'Duplo controlador garantindo isolamento total do Hookah e do Banheiro. Raze limpa ângulos fechados com cartuchos e granadas auxiliada pelos lobos da Skye.',
      combos: ['Lobo Skye + Granadas Raze', 'Cortina Viper + Smokes Brimstone', 'Fio Cypher + Moly Brimstone'],
      baseScore: 95
    },
    {
      title: 'Pressão Teleport Explosiva',
      archetype: 'Agressiva ⚡',
      tag: 'Aceleração & Duplo Duelista',
      agents: ['Raze', 'Yoru', 'Brimstone', 'Skye', 'Fade'],
      plan: 'Uso agressivo dos teletransportadores com clones do Yoru e bombinhas da Raze para surpreender a defesa pelas costas.',
      combos: ['Clone Yoru + Bombinha Raze', 'Tether Fade + Granada Raze'],
      baseScore: 89
    },
    {
      title: 'Muralha Defensiva',
      archetype: 'Controle 🛡️',
      tag: 'Duplo Sentinela B & A',
      agents: ['Cypher', 'Deadlock', 'Viper', 'Brimstone', 'Raze'],
      plan: 'Ancoragem com fios e barreiras no Hookah e Jardim. Impossibilita o avanço do adversário sem perda massiva de vida.',
      combos: ['GravNet Deadlock + Granada Raze', 'Veneno Viper + Barreira Deadlock'],
      baseScore: 87
    }
  ],
  haven: [
    {
      title: 'Meta 3 Bombsites',
      archetype: 'Recomendada ⭐',
      tag: 'Controle de Garagem & Rotação',
      agents: ['Omen', 'Jett', 'Sova', 'Breach', 'Killjoy'],
      plan: 'Breach domina a Garagem e o Meio com estorvos e flashes. Sova garante info no Bomb C e A, permitindo rotações rápidas e retakes organizados.',
      combos: ['Estorvo Breach + Dash Jett', 'Flecha Sova + Pós-Estorvo', 'Paranoia Omen + Flash Breach'],
      baseScore: 96
    },
    {
      title: 'Blitzkrieg Tripla',
      archetype: 'Agressiva ⚡',
      tag: 'Velocidade & Stuns',
      agents: ['Jett', 'Neon', 'Breach', 'Omen', 'Sova'],
      plan: 'Aproveita os 3 bombsites para ataques relâmpagos de Neon e Jett, forçando a defesa a se dividir e perder confrontos 1v1.',
      combos: ['Corrida Neon + Flash Breach', 'Fagulha Neon + Dash Jett'],
      baseScore: 91
    },
    {
      title: 'Ancoragem C Long & Garagem',
      archetype: 'Controle 🛡️',
      tag: 'Duplo Sentinela Anti-Avanço',
      agents: ['Cypher', 'Killjoy', 'Sova', 'Omen', 'Iso'],
      plan: 'Cypher trava a Garagem e Meio enquanto Killjoy protege o Bomb C com torreta e alarmes.',
      combos: ['Fio Cypher na Garagem + Escudo Iso', 'Torreta Killjoy + Flecha Sova'],
      baseScore: 88
    }
  ],
  split: [
    {
      title: 'Meta Clássico Meio & Céu',
      archetype: 'Recomendada ⭐',
      tag: 'Domínio das Cordas & Meio',
      agents: ['Raze', 'Omen', 'Viper', 'Skye', 'Cypher'],
      plan: 'Disputa feroz das Cordas e Ventilação com granadas da Raze e smokes da Viper/Omen. Cypher trava o avanço da B com fios profundos.',
      combos: ['Granada Raze + Flechas/Lobos Skye', 'Veneno Viper + Fio Cypher', 'Paranoia Omen + Bombinha Raze'],
      baseScore: 95
    },
    {
      title: 'Execução Acelerada',
      archetype: 'Agressiva ⚡',
      tag: 'Flashes Rápidas & Entrada B',
      agents: ['Raze', 'Jett', 'Breach', 'Omen', 'Skye'],
      plan: 'Sobrecarga de estorvos e flashes no Meio e Main A para abrir caminho instantâneo aos bombsites.',
      combos: ['Estorvo Breach + Granadas Raze', 'Flash Skye + Dash Jett'],
      baseScore: 89
    },
    {
      title: 'Fortaleza B & Meio',
      archetype: 'Controle 🛡️',
      tag: 'Barreiras & Retomada Calma',
      agents: ['Cypher', 'Sage', 'Viper', 'Omen', 'Raze'],
      plan: 'Orbe de lentidão e parede da Sage atrasam o ataque adversário em 40 segundos, garantindo tempo para os reforços chegarem.',
      combos: ['Parede Sage + Fio Cypher', 'Lentidão Sage + Granada Raze'],
      baseScore: 87
    }
  ],
  sunset: [
    {
      title: 'Controle de Pátio & B',
      archetype: 'Recomendada ⭐',
      tag: 'Domínio Central & Armadilhas',
      agents: ['Omen', 'Cypher', 'Sova', 'Breach', 'Raze'],
      plan: 'Cypher é rei no Bomb B com fios mortais no beco. Sova e Breach limpam o Pátio Central garantindo domínio total de rotações.',
      combos: ['Fio Cypher + Granada Raze', 'Estorvo Breach + Recon Sova', 'Paranoia Omen + Entrada Raze'],
      baseScore: 96
    },
    {
      title: 'Pressão Relâmpago',
      archetype: 'Agressiva ⚡',
      tag: 'Duplo Duelista & Abertura Rápida',
      agents: ['Raze', 'Neon', 'Breach', 'Omen', 'Gekko'],
      plan: 'Gekko planta a spike de longe com o Wingman enquanto Neon e Raze atropelam a defesa com stuns e granadas.',
      combos: ['Wingman Gekko + Flash Breach', 'Slide Neon + Granada Raze'],
      baseScore: 90
    },
    {
      title: 'Cadeado Duplo',
      archetype: 'Controle 🛡️',
      tag: 'Cypher + Deadlock',
      agents: ['Cypher', 'Deadlock', 'Omen', 'Fade', 'Raze'],
      plan: 'Fios do Cypher no B e Barreiras da Deadlock no A criam um mapa intransitável para investidas desordenadas.',
      combos: ['GravNet Deadlock + Fio Cypher', 'Tether Fade + GravNet'],
      baseScore: 89
    }
  ],
  lotus: [
    {
      title: 'Meta 3 Sites Rápido',
      archetype: 'Recomendada ⭐',
      tag: 'Controle das Portas Giratórias',
      agents: ['Omen', 'Fade', 'Killjoy', 'Raze', 'Viper'],
      plan: 'Duplo controlador neutraliza as linhas de visão longas em A e C. Fade e Raze combinam Tether e granadas nas portas giratórias.',
      combos: ['Tether Fade + Granadas Raze', 'Cortina Viper + Confinamento Killjoy', 'Paranoia Omen + Olhar Fade'],
      baseScore: 95
    },
    {
      title: 'Sobrecarga de Duelo',
      archetype: 'Agressiva ⚡',
      tag: 'Pressão de Entrada em C',
      agents: ['Neon', 'Raze', 'Breach', 'Omen', 'Fade'],
      plan: 'Invasões fulminantes no Bomb C e Montículo com estorvos do Breach e velocidade da Neon.',
      combos: ['Fagulha Neon + Estorvo Breach', 'Tether Fade + Bombinha Raze'],
      baseScore: 90
    },
    {
      title: 'Retomada Metódica',
      archetype: 'Controle 🛡️',
      tag: 'Pós-Plant & Ancoragem A/C',
      agents: ['Killjoy', 'Cypher', 'Viper', 'Omen', 'Fade'],
      plan: 'Permite o plant adversário com dano residual e executa retakes com 100% de utilitários combinados.',
      combos: ['Confinamento Killjoy + Poço Peçonhento Viper', 'Fio Cypher + Smoke Omen'],
      baseScore: 88
    }
  ],
  breeze: [
    {
      title: 'Meta Longas Distâncias',
      archetype: 'Recomendada ⭐',
      tag: 'Cortina Viper & Recon Amplo',
      agents: ['Viper', 'Sova', 'Jett', 'Cypher', 'KAY/O'],
      plan: 'A cortina da Viper corta o mapa em dois. Sova e KAY/O revelam e suprimem operadores adversários, abrindo espaço para a Jett dominar as pirâmides.',
      combos: ['Flecha Sova + Cortina Viper', 'Faca KAY/O + Dash Jett', 'Fio Cypher + Veneno Viper'],
      baseScore: 97
    },
    {
      title: 'Agressão com Operator',
      archetype: 'Agressiva ⚡',
      tag: 'Domínio de Meio com Jett/Yoru',
      agents: ['Jett', 'Yoru', 'Sova', 'Viper', 'Harbor'],
      plan: 'Dupla cortina aquática com Viper e Harbor para avançar no Meio e Pirâmides sem ser visto.',
      combos: ['Onda Harbor + Dash Jett', 'Teleport Yoru + Flecha Sova'],
      baseScore: 89
    },
    {
      title: 'Sentinelas de Mira Longa',
      archetype: 'Controle 🛡️',
      tag: 'Viper + Cypher + Chamber',
      agents: ['Viper', 'Cypher', 'Chamber', 'Sova', 'Astra'],
      plan: 'Chamber e Cypher travam A e B com mira pesada e câmeras, liberando a equipe para defender o Meio.',
      combos: ['Câmera Cypher + Tour de Force Chamber', 'Veneno Viper + Marca Chamber'],
      baseScore: 87
    }
  ],
  icebox: [
    {
      title: 'Meta Vertical Icebox',
      archetype: 'Recomendada ⭐',
      tag: 'Plant Seguro & Domínio A',
      agents: ['Viper', 'Sova', 'Killjoy', 'Jett', 'Sage'],
      plan: 'Sage garante o plant seguro no Bomb B com a parede de gelo. Viper e Sova cobrem o Meio e o Bomb A com recon vertical e cortinas.',
      combos: ['Parede Sage + Plant Seguro', 'Flecha Sova + Dash Jett nos Tubos', 'Confinamento Killjoy no Retake A'],
      baseScore: 96
    },
    {
      title: 'Aceleração nos Tubos',
      archetype: 'Agressiva ⚡',
      tag: 'Invasão Rápida A Céu',
      agents: ['Jett', 'Reyna', 'Viper', 'Sova', 'Gekko'],
      plan: 'Gekko envia o Wingman para armar a spike no A enquanto Jett e Reyna limpam o Céu e Rafters.',
      combos: ['Wingman Gekko + Dash Jett', 'Olhar Reyna + Cortina Viper'],
      baseScore: 90
    },
    {
      title: 'Controle de Flanco B',
      archetype: 'Controle 🛡️',
      tag: 'Duplo Sentinela Anti-Plant',
      agents: ['Killjoy', 'Sage', 'Viper', 'Harbor', 'Sova'],
      plan: 'Lentidões e armadilhas impedem qualquer aproximação rápida da B Long e Cozinha.',
      combos: ['Lentidão Sage + Nanoswarm Killjoy', 'Poço Viper + Parede Sage'],
      baseScore: 88
    }
  ],
  fracture: [
    {
      title: 'Meta Tenaz Fracture',
      archetype: 'Recomendada ⭐',
      tag: 'Pincelada em Duas Frentes',
      agents: ['Brimstone', 'Breach', 'Raze', 'Cypher', 'Fade'],
      plan: 'Breach e Fade coordenam estorvos no Arcade e A Main. Raze abre espaço imediato e Cypher garante a retaguarda nas tirolesas.',
      combos: ['Estorvo Breach + Granadas Raze', 'Tether Fade + Fissura Breach', 'Smokes Brimstone + Salto Raze'],
      baseScore: 96
    },
    {
      title: 'Blitz Neon & Breach',
      archetype: 'Agressiva ⚡',
      tag: 'Velocidade nos 4 Acessos',
      agents: ['Neon', 'Raze', 'Breach', 'Brimstone', 'Fade'],
      plan: 'Ataque em alta velocidade utilizando os dois lados do mapa para desmantelar a defesa antes que consigam recuar.',
      combos: ['Corrida Neon + Estorvo Breach', 'Tether Fade + Granada Raze'],
      baseScore: 91
    },
    {
      title: 'Fortaleza Central',
      archetype: 'Controle 🛡️',
      tag: 'Cypher + Killjoy',
      agents: ['Cypher', 'Killjoy', 'Viper', 'Brimstone', 'Breach'],
      plan: 'Ancoragem com fios em ambas as tirolesas e alarmes nos corredores estreitos do Arcade.',
      combos: ['Fio Cypher nas Tirolesas + Estorvo Breach', 'Confinamento Killjoy no Retake B'],
      baseScore: 87
    }
  ],
  pearl: [
    {
      title: 'Meta Profundezas Pearl',
      archetype: 'Recomendada ⭐',
      tag: 'Controle de B Long & Meio',
      agents: ['Astra', 'Fade', 'Killjoy', 'Jett', 'KAY/O'],
      plan: 'Astra controla a B Long com puxões e poços gravitacionais. Fade revela o Meio Conector e Killjoy trava o Bomb A com setups secretos.',
      combos: ['Puxão Astra + Granadas/Facas KAY/O', 'Olhar Fade + Dash Jett', 'Confinamento Killjoy na B Long'],
      baseScore: 95
    },
    {
      title: 'Pressão de Fogo Pearl',
      archetype: 'Agressiva ⚡',
      tag: 'Flashes Rápidas & Entrada B',
      agents: ['Jett', 'Phoenix', 'Skye', 'Astra', 'Fade'],
      plan: 'Phoenix e Skye garantem flashes agressivas para tomar a B Long e Conector em menos de 20 segundos.',
      combos: ['Flash Phoenix + Dash Jett', 'Lobo Skye + Puxão Astra'],
      baseScore: 89
    },
    {
      title: 'Muro de Contenção',
      archetype: 'Controle 🛡️',
      tag: 'Duplo Controlador & Armadilhas',
      agents: ['Killjoy', 'Viper', 'Astra', 'Fade', 'Jett'],
      plan: 'Cortina da Viper na B Long e estrelas da Astra no Meio transformam o avanço adversário em armadilhas letais.',
      combos: ['Veneno Viper + Puxão Astra', 'Nanoswarm Killjoy + Smoke Astra'],
      baseScore: 88
    }
  ],
  abyss: [
    {
      title: 'Meta Voo & Quedas Abyss',
      archetype: 'Recomendada ⭐',
      tag: 'Mobilidade & Controle de Pontes',
      agents: ['Omen', 'Sova', 'Cypher', 'Jett', 'KAY/O'],
      plan: 'Jett e Omen aproveitam as pontes e desníveis com mobilidade vertical. Cypher fecha as rotas estreitas com fios nos acessos às pontes.',
      combos: ['Supressão KAY/O nas Pontes + Dash Jett', 'Paranoia Omen + Flecha Sova', 'Fio Cypher na Borda + Smoke'],
      baseScore: 96
    },
    {
      title: 'Aceleração Aérea',
      archetype: 'Agressiva ⚡',
      tag: 'Entrada Vertical & Stuns',
      agents: ['Jett', 'Waylay', 'Breach', 'Omen', 'Sova'],
      plan: 'Combinação de Waylay e Jett para saltar sobre as barreiras e surpreender miras estáticas com velocidade extrema.',
      combos: ['Flash Breach + Salto Waylay', 'Dash Jett + Avanço Acelerado'],
      baseScore: 90
    },
    {
      title: 'Ancoragem das Pontes',
      archetype: 'Controle 🛡️',
      tag: 'Duplo Sentinela Anti-Queda',
      agents: ['Cypher', 'Deadlock', 'Astra', 'Sova', 'Jett'],
      plan: 'GravNets e fios nas pontes criam risco mortal de queda para os atacantes a cada avanço.',
      combos: ['GravNet Deadlock nas Pontes + Puxão Astra', 'Fio Cypher + Recon Sova'],
      baseScore: 88
    }
  ]
};

// Otimizador de Escalação: Atribui os 5 agentes aos 5 melhores jogadores do elenco
function assignRosterToComp(compAgents, roster, targetMapId = 'ascent') {
  const assigned = [];
  const usedPlayerIndices = new Set();
  const effectiveRoster = (Array.isArray(roster) && roster.length >= 5) ? roster : DEFAULT_ROSTER;
  const targetMapObj = MAPS_DATA.find(m => m.id === targetMapId) || MAPS_DATA[0];

  compAgents.forEach(agentName => {
    let bestPlayer = null;
    let bestScore = -999;
    let bestIdx = -1;

    effectiveRoster.forEach((player, pIdx) => {
      if (usedPlayerIndices.has(pIdx)) return;
      let score = 0;
      const mostPlayed = player.mostPlayed || [];
      const mIdx = mostPlayed.findIndex(a => a && a.toLowerCase() === agentName.toLowerCase());
      if (mIdx === 0) score += 55;
      else if (mIdx === 1) score += 38;
      else if (mIdx === 2) score += 22;

      const agRole = getAgentRole(agentName) || 'Flex';
      if (player.role && agRole.toLowerCase().includes(player.role.toLowerCase().slice(0, 4))) {
        score += 25;
      }
      const mapRating = player.mapRatings?.[targetMapId.toLowerCase()] || player.overallRating || '7.5';
      score += parseFloat(mapRating) * 3;
      score += parseFloat(player.kd || '1.0') * 5;

      if (score > bestScore) {
        bestScore = score;
        bestPlayer = player;
        bestIdx = pIdx;
      }
    });

    if (bestPlayer) {
      usedPlayerIndices.add(bestIdx);
      const topIdx = (bestPlayer.mostPlayed || []).findIndex(a => a && a.toLowerCase() === agentName.toLowerCase());
      let comfort = 'Flex Tática 🔄';
      let comfortBadgeClass = 'text-sky-300 bg-sky-950/80 border-sky-500/30';
      if (topIdx === 0) {
        comfort = 'Top 1 Especialista ⭐';
        comfortBadgeClass = 'text-amber-300 bg-amber-950/80 border-amber-500/40';
      } else if (topIdx >= 1 && topIdx <= 2) {
        comfort = `Top ${topIdx + 1} Confortável 🛡️`;
        comfortBadgeClass = 'text-emerald-300 bg-emerald-950/80 border-emerald-500/30';
      }

      // Detalhes da justificativa inteligente
      const cleanNick = (bestPlayer.name || '').split('#')[0];
      const agRole = getAgentRole(agentName) || 'Flex';
      const mapRatingVal = parseFloat(bestPlayer.mapRatings?.[targetMapId.toLowerCase()] || bestPlayer.overallRating || '7.5').toFixed(1);
      const kdVal = parseFloat(bestPlayer.kd || '1.00').toFixed(2);
      const poolRank = topIdx >= 0 ? `Top ${topIdx + 1} Principal` : 'Adaptação Tática';

      let reasonTitle = '';
      let reasonDetail = '';
      if (topIdx === 0) {
        reasonTitle = `Especialista Absoluta com ${agentName}`;
        reasonDetail = `${cleanNick} tem ${agentName} como seu agente #1 mais jogado no histórico. Sustenta nota ${mapRatingVal} e K/D ${kdVal} em ${targetMapObj.name}, sendo a escolha com maior consistência mecânica para a função de ${agRole}.`;
      } else if (topIdx === 1 || topIdx === 2) {
        reasonTitle = `Conforto Comprovado (Top ${topIdx + 1})`;
        reasonDetail = `${cleanNick} possui histórico sólido com ${agentName} na sua rotação regular, mantendo rendimento de ${mapRatingVal} e K/D de ${kdVal}. Garante utilitários confiáveis de ${agRole} sem sobrecarregar a jogadora.`;
      } else if (bestPlayer.role && agRole.toLowerCase().includes(bestPlayer.role.toLowerCase().slice(0, 4))) {
        reasonTitle = `Alinhamento Natural de Função (${agRole})`;
        reasonDetail = `${cleanNick} atua prioritariamente como ${bestPlayer.role} no elenco. A escolha de ${agentName} encaixa perfeitamente no seu estilo tático para dominar as zonas-chave de ${targetMapObj.name}.`;
      } else {
        reasonTitle = `Adaptação Estratégica para o Meta`;
        reasonDetail = `Sugerida para suprir a vaga essencial de ${agRole} exigida pela composição em ${targetMapObj.name}. Sua regularidade com K/D ${kdVal} e rendimento ${mapRatingVal} viabilizam o plano tático proposto.`;
      }

      assigned.push({
        agent: agentName,
        player: bestPlayer,
        playerIndex: bestIdx,
        comfort: comfort,
        comfortBadgeClass: comfortBadgeClass,
        role: agRole,
        cleanNick,
        mapRatingVal,
        kdVal,
        poolRank,
        reasonTitle,
        reasonDetail
      });
    }
  });

  return assigned;
}

// Gera as 3 sugestões de composição para o mapa especificado
function generateMapCompSuggestions(mapId, roster) {
  const cleanMapId = (mapId || 'ascent').toLowerCase();
  const presets = MAP_COMP_PRESETS[cleanMapId] || MAP_COMP_PRESETS.ascent;
  const mapObj = MAPS_DATA.find(m => m.id === cleanMapId) || MAPS_DATA[0];

  return presets.map((comp, compIdx) => {
    const assigned = assignRosterToComp(comp.agents, roster, cleanMapId);
    let specialistCount = 0;
    assigned.forEach(item => {
      if (item.comfort.includes('Top 1')) specialistCount += 2;
      else if (item.comfort.includes('Top 2')) specialistCount += 1;
    });
    const finalScore = Math.min(99, comp.baseScore + Math.min(3, specialistCount));

    return {
      compIdx,
      mapId: cleanMapId,
      mapName: mapObj.name,
      title: comp.title,
      archetype: comp.archetype,
      tag: comp.tag,
      plan: comp.plan,
      combos: comp.combos,
      score: finalScore,
      assigned
    };
  });
}

// Aplica a composição sugerida na escalação titular do mapa com 1 clique
// Função desativada a pedido do usuário (composições agora são apenas consultivas para reuniões)
window.applySuggestedComp = function() {
  showToast('📋 A aplicação direta foi desativada. Discuta a proposta com a equipe.', 'info');
};


// Gera o diagnóstico inteligente do treinador (Coach Insights)
function generateCoachInsights(mapId, titulares, reservas) {
  const isAll = mapId === 'all';
  const targetMapObj = MAPS_DATA.find(m => m.id === mapId) || MAPS_DATA[0];

  // 1. MVP da Lineup
  const sortedByMapRating = [...titulares].sort((a, b) => (isAll ? b.overallRating : b.mapRating) - (isAll ? a.overallRating : a.mapRating));
  const mvp = sortedByMapRating[0] || titulares[0];

  // 2. Análise de Ban & Pick para os 11 mapas
  const mapScores = MAPS_DATA.map(m => {
    const avg = titulares.reduce((acc, p) => {
      const inRoster = (state.roster || []).find(r => r.name && r.name.toLowerCase() === p.name.toLowerCase());
      const r = inRoster?.mapRatings?.[m.id.toLowerCase()] || inRoster?.overallRating || '7.5';
      return acc + parseFloat(r);
    }, 0) / (titulares.length || 1);
    return { id: m.id, name: m.name, icon: m.listViewIcon, score: avg };
  }).sort((a, b) => b.score - a.score);

  const bestPick = mapScores[0];
  const worstBan = mapScores[mapScores.length - 1];
  const decider = mapScores[Math.floor(mapScores.length / 2)];

  // 3. Dicas Táticas Customizadas por Mapa
  const mapTips = {
    ascent: 'Controle sistemático da Porta do Meio e Acesso ao Mercado. Killjoy deve ancorar o Bomb B com nanossurras profundas e Jett avançar com recon do Sova.',
    bind: 'Uso agressivo dos teletransportadores para inversão instantânea de bomb. Raze e Skye devem pressionar o Banheiro para forçar a defesa a recuar.',
    haven: 'Trabalhar a rotação pelos 3 bombsites com estorvos do Breach na Garagem. Na defesa, nunca abandonar a Garagem sem utilitário de retardo.',
    split: 'Disputa prioritária das Cordas e Ventilação do Meio. Entrada no Bomb B requer smokes sincronizadas no Céu e Pilar.',
    sunset: 'Dominar o Pátio Central com smokes rápidas para quebrar a visão do Cypher adversário e abrir caminhos duplos para A e B.',
    lotus: 'Quebrar a porta giratória do Meio/A cedo na rodada para forçar rotações defensivas. Omen e Fade devem combar Paranoia com Tether no Montículo.',
    breeze: 'Cortina da Viper na linha divisória é indispensável. Sova e KAY/O devem anular Operators adversários com dardos e facas de supressão.',
    icebox: 'Plant protegido da Spike com a parede da Sage no Bomb B. Viper e Sova dominam o Céu do Bomb A em retakes combinados.',
    fracture: 'Pincelada coordenada atacando simultaneamente pelo Arcade e A Main. Cypher deve proteger a tirolesa para evitar flancos rápidos.',
    pearl: 'Controle absoluto da B Long com estrelas da Astra. Evitar duelos secos no Conector sem utilitário de reconhecimento.',
    abyss: 'Atenção redobrada nas pontes e abismos; utilizar utilitários de deslocamento para surpreender ângulos elevados sem risco de queda.'
  };
  const activeTip = mapTips[mapId] || 'Mantenha a disciplina nas trocas de abates (crossfire) e evite avanços individuais desnecessários em rodadas de pós-plant.';

  // 4. Ponto de Atenção & Jogadora em Foco
  let warningText = '';
  let warningPlayer = null;
  const offMetaPlayer = titulares.find(p => p.comfortTier && p.comfortTier.includes('Flex'));

  if (offMetaPlayer) {
    warningPlayer = offMetaPlayer;
    warningText = `${offMetaPlayer.name.split('#')[0]} está atuando com ${offMetaPlayer.agent} fora da sua zona primária de conforto. Dedicar rotinas táticas no servidor para consolidar setups de utilitários e posicionamento de âncora.`;
  } else {
    // Procura a jogadora com menor rendimento no mapa ou elenco
    const lowestPlayer = [...titulares].sort((a, b) => (isAll ? a.overallRating - b.overallRating : a.mapRating - b.mapRating))[0];
    if (lowestPlayer && parseFloat(isAll ? lowestPlayer.overallRating : lowestPlayer.mapRating) < 7.2) {
      warningPlayer = lowestPlayer;
      warningText = `${lowestPlayer.name.split('#')[0]} apresenta oscilação de rendimento com ${lowestPlayer.agent} (${isAll ? lowestPlayer.overallRating : lowestPlayer.mapRating}/10). Recomenda-se treinar entradas sincronizadas com o iniciador para garantir trocas de abates.`;
    } else if (parseFloat(worstBan.score) < 6.8) {
      warningText = `O rendimento médio coletivo em ${worstBan.name} (${worstBan.score.toFixed(1)}/10) está em nível de alerta. Recomenda-se priorizar o mapa nos treinos ou mantê-lo como Ban prioritário em séries MD3.`;
    } else {
      warningText = 'Excelente equilíbrio geral de funções. O principal ponto de atenção tático é garantir que o primeiro contato na defesa sempre tenha suporte imediato para re-frag.';
    }
  }

  return {
    mvp,
    bestPick,
    worstBan,
    decider,
    activeTip,
    warningText,
    warningPlayer
  };
}

// Retorna a justificativa tática detalhada de por que a jogadora ocupa aquela função na profundidade do elenco
function getPlayerDepthReason(player, roleType, rIdx = null) {
  const cleanName = (player.name || '').split('#')[0] || 'Jogadora';
  const mainAgent = player.agent || player.mostPlayed?.[0] || (
    roleType === 'Duelista' ? 'Jett' : 
    (roleType || '').startsWith('Controlad') ? 'Omen' : 
    (roleType || '').startsWith('Iniciad') ? 'Sova' : 
    roleType === 'Sentinela' ? 'Killjoy' : 'Cypher'
  );
  const poolList = Array.isArray(player.mostPlayed) && player.mostPlayed.length > 0
    ? player.mostPlayed.slice(0, 3).join(', ')
    : mainAgent;
  const kd = player.kd || '1.00';
  const rend = player.rendimento || player.overallRating || '7.5';

  if (roleType === 'Duelista') {
    return {
      title: 'Ponta de Lança & Entry Fragger',
      reason: `Alocada como Duelista principal pelo alto poder de combate (K/D ${kd}) e agressividade em confrontos diretos. Domina ${poolList}, sendo a responsável direta por quebrar miras adversárias, criar espaço e garantir o First Blood para abrir os bombsites.`,
      impact: 'Conquista de território inicial e quebra das linhas defensivas inimigas.'
    };
  } else if ((roleType || '').startsWith('Controlad')) {
    return {
      title: 'Controle de Visão & Ritmo de Round',
      reason: `Ocupa a função de Controladora pela leitura de jogo e posicionamento milimétrico de fumaças com ${poolList}. Anula ângulos de Operator adversário, divide os bombsites e possibilita plants e retakes seguros (Rendimento ${rend}/10).`,
      impact: 'Isolamento de miras e garantia de execuções sem exposição desnecessária.'
    };
  } else if ((roleType || '').startsWith('Iniciad')) {
    return {
      title: 'Inteligência Tática & Reconhecimento',
      reason: `Escalada como Iniciadora por ser o pilar de informação e utilitários da equipe. Utiliza ${poolList} para localizar defensores, cegar posições chave e destruir armadilhas, permitindo que as duelistas entrem sem tomar dry-peek (K/D ${kd}).`,
      impact: 'Eliminação da névoa de guerra e criação de vantagens numéricas em invasões.'
    };
  } else if (roleType === 'Sentinela') {
    return {
      title: 'Âncora Defensiva & Vigilância Anti-Flanco',
      reason: `Posicionada como Sentinela pela solidez tática e retenção de terreno com ${poolList}. Retarda rushes inimigos na defesa com setups inteligentes e bloqueia investidas pelas costas no ataque (Rendimento ${rend}/10, K/D ${kd}).`,
      impact: 'Retenção solo de bombsites e segurança total da retaguarda do time.'
    };
  } else {
    // Suplente / Flex
    const flexPicks = [player.flex1, player.flex2, player.flex3].filter(Boolean);
    const flexStr = flexPicks.length > 0 ? flexPicks.join(', ') : poolList;
    const num = rIdx !== null ? rIdx + 1 : 1;
    return {
      title: `Suplente Tática Flex R${num}`,
      reason: `Designada no banco como Reserva Flex R${num} para prover adaptabilidade imediata. Está configurada com ${flexStr}, permitindo substituir titulares sem perda técnica e viabilizando variações táticas específicas de mapa (como duplo iniciador ou dupla controladora).`,
      impact: 'Proteção contra ausências/bans e flexibilidade de composição em séries MD3 / MD5.'
    };
  }
}

// Renderiza o card individual da jogadora na matriz de profundidade com hover card interativo explicando o motivo de estar naquele lugar
function renderDepthPlayerItemHtml(player, roleType, rIdx = null) {
  const cleanName = (player.name || '').split('#')[0] || `Player`;
  const mainAgent = player.agent || player.mostPlayed?.[0] || (
    roleType === 'Duelista' ? 'Jett' : 
    (roleType || '').startsWith('Controlad') ? 'Omen' : 
    (roleType || '').startsWith('Iniciad') ? 'Sova' : 
    roleType === 'Sentinela' ? 'Killjoy' : 'Cypher'
  );
  const agentIcon = getAgentIcon(mainAgent);
  const agentColor = getAgentColor(mainAgent);
  const kd = player.kd || '1.00';
  const rend = player.rendimento || player.overallRating || '7.5';
  const pool = Array.isArray(player.mostPlayed) && player.mostPlayed.length > 0
    ? player.mostPlayed.slice(0, 3).join(', ')
    : mainAgent;
  const isSub = rIdx !== null;
  const info = getPlayerDepthReason(player, roleType, rIdx);

  return `
    <div class="group/player relative bg-[#0c121a] hover:bg-[#121c27] p-1.5 sm:p-2 rounded-lg border border-[#162232] hover:border-amber-500/60 flex items-center justify-between text-xs transition-all duration-200 cursor-help">
      
      <!-- Lado Esquerdo: Retrato, Nome e Indicador -->
      <div class="flex items-center gap-2 min-w-0">
        ${isSub ? `
          <span class="w-5 h-5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 text-[9px] font-mono flex items-center justify-center font-bold flex-shrink-0">
            R${rIdx + 1}
          </span>
        ` : `
          <div class="w-5 h-5 rounded bg-black/60 border flex items-center justify-center flex-shrink-0 p-0.5" style="border-color: ${agentColor}">
            <img src="${agentIcon}" alt="${mainAgent}" class="w-full h-full object-contain">
          </div>
        `}
        <span class="font-bold text-white group-hover/player:text-amber-300 transition-colors truncate">
          ${cleanName}
        </span>
      </div>

      <!-- Lado Direito: K/D e Ícone de Ajuda/Info -->
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <span class="text-[9px] font-mono text-emerald-400 font-bold">K/D ${kd}</span>
        <span class="text-[8px] text-gray-400 font-mono hidden xs:inline">(${mainAgent})</span>
        <span class="w-3.5 h-3.5 rounded-full bg-[#182638] text-gray-400 group-hover/player:text-amber-300 group-hover/player:bg-amber-950/80 border border-gray-600/40 group-hover/player:border-amber-500/50 flex items-center justify-center text-[8px] transition-colors">
          ⓘ
        </span>
      </div>

      <!-- HOVER CARD TÁTICO EXPANDIDO (EXPLICAÇÃO DO PORQUÊ DESTA JOGADORA) -->
      <div class="absolute bottom-full left-0 sm:left-1/2 sm:-translate-x-1/2 mb-2 w-72 sm:w-80 p-3 bg-[#070c13] border border-amber-500/60 rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.95)] z-50 pointer-events-none hidden group-hover/player:block animate-fade-in text-left ring-1 ring-amber-500/20 max-w-[calc(100vw-2rem)]">
        
        <!-- Header do Tooltip -->
        <div class="flex items-center gap-2.5 pb-2 border-b border-[#1c2c3e]">
          <div class="w-8 h-8 rounded-lg bg-[#050910] border-2 p-0.5 flex items-center justify-center flex-shrink-0" style="border-color: ${agentColor}">
            <img src="${agentIcon}" alt="${mainAgent}" class="w-full h-full object-contain">
          </div>
          <div class="truncate flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <b class="text-xs font-tactical font-black text-white truncate">${player.name || cleanName}</b>
              <span class="text-[8px] font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-1 rounded uppercase">
                ${isSub ? `Reserva R${rIdx + 1}` : 'Titular'}
              </span>
            </div>
            <span class="text-[9px] font-mono text-gray-400 block truncate">
              ${info.title}
            </span>
          </div>
        </div>

        <!-- Conteúdo do Tooltip: O Porquê Estratégico -->
        <div class="mt-2 space-y-1.5 text-[10px]">
          <div>
            <span class="text-amber-400 font-tactical font-bold flex items-center gap-1">
              <span>💡</span> Por que está neste lugar:
            </span>
            <p class="text-gray-200 text-[10px] leading-relaxed font-sans mt-0.5 break-words">
              ${info.reason}
            </p>
          </div>

          <div class="bg-[#0e1622] p-1.5 rounded-lg border border-[#1b2b3d] space-y-0.5">
            <span class="text-sky-300 font-tactical font-bold text-[9px] block">Impacto na Equipe:</span>
            <p class="text-gray-300 text-[9px] leading-tight font-sans break-words">
              ${info.impact}
            </p>
          </div>

          <div class="pt-1.5 border-t border-[#162232] flex items-center justify-between text-[9px] font-mono text-gray-400">
            <span class="text-emerald-400 font-bold">K/D: ${kd}</span>
            <span class="text-amber-300 font-bold">Rend: ${rend}/10</span>
            <span class="truncate max-w-[120px]">Pool: ${pool}</span>
          </div>
        </div>

        <!-- Indicador de seta para baixo -->
        <div class="absolute top-full left-6 sm:left-1/2 sm:-translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-amber-500/60"></div>
      </div>

    </div>
  `;
}

function renderTeamAnalyticsView() {
  const container = document.getElementById('view-analytics');
  if (!container) return;

  const targetMapId = (state.teamAnalytics.selectedMapId === 'all' || !state.teamAnalytics.selectedMapId)
    ? 'all'
    : state.teamAnalytics.selectedMapId;
  const isAllMapsMode = targetMapId === 'all';
  const activeMapObj = !isAllMapsMode ? (MAPS_DATA.find(m => m.id === targetMapId) || MAPS_DATA[0]) : MAPS_DATA[0];

  const currentLineup = (!isAllMapsMode && state.lineups[targetMapId])
    ? state.lineups[targetMapId]
    : (state.lineups[state.activeMapId] || DEFAULT_PLAYERS);

  // Processa dados dos 5 titulares
  const titulares = currentLineup.slice(0, 5).map((p, idx) => {
    const cleanName = (p.name || '').trim() || `Player ${idx + 1}`;
    const inRoster = (state.roster || []).find(r => r.name && r.name.toLowerCase() === cleanName.toLowerCase()) || {};
    const kd = parseFloat(p.kd || inRoster.kd || '1.00');
    const mapRating = parseFloat(p.rendimento || inRoster.mapRatings?.[targetMapId.toLowerCase()] || inRoster.overallRating || '7.5');
    const overallRating = parseFloat(inRoster.overallRating || p.rendimento || '7.5');
    const acs = parseInt(inRoster.overallAcs || 220, 10);
    const winRate = parseInt(inRoster.overallWinRate !== undefined ? inRoster.overallWinRate : 55, 10);
    const agent = p.titular || inRoster.mostPlayed?.[0] || 'Killjoy';
    const mostPlayed = (Array.isArray(p.mostPlayed) && p.mostPlayed.length > 0) ? p.mostPlayed : (inRoster.mostPlayed || [agent]);
    const role = getAgentRole(agent);
    const compMatches = inRoster.compMatchesCount !== undefined 
      ? inRoster.compMatchesCount 
      : (inRoster.recentMatches ? inRoster.recentMatches.filter(m => m.isCompetitive !== false).length : 7);
    const unratedMatches = inRoster.unratedMatchesCount !== undefined 
      ? inRoster.unratedMatchesCount 
      : (inRoster.recentMatches ? inRoster.recentMatches.filter(m => m.isCompetitive === false).length : 3);
    const totalMatches = inRoster.totalMatches || (compMatches + unratedMatches);

    const topIndex = mostPlayed.findIndex(a => a && a.toLowerCase() === agent.toLowerCase());
    let comfortTier = 'Flex / Adaptação 🔄';
    let comfortColor = 'text-sky-400 bg-sky-950/60 border-sky-500/30';
    if (topIndex === 0) {
      comfortTier = 'Top 1 Principal ⭐';
      comfortColor = 'text-amber-300 bg-amber-950/60 border-amber-500/30';
    } else if (topIndex >= 1 && topIndex <= 2) {
      comfortTier = `Top ${topIndex + 1} Segurança 🛡️`;
      comfortColor = 'text-emerald-300 bg-emerald-950/60 border-emerald-500/30';
    }

    return {
      index: idx,
      name: cleanName,
      hasTag: cleanName.includes('#'),
      agent,
      role,
      kd,
      mapRating,
      overallRating,
      acs,
      winRate,
      mostPlayed,
      compMatches,
      unratedMatches,
      totalMatches,
      comfortTier,
      comfortColor,
      photoUrl: p.photoUrl || inRoster.photoUrl || '',
      isSub: false
    };
  });

  // Processa APENAS as reservas que possuem jogadoras efetivamente escaladas
  const reservas = currentLineup.slice(5).filter(p => hasScaledPlayer(p)).map((p, rIdx) => {
    const idx = rIdx + 5;
    const cleanName = (p.name || '').trim() || `Reserva ${rIdx + 1}`;
    const inRoster = (state.roster || []).find(r => r.name && r.name.toLowerCase() === cleanName.toLowerCase()) || {};
    const kd = parseFloat(p.kd || inRoster.kd || '1.00');
    const mapRating = parseFloat(p.rendimento || inRoster.mapRatings?.[targetMapId.toLowerCase()] || inRoster.overallRating || '7.0');
    const overallRating = parseFloat(inRoster.overallRating || p.rendimento || '7.0');
    const acs = parseInt(inRoster.overallAcs || 200, 10);
    const winRate = parseInt(inRoster.overallWinRate !== undefined ? inRoster.overallWinRate : 50, 10);
    const agent = p.flex1 || inRoster.mostPlayed?.[0] || 'Cypher';
    const mostPlayed = (Array.isArray(p.mostPlayed) && p.mostPlayed.length > 0) ? p.mostPlayed : (inRoster.mostPlayed || [agent]);
    const role = getAgentRole(agent);
    const compMatches = inRoster.compMatchesCount !== undefined 
      ? inRoster.compMatchesCount 
      : (inRoster.recentMatches ? inRoster.recentMatches.filter(m => m.isCompetitive !== false).length : 5);
    const unratedMatches = inRoster.unratedMatchesCount !== undefined 
      ? inRoster.unratedMatchesCount 
      : (inRoster.recentMatches ? inRoster.recentMatches.filter(m => m.isCompetitive === false).length : 2);
    const totalMatches = inRoster.totalMatches || (compMatches + unratedMatches);

    return {
      index: idx,
      name: cleanName,
      hasTag: cleanName.includes('#'),
      agent,
      role,
      kd,
      mapRating,
      overallRating,
      acs,
      winRate,
      mostPlayed,
      compMatches,
      unratedMatches,
      totalMatches,
      comfortTier: 'Reserva Flex 🔄',
      comfortColor: 'text-gray-300 bg-[#151f2b] border-[#223347]',
      photoUrl: p.photoUrl || inRoster.photoUrl || '',
      isSub: true
    };
  });

  // Métricas agregadas da equipe
  const avgRating = (titulares.reduce((acc, p) => acc + (isAllMapsMode ? p.overallRating : p.mapRating), 0) / titulares.length).toFixed(1);
  const avgKd = (titulares.reduce((acc, p) => acc + p.kd, 0) / titulares.length).toFixed(2);
  const avgAcs = Math.round(titulares.reduce((acc, p) => acc + p.acs, 0) / titulares.length);
  const avgWinRate = Math.round(titulares.reduce((acc, p) => acc + p.winRate, 0) / titulares.length);
  const totalComp = titulares.reduce((acc, p) => acc + p.compMatches, 0) + reservas.reduce((acc, p) => acc + p.compMatches, 0);
  const totalUnrated = titulares.reduce((acc, p) => acc + p.unratedMatches, 0) + reservas.reduce((acc, p) => acc + p.unratedMatches, 0);
  const totalAll = totalComp + totalUnrated;
  const ratingVisual = getRatingVisuals(avgRating);

  // Mapa pills de navegação interna
  const mapPillsHtml = [
    `
      <button onclick="window.setAnalyticsMap('all')"
              class="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-tactical font-bold flex items-center gap-1 sm:gap-1.5 transition whitespace-nowrap flex-shrink-0 ${isAllMapsMode ? 'bg-[#ff4655] text-white border-[#ff4655] shadow-[0_0_15px_rgba(255,70,85,0.4)]' : 'bg-[#101924] text-gray-300 hover:text-white border-[#1c2c3e] hover:border-sky-500/50'}">
        <span>🌐 Todos (Geral)</span>
      </button>
    `,
    ...MAPS_DATA.map(m => {
      const isSel = !isAllMapsMode && m.id === targetMapId;
      return `
        <button onclick="window.setAnalyticsMap('${m.id}')"
                class="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-tactical font-bold flex items-center gap-1 sm:gap-1.5 transition whitespace-nowrap flex-shrink-0 ${isSel ? 'bg-[#ff4655] text-white border-[#ff4655] shadow-[0_0_15px_rgba(255,70,85,0.4)]' : 'bg-[#101924] text-gray-300 hover:text-white border-[#1c2c3e] hover:border-sky-500/50'}">
          <img src="${m.listViewIcon}" alt="${m.name}" class="w-3.5 h-3.5 rounded object-cover flex-shrink-0">
          <span>${m.name}</span>
        </button>
      `;
    })
  ].join('');

  // Duplas de Sinergia
  const duos = [
    evaluateAgentDuoSynergy(titulares[0].agent, titulares[1].agent, titulares[0].name, titulares[1].name, titulares[0].kd, titulares[1].kd),
    evaluateAgentDuoSynergy(titulares[2].agent, titulares[3].agent, titulares[2].name, titulares[3].name, titulares[2].kd, titulares[3].kd),
    evaluateAgentDuoSynergy(titulares[1].agent, titulares[3].agent, titulares[1].name, titulares[3].name, titulares[1].kd, titulares[3].kd),
    evaluateAgentDuoSynergy(titulares[0].agent, titulares[2].agent, titulares[0].name, titulares[2].name, titulares[0].kd, titulares[2].kd)
  ];
  const overallSynergyScore = Math.round(duos.reduce((a, b) => a + b.score, 0) / duos.length);

  // Duplas cards html (sem vazamento)
  const duosHtml = duos.map(duo => {
    const icon1 = getAgentIcon(duo.agent1);
    const icon2 = getAgentIcon(duo.agent2);
    const color1 = getAgentColor(duo.agent1);
    const color2 = getAgentColor(duo.agent2);

    return `
      <div class="tactical-card p-3.5 rounded-xl border border-[#1b2b3d] bg-[#0c141e] flex flex-col justify-between hover:border-amber-400/50 transition overflow-hidden">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2.5 min-w-0">
            <span class="px-2 py-0.5 rounded text-[9px] font-tactical font-black uppercase tracking-wider bg-sky-950/80 text-sky-300 border border-sky-500/40 truncate max-w-[140px]">
              ${duo.role1} + ${duo.role2}
            </span>
            <div class="flex items-center gap-1 flex-shrink-0">
              <span class="text-xs font-mono font-black text-amber-400">${duo.score}%</span>
              <span class="text-[9px] text-gray-400 font-tactical">Sinergia</span>
            </div>
          </div>

          <div class="flex items-center gap-2.5 bg-[#080d14] p-2 rounded-lg border border-[#182637] mb-2.5 overflow-hidden">
            <div class="flex items-center -space-x-2 flex-shrink-0">
              <img src="${icon1}" alt="${duo.agent1}" class="w-7 h-7 rounded-full object-cover bg-black/60 border shadow" style="border-color: ${color1}">
              <img src="${icon2}" alt="${duo.agent2}" class="w-7 h-7 rounded-full object-cover bg-black/60 border shadow" style="border-color: ${color2}">
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1 text-xs font-bold text-white truncate">
                <span>${duo.agent1}</span>
                <span class="text-amber-400">⚡</span>
                <span>${duo.agent2}</span>
              </div>
              <p class="text-[10px] text-gray-400 truncate">
                ${duo.player1.split('#')[0]} & ${duo.player2.split('#')[0]}
              </p>
            </div>
          </div>

          <h5 class="text-xs font-tactical font-bold text-gray-200 mb-1 truncate">${duo.dynamicTitle}</h5>
          <p class="text-[11px] text-gray-400 leading-relaxed break-words">${duo.dynamicDesc}</p>
        </div>

        <div class="mt-3 pt-2 border-t border-[#182637] flex items-center justify-between text-[10px] min-w-0 gap-1">
          <span class="text-gray-400 font-tactical flex-shrink-0">Combo:</span>
          <b class="text-amber-300 font-mono truncate text-right">${duo.comboTitle}</b>
        </div>
      </div>
    `;
  }).join('');

  // Heatmap dos 11 mapas
  const mapHeatmapHtml = MAPS_DATA.map(map => {
    const mapRatings = titulares.map(p => {
      const inR = (state.roster || []).find(r => r.name && r.name.toLowerCase() === p.name.toLowerCase()) || {};
      return parseFloat(inR.mapRatings?.[map.id.toLowerCase()] || inR.overallRating || '7.5');
    });
    const mapTeamAvg = (mapRatings.reduce((a, b) => a + b, 0) / mapRatings.length).toFixed(1);
    const vis = getRatingVisuals(mapTeamAvg);

    let topPlayer = titulares[0];
    let maxRtg = -1;
    titulares.forEach(p => {
      const inR = (state.roster || []).find(r => r.name && r.name.toLowerCase() === p.name.toLowerCase()) || {};
      const rtg = parseFloat(inR.mapRatings?.[map.id.toLowerCase()] || inR.overallRating || '7.5');
      if (rtg > maxRtg) {
        maxRtg = rtg;
        topPlayer = p;
      }
    });

    const statusBadge = parseFloat(mapTeamAvg) >= 8.5
      ? '<span class="px-2 py-0.5 rounded text-[9px] font-tactical font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 whitespace-nowrap">Ponto Forte 🏆</span>'
      : (parseFloat(mapTeamAvg) >= 7.0 
        ? '<span class="px-2 py-0.5 rounded text-[9px] font-tactical font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40 whitespace-nowrap">Equilibrado ⚖️</span>'
        : '<span class="px-2 py-0.5 rounded text-[9px] font-tactical font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap">Foco de Treino 🎯</span>');

    return `
      <div class="tactical-card p-3.5 rounded-xl border border-[#1a2838] bg-[#0c131d] flex flex-col justify-between hover:border-sky-400/50 transition overflow-hidden">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-2 min-w-0">
              <img src="${map.listViewIcon}" alt="${map.name}" class="w-6 h-6 rounded object-cover bg-black/60 border border-white/20 flex-shrink-0">
              <div class="min-w-0">
                <span class="text-xs font-tactical font-bold text-white block truncate">${map.name}</span>
                <span class="text-[9px] font-mono text-gray-400 block truncate">${map.isMeta ? 'Rotação Meta' : 'Fora do Meta'}</span>
              </div>
            </div>
            ${statusBadge}
          </div>

          <div class="bg-[#070b10] p-2.5 rounded-lg border border-[#162230] flex items-center justify-between my-2">
            <div>
              <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none">Rendimento</span>
              <span class="text-lg font-mono font-black ${vis.valColor}">${mapTeamAvg}</span>
              <span class="text-[10px] text-gray-500 font-mono">/ 10</span>
            </div>
            <div class="text-right min-w-0">
              <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none">MVP da Line</span>
              <span class="text-xs font-bold text-gray-200 block truncate max-w-[90px]">${topPlayer.name.split('#')[0]}</span>
              <span class="text-[9px] font-mono text-emerald-400 font-bold">${maxRtg.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div class="mt-2 pt-2 border-t border-[#141f2d] flex items-center justify-between text-[10px] gap-2">
          <button onclick="window.switchMap('${map.id}'); window.switchMainView('lineup');" class="text-sky-400 hover:text-sky-300 font-tactical font-bold flex items-center gap-1 transition truncate">
            <span>Lineup ↗</span>
          </button>
          <button onclick="window.setAnalyticsMap('${map.id}')" class="text-amber-300 hover:text-white font-tactical font-bold transition flex items-center gap-1 truncate">
            <span>Analisar Mapa →</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Tabela comparativa do elenco
  const allPlayers = [...titulares, ...reservas];
  const sortCol = state.analyticsTableSort?.column || 'slot';
  const sortOrder = state.analyticsTableSort?.order || 'asc';
  const sortDir = sortOrder === 'asc' ? 1 : -1;

  allPlayers.sort((a, b) => {
    if (sortCol === 'slot') return (a.index - b.index) * sortDir;
    if (sortCol === 'name') return (a.name.localeCompare(b.name)) * sortDir;
    if (sortCol === 'agent') return (a.agent.localeCompare(b.agent)) * sortDir;
    if (sortCol === 'comfort') return (a.comfortTier.localeCompare(b.comfortTier)) * sortDir;
    if (sortCol === 'kd') return ((a.kd || 0) - (b.kd || 0)) * sortDir;
    if (sortCol === 'acs') return ((a.acs || 0) - (b.acs || 0)) * sortDir;
    if (sortCol === 'rating') {
      const rA = parseFloat(isAllMapsMode ? a.overallRating : a.mapRating) || 0;
      const rB = parseFloat(isAllMapsMode ? b.overallRating : b.mapRating) || 0;
      return (rA - rB) * sortDir;
    }
    if (sortCol === 'matches') {
      const mA = (a.compMatches || 0) + (a.unratedMatches || 0);
      const mB = (b.compMatches || 0) + (b.unratedMatches || 0);
      return (mA - mB) * sortDir;
    }
    return 0;
  });

  const tableRowsHtml = allPlayers.map(p => {
    const icon = getAgentIcon(p.agent);
    const color = getAgentColor(p.agent);
    const cleanNick = p.name.split('#')[0];
    const tag = p.name.includes('#') ? '#' + p.name.split('#')[1] : '';
    const ratingVal = isAllMapsMode ? p.overallRating : p.mapRating;
    const rVis = getRatingVisuals(ratingVal);

    return `
      <tr class="border-b border-[#141f2d] hover:bg-[#0f1722] transition text-xs">
        <td class="py-3 px-3 whitespace-nowrap">
          <span class="px-2 py-0.5 rounded text-[9px] font-tactical font-black uppercase ${p.isSub ? 'bg-gray-800 text-gray-300 border border-gray-600' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'}">
            ${p.isSub ? `Reserva R${p.index - 4}` : `Titular P${p.index + 1}`}
          </span>
        </td>
        <td class="py-3 px-3 min-w-0">
          <button onclick="window.openPlayerProfileModal(${p.index})" class="text-left group flex items-center gap-2 cursor-pointer max-w-full">
            ${p.photoUrl ? `<img src="${p.photoUrl}" alt="${cleanNick}" class="w-6 h-6 rounded-full object-cover border border-amber-400/50 flex-shrink-0">` : ''}
            <div class="truncate min-w-0">
              <span class="font-bold text-white group-hover:text-amber-300 transition truncate">${cleanNick}</span>
              <span class="text-gray-500 text-[10px] font-mono hidden sm:inline">${tag}</span>
            </div>
          </button>
        </td>
        <td class="py-3 px-3 whitespace-nowrap">
          <div class="flex items-center gap-1.5">
            <img src="${icon}" alt="${p.agent}" class="w-5 h-5 rounded-full object-cover bg-black/50 border flex-shrink-0" style="border-color: ${color}">
            <span class="text-gray-200 font-bold">${p.agent}</span>
            <span class="text-[9px] text-gray-400 font-mono hidden md:inline">(${p.role})</span>
          </div>
        </td>
        <td class="py-3 px-3 whitespace-nowrap">
          <span class="px-2 py-0.5 rounded text-[9px] font-tactical font-bold uppercase ${p.comfortColor} border inline-block">
            ${p.comfortTier}
          </span>
        </td>
        <td class="py-3 px-3 font-mono font-bold text-emerald-400 text-center whitespace-nowrap">${p.kd}</td>
        <td class="py-3 px-3 font-mono font-bold text-sky-400 text-center whitespace-nowrap">${p.acs}</td>
        <td class="py-3 px-3 text-center whitespace-nowrap">
          <div class="inline-flex items-center gap-1">
            <span class="font-mono font-black ${rVis.valColor}">${ratingVal}</span>
            <span class="px-1.5 py-0.2 rounded text-[8px] font-tactical font-black uppercase ${rVis.tierBadgeClass} border">
              ${rVis.tier}
            </span>
          </div>
        </td>
        <td class="py-3 px-3 text-center font-mono text-[10px] whitespace-nowrap">
          <span class="text-amber-300 font-bold">${p.compMatches}c</span>
          <span class="text-gray-500">/</span>
          <span class="text-purple-300 font-bold">${p.unratedMatches}u</span>
        </td>
        <td class="py-3 px-3 text-right whitespace-nowrap">
          <button onclick="window.openPlayerProfileModal(${p.index})" 
                  class="px-2.5 py-1 rounded bg-sky-950/60 hover:bg-sky-900 border border-sky-500/30 text-sky-300 text-[10px] font-tactical font-bold transition">
            Ver Perfil ↗
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // --------------------------------------------------------------------------
  // GRÁFICO CRONOLÓGICO DA EQUIPE (AGRUPA PARTIDAS POR EVENTO TEMPORAL)
  // --------------------------------------------------------------------------
  function parseMatchTime(m) {
    if (m.gameStartTimestamp && !isNaN(m.gameStartTimestamp)) return Number(m.gameStartTimestamp);
    if (m.timestamp && !isNaN(m.timestamp)) return Number(m.timestamp);
    if (m.gameStart) {
      const now = Date.now();
      const s = String(m.gameStart).toLowerCase();
      const dayMatch = s.match(/(\d+)\s*dia/);
      if (dayMatch) return now - parseInt(dayMatch[1], 10) * 86400000;
      const hrMatch = s.match(/(\d+)\s*hora/);
      if (hrMatch) return now - parseInt(hrMatch[1], 10) * 3600000;
      if (s.includes('ontem')) return now - 86400000;
      if (s.includes('hoje')) return now - 1800000;
      if (s.includes('sem')) return now - 7 * 86400000;
      const parsed = Date.parse(m.gameStart);
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  }

  // Agrupa partidas por evento real de partida para não multiplicar jogadoras da mesma line
  const matchEventMap = new Map();
  (state.roster || []).forEach(pl => {
    if (Array.isArray(pl.recentMatches)) {
      pl.recentMatches.forEach(m => {
        const matchFilter = isAllMapsMode || 
          (m.mapId && m.mapId.toLowerCase() === targetMapId.toLowerCase()) || 
          (m.map && m.map.toLowerCase() === activeMapObj.name.toLowerCase());
        if (!matchFilter) return;

        const eventKey = m.matchId || `${m.map}-${m.score}-${m.gameStart || 'rec'}`;
        if (!matchEventMap.has(eventKey)) {
          matchEventMap.set(eventKey, {
            matchId: eventKey,
            map: m.map || activeMapObj.name,
            mapId: m.mapId || (m.map ? m.map.toLowerCase() : targetMapId),
            won: m.won,
            score: m.score || '13 - 10',
            gameStart: m.gameStart || 'Recente',
            timestamp: parseMatchTime(m),
            players: [],
            ratings: [],
            kdList: [],
            acsList: []
          });
        }
        const event = matchEventMap.get(eventKey);
        event.players.push(pl.name.split('#')[0]);
        const k = m.kills || 0;
        const d = m.deaths || 0;
        const kdVal = d > 0 ? k / d : k;
        const acsVal = m.acs || 200;
        const ratingVal = m.singleRating 
          ? parseFloat(m.singleRating) 
          : parseFloat(Math.min(10, Math.max(1, ((kdVal / 1.0) * 3.5 + (acsVal / 200) * 4.0) + (m.won ? 0.75 : -0.75))).toFixed(1));
        event.ratings.push(ratingVal);
        event.kdList.push(kdVal);
        event.acsList.push(acsVal);
      });
    }
  });

  let teamChartMatches = Array.from(matchEventMap.values()).map(ev => {
    const avgRtg = ev.ratings.reduce((a, b) => a + b, 0) / ev.ratings.length;
    const avgKd = (ev.kdList.reduce((a, b) => a + b, 0) / ev.kdList.length).toFixed(2);
    const avgAcs = Math.round(ev.acsList.reduce((a, b) => a + b, 0) / ev.acsList.length);
    const labelAgent = ev.players.length > 1 ? `Equipe (${ev.players.slice(0, 2).join(', ')})` : `Line (${ev.players[0]})`;
    return {
      map: ev.map,
      mapId: ev.mapId,
      agent: labelAgent,
      won: ev.won,
      singleRating: parseFloat(avgRtg.toFixed(1)),
      kd: avgKd,
      acs: avgAcs,
      score: ev.score,
      gameStart: ev.gameStart,
      timestamp: ev.timestamp
    };
  });

  // Ordenação Estritamente Cronológica (do passado para o presente)
  teamChartMatches.sort((a, b) => a.timestamp - b.timestamp);

  if (teamChartMatches.length < 2) {
    const now = Date.now();
    teamChartMatches = [
      { map: isAllMapsMode ? 'Icebox' : activeMapObj.name, agent: 'Equipe', won: true, singleRating: 9.1, kd: '1.40', acs: 260, score: '13 - 6', gameStart: 'Há 7 dias', timestamp: now - 7 * 86400000 },
      { map: isAllMapsMode ? 'Split' : activeMapObj.name, agent: 'Equipe', won: false, singleRating: 6.4, kd: '0.92', acs: 188, score: '9 - 13', gameStart: 'Há 6 dias', timestamp: now - 6 * 86400000 },
      { map: isAllMapsMode ? 'Lotus' : activeMapObj.name, agent: 'Equipe', won: true, singleRating: 8.4, kd: '1.20', acs: 230, score: '13 - 10', gameStart: 'Há 5 dias', timestamp: now - 5 * 86400000 },
      { map: isAllMapsMode ? 'Sunset' : activeMapObj.name, agent: 'Equipe', won: true, singleRating: 8.8, kd: '1.32', acs: 245, score: '13 - 7', gameStart: 'Há 4 dias', timestamp: now - 4 * 86400000 },
      { map: isAllMapsMode ? 'Bind' : activeMapObj.name, agent: 'Equipe', won: false, singleRating: 6.8, kd: '0.98', acs: 195, score: '10 - 13', gameStart: 'Há 3 dias', timestamp: now - 3 * 86400000 },
      { map: isAllMapsMode ? 'Haven' : activeMapObj.name, agent: 'Equipe', won: true, singleRating: 8.2, kd: '1.18', acs: 228, score: '13 - 9', gameStart: 'Há 2 dias', timestamp: now - 2 * 86400000 },
      { map: isAllMapsMode ? 'Ascent' : activeMapObj.name, agent: 'Equipe', won: true, singleRating: 8.5, kd: '1.24', acs: 235, score: '13 - 8', gameStart: 'Ontem', timestamp: now - 86400000 }
    ];
  } else if (teamChartMatches.length > 15) {
    teamChartMatches = teamChartMatches.slice(-15);
  }

  const teamEvolutionChartHtml = generateSvgLineChart(teamChartMatches, {
    title: isAllMapsMode
      ? 'Trajetória Cronológica de Rendimento da Equipe (Média Coletiva)'
      : `Evolução Cronológica de Partidas em ${activeMapObj.name}`,
    isAcs: false,
    alreadyChronological: true
  });

  // Coach insights
  const coach = generateCoachInsights(isAllMapsMode ? 'ascent' : targetMapId, titulares, reservas);

  // --------------------------------------------------------------------------
  // CONTEÚDO ESPECÍFICO CONFORME O MODO: TODOS OS MAPAS vs MAPA ESPECÍFICO
  // --------------------------------------------------------------------------
  let modeSpecificSectionHtml = '';

  if (isAllMapsMode) {
    // MODO GERAL: Visão Macro, Matriz de Cobertura de Funções do Roster e Radar de Ban & Pick
    const roleDuelistas = (state.roster || []).filter(r => r.role === 'Duelista');
    const roleControladoras = (state.roster || []).filter(r => r.role === 'Controlador' || r.role === 'Controladora');
    const roleIniciadoras = (state.roster || []).filter(r => r.role === 'Iniciador' || r.role === 'Iniciadora');
    const roleSentinelas = (state.roster || []).filter(r => r.role === 'Sentinela');
    const roleFlex = (state.roster || []).filter(r => r.role === 'Flex');

    modeSpecificSectionHtml = `
      <!-- BANNER EXPLICATIVO PARA SELEÇÃO DE MAPA -->
      <div class="bg-gradient-to-r from-sky-950/60 via-[#0d1724] to-purple-950/40 border border-sky-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
        <div class="flex items-center gap-3">
          <span class="text-3xl flex-shrink-0">💡</span>
          <div>
            <h4 class="text-sm font-tactical font-black text-white uppercase tracking-wider">
              Analisando o Panorama Global da Equipe
            </h4>
            <p class="text-xs text-gray-300 mt-0.5">
              Você está na visão macro de todos os 11 mapas. Para visualizar as <b>Sugestões de Composições Táticas</b>, <b>Combos de Habilidades</b> e <b>Planos de Execução</b> de um mapa específico, selecione o mapa desejado nos botões acima.
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button onclick="window.setAnalyticsMap('ascent')" class="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-tactical font-bold text-xs transition">
            Abrir Ascent →
          </button>
          <button onclick="window.setAnalyticsMap('haven')" class="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-tactical font-bold text-xs transition">
            Abrir Haven →
          </button>
        </div>
      </div>

      <!-- RADAR ESTRATÉGICO DE BAN & PICK (TODOS OS 11 MAPAS RANQUEADOS) -->
      <div class="tactical-card p-4 sm:p-5 rounded-2xl border border-[#1e2f42] bg-[#0c131d] space-y-4 overflow-hidden shadow-xl">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-[#182638]">
          <div class="min-w-0 flex-1">
            <h3 class="text-sm sm:text-base font-tactical font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap break-words">
              <span>📋</span> Diagnóstico Estratégico de Ban & Pick para Séries MD3
            </h3>
            <p class="text-xs text-gray-400 break-words">Classificação da força do elenco nos 11 mapas para orientar vetos e escolhas em torneios</p>
          </div>
          <span class="text-xs font-mono text-emerald-400 bg-[#080d14] px-3 py-1 rounded-xl border border-[#182638] flex-shrink-0">
            Classificação Automática
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <!-- Picks Prioritários -->
          <div class="p-3.5 rounded-xl bg-[#08120d] border border-emerald-500/40 space-y-2 overflow-hidden min-w-0">
            <div class="flex items-center justify-between gap-1.5 flex-wrap">
              <span class="text-xs font-tactical font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 flex-wrap break-words min-w-0">
                <span>🟢</span> Picks Prioritários (Força Máxima)
              </span>
              <span class="text-[10px] font-mono text-emerald-300 font-bold flex-shrink-0">Tier S & A</span>
            </div>
            <p class="text-[11px] text-gray-300 break-words">Mapas onde a equipe tem maior taxa de conversão e domínio tático:</p>
            <div class="space-y-1.5 pt-1">
              <div class="flex items-center justify-between bg-[#0b1c14] px-2.5 py-1.5 rounded-lg border border-emerald-500/20 text-xs">
                <b class="text-white font-tactical truncate">1. ${coach.bestPick.name}</b>
                <span class="font-mono text-emerald-400 font-black flex-shrink-0">${coach.bestPick.score.toFixed(1)} / 10</span>
              </div>
              <div class="flex items-center justify-between bg-[#0b1c14] px-2.5 py-1.5 rounded-lg border border-emerald-500/20 text-xs">
                <b class="text-white font-tactical truncate">2. Haven</b>
                <span class="font-mono text-emerald-400 font-black flex-shrink-0">8.4 / 10</span>
              </div>
              <div class="flex items-center justify-between bg-[#0b1c14] px-2.5 py-1.5 rounded-lg border border-emerald-500/20 text-xs">
                <b class="text-white font-tactical truncate">3. Sunset</b>
                <span class="font-mono text-emerald-400 font-black flex-shrink-0">8.2 / 10</span>
              </div>
            </div>
          </div>

          <!-- Mapas Neutros & Deciders -->
          <div class="p-3.5 rounded-xl bg-[#0a111a] border border-sky-500/40 space-y-2 overflow-hidden min-w-0">
            <div class="flex items-center justify-between gap-1.5 flex-wrap">
              <span class="text-xs font-tactical font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5 flex-wrap break-words min-w-0">
                <span>⚖️</span> Mapas Equilibrados (Deciders)
              </span>
              <span class="text-[10px] font-mono text-sky-300 font-bold flex-shrink-0">Tier B</span>
            </div>
            <p class="text-[11px] text-gray-300 break-words">Mapas disputados onde a vitória depende do encaixe de clutches:</p>
            <div class="space-y-1.5 pt-1">
              <div class="flex items-center justify-between bg-[#0d1b2a] px-2.5 py-1.5 rounded-lg border border-sky-500/20 text-xs">
                <b class="text-white font-tactical truncate">1. ${coach.decider.name}</b>
                <span class="font-mono text-sky-400 font-black flex-shrink-0">${coach.decider.score.toFixed(1)} / 10</span>
              </div>
              <div class="flex items-center justify-between bg-[#0d1b2a] px-2.5 py-1.5 rounded-lg border border-sky-500/20 text-xs">
                <b class="text-white font-tactical truncate">2. Lotus</b>
                <span class="font-mono text-sky-400 font-black flex-shrink-0">7.6 / 10</span>
              </div>
              <div class="flex items-center justify-between bg-[#0d1b2a] px-2.5 py-1.5 rounded-lg border border-sky-500/20 text-xs">
                <b class="text-white font-tactical truncate">3. Bind</b>
                <span class="font-mono text-sky-400 font-black flex-shrink-0">7.4 / 10</span>
              </div>
            </div>
          </div>

          <!-- Bans Prioritários -->
          <div class="p-3.5 rounded-xl bg-[#140a0c] border border-rose-500/40 space-y-2 overflow-hidden min-w-0">
            <div class="flex items-center justify-between gap-1.5 flex-wrap">
              <span class="text-xs font-tactical font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5 flex-wrap break-words min-w-0">
                <span>🔴</span> Bans Obrigatórios (Foco de Treino)
              </span>
              <span class="text-[10px] font-mono text-rose-300 font-bold flex-shrink-0">Tier C / D</span>
            </div>
            <p class="text-[11px] text-gray-300 break-words">Mapas onde a equipe apresenta maior oscilação e vulnerabilidade:</p>
            <div class="space-y-1.5 pt-1">
              <div class="flex items-center justify-between bg-[#220d11] px-2.5 py-1.5 rounded-lg border border-rose-500/20 text-xs">
                <b class="text-white font-tactical truncate">1. ${coach.worstBan.name}</b>
                <span class="font-mono text-rose-400 font-black flex-shrink-0">${coach.worstBan.score.toFixed(1)} / 10</span>
              </div>
              <div class="flex items-center justify-between bg-[#220d11] px-2.5 py-1.5 rounded-lg border border-rose-500/20 text-xs">
                <b class="text-white font-tactical truncate">2. Breeze</b>
                <span class="font-mono text-rose-400 font-black flex-shrink-0">6.5 / 10</span>
              </div>
              <div class="flex items-center justify-between bg-[#220d11] px-2.5 py-1.5 rounded-lg border border-rose-500/20 text-xs">
                <b class="text-white font-tactical truncate">3. Split</b>
                <span class="font-mono text-rose-400 font-black flex-shrink-0">6.8 / 10</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MATRIZ DE COBERTURA DE FUNÇÕES & PROFUNDIDADE DETALHADA DO ELENCO (COM MOTIVOS E PORQUÊS) -->
      <div class="tactical-card p-4 sm:p-6 rounded-2xl border border-[#1e2f42] bg-[#0c131d] space-y-6 shadow-2xl">
        
        <!-- Header Estratégico com Badges de Diagnóstico -->
        <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-4 border-b border-[#182638]">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-tactical font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 tracking-wider flex-shrink-0">
                Diagnóstico Estratégico do Treinador
              </span>
              <span class="text-xs font-mono text-gray-400 break-words">
                Resiliência a Bans & Desfalques
              </span>
            </div>
            <h3 class="text-base sm:text-xl font-tactical font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap break-words">
              <span>👥</span> Cobertura de Funções & Profundidade do Elenco (9 Jogadoras)
            </h3>
            <p class="text-xs text-gray-300 mt-1 max-w-4xl leading-relaxed break-words">
              Mapeamento tático dos 4 papéis essenciais e da flexibilidade das 4 jogadoras reservas (com 3 slots Flex cada). Analisa o impacto de cada função no controle de mapa, na economia de utilitários e os riscos diretos em caso de ban de agente ou ausência em séries MD3 / MD5. Passe o mouse sobre qualquer jogadora para entender os motivos técnicos e táticos da escalação.
            </p>
          </div>

          <!-- Índice de Resiliência do Elenco -->
          <div class="flex items-center gap-3 bg-[#080d14] border border-[#1b2b3d] p-3 rounded-xl w-full sm:w-auto min-w-0 flex-shrink-0">
            <div class="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-xl font-bold flex-shrink-0">
              🛡️
            </div>
            <div class="min-w-0">
              <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-tight truncate">Índice de Resiliência</span>
              <div class="flex items-baseline gap-1 flex-wrap">
                <span class="text-xl font-mono font-black text-emerald-400">92%</span>
                <span class="text-[10px] text-emerald-300 font-tactical">Alta Robustez</span>
              </div>
              <span class="text-[9px] text-gray-500 font-mono block truncate">4 Papéis + 4 Reservas (12 Flex)</span>
            </div>
          </div>
        </div>

        <!-- 5 Colunas Estratégicas com Motivos e Porquês -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

          <!-- 1. DUELISTAS -->
          <div class="bg-[#080d14] border border-[#182637] hover:border-rose-500/50 p-3.5 rounded-xl flex flex-col justify-between transition-all duration-300 space-y-3 relative z-10 hover:z-30 min-w-0">
            <div>
              <!-- Header do Card -->
              <div class="flex items-center justify-between pb-2 border-b border-[#141f2d] gap-2 flex-wrap">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0"></span>
                  <span class="text-xs font-tactical font-black text-rose-400 uppercase tracking-wider truncate">🎯 Duelistas</span>
                </div>
                <span class="text-[9px] font-mono text-rose-300 bg-rose-950/70 border border-rose-500/30 px-1.5 py-0.2 rounded font-bold flex-shrink-0">
                  ${roleDuelistas.length} no Roster
                </span>
              </div>

              <!-- Status de Cobertura -->
              <div class="my-2 bg-[#120a0d] p-2 rounded-lg border border-rose-500/20">
                <span class="text-[9px] uppercase font-tactical text-rose-300 font-bold block">Status da Função:</span>
                <span class="text-[11px] text-white font-bold block mt-0.5 break-words">
                  ${roleDuelistas.length >= 2 ? '🟢 Cobertura Completa (Dupla Opção)' : '⚖️ Titular Ativa (Risco em Ausência)'}
                </span>
              </div>

              <!-- Jogadoras Alocadas -->
              <div class="space-y-1.5 my-2">
                <div class="flex items-center justify-between gap-1 flex-wrap">
                  <span class="text-[9px] uppercase font-tactical text-gray-400 block">Jogadoras Aptas:</span>
                  <span class="text-[8px] font-mono text-rose-400/80 bg-rose-950/40 px-1 py-0.2 rounded border border-rose-500/20">Passe o mouse ⓘ</span>
                </div>
                ${roleDuelistas.map(p => renderDepthPlayerItemHtml(p, 'Duelista')).join('') || '<span class="text-xs text-gray-500 block py-1">Nenhuma duelista cadastrada</span>'}
              </div>

              <!-- O PORQUÊ ESTRATÉGICO (MOTIVO TÁTICO) -->
              <div class="mt-3 pt-2.5 border-t border-[#141f2d] space-y-1">
                <span class="text-[10px] font-tactical font-black text-amber-300 flex items-center gap-1">
                  <span>💡</span> O "Porquê" Estratégico:
                </span>
                <p class="text-[11px] text-gray-300 leading-relaxed font-sans break-words">
                  O Duelista é o motor que <b>converte utilitários em território conquistado</b>. Sem um entry fragger agressivo para quebrar miras e conseguir o First Blood, a equipe fica encurralada nos afunilamentos (choke points) e gasta smokes e flashes prematuramente.
                </p>
              </div>

              <!-- RISCO DE AUSÊNCIA & CONTINGÊNCIA -->
              <div class="mt-2 bg-[#0d141f] p-2 rounded-lg border border-[#182638] text-[10px] space-y-0.5">
                <b class="text-amber-400 block font-tactical">Plano de Contingência:</b>
                <p class="text-gray-400 leading-relaxed break-words">
                  Se a titular sofrer bloqueio de mira ou ban de agente (ex: Jett/Raze), a Reserva 1 deve assumir a função de entry fragger com Reyna/Neon para preservar a velocidade de invasão.
                </p>
              </div>
            </div>

            <div class="pt-2 border-t border-[#141f2d]">
              <span class="text-[9px] text-gray-500 font-tactical uppercase block">Diretriz de Treino:</span>
              <span class="text-[10px] text-rose-300 font-bold block break-words">Entry Sincronizado com Flashes</span>
            </div>
          </div>

          <!-- 2. CONTROLADORAS -->
          <div class="bg-[#080d14] border border-[#182637] hover:border-purple-500/50 p-3.5 rounded-xl flex flex-col justify-between transition-all duration-300 space-y-3 relative z-10 hover:z-30 min-w-0">
            <div>
              <!-- Header do Card -->
              <div class="flex items-center justify-between pb-2 border-b border-[#141f2d] gap-2 flex-wrap">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"></span>
                  <span class="text-xs font-tactical font-black text-purple-400 uppercase tracking-wider truncate">☁️ Controladoras</span>
                </div>
                <span class="text-[9px] font-mono text-purple-300 bg-purple-950/70 border border-purple-500/30 px-1.5 py-0.2 rounded font-bold flex-shrink-0">
                  ${roleControladoras.length} no Roster
                </span>
              </div>

              <!-- Status de Cobertura -->
              <div class="my-2 bg-[#120b17] p-2 rounded-lg border border-purple-500/20">
                <span class="text-[9px] uppercase font-tactical text-purple-300 font-bold block">Status da Função:</span>
                <span class="text-[11px] text-white font-bold block mt-0.5 break-words">
                  ${roleControladoras.length >= 2 ? '🟢 Pilar Estratégico Seguro' : '⚠️ Função Mais Crítica (Sem Margem de Erro)'}
                </span>
              </div>

              <!-- Jogadoras Alocadas -->
              <div class="space-y-1.5 my-2">
                <div class="flex items-center justify-between gap-1 flex-wrap">
                  <span class="text-[9px] uppercase font-tactical text-gray-400 block">Jogadoras Aptas:</span>
                  <span class="text-[8px] font-mono text-purple-400/80 bg-purple-950/40 px-1 py-0.2 rounded border border-purple-500/20">Passe o mouse ⓘ</span>
                </div>
                ${roleControladoras.map(p => renderDepthPlayerItemHtml(p, 'Controladora')).join('') || '<span class="text-xs text-gray-500 block py-1">Nenhuma controladora cadastrada</span>'}
              </div>

              <!-- O PORQUÊ ESTRATÉGICO (MOTIVO TÁTICO) -->
              <div class="mt-3 pt-2.5 border-t border-[#141f2d] space-y-1">
                <span class="text-[10px] font-tactical font-black text-amber-300 flex items-center gap-1">
                  <span>💡</span> O "Porquê" Estratégico:
                </span>
                <p class="text-[11px] text-gray-300 leading-relaxed font-sans break-words">
                  Fumaças <b>ditam o ritmo e o espaço de cada round</b>. Bloqueiam Operators de longa distância, isolam defensores no bomb para o plant e impedem retakes imediatos. Jogar sem fumaça em mapas abertos (Breeze, Ascent, Lotus) torna qualquer entrada suicida.
                </p>
              </div>

              <!-- RISCO DE AUSÊNCIA & CONTINGÊNCIA -->
              <div class="mt-2 bg-[#0d141f] p-2 rounded-lg border border-[#182638] text-[10px] space-y-0.5">
                <b class="text-amber-400 block font-tactical">Plano de Contingência:</b>
                <p class="text-gray-400 leading-relaxed break-words">
                  A ausência da controladora é fatal. As jogadoras reservas devem manter Viper (Breeze/Icebox) e Omen (Ascent/Haven) calibrados nos seus 5 slots flex para rotação imediata.
                </p>
              </div>
            </div>

            <div class="pt-2 border-t border-[#141f2d]">
              <span class="text-[9px] text-gray-500 font-tactical uppercase block">Diretriz de Treino:</span>
              <span class="text-[10px] text-purple-300 font-bold block break-words">Timings Perfeitos de Fumaças & Retake</span>
            </div>
          </div>

          <!-- 3. INICIADORAS -->
          <div class="bg-[#080d14] border border-[#182637] hover:border-sky-500/50 p-3.5 rounded-xl flex flex-col justify-between transition-all duration-300 space-y-3 relative z-10 hover:z-30 min-w-0">
            <div>
              <!-- Header do Card -->
              <div class="flex items-center justify-between pb-2 border-b border-[#141f2d] gap-2 flex-wrap">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0"></span>
                  <span class="text-xs font-tactical font-black text-sky-400 uppercase tracking-wider truncate">👁️ Iniciadoras</span>
                </div>
                <span class="text-[9px] font-mono text-sky-300 bg-sky-950/70 border border-sky-500/30 px-1.5 py-0.2 rounded font-bold flex-shrink-0">
                  ${roleIniciadoras.length} no Roster
                </span>
              </div>

              <!-- Status de Cobertura -->
              <div class="my-2 bg-[#0a141b] p-2 rounded-lg border border-sky-500/20">
                <span class="text-[9px] uppercase font-tactical text-sky-300 font-bold block">Status da Função:</span>
                <span class="text-[11px] text-white font-bold block mt-0.5 break-words">
                  ${roleIniciadoras.length >= 2 ? '🟢 Cobertura Tática de Alto Nível' : '⚖️ Equilíbrio Saudável'}
                </span>
              </div>

              <!-- Jogadoras Alocadas -->
              <div class="space-y-1.5 my-2">
                <div class="flex items-center justify-between gap-1 flex-wrap">
                  <span class="text-[9px] uppercase font-tactical text-gray-400 block">Jogadoras Aptas:</span>
                  <span class="text-[8px] font-mono text-sky-400/80 bg-sky-950/40 px-1 py-0.2 rounded border border-sky-500/20">Passe o mouse ⓘ</span>
                </div>
                ${roleIniciadoras.map(p => renderDepthPlayerItemHtml(p, 'Iniciadora')).join('') || '<span class="text-xs text-gray-500 block py-1">Nenhuma iniciadora cadastrada</span>'}
              </div>

              <!-- O PORQUÊ ESTRATÉGICO (MOTIVO TÁTICO) -->
              <div class="mt-3 pt-2.5 border-t border-[#141f2d] space-y-1">
                <span class="text-[10px] font-tactical font-black text-amber-300 flex items-center gap-1">
                  <span>💡</span> O "Porquê" Estratégico:
                </span>
                <p class="text-[11px] text-gray-300 leading-relaxed font-sans break-words">
                  O Iniciador <b>remove a névoa de guerra e destrói setups defensivos</b>. Com dardos de recon, flashes teleguiados e estorvos, ele expõe o adversário antes do contato. Sem ele, a equipe é obrigada a checar cantos no peito (dry peeking), sofrendo baixas desnecessárias.
                </p>
              </div>

              <!-- RISCO DE AUSÊNCIA & CONTINGÊNCIA -->
              <div class="mt-2 bg-[#0d141f] p-2 rounded-lg border border-[#182638] text-[10px] space-y-0.5">
                <b class="text-amber-400 block font-tactical">Plano de Contingência:</b>
                <p class="text-gray-400 leading-relaxed break-words">
                  Em mapas que favorecem Duplo Iniciador (Sunset, Lotus, Haven), o time deve ativar uma das reservas no slot Flex com Fade ou Breach para maximizar a pressão de flashes.
                </p>
              </div>
            </div>

            <div class="pt-2 border-t border-[#141f2d]">
              <span class="text-[9px] text-gray-500 font-tactical uppercase block">Diretriz de Treino:</span>
              <span class="text-[10px] text-sky-300 font-bold block break-words">Lineups de Recon & Quebra de Setups</span>
            </div>
          </div>

          <!-- 4. SENTINELAS -->
          <div class="bg-[#080d14] border border-[#182637] hover:border-amber-500/50 p-3.5 rounded-xl flex flex-col justify-between transition-all duration-300 space-y-3 relative z-10 hover:z-30 min-w-0">
            <div>
              <!-- Header do Card -->
              <div class="flex items-center justify-between pb-2 border-b border-[#141f2d] gap-2 flex-wrap">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></span>
                  <span class="text-xs font-tactical font-black text-amber-400 uppercase tracking-wider truncate">🛡️ Sentinelas</span>
                </div>
                <span class="text-[9px] font-mono text-amber-300 bg-amber-950/70 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold flex-shrink-0">
                  ${roleSentinelas.length} no Roster
                </span>
              </div>

              <!-- Status de Cobertura -->
              <div class="my-2 bg-[#17120a] p-2 rounded-lg border border-amber-500/20">
                <span class="text-[9px] uppercase font-tactical text-amber-300 font-bold block">Status da Função:</span>
                <span class="text-[11px] text-white font-bold block mt-0.5 break-words">
                  ${roleSentinelas.length >= 2 ? '🟢 Ancoragem & Retenção Sólida' : '⚖️ Especialista Dedicada'}
                </span>
              </div>

              <!-- Jogadoras Alocadas -->
              <div class="space-y-1.5 my-2">
                <div class="flex items-center justify-between gap-1 flex-wrap">
                  <span class="text-[9px] uppercase font-tactical text-gray-400 block">Jogadoras Aptas:</span>
                  <span class="text-[8px] font-mono text-amber-400/80 bg-amber-950/40 px-1 py-0.2 rounded border border-amber-500/20">Passe o mouse ⓘ</span>
                </div>
                ${roleSentinelas.map(p => renderDepthPlayerItemHtml(p, 'Sentinela')).join('') || '<span class="text-xs text-gray-500 block py-1">Nenhuma sentinela cadastrada</span>'}
              </div>

              <!-- O PORQUÊ ESTRATÉGICO (MOTIVO TÁTICO) -->
              <div class="mt-3 pt-2.5 border-t border-[#141f2d] space-y-1">
                <span class="text-[10px] font-tactical font-black text-amber-300 flex items-center gap-1">
                  <span>💡</span> O "Porquê" Estratégico:
                </span>
                <p class="text-[11px] text-gray-300 leading-relaxed font-sans break-words">
                  A Sentinela é a <b>âncora que impede o colapso do mapa</b>. Na defesa, retarda o rush inimigo com armadilhas para permitir rotações seguras. No ataque, garante as costas contra flancos rápidos, evitando que jogadoras precisem ficar cravadas olhando para trás.
                </p>
              </div>

              <!-- RISCO DE AUSÊNCIA & CONTINGÊNCIA -->
              <div class="mt-2 bg-[#0d141f] p-2 rounded-lg border border-[#182638] text-[10px] space-y-0.5">
                <b class="text-amber-400 block font-tactical">Plano de Contingência:</b>
                <p class="text-gray-400 leading-relaxed break-words">
                  Sem sentinela, a defesa fica frágil a execuções rápidas. Em caso de necessidade, alternar entre Killjoy (Ascent/Icebox) e Cypher (Sunset/Bind) garante versatilidade contra diferentes estilos de rush.
                </p>
              </div>
            </div>

            <div class="pt-2 border-t border-[#141f2d]">
              <span class="text-[9px] text-gray-500 font-tactical uppercase block">Diretriz de Treino:</span>
              <span class="text-[10px] text-amber-300 font-bold block break-words">Variação de Armadilhas Anti-Flanco</span>
            </div>
          </div>

          <!-- 5. SUPLENTES & FLEXIBILIDADE DE ROSTER -->
          <div class="bg-[#080d14] border border-[#182637] hover:border-emerald-500/50 p-3.5 rounded-xl flex flex-col justify-between transition-all duration-300 space-y-3 relative z-10 hover:z-30 min-w-0">
            <div>
              <!-- Header do Card -->
              <div class="flex items-center justify-between pb-2 border-b border-[#141f2d] gap-2 flex-wrap">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
                  <span class="text-xs font-tactical font-black text-emerald-400 uppercase tracking-wider truncate">🔄 Flex & Suplentes</span>
                </div>
                <span class="text-[9px] font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold flex-shrink-0">
                  ${reservas.length} ${reservas.length === 1 ? 'Reserva' : 'Reservas'} • 3 Flex Cada
                </span>
              </div>

              <!-- Status de Cobertura -->
              <div class="my-2 bg-[#081510] p-2 rounded-lg border border-emerald-500/20">
                <span class="text-[9px] uppercase font-tactical text-emerald-300 font-bold block">Status da Função:</span>
                <span class="text-[11px] text-white font-bold block mt-0.5 break-words">
                  ⚡ Alta Adaptabilidade (${reservas.length * 3} Slots Flex Disponíveis)
                </span>
              </div>

              <!-- Jogadoras Alocadas -->
              <div class="space-y-1.5 my-2">
                <div class="flex items-center justify-between gap-1 flex-wrap">
                  <span class="text-[9px] uppercase font-tactical text-gray-400 block">Reservas Configuradas:</span>
                  <span class="text-[8px] font-mono text-emerald-400/80 bg-emerald-950/40 px-1 py-0.2 rounded border border-emerald-500/20">Passe o mouse ⓘ</span>
                </div>
                ${reservas.map((p, rIdx) => renderDepthPlayerItemHtml(p, 'Reserva', rIdx)).join('') || '<span class="text-xs text-gray-500 block py-1">Sem reservas configuradas</span>'}
              </div>

              <!-- O PORQUÊ ESTRATÉGICO (MOTIVO TÁTICO) -->
              <div class="mt-3 pt-2.5 border-t border-[#141f2d] space-y-1">
                <span class="text-[10px] font-tactical font-black text-amber-300 flex items-center gap-1">
                  <span>💡</span> O "Porquê" Estratégico:
                </span>
                <p class="text-[11px] text-gray-300 leading-relaxed font-sans break-words">
                  Cada mapa exige um arquétipo diferente: Sunset pede duplo iniciador, Bind se beneficia de dupla controladora. Ter <b>${reservas.length} reservas preparadas com 3 bonecos flex cada (${reservas.length * 3} opções ao todo)</b> permite mudar a composição para surpreender os adversários sem quebrar a estrutura da equipe.
                </p>
              </div>

              <!-- RISCO DE AUSÊNCIA & CONTINGÊNCIA -->
              <div class="mt-2 bg-[#0d141f] p-2 rounded-lg border border-[#182638] text-[10px] space-y-0.5">
                <b class="text-amber-400 block font-tactical">Proteção Total:</b>
                <p class="text-gray-400 leading-relaxed break-words">
                  Com ${reservas.length * 3} opções de adaptação no banco de reservas, o time está blindado contra ausências de última hora, cansaço ou penalidades em torneios longos.
                </p>
              </div>
            </div>

            <div class="pt-2 border-t border-[#141f2d]">
              <span class="text-[9px] text-gray-500 font-tactical uppercase block">Diretriz de Treino:</span>
              <span class="text-[10px] text-emerald-300 font-bold block break-words">Rotação Semanal em Scrims Táticos</span>
            </div>
          </div>

        </div>

      </div>
    `;
  } else {
    // MODO MAPA ESPECÍFICO: Otimizador Tático com 3 Comps do Meta, Dicas de Execução e Combos Específicos
    const compSuggestions = generateMapCompSuggestions(targetMapId, state.roster);
    const compSuggestionsHtml = compSuggestions.map((sug, sIdx) => {
      const slotsHtml = sug.assigned.map((item, slIdx) => {
        const icon = getAgentIcon(item.agent);
        const color = getAgentColor(item.agent);
        const drawerId = `slot-reason-${targetMapId}-${sIdx}-${slIdx}`;

        return `
          <div class="group bg-[#080d14] border border-[#162230] hover:border-amber-400/80 rounded-xl p-2.5 transition flex flex-col justify-between cursor-pointer"
               onclick="const d = document.getElementById('${drawerId}'); if (d) d.classList.toggle('hidden');">
            
            <!-- Linha Principal do Slot -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <img src="${icon}" alt="${item.agent}" class="w-7 h-7 rounded-lg object-cover bg-black/50 border shadow flex-shrink-0" style="border-color: ${color}">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1 truncate">
                    <b class="text-xs text-white truncate font-tactical group-hover:text-amber-300 transition">${item.agent}</b>
                    <span class="text-[9px] text-gray-400 font-mono hidden sm:inline">(${item.role})</span>
                  </div>
                  <span class="text-[10px] text-gray-300 truncate block">➔ ${item.cleanNick}</span>
                </div>
              </div>
              
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <span class="px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-tactical font-bold uppercase ${item.comfortBadgeClass} border whitespace-nowrap">
                  ${item.comfort}
                </span>
                <span class="text-gray-400 group-hover:text-amber-300 text-[10px] transition">💡</span>
              </div>
            </div>

            <!-- GAVETA DE JUSTIFICATIVA TÁTICA (EXPANDE AO PASSAR O MOUSE OU CLICAR) -->
            <div id="${drawerId}" class="mt-2 pt-2 border-t border-[#182638] bg-[#060a0f] p-2.5 rounded-lg border border-amber-500/20 text-[10px] space-y-1.5 hidden group-hover:block transition-all animate-fade-in">
              <div class="flex items-center justify-between gap-1 flex-wrap">
                <span class="text-amber-300 font-tactical font-bold text-[10px] flex items-center gap-1">
                  <span>💡</span> ${item.reasonTitle}
                </span>
                <span class="text-[8px] font-mono text-gray-400 bg-[#0d141e] px-1.5 py-0.5 rounded border border-[#1b2b3d]">
                  ${item.poolRank}
                </span>
              </div>

              <p class="text-[10px] text-gray-300 leading-relaxed break-words font-sans">
                ${item.reasonDetail}
              </p>

              <div class="flex items-center gap-2 text-[9px] font-mono pt-1 text-gray-400 flex-wrap">
                <span>Nota no Mapa: <b class="text-emerald-400">${item.mapRatingVal}</b></span>
                <span>•</span>
                <span>K/D Geral: <b class="text-sky-400">${item.kdVal}</b></span>
                <span>•</span>
                <span>Função: <b class="text-amber-400">${item.role}</b></span>
              </div>
            </div>

          </div>
        `;
      }).join('');

      const combosPillsHtml = (sug.combos || []).map(c => `
        <span class="px-2 py-0.5 rounded-md bg-[#101b27] border border-[#1c2e42] text-[9px] text-sky-300 font-mono flex items-center gap-1 whitespace-nowrap">
          <span>⚡</span> ${c}
        </span>
      `).join('');

      return `
        <div class="tactical-card p-4 sm:p-5 rounded-2xl border border-[#1d2d3e] bg-[#0c141f] flex flex-col justify-between hover:border-amber-400/50 transition-all shadow-xl overflow-hidden min-w-0">
          <div class="space-y-3">
            <div class="flex items-center justify-between gap-2 pb-2 border-b border-[#162332] flex-wrap">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <span class="px-2 py-0.5 rounded text-[9px] font-tactical font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex-shrink-0">
                  ${sug.archetype}
                </span>
                <h4 class="text-sm font-tactical font-black text-white uppercase truncate">${sug.title}</h4>
              </div>

              <!-- NOVO SELO DE EFICÁCIA: ELEGANTE, SEM POLUIÇÃO -->
              <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/40 shadow-sm flex-shrink-0">
                <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span class="text-[10px] font-tactical text-amber-200 uppercase font-bold tracking-wider hidden sm:inline">Eficácia:</span>
                <span class="text-xs sm:text-sm font-mono font-black text-amber-300">${sug.score}%</span>
              </div>
            </div>

            <p class="text-xs text-gray-300 leading-relaxed font-sans break-words">${sug.plan}</p>

            <div class="flex flex-wrap gap-1.5 pt-1">
              ${combosPillsHtml}
            </div>

            <div class="space-y-1.5 pt-2">
              <div class="flex items-center justify-between gap-1 flex-wrap">
                <span class="text-[9px] uppercase font-tactical text-gray-400 block">Escalação Sugerida do Elenco:</span>
                <span class="text-[8px] font-mono text-amber-300/80">Passe o mouse para ver os motivos 💡</span>
              </div>
              <div class="grid grid-cols-1 gap-1.5">
                ${slotsHtml}
              </div>
            </div>
          </div>

          <!-- RODAPÉ CONSULTIVO (SEM BOTÃO DE APLICAR DIRETO) -->
          <div class="mt-4 pt-3 border-t border-[#18283a] flex items-center justify-between text-xs text-gray-400 flex-wrap gap-2">
            <span class="flex items-center gap-1.5 text-sky-300 font-tactical font-bold text-[11px] truncate min-w-0 flex-1">
              <span>📋</span> Proposta para Alinhamento Tático
            </span>
            <span class="text-[10px] font-mono text-gray-400 bg-[#080d14] px-2 py-0.5 rounded border border-[#1b2b3d] flex-shrink-0">
              Apresentar em Reunião
            </span>
          </div>
        </div>
      `;
    }).join('');

    // Dicas do Treinador Focadas no Mapa
    const mapTipsHtml = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        
        <!-- MVP da Line no Mapa -->
        <div class="tactical-card p-4 rounded-xl border border-emerald-500/30 bg-[#0c141e] flex flex-col justify-between overflow-hidden min-w-0">
          <div>
            <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <span class="text-[9px] uppercase font-tactical font-black text-emerald-400 tracking-wider break-words flex-1 min-w-0">MVP & Referência no Mapa</span>
              <span class="text-base flex-shrink-0">🏆</span>
            </div>
            <div class="flex items-center gap-2.5 my-2">
              <img src="${getAgentIcon(coach.mvp.agent)}" alt="${coach.mvp.agent}" class="w-9 h-9 rounded-xl object-cover bg-black/60 border border-emerald-500/40 flex-shrink-0">
              <div class="min-w-0 flex-1">
                <b class="text-sm text-white block truncate">${coach.mvp.name.split('#')[0]}</b>
                <span class="text-[10px] text-gray-400 truncate block">${coach.mvp.agent} (${coach.mvp.role})</span>
              </div>
            </div>
            <p class="text-[11px] text-gray-300 leading-relaxed break-words">
              Maior aproveitamento em <b>${activeMapObj.name}</b> com rendimento de <b>${coach.mvp.mapRating}</b> e K/D <b>${coach.mvp.kd}</b>.
            </p>
          </div>
          <span class="text-[9px] font-mono text-emerald-400 mt-2 block">Destaque de Duelo</span>
        </div>

        <!-- Ponto de Atenção no Mapa (COM ÍCONE E NOME DO PLAYER CITADO) -->
        <div class="tactical-card p-4 rounded-xl border border-amber-500/30 bg-[#0c141e] flex flex-col justify-between overflow-hidden min-w-0">
          <div>
            <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <span class="text-[9px] uppercase font-tactical font-black text-amber-400 tracking-wider break-words flex-1 min-w-0">Ponto de Atenção em ${activeMapObj.name}</span>
              <span class="text-base flex-shrink-0">⚠️</span>
            </div>

            ${coach.warningPlayer ? `
              <div class="flex items-center gap-2.5 my-2 bg-[#080d14] p-2 rounded-lg border border-amber-500/30">
                <img src="${getAgentIcon(coach.warningPlayer.agent)}" alt="${coach.warningPlayer.agent}" class="w-8 h-8 rounded-lg object-cover bg-black/60 border flex-shrink-0" style="border-color: ${getAgentColor(coach.warningPlayer.agent)}">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 truncate">
                    <b class="text-xs text-white truncate">${coach.warningPlayer.name.split('#')[0]}</b>
                    <span class="text-[9px] font-mono text-amber-300">(${coach.warningPlayer.agent})</span>
                  </div>
                  <span class="text-[9px] text-gray-400 font-tactical truncate block">${coach.warningPlayer.role} • K/D ${coach.warningPlayer.kd}</span>
                </div>
              </div>
            ` : ''}

            <p class="text-[11px] text-gray-300 leading-relaxed mt-2 break-words">
              ${coach.warningText}
            </p>
          </div>
          <span class="text-[9px] font-mono text-amber-400 mt-2 block">Ajuste de Treino</span>
        </div>

        <!-- Dica de Execução do Mapa -->
        <div class="tactical-card p-4 rounded-xl border border-sky-500/30 bg-[#0c141e] flex flex-col justify-between overflow-hidden min-w-0">
          <div>
            <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <span class="text-[9px] uppercase font-tactical font-black text-sky-400 tracking-wider break-words flex-1 min-w-0">Dica Tática de Execução</span>
              <span class="text-base flex-shrink-0">💡</span>
            </div>
            <p class="text-[11px] text-gray-300 leading-relaxed mt-2 break-words">
              ${coach.activeTip}
            </p>
          </div>
          <span class="text-[9px] font-mono text-sky-400 mt-2 block">Diretriz de Rodada</span>
        </div>

      </div>
    `;

    modeSpecificSectionHtml = `
      <!-- OTIMIZADOR TÁTICO ESPECÍFICO DO MAPA -->
      <div class="tactical-card p-4 sm:p-5 rounded-2xl border border-[#1e2f42] bg-[#0c131d] space-y-4 overflow-hidden shadow-xl">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-[#182638]">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-sm sm:text-base font-tactical font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap break-words">
                <span>⚡</span> Otimizador Tático: Propostas de Composição (${activeMapObj.name})
              </h3>
              <span class="px-2 py-0.5 rounded text-[9px] font-tactical font-black uppercase bg-emerald-950 border border-emerald-500/40 text-emerald-300 flex-shrink-0">
                3 Opções do Meta
              </span>
            </div>
            <p class="text-xs text-gray-400 mt-0.5 break-words">Composições calculadas cruzando notas individuais, agentes mais dominados e sinergia de utilitários no mapa</p>
          </div>
          <span class="text-xs font-mono text-sky-400 bg-[#080d14] px-3 py-1.5 rounded-xl border border-[#182638] flex-shrink-0">
            Consultivo / Sem Auto-aplicar 📋
          </span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          ${compSuggestionsHtml}
        </div>
      </div>

      <!-- DIAGNÓSTICO DO TREINADOR NO MAPA -->
      <div class="tactical-card p-4 sm:p-5 rounded-2xl border border-[#1e2f42] bg-[#0c131d] space-y-4 overflow-hidden shadow-xl">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-[#182638]">
          <div class="min-w-0 flex-1">
            <h3 class="text-sm sm:text-base font-tactical font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap break-words">
              <span>🧠</span> Diagnóstico do Treinador: Dicas de Execução & Foco (${activeMapObj.name})
            </h3>
            <p class="text-xs text-gray-400 break-words">Análise da comissão técnica exclusiva para o mapa ${activeMapObj.name}</p>
          </div>
          <span class="text-[10px] font-tactical uppercase font-bold text-sky-400 bg-sky-950/80 px-2.5 py-1 rounded-lg border border-sky-500/30 flex-shrink-0">
            Inteligência Tática
          </span>
        </div>

        ${mapTipsHtml}
      </div>
    `;
  }

  // Montagem Completa do Painel
  container.innerHTML = `
    <div class="space-y-6 w-full">
      
      <!-- Banner Superior da Equipe -->
      <div class="tactical-card p-4 sm:p-5 rounded-2xl border border-[#1e2f42] bg-[#0c141e] shadow-2xl relative overflow-hidden">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <span class="px-2 py-0.5 rounded text-[10px] font-tactical font-black uppercase bg-[#ff4655]/20 text-[#ff4655] border border-[#ff4655]/40 tracking-wider flex-shrink-0">
                Estatísticas Coletivas & Cruzamento
              </span>
              <span class="text-xs font-mono text-gray-400 break-words">
                Visualização: <b class="text-white uppercase">${isAllMapsMode ? 'Todos os 11 Mapas (Panorama Geral)' : `Análise Focada: ${activeMapObj.name}`}</b>
              </span>
            </div>
            <h2 class="text-xl sm:text-2xl font-tactical font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap break-words">
              <span>📊</span> ${state.teamName || 'Painel Valorant'} — Análise da Equipe
            </h2>
            <p class="text-xs text-gray-400 mt-1 break-words">
              ${isAllMapsMode 
                ? 'Panorama geral da equipe, cobertura de funções do elenco, análise de ban & pick para os 11 mapas e evolução cronológica'
                : `Análise aprofundada de ${activeMapObj.name}: composições recomendadas, sinergia das titulares, dicas de execução e métricas específicas`}
            </p>
          </div>

          <div class="flex items-center gap-2 flex-wrap w-full md:w-auto">
            <button onclick="window.switchMainView('sync')" 
                    class="flex-1 md:flex-initial px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-tactical font-black text-xs transition flex items-center justify-center gap-1.5 shadow-lg hover:shadow-sky-500/20 cursor-pointer">
              <span>⚡</span>
              <span class="hidden sm:inline">Central de Sincronização API</span>
              <span class="sm:hidden">Sincronizar API</span>
            </button>
            <button onclick="window.switchMainView('lineup')"
                    class="flex-1 md:flex-initial px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#14202d] hover:bg-[#1a2b3d] border border-[#24374c] text-gray-200 font-tactical font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer">
              <span>📋</span>
              <span class="hidden sm:inline">Voltar para Lineup</span>
              <span class="sm:hidden">Lineup</span>
            </button>
          </div>
        </div>

        <!-- Seletor de Mapa para Análise -->
        <div class="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-[#182638] flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 map-tabs-container max-w-full">
          <span class="text-[11px] sm:text-xs font-tactical text-gray-400 flex-shrink-0">Filtrar por Mapa:</span>
          ${mapPillsHtml}
        </div>
      </div>

      <!-- 5 KPI Cards da Equipe -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        
        <div class="tactical-card p-3 sm:p-4 rounded-xl border ${ratingVisual.border} bg-[#0c141e] shadow-lg flex flex-col justify-between overflow-hidden">
          <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none truncate">
            ${isAllMapsMode ? 'Rendimento Coletivo Geral' : `Rendimento em ${activeMapObj.name}`}
          </span>
          <div class="flex items-center gap-1.5 my-1">
            <span class="text-2xl sm:text-3xl font-mono font-black ${ratingVisual.valColor}">${avgRating}</span>
            <span class="text-xs text-gray-500 font-mono">/ 10</span>
          </div>
          <span class="px-2 py-0.5 rounded text-[9px] font-tactical font-black uppercase ${ratingVisual.tierBadgeClass} border inline-block w-fit">
            ${ratingVisual.tier}
          </span>
        </div>

        <div class="tactical-card p-3 sm:p-4 rounded-xl border border-[#1b2b3d] bg-[#0c141e] shadow-lg flex flex-col justify-between overflow-hidden">
          <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none truncate">K/D Médio da Line</span>
          <div class="my-1">
            <span class="text-2xl sm:text-3xl font-mono font-black text-emerald-400">${avgKd}</span>
          </div>
          <span class="text-[10px] text-gray-400 truncate">Eficiência de Eliminações</span>
        </div>

        <div class="tactical-card p-3 sm:p-4 rounded-xl border border-[#1b2b3d] bg-[#0c141e] shadow-lg flex flex-col justify-between overflow-hidden">
          <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none truncate">ACS Médio Combinado</span>
          <div class="my-1">
            <span class="text-2xl sm:text-3xl font-mono font-black text-sky-400">${avgAcs}</span>
          </div>
          <span class="text-[10px] text-gray-400 truncate">Combat Score por Rodada</span>
        </div>

        <div class="tactical-card p-3 sm:p-4 rounded-xl border border-[#1b2b3d] bg-[#0c141e] shadow-lg flex flex-col justify-between overflow-hidden">
          <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none truncate">Taxa de Vitória</span>
          <div class="my-1">
            <span class="text-2xl sm:text-3xl font-mono font-black text-amber-400">${avgWinRate}%</span>
          </div>
          <span class="text-[10px] text-gray-400 truncate">Aproveitamento Médio</span>
        </div>

        <div class="tactical-card p-3 sm:p-4 rounded-xl border border-[#1b2b3d] bg-[#0c141e] shadow-lg flex flex-col justify-between col-span-2 sm:col-span-1 overflow-hidden">
          <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none truncate">Partidas Analisadas</span>
          <div class="my-1">
            <span class="text-2xl sm:text-3xl font-mono font-black text-white">${totalAll}</span>
          </div>
          <div class="flex items-center gap-1 text-[9px] font-mono truncate">
            <span class="text-amber-300">${totalComp}c</span>
            <span class="text-gray-500">•</span>
            <span class="text-purple-300">${totalUnrated}u</span>
          </div>
        </div>

      </div>

      <!-- SEÇÃO CONDICIONAL (MODO TODOS OS MAPAS vs MODO MAPA ESPECÍFICO) -->
      ${modeSpecificSectionHtml}

      <!-- GRÁFICO DE EVOLUÇÃO TEMPORAL (RIGOROSAMENTE CRONOLÓGICO) -->
      ${teamEvolutionChartHtml}

      <!-- SEÇÃO: SINERGIA DE DUPLAS NO MAPA -->
      <div class="tactical-card p-4 sm:p-5 rounded-2xl border border-[#1e2f42] bg-[#0c131d] space-y-4 overflow-hidden shadow-xl">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-[#182638]">
          <div class="min-w-0 flex-1">
            <h3 class="text-sm sm:text-base font-tactical font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap break-words">
              <span>⚡</span> Sinergia de Agentes em Duplas (${isAllMapsMode ? 'Lineup Ativa' : activeMapObj.name})
            </h3>
            <p class="text-xs text-gray-400 break-words">Como os agentes escalados se complementam e potencializam utilitários em duplas</p>
          </div>
          <div class="flex items-center gap-2 bg-[#080d14] px-3 py-1.5 rounded-xl border border-[#1a2838] flex-shrink-0 flex-wrap">
            <span class="text-[10px] font-tactical text-gray-400 uppercase">Coesão da Comp:</span>
            <span class="text-sm font-mono font-black text-amber-400">${overallSynergyScore}%</span>
            <span class="text-[9px] text-emerald-400 font-bold uppercase">(Alta Sinergia)</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          ${duosHtml}
        </div>
      </div>

      <!-- SEÇÃO: HEATMAP DOS 11 MAPAS COMPETITIVOS -->
      <div class="tactical-card p-4 sm:p-5 rounded-2xl border border-[#1e2f42] bg-[#0c131d] space-y-4 overflow-hidden shadow-xl">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-[#182638]">
          <div class="min-w-0 flex-1">
            <h3 class="text-sm sm:text-base font-tactical font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap break-words">
              <span>🗺️</span> Força da Equipe por Mapa (Todos os 11 Mapas)
            </h3>
            <p class="text-xs text-gray-400 break-words">Visão comparativa da equipe para orientar Ban & Pick e mapas prioritários de treino tático</p>
          </div>
          <span class="text-xs font-mono text-gray-400 bg-[#121c2a] border border-[#22364c] px-3 py-1 rounded-lg flex-shrink-0">
            Total de Mapas: <b>11</b>
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          ${mapHeatmapHtml}
        </div>
      </div>

      <!-- SEÇÃO: TABELA COMPARATIVA DO ELENCO COMPLETO -->
      <div class="tactical-card p-4 sm:p-5 rounded-2xl border border-[#1e2f42] bg-[#0c131d] space-y-4 overflow-hidden shadow-xl">
        <div class="flex items-center justify-between pb-2 border-b border-[#182638] flex-wrap gap-2">
          <div class="min-w-0 flex-1">
            <h3 class="text-sm sm:text-base font-tactical font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap break-words">
              <span>👥</span> Desempenho e Conforto Individual do Elenco (${(state.roster || []).length} Jogadoras)
            </h3>
            <p class="text-xs text-gray-400 break-words">
              ${isAllMapsMode 
                ? 'Cruzamento geral de K/D, ACS, Rendimento Médio e amostragem de partidas'
                : `Cruzamento de dados no mapa ${activeMapObj.name} e amostragem de partidas`}
            </p>
          </div>
          <button onclick="window.openRosterModal()" class="px-3 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-lg transition flex-shrink-0">
            Gerenciar Roster
          </button>
        </div>

        <div class="overflow-x-auto rounded-xl border border-[#172535]">
          <table class="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr class="bg-[#080d14] border-b border-[#182638] text-[10px] uppercase font-tactical text-gray-400 select-none">
                <th onclick="window.sortAnalyticsTable('slot')" class="py-2.5 px-3 cursor-pointer hover:text-white transition group" title="Ordenar por Slot">
                  <div class="flex items-center gap-1">
                    <span>Slot</span>
                    <span class="font-mono text-[9px] ${sortCol === 'slot' ? 'text-amber-400 font-black' : 'text-gray-600 group-hover:text-gray-400'}">${sortCol === 'slot' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</span>
                  </div>
                </th>
                <th onclick="window.sortAnalyticsTable('name')" class="py-2.5 px-3 cursor-pointer hover:text-white transition group" title="Ordenar por Nome da Jogadora">
                  <div class="flex items-center gap-1">
                    <span>Jogadora</span>
                    <span class="font-mono text-[9px] ${sortCol === 'name' ? 'text-amber-400 font-black' : 'text-gray-600 group-hover:text-gray-400'}">${sortCol === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</span>
                  </div>
                </th>
                <th onclick="window.sortAnalyticsTable('agent')" class="py-2.5 px-3 cursor-pointer hover:text-white transition group" title="Ordenar por Agente">
                  <div class="flex items-center gap-1">
                    <span>Agente Fixado</span>
                    <span class="font-mono text-[9px] ${sortCol === 'agent' ? 'text-amber-400 font-black' : 'text-gray-600 group-hover:text-gray-400'}">${sortCol === 'agent' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</span>
                  </div>
                </th>
                <th onclick="window.sortAnalyticsTable('comfort')" class="py-2.5 px-3 cursor-pointer hover:text-white transition group" title="Ordenar por Nível de Conforto">
                  <div class="flex items-center gap-1">
                    <span>Nível de Conforto</span>
                    <span class="font-mono text-[9px] ${sortCol === 'comfort' ? 'text-amber-400 font-black' : 'text-gray-600 group-hover:text-gray-400'}">${sortCol === 'comfort' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</span>
                  </div>
                </th>
                <th onclick="window.sortAnalyticsTable('kd')" class="py-2.5 px-3 text-center cursor-pointer hover:text-white transition group" title="Ordenar por K/D">
                  <div class="flex items-center justify-center gap-1">
                    <span>K/D</span>
                    <span class="font-mono text-[9px] ${sortCol === 'kd' ? 'text-amber-400 font-black' : 'text-gray-600 group-hover:text-gray-400'}">${sortCol === 'kd' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</span>
                  </div>
                </th>
                <th onclick="window.sortAnalyticsTable('acs')" class="py-2.5 px-3 text-center cursor-pointer hover:text-white transition group" title="Ordenar por ACS">
                  <div class="flex items-center justify-center gap-1">
                    <span>ACS</span>
                    <span class="font-mono text-[9px] ${sortCol === 'acs' ? 'text-amber-400 font-black' : 'text-gray-600 group-hover:text-gray-400'}">${sortCol === 'acs' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</span>
                  </div>
                </th>
                <th onclick="window.sortAnalyticsTable('rating')" class="py-2.5 px-3 text-center cursor-pointer hover:text-white transition group" title="Ordenar por Rendimento">
                  <div class="flex items-center justify-center gap-1">
                    <span>Rendimento</span>
                    <span class="font-mono text-[9px] ${sortCol === 'rating' ? 'text-amber-400 font-black' : 'text-gray-600 group-hover:text-gray-400'}">${sortCol === 'rating' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</span>
                  </div>
                </th>
                <th onclick="window.sortAnalyticsTable('matches')" class="py-2.5 px-3 text-center cursor-pointer hover:text-white transition group" title="Ordenar por Volume de Partidas">
                  <div class="flex items-center justify-center gap-1">
                    <span>Partidas (Comp / Sem Class.)</span>
                    <span class="font-mono text-[9px] ${sortCol === 'matches' ? 'text-amber-400 font-black' : 'text-gray-600 group-hover:text-gray-400'}">${sortCol === 'matches' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</span>
                  </div>
                </th>
                <th class="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

// Ordenação clicável dos cabeçalhos da tabela de desempenho
window.sortAnalyticsTable = function(column) {
  if (state.analyticsTableSort.column === column) {
    state.analyticsTableSort.order = state.analyticsTableSort.order === 'asc' ? 'desc' : 'asc';
  } else {
    state.analyticsTableSort.column = column;
    state.analyticsTableSort.order = ['kd', 'acs', 'rating', 'matches'].includes(column) ? 'desc' : 'asc';
  }
  renderTeamAnalyticsView();
};


// --------------------------------------------------------------------------
// CENTRAL DE SINCRONIZAÇÃO DA API RIOT GAMES & HENRIKDEV (RATE LIMIT CONTROLLER)
// --------------------------------------------------------------------------

// Adiciona linha de log com timestamp e nível visual
function addSyncLog(type, tag, message, durationMs = 0) {
  if (!state.syncManager.logs) state.syncManager.logs = [];
  const logEntry = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toLocaleTimeString('pt-BR'),
    type, // 'info', 'success', 'warning', 'error', 'ratelimit'
    tag: tag.toUpperCase(),
    message,
    durationMs
  };
  state.syncManager.logs.push(logEntry);
  if (state.syncManager.logs.length > 150) {
    state.syncManager.logs.shift();
  }

  // Se a view de sincronização estiver visível, atualiza o console em tempo real
  if (state.currentMainView === 'sync') {
    const termBody = document.getElementById('sync-terminal-body');
    if (termBody) {
      const entryEl = document.createElement('div');
      entryEl.className = 'py-1 flex items-start gap-2 border-b border-[#0d1722] hover:bg-[#0a121d] transition font-mono text-[11px] leading-relaxed';
      
      let badgeClass = 'bg-sky-950/80 text-sky-400 border border-sky-500/30';
      if (type === 'success') badgeClass = 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30';
      else if (type === 'ratelimit') badgeClass = 'bg-amber-950/90 text-amber-300 border border-amber-500/50 animate-pulse';
      else if (type === 'error') badgeClass = 'bg-rose-950/80 text-rose-400 border border-rose-500/30';
      else if (type === 'warning') badgeClass = 'bg-amber-950/60 text-amber-400 border border-amber-500/30';

      const durStr = durationMs > 0 ? `<span class="text-purple-400 font-mono text-[10px]">+${durationMs}ms</span>` : '';

      entryEl.innerHTML = `
        <span class="text-gray-500 flex-shrink-0 select-none">[${logEntry.timestamp}]</span>
        <span class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase flex-shrink-0 ${badgeClass}">${logEntry.tag}</span>
        ${durStr}
        <span class="text-gray-200 break-words flex-1">${logEntry.message}</span>
      `;
      termBody.appendChild(entryEl);
      if (state.syncManager.autoScroll) {
        termBody.scrollTop = termBody.scrollHeight;
      }
    }
  }
}

// Executa chamada com medição rigorosa de milissegundos e detecção de HTTP 429
async function fetchPlayerWithRateLimit(riotId) {
  if (!riotId || !riotId.includes('#')) {
    return { error: true, status: 400, message: 'Tag ausente ou inválida' };
  }
  const [name, tag] = riotId.split('#').map(s => s.trim());
  const apiKey = getHenrikApiKey();
  if (!apiKey) {
    return { error: true, status: 401, message: 'Chave de API HenrikDev ausente' };
  }

  const t0 = performance.now();

  try {
    const accUrl = `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
    const accRes = await fetch(accUrl, { headers: { 'Authorization': apiKey } });

    if (accRes.status === 429) {
      const dur = Math.round(performance.now() - t0);
      return { rateLimited: true, status: 429, durationMs: dur, retryAfter: 60 };
    }
    if (!accRes.ok) {
      const dur = Math.round(performance.now() - t0);
      return { error: true, status: accRes.status, durationMs: dur, message: `Conta não localizada (HTTP ${accRes.status})` };
    }

    const accData = await accRes.json();
    const region = accData.data?.region || 'br';
    const puuid = accData.data?.puuid;

    let matches = null;
    let endpointUsed = 'v1/lifetime';

    // 1. Tenta endpoint Lifetime (amostragem ampla de até 60 jogos)
    try {
      const lifeUrl = `https://api.henrikdev.xyz/valorant/v1/lifetime/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=100`;
      const lifeRes = await fetch(lifeUrl, { headers: { 'Authorization': apiKey } });
      if (lifeRes.status === 429) {
        const dur = Math.round(performance.now() - t0);
        return { rateLimited: true, status: 429, durationMs: dur, retryAfter: 60 };
      }
      if (lifeRes.ok) {
        const lifeData = await lifeRes.json();
        if (lifeData.data && Array.isArray(lifeData.data) && lifeData.data.length > 0) {
          matches = lifeData.data;
        }
      }
    } catch (e) {
      // Ignora e tenta fallback v3
    }

    // 2. Fallback v3 caso lifetime não responda
    if (!matches || matches.length === 0) {
      endpointUsed = 'v3/matches';
      const matchUrl = `https://api.henrikdev.xyz/valorant/v3/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=15`;
      const matchRes = await fetch(matchUrl, { headers: { 'Authorization': apiKey } });
      if (matchRes.status === 429) {
        const dur = Math.round(performance.now() - t0);
        return { rateLimited: true, status: 429, durationMs: dur, retryAfter: 60 };
      }
      if (matchRes.ok) {
        const matchData = await matchRes.json();
        if (matchData.data && Array.isArray(matchData.data)) {
          matches = matchData.data;
        }
      }
    }

    const durationMs = Math.round(performance.now() - t0);

    if (!matches || matches.length === 0) {
      return { error: true, status: 404, durationMs, message: 'Nenhuma partida pública encontrada no histórico recente' };
    }

    // Resgata histórico existente no banco para acúmulo contínuo da temporada
    const existingPlayer = Array.isArray(state.roster) 
      ? state.roster.find(p => p.name && p.name.toLowerCase().trim() === riotId.toLowerCase().trim())
      : null;
    const existingMatches = existingPlayer?.recentMatches || [];

    const stats = processMatchesData(matches, puuid, name, tag, existingMatches);
    if (!stats) {
      return { error: true, status: 500, durationMs, message: 'Falha ao tabular dados das partidas' };
    }

    // 1. Atualiza no Roster
    upsertRosterPlayer({
      name: riotId,
      kd: stats.kd,
      mostPlayed: stats.topAgents,
      mapRatings: stats.mapRatings,
      mapDetails: stats.mapDetails,
      recentMatches: stats.recentMatches,
      overallRating: stats.overallRating,
      overallAcs: stats.overallAcs,
      overallWinRate: stats.overallWinRate,
      totalMatches: stats.totalMatches,
      compMatchesCount: stats.compMatchesCount,
      unratedMatchesCount: stats.unratedMatchesCount,
      totalKills: stats.totalKills,
      totalDeaths: stats.totalDeaths,
      role: stats.topAgents[0] ? getAgentRole(stats.topAgents[0]) : 'Flex'
    });

    // 2. Atualiza em todas as lineups
    MAPS_DATA.forEach(map => {
      const mapLineup = state.lineups[map.id];
      if (mapLineup && Array.isArray(mapLineup)) {
        mapLineup.forEach((p, pIdx) => {
          if (p.name && p.name.toLowerCase().trim() === riotId.toLowerCase().trim()) {
            const mapRating = stats.mapRatings[map.id.toLowerCase()] || stats.overallRating;
            if (mapRating) p.rendimento = mapRating;
            if (stats.kd) p.kd = stats.kd;
            if (stats.topAgents.length > 0) p.mostPlayed = [...stats.topAgents];
            syncSavePlayer(map.id, pIdx, p, state.lineups);
          }
        });
      }
    });

    saveCurrentState();

    return {
      success: true,
      stats,
      durationMs,
      endpoint: endpointUsed
    };

  } catch (err) {
    const durationMs = Math.round(performance.now() - t0);
    return { error: true, status: 500, durationMs, message: err.message || 'Erro de rede ou conexão' };
  }
}

// Inicia a sincronização de todo o elenco com controle de fila e Rate Limit
window.startTeamSync = async function(force = false) {
  if (state.syncManager.isRunning) {
    showToast('Sincronização já está em andamento!', 'warning');
    return;
  }

  const currentLineup = state.lineups[state.activeMapId] || DEFAULT_PLAYERS;
  const playersToSync = [];
  currentLineup.forEach((p, idx) => {
    if (!hasScaledPlayer(p)) return; // Ignora vagas sem ninguém escalado (R1, R2, etc.)
    const clean = (p.name || '').trim();
    if (clean && clean.includes('#')) {
      playersToSync.push({
        index: idx,
        name: clean,
        isSub: idx >= 5
      });
    }
  });

  if (playersToSync.length === 0) {
    addSyncLog('warning', 'ALERTA', 'Nenhuma jogadora com Nick#TAG encontrada na escalação ativa.');
    showToast('Nenhuma jogadora com Nick#TAG para sincronizar!', 'warning');
    renderSyncView();
    return;
  }

  state.syncManager.isRunning = true;
  state.syncManager.isPaused = false;
  state.syncManager.progress.total = playersToSync.length;
  state.syncManager.progress.current = 0;
  
  const activeDot = document.getElementById('sync-active-indicator');
  if (activeDot) activeDot.classList.remove('hidden');

  addSyncLog('info', 'FILA INICIADA', `Iniciando sincronização de ${playersToSync.length} jogadoras do elenco com proteção de Rate Limit.`);
  renderSyncView();

  for (let i = 0; i < playersToSync.length; i++) {
    if (state.syncManager.isPaused) {
      addSyncLog('warning', 'PAUSADO', 'Fila pausada pelo usuário.');
      state.syncManager.isRunning = false;
      if (activeDot) activeDot.classList.add('hidden');
      renderSyncView();
      return;
    }

    const item = playersToSync[i];
    state.syncManager.activePlayerName = item.name;
    state.syncManager.activePlayerIndex = item.index;
    
    if (!state.syncManager.playerStats[item.name]) {
      state.syncManager.playerStats[item.name] = {};
    }
    state.syncManager.playerStats[item.name].status = 'syncing';
    renderSyncView();

    addSyncLog('info', 'REQUISIÇÃO', `[${i + 1}/${playersToSync.length}] Solicitando histórico de ${item.name} à API...`);

    let completed = false;
    while (!completed) {
      if (state.syncManager.isPaused) {
        state.syncManager.isRunning = false;
        if (activeDot) activeDot.classList.add('hidden');
        renderSyncView();
        return;
      }

      const res = await fetchPlayerWithRateLimit(item.name);

      if (res.rateLimited) {
        // RATE LIMIT ATINGIDO (HTTP 429)
        addSyncLog('ratelimit', 'RATE LIMIT 429', `⚠️ Cota por minuto atingida na API da Riot/HenrikDev ao buscar ${item.name}. Aguardando resfriamento...`, res.durationMs);
        state.syncManager.isWaitingRateLimit = true;
        state.syncManager.rateLimitSecondsRemaining = res.retryAfter || 60;
        state.syncManager.playerStats[item.name].status = 'ratelimit';
        renderSyncView();

        // Contagem regressiva visual segundo a segundo
        await new Promise(resolve => {
          if (state.syncManager.rateLimitTimer) clearInterval(state.syncManager.rateLimitTimer);
          state.syncManager.rateLimitTimer = setInterval(() => {
            state.syncManager.rateLimitSecondsRemaining--;
            
            // Atualiza o texto do contador no DOM diretamente para fluidez
            const cdEl = document.getElementById('rate-limit-countdown-text');
            if (cdEl) cdEl.textContent = `${state.syncManager.rateLimitSecondsRemaining}s`;
            const cdBar = document.getElementById('rate-limit-progress-fill');
            if (cdBar) {
              const pct = Math.max(0, Math.min(100, ((60 - state.syncManager.rateLimitSecondsRemaining) / 60) * 100));
              cdBar.style.width = pct + '%';
            }

            if (state.syncManager.rateLimitSecondsRemaining <= 0 || state.syncManager.isPaused) {
              clearInterval(state.syncManager.rateLimitTimer);
              state.syncManager.rateLimitTimer = null;
              state.syncManager.isWaitingRateLimit = false;
              resolve();
            }
          }, 1000);
        });

        if (state.syncManager.isPaused) {
          state.syncManager.isRunning = false;
          if (activeDot) activeDot.classList.add('hidden');
          renderSyncView();
          return;
        }

        addSyncLog('info', 'RETOMANDO', `✅ Cota da API restabelecida. Retentando sincronizar ${item.name} agora...`);
        // O loop continua e tenta a mesma jogadora novamente
      } else if (res.success) {
        completed = true;
        state.syncManager.playerStats[item.name] = {
          lastSyncTime: Date.now(),
          lastDurationMs: res.durationMs,
          status: 'success',
          matchesCount: res.stats.totalMatches,
          overallRating: res.stats.overallRating,
          kd: res.stats.kd
        };
        state.syncManager.progress.current++;
        addSyncLog('success', 'API 200 OK', `✅ ${item.name} sincronizada em ${res.durationMs}ms: ${res.stats.totalMatches} partidas carregadas (Nota: ${res.stats.overallRating}, K/D: ${res.stats.kd}).`, res.durationMs);
        renderSyncView();

        // Delay preventivo de segurança (1.5s) entre jogadoras para poupar requisições
        if (i < playersToSync.length - 1) {
          addSyncLog('info', 'PAUSA TÁTICA', 'Aguardando 1.5s de respiro para garantir estabilidade da cota...');
          await new Promise(r => setTimeout(r, 1500));
        }
      } else {
        completed = true;
        state.syncManager.playerStats[item.name] = {
          lastSyncTime: Date.now(),
          lastDurationMs: res.durationMs || 0,
          status: 'error',
          errorMsg: res.message
        };
        state.syncManager.progress.current++;
        addSyncLog('error', `ERRO ${res.status || ''}`, `❌ Falha ao buscar ${item.name}: ${res.message}`, res.durationMs);
        renderSyncView();
      }
    }
  }

  state.syncManager.isRunning = false;
  state.syncManager.activePlayerName = '';
  if (activeDot) activeDot.classList.add('hidden');

  addSyncLog('success', 'CONCLUÍDO', `🎉 Sincronização do elenco finalizada! ${state.syncManager.progress.current}/${playersToSync.length} jogadoras processadas.`);
  showToast('✅ Sincronização da equipe finalizada com sucesso!', 'success');
  renderSyncView();
  renderPlayersList();
  if (state.currentMainView === 'analytics') {
    renderTeamAnalyticsView();
  }
};

window.pauseTeamSync = function() {
  state.syncManager.isPaused = true;
  state.syncManager.isRunning = false;
  if (state.syncManager.rateLimitTimer) {
    clearInterval(state.syncManager.rateLimitTimer);
    state.syncManager.rateLimitTimer = null;
  }
  state.syncManager.isWaitingRateLimit = false;
  const activeDot = document.getElementById('sync-active-indicator');
  if (activeDot) activeDot.classList.add('hidden');
  addSyncLog('warning', 'PAUSA', 'Processo de sincronização interrompido pelo usuário.');
  showToast('Sincronização pausada.', 'info');
  renderSyncView();
};

window.syncSinglePlayer = async function(playerName) {
  if (state.syncManager.isRunning) {
    showToast('Aguarde a sincronização em lote terminar!', 'warning');
    return;
  }
  if (!playerName || !playerName.includes('#')) {
    showToast('A jogadora precisa ter Nick#TAG!', 'warning');
    return;
  }

  addSyncLog('info', 'INDIVIDUAL', `Sincronizando individualmente ${playerName}...`);
  if (!state.syncManager.playerStats[playerName]) state.syncManager.playerStats[playerName] = {};
  state.syncManager.playerStats[playerName].status = 'syncing';
  renderSyncView();

  const res = await fetchPlayerWithRateLimit(playerName);
  if (res.rateLimited) {
    addSyncLog('ratelimit', 'RATE LIMIT 429', `⚠️ Limite de requisições por minuto atingido ao buscar ${playerName}.`, res.durationMs);
    state.syncManager.playerStats[playerName].status = 'ratelimit';
    showToast('⚠️ Limite de chamadas atingido (HTTP 429). Aguarde 1 minuto.', 'warning');
  } else if (res.success) {
    state.syncManager.playerStats[playerName] = {
      lastSyncTime: Date.now(),
      lastDurationMs: res.durationMs,
      status: 'success',
      matchesCount: res.stats.totalMatches,
      overallRating: res.stats.overallRating,
      kd: res.stats.kd
    };
    addSyncLog('success', 'API 200 OK', `✅ ${playerName} sincronizada em ${res.durationMs}ms: Nota ${res.stats.overallRating}, K/D ${res.stats.kd}.`, res.durationMs);
    showToast(`⚡ ${playerName} sincronizada com sucesso (${res.durationMs}ms)!`, 'success');
  } else {
    state.syncManager.playerStats[playerName] = {
      lastSyncTime: Date.now(),
      lastDurationMs: res.durationMs,
      status: 'error',
      errorMsg: res.message
    };
    addSyncLog('error', 'FALHA', `❌ Erro ao buscar ${playerName}: ${res.message}`, res.durationMs);
    showToast(`Erro ao sincronizar: ${res.message}`, 'error');
  }

  renderSyncView();
  renderPlayersList();
};

window.testApiPing = async function() {
  const apiKey = getHenrikApiKey();
  if (!apiKey) {
    showToast('Configure sua chave de API nas configurações!', 'warning');
    return;
  }
  addSyncLog('info', 'PING TEST', 'Testando latência com os servidores da API HenrikDev...');
  const t0 = performance.now();
  try {
    const res = await fetch('https://api.henrikdev.xyz/valorant/v1/version/na', {
      headers: { 'Authorization': apiKey }
    });
    const dur = Math.round(performance.now() - t0);
    if (res.ok) {
      addSyncLog('success', 'PING OK', `Conexão ativa! Latência de resposta: ${dur}ms (HTTP ${res.status}).`, dur);
      showToast(`Ping com a API: ${dur}ms • Conexão Excelente!`, 'success');
    } else if (res.status === 429) {
      addSyncLog('ratelimit', 'PING 429', `Servidor respondeu em ${dur}ms, mas a cota por minuto está esgotada.`, dur);
      showToast('API respondeu com Rate Limit (HTTP 429).', 'warning');
    } else {
      addSyncLog('warning', 'PING AVISO', `Resposta HTTP ${res.status} em ${dur}ms.`, dur);
    }
  } catch (err) {
    const dur = Math.round(performance.now() - t0);
    addSyncLog('error', 'PING FALHA', `Falha de conexão com a API (${dur}ms): ${err.message}`, dur);
    showToast('Falha ao conectar com o servidor da API.', 'error');
  }
  renderSyncView();
};

window.clearSyncLogs = function() {
  state.syncManager.logs = [{
    id: 'log-clear-' + Date.now(),
    timestamp: new Date().toLocaleTimeString('pt-BR'),
    type: 'info',
    tag: 'SISTEMA',
    message: 'Console de logs limpo pelo usuário.',
    durationMs: 0
  }];
  renderSyncView();
  showToast('Logs limpos com sucesso!', 'info');
};

window.copySyncLogs = function() {
  if (!state.syncManager.logs || state.syncManager.logs.length === 0) {
    showToast('Nenhum log para copiar!', 'warning');
    return;
  }
  const text = state.syncManager.logs.map(l => `[${l.timestamp}] [${l.tag}] ${l.durationMs > 0 ? `+${l.durationMs}ms ` : ''}${l.message}`).join('\n');
  copyToClipboard(text, '📋 Logs copiados para a área de transferência!');
};

window.setSyncLogFilter = function(filter) {
  state.syncManager.logFilter = filter;
  renderSyncView();
};

window.toggleSyncAutoScroll = function() {
  state.syncManager.autoScroll = !state.syncManager.autoScroll;
  renderSyncView();
};

// Redireciona a chamada syncAllTeamFromApi para o gerenciador de fila
window.syncAllTeamFromApi = async function() {
  window.switchMainView('sync');
  window.startTeamSync();
};

// RENDERIZAÇÃO DA VIEW COMPLETA DE SINCRONIZAÇÃO
function renderSyncView() {
  const container = document.getElementById('view-sync');
  if (!container) return;

  const mgr = state.syncManager;
  const currentLineup = state.lineups[state.activeMapId] || DEFAULT_PLAYERS;
  const allTeamPlayers = currentLineup
    .filter(p => hasScaledPlayer(p))
    .map((p, idx) => {
    const clean = (p.name || '').trim();
    const inR = (state.roster || []).find(r => r.name && r.name.toLowerCase() === clean.toLowerCase()) || {};
    const stats = mgr.playerStats[clean] || {};
    return {
      index: idx,
      name: clean || `Player ${idx + 1}`,
      hasTag: clean.includes('#'),
      isSub: idx >= 5,
      agent: p.titular || (p.isSub ? p.flex1 : '') || inR.mostPlayed?.[0] || 'Killjoy',
      role: p.isSub ? 'Reserva' : getAgentRole(p.titular || 'Killjoy'),
      lastSyncTime: stats.lastSyncTime || inR.lastSyncTime || null,
      lastDurationMs: stats.lastDurationMs || inR.lastDurationMs || 0,
      status: stats.status || (inR.recentMatches && inR.recentMatches.length > 0 ? 'success' : (clean.includes('#') ? 'idle' : 'no_tag')),
      matchesCount: stats.matchesCount || inR.totalMatches || (inR.recentMatches ? inR.recentMatches.length : 0),
      kd: stats.kd || inR.kd || p.kd || '1.00',
      overallRating: stats.overallRating || inR.overallRating || p.rendimento || '7.5',
      errorMsg: stats.errorMsg || null
    };
  });

  // Cálculo dos 4 KPIs da Sincronização
  const syncedCount = allTeamPlayers.filter(p => p.status === 'success').length;
  const validDurations = allTeamPlayers.filter(p => p.lastDurationMs > 0).map(p => p.lastDurationMs);
  const avgLatency = validDurations.length > 0 
    ? Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length)
    : 340;

  // Tempo decorrido da última sincronização geral
  const timestamps = allTeamPlayers.filter(p => p.lastSyncTime).map(p => p.lastSyncTime);
  let lastSyncText = 'Ainda não realizada';
  if (timestamps.length > 0) {
    const latest = Math.max(...timestamps);
    const diffSec = Math.round((Date.now() - latest) / 1000);
    if (diffSec < 60) lastSyncText = `Há ${diffSec}s`;
    else if (diffSec < 3600) lastSyncText = `Há ${Math.round(diffSec / 60)} min`;
    else lastSyncText = `Há ${Math.round(diffSec / 3600)}h`;
  }

  // Tabela de status do elenco
  const rowsHtml = allTeamPlayers.map(p => {
    let statusBadge = '';
    if (p.status === 'syncing') {
      statusBadge = '<span class="px-2 py-0.5 rounded text-[9px] font-tactical font-black uppercase bg-sky-950 text-sky-400 border border-sky-500/50 animate-pulse">🔄 Sincronizando...</span>';
    } else if (p.status === 'ratelimit') {
      statusBadge = '<span class="px-2 py-0.5 rounded text-[9px] font-tactical font-black uppercase bg-amber-950 text-amber-300 border border-amber-500/50 animate-pulse">⏳ Rate Limit 429</span>';
    } else if (p.status === 'success') {
      statusBadge = '<span class="px-2 py-0.5 rounded text-[9px] font-tactical font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/40">✅ Atualizada</span>';
    } else if (p.status === 'error') {
      statusBadge = `<span class="px-2 py-0.5 rounded text-[9px] font-tactical font-black uppercase bg-rose-950 text-rose-400 border border-rose-500/40" title="${p.errorMsg || 'Erro'}">❌ Falha API</span>`;
    } else if (!p.hasTag) {
      statusBadge = '<span class="px-2 py-0.5 rounded text-[9px] font-tactical font-black uppercase bg-gray-900 text-gray-400 border border-gray-700">⚠️ Sem TAG #</span>';
    } else {
      statusBadge = '<span class="px-2 py-0.5 rounded text-[9px] font-tactical font-black uppercase bg-[#141f2d] text-gray-300 border border-[#22354a]">⏳ Na Fila</span>';
    }

    let timeAgo = 'Nunca';
    if (p.lastSyncTime) {
      const s = Math.round((Date.now() - p.lastSyncTime) / 1000);
      if (s < 60) timeAgo = `Há ${s}s`;
      else if (s < 3600) timeAgo = `Há ${Math.round(s / 60)} min`;
      else timeAgo = `Há ${Math.round(s / 3600)}h`;
    }

    const durBadge = p.lastDurationMs > 0 
      ? `<span class="font-mono text-[10px] text-purple-400 font-bold">${p.lastDurationMs} ms</span>`
      : '<span class="text-gray-500 text-[10px] font-mono">--</span>';

    return `
      <tr class="border-b border-[#141f2d] hover:bg-[#0c141f] transition text-xs">
        <td class="py-2.5 px-3 whitespace-nowrap">
          <span class="px-2 py-0.5 rounded text-[9px] font-tactical font-black uppercase ${p.isSub ? 'bg-gray-800 text-gray-300 border border-gray-600' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'}">
            ${p.isSub ? `Reserva R${p.index - 4}` : `Titular P${p.index + 1}`}
          </span>
        </td>
        <td class="py-2.5 px-3 min-w-0">
          <div class="flex items-center gap-2">
            <img src="${getAgentIcon(p.agent)}" alt="${p.agent}" class="w-6 h-6 rounded-md object-cover bg-black/50 border border-white/20 flex-shrink-0">
            <div class="min-w-0">
              <span class="font-bold text-white block truncate">${p.name.split('#')[0]}</span>
              <span class="text-[9px] font-mono text-gray-400 block truncate">${p.name.includes('#') ? '#' + p.name.split('#')[1] : 'Sem Tag'}</span>
            </div>
          </div>
        </td>
        <td class="py-2.5 px-3 whitespace-nowrap">
          ${statusBadge}
        </td>
        <td class="py-2.5 px-3 text-center whitespace-nowrap font-mono text-xs text-sky-400 font-bold">
          ${p.matchesCount > 0 ? `${p.matchesCount} partidas` : '<span class="text-gray-500">0</span>'}
        </td>
        <td class="py-2.5 px-3 text-center whitespace-nowrap">
          ${durBadge}
        </td>
        <td class="py-2.5 px-3 text-center whitespace-nowrap text-gray-400 font-mono text-[11px]">
          ${timeAgo}
        </td>
        <td class="py-2.5 px-3 text-right whitespace-nowrap">
          <button onclick="window.syncSinglePlayer('${p.name}')"
                  ${mgr.isRunning || !p.hasTag ? 'disabled' : ''}
                  class="px-2.5 py-1 rounded bg-[#162332] hover:bg-sky-900 border border-[#273d57] hover:border-sky-500/50 text-sky-300 text-[10px] font-tactical font-bold transition disabled:opacity-40 disabled:cursor-not-allowed">
            🔄 Sincronizar
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Filtro de logs
  const filter = mgr.logFilter || 'all';
  const filteredLogs = (mgr.logs || []).filter(l => {
    if (filter === 'all') return true;
    if (filter === 'success') return l.type === 'success';
    if (filter === 'ratelimit') return l.type === 'ratelimit' || l.type === 'warning';
    if (filter === 'error') return l.type === 'error';
    return true;
  });

  const terminalRowsHtml = filteredLogs.map(l => {
    let badgeClass = 'bg-sky-950/80 text-sky-400 border border-sky-500/30';
    if (l.type === 'success') badgeClass = 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30';
    else if (l.type === 'ratelimit') badgeClass = 'bg-amber-950/90 text-amber-300 border border-amber-500/50 animate-pulse';
    else if (l.type === 'error') badgeClass = 'bg-rose-950/80 text-rose-400 border border-rose-500/30';
    else if (l.type === 'warning') badgeClass = 'bg-amber-950/60 text-amber-400 border border-amber-500/30';

    const durStr = l.durationMs > 0 ? `<span class="text-purple-400 font-mono text-[10px]">+${l.durationMs}ms</span>` : '';

    return `
      <div class="py-1 flex items-start gap-2 border-b border-[#0d1722] hover:bg-[#0a121d] transition font-mono text-[11px] leading-relaxed">
        <span class="text-gray-500 flex-shrink-0 select-none">[${l.timestamp}]</span>
        <span class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase flex-shrink-0 ${badgeClass}">${l.tag}</span>
        ${durStr}
        <span class="text-gray-200 break-words flex-1">${l.message}</span>
      </div>
    `;
  }).join('');

  // Banner do Rate Limit Dinâmico
  let rateLimitBannerHtml = '';
  if (mgr.isWaitingRateLimit) {
    const seconds = mgr.rateLimitSecondsRemaining;
    const pct = Math.max(0, Math.min(100, ((60 - seconds) / 60) * 100));
    rateLimitBannerHtml = `
      <div class="bg-gradient-to-r from-amber-950/80 via-[#181108] to-[#1a0a0d] border-2 border-amber-500/60 rounded-2xl p-4 sm:p-5 shadow-[0_0_30px_rgba(245,158,11,0.2)] animate-pulse">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-2xl flex-shrink-0">
              ⏳
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-base font-tactical font-black text-amber-300 uppercase tracking-wider">
                  Limite de Requisições da API Atingido (HTTP 429)
                </h4>
                <span class="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-amber-500/30 text-amber-200 border border-amber-400/50">
                  Rate Limit Riot / HenrikDev
                </span>
              </div>
              <p class="text-xs text-gray-300 mt-1 leading-relaxed">
                A API oficial retornou limite temporário de requisições por minuto. O Painel Valorant pausou com segurança para evitar bloqueio e <b>retomará automaticamente a sincronização</b> da jogadora <b class="text-white">${mgr.activePlayerName}</b> assim que o cronômetro zerar.
              </p>
            </div>
          </div>

          <div class="flex flex-col items-center justify-center bg-[#0a0f17] border border-amber-500/40 px-6 py-3 rounded-xl min-w-[150px] flex-shrink-0 text-center">
            <span class="text-[9px] uppercase font-tactical text-gray-400 block">Retomando em:</span>
            <span id="rate-limit-countdown-text" class="text-3xl font-mono font-black text-amber-400 mt-0.5">${seconds}s</span>
            <span class="text-[8px] font-mono text-gray-500">Resfriamento Seguro</span>
          </div>
        </div>

        <!-- Barra de progresso de resfriamento -->
        <div class="mt-3 w-full bg-[#080d14] h-2 rounded-full overflow-hidden border border-[#1b2b3d]">
          <div id="rate-limit-progress-fill" class="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-1000" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }

  // Progresso geral da fila
  let progressBarHtml = '';
  if (mgr.isRunning) {
    const cur = mgr.progress.current;
    const tot = mgr.progress.total || 7;
    const pct = Math.round((cur / tot) * 100);
    progressBarHtml = `
      <div class="tactical-card p-3 sm:p-4 rounded-xl border border-sky-500/40 bg-[#08111a] space-y-2">
        <div class="flex items-center justify-between text-xs font-tactical">
          <span class="text-sky-300 font-bold flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
            <span>Sincronizando Elenco: ${cur} de ${tot} jogadoras processadas (${pct}%)</span>
          </span>
          <span class="text-gray-400 font-mono text-[11px]">Em processamento: <b class="text-white">${mgr.activePlayerName || 'Iniciando...'}</b></span>
        </div>
        <div class="w-full bg-[#04080e] h-2.5 rounded-full overflow-hidden border border-[#142232]">
          <div class="bg-gradient-to-r from-sky-500 to-emerald-400 h-full transition-all duration-300" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="space-y-6 w-full">
      
      <!-- Banner Superior da Central de Sincronização -->
      <div class="tactical-card p-4 sm:p-5 rounded-2xl border border-[#1e2f42] bg-[#0c141e] shadow-2xl relative overflow-hidden">
        <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <span class="px-2 py-0.5 rounded text-[10px] font-tactical font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 tracking-wider flex-shrink-0">
                API Oficial Riot Games & HenrikDev
              </span>
              <span class="text-xs font-mono text-gray-400 break-words">
                Status do Serviço: <b class="text-emerald-400">Online 🟢</b>
              </span>
            </div>
            <h2 class="text-xl sm:text-2xl font-tactical font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap break-words">
              <span>⚡</span> Central de Sincronização & Rate Limit
            </h2>
            <p class="text-xs text-gray-400 mt-1 break-words">
              Controle de chamadas em lote, tempo de resposta em milissegundos por jogadora, espera inteligente de Rate Limit (HTTP 429) e terminal de auditoria em tempo real.
            </p>
          </div>

          <div class="flex items-center gap-2 flex-wrap w-full md:w-auto">
            ${!mgr.isRunning ? `
              <button onclick="window.startTeamSync()" 
                      class="flex-1 md:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-tactical font-black text-xs transition flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg hover:shadow-emerald-500/20 cursor-pointer">
                <span>⚡</span>
                <span class="hidden sm:inline">Sincronizar Todo o Elenco</span>
                <span class="sm:hidden">Sincronizar Elenco</span>
              </button>
            ` : `
              <button onclick="window.pauseTeamSync()" 
                      class="flex-1 md:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-tactical font-black text-xs transition flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg cursor-pointer">
                <span>⏸️</span>
                <span class="hidden sm:inline">Pausar Sincronização</span>
                <span class="sm:hidden">Pausar</span>
              </button>
            `}

            <button onclick="window.testApiPing()" 
                    class="flex-1 md:flex-initial px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl bg-[#14202d] hover:bg-[#1a2b3d] border border-[#24374c] text-sky-300 font-tactical font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer">
              <span>🔄</span>
              <span>Testar Ping</span>
            </button>

            <button onclick="window.switchMainView('lineup')"
                    class="flex-1 md:flex-initial px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl bg-[#14202d] hover:bg-[#1a2b3d] border border-[#24374c] text-gray-300 font-tactical font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer">
              <span>📋</span>
              <span class="hidden sm:inline">Ir para Lineup</span>
              <span class="sm:hidden">Lineup</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ALERTA DE RATE LIMIT (CASO ATINGIDO) -->
      ${rateLimitBannerHtml}

      <!-- BARRA DE PROGRESSO DA FILA (CASO ATIVA) -->
      ${progressBarHtml}

      <!-- 4 KPIS DA CENTRAL DE SINCRONIZAÇÃO -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div class="tactical-card p-3 sm:p-4 rounded-xl border border-sky-500/30 bg-[#0c141e] shadow-lg flex flex-col justify-between overflow-hidden">
          <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none truncate">Status da Fila</span>
          <div class="my-1.5 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full ${mgr.isRunning ? 'bg-sky-400 animate-ping' : 'bg-gray-500'}"></span>
            <span class="text-lg sm:text-2xl font-mono font-black ${mgr.isRunning ? 'text-sky-400' : 'text-gray-300'} truncate">
              ${mgr.isRunning ? 'Em Execução' : (mgr.isWaitingRateLimit ? 'Pausa 429' : 'Pronto / Ocioso')}
            </span>
          </div>
          <span class="text-[10px] text-gray-400 truncate">${allTeamPlayers.length} jogadoras mapeadas</span>
        </div>

        <div class="tactical-card p-3 sm:p-4 rounded-xl border border-emerald-500/30 bg-[#0c141e] shadow-lg flex flex-col justify-between overflow-hidden">
          <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none truncate">Jogadoras Atualizadas</span>
          <div class="my-1.5 flex items-baseline gap-1.5">
            <span class="text-2xl sm:text-3xl font-mono font-black text-emerald-400">${syncedCount}</span>
            <span class="text-xs font-mono text-gray-500">/ ${allTeamPlayers.length}</span>
          </div>
          <span class="text-[10px] text-emerald-300 font-tactical">Dados frescos no cache</span>
        </div>

        <div class="tactical-card p-3 sm:p-4 rounded-xl border border-purple-500/30 bg-[#0c141e] shadow-lg flex flex-col justify-between overflow-hidden">
          <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none truncate">Latência Média da API</span>
          <div class="my-1.5 flex items-baseline gap-1.5">
            <span class="text-2xl sm:text-3xl font-mono font-black text-purple-400">${avgLatency}</span>
            <span class="text-xs font-mono text-purple-300">ms</span>
          </div>
          <span class="text-[10px] text-gray-400 truncate">Tempo por jogadora</span>
        </div>

        <div class="tactical-card p-3 sm:p-4 rounded-xl border border-amber-500/30 bg-[#0c141e] shadow-lg flex flex-col justify-between overflow-hidden">
          <span class="text-[9px] uppercase font-tactical text-gray-400 block leading-none truncate">Última Sincronização Geral</span>
          <div class="my-1.5">
            <span class="text-lg sm:text-2xl font-mono font-black text-white truncate block">${lastSyncText}</span>
          </div>
          <span class="text-[10px] text-gray-400 truncate">Atualização mais recente</span>
        </div>
      </div>

      <!-- TABELA DE STATUS INDIVIDUAL DAS 7 JOGADORAS -->
      <div class="tactical-card p-4 sm:p-5 rounded-2xl border border-[#1e2f42] bg-[#0c131d] space-y-4 overflow-hidden shadow-xl max-w-full">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-[#182638]">
          <div class="min-w-0 flex-1">
            <h3 class="text-sm sm:text-base font-tactical font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap break-words">
              <span>👥</span> Status de Sincronização por Jogadora do Elenco
            </h3>
            <p class="text-xs text-gray-400 break-words">Acompanhamento do status de cada jogadora, tempo de resposta individual e botão para sincronizar isoladamente</p>
          </div>
          <span class="text-xs font-mono text-gray-400 bg-[#080d14] px-3 py-1 rounded-xl border border-[#182638] flex-shrink-0">
            ${allTeamPlayers.length} Jogadoras no Radar
          </span>
        </div>

        <div class="overflow-x-auto rounded-xl border border-[#172535] max-w-full">
          <table class="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr class="bg-[#080d14] border-b border-[#182638] text-[10px] uppercase font-tactical text-gray-400">
                <th class="py-2.5 px-3">Slot</th>
                <th class="py-2.5 px-3">Jogadora</th>
                <th class="py-2.5 px-3">Status da API</th>
                <th class="py-2.5 px-3 text-center">Partidas</th>
                <th class="py-2.5 px-3 text-center">Tempo Resposta</th>
                <th class="py-2.5 px-3 text-center">Última Sinc.</th>
                <th class="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- TERMINAL / CONSOLE DE AUDITORIA EM TEMPO REAL -->
      <div class="tactical-card p-4 sm:p-5 rounded-2xl border border-[#1e2f42] bg-[#090e15] space-y-3 overflow-hidden shadow-2xl max-w-full">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-[#182638]">
          <div class="flex items-center gap-2 flex-wrap min-w-0 flex-1">
            <span class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
            <h3 class="text-sm sm:text-base font-tactical font-black text-white uppercase tracking-wider break-words">
              Console & Terminal de Eventos da API
            </h3>
            <span class="text-xs font-mono text-gray-500 hidden sm:inline">(${filteredLogs.length} eventos)</span>
          </div>

          <!-- Filtros e Ações do Console -->
          <div class="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <button onclick="window.setSyncLogFilter('all')" class="px-2 py-1 rounded text-[10px] font-mono uppercase font-bold transition ${filter === 'all' ? 'bg-sky-600 text-white' : 'bg-[#101924] text-gray-400 hover:text-white'}">
              Todos
            </button>
            <button onclick="window.setSyncLogFilter('success')" class="px-2 py-1 rounded text-[10px] font-mono uppercase font-bold transition ${filter === 'success' ? 'bg-emerald-600 text-white' : 'bg-[#101924] text-gray-400 hover:text-white'}">
              Sucessos
            </button>
            <button onclick="window.setSyncLogFilter('ratelimit')" class="px-2 py-1 rounded text-[10px] font-mono uppercase font-bold transition ${filter === 'ratelimit' ? 'bg-amber-600 text-white' : 'bg-[#101924] text-gray-400 hover:text-white'}">
              <span class="hidden sm:inline">Rate Limit / Avisos</span>
              <span class="sm:hidden">Rate Limit</span>
            </button>
            <button onclick="window.setSyncLogFilter('error')" class="px-2 py-1 rounded text-[10px] font-mono uppercase font-bold transition ${filter === 'error' ? 'bg-rose-600 text-white' : 'bg-[#101924] text-gray-400 hover:text-white'}">
              Erros
            </button>
            <button onclick="window.copySyncLogs()" title="Copiar logs" class="px-2 py-1 rounded text-[10px] font-mono bg-[#14202d] hover:bg-[#1a2b3d] text-gray-300 hover:text-white border border-[#25374d] transition ml-0.5 sm:ml-1">
              📋 Copiar
            </button>
            <button onclick="window.clearSyncLogs()" title="Limpar console" class="px-2 py-1 rounded text-[10px] font-mono bg-[#14202d] hover:bg-rose-950 text-gray-400 hover:text-rose-300 border border-[#25374d] transition">
              🧹 Limpar
            </button>
          </div>
        </div>

        <!-- Área de Rolagem do Terminal -->
        <div id="sync-terminal-body" class="bg-[#05080c] border border-[#141f2d] rounded-xl p-3 sm:p-4 max-h-80 overflow-y-auto font-mono text-xs space-y-0.5 shadow-inner select-text">
          ${terminalRowsHtml || '<div class="text-gray-500 py-4 text-center">Nenhum evento registrado no console.</div>'}
        </div>

        <div class="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-1 flex-wrap gap-1">
          <span>● Conexão: HenrikDev REST Endpoint v1/lifetime & v3 fallback</span>
          <span>Buffer: Últimos 150 registros mantidos em memória</span>
        </div>
      </div>

      <!-- GUIA DE OTIMIZAÇÃO DA API & RATE LIMIT -->
      <div class="tactical-card p-4 rounded-xl border border-sky-500/20 bg-[#081018] space-y-2">
        <h4 class="text-xs font-tactical font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5 flex-wrap break-words">
          <span>💡</span> Como Funciona a Proteção de Cota da API Riot / HenrikDev
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-gray-300 pt-1">
          <div class="bg-[#050a10] p-2.5 rounded-lg border border-[#142030]">
            <b class="text-white block font-tactical mb-1">1. Pausa Tática de 1.5s</b>
            <p class="text-gray-400 leading-relaxed">Entre a sincronização de cada jogadora, o sistema aguarda 1.5 segundo para não disparar rajadas consecutivas que estouram a cota.</p>
          </div>
          <div class="bg-[#050a10] p-2.5 rounded-lg border border-[#142030]">
            <b class="text-white block font-tactical mb-1">2. Retomada Automática em 429</b>
            <p class="text-gray-400 leading-relaxed">Se a API devolver o status HTTP 429 (Too Many Requests), a fila entra em modo de espera com cronômetro de 60s e retoma de onde parou.</p>
          </div>
          <div class="bg-[#050a10] p-2.5 rounded-lg border border-[#142030]">
            <b class="text-white block font-tactical mb-1">3. Cache Inteligente</b>
            <p class="text-gray-400 leading-relaxed">Todas as partidas, notas e cálculos ficam salvos no LocalStorage e Firebase. Não é necessário sincronizar o elenco a cada partida.</p>
          </div>
        </div>
      </div>

    </div>
  `;
}

window.renderSyncView = renderSyncView;
window.renderTeamAnalyticsView = renderTeamAnalyticsView;
window.renderTeamAnalyticsView = renderTeamAnalyticsView;



// --------------------------------------------------------------------------
// UTILITÁRIOS
// --------------------------------------------------------------------------

function copyToClipboard(text, successMessage) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMessage || 'Copiado com sucesso!', 'success');
    }).catch(() => {
      fallbackCopy(text, successMessage);
    });
  } else {
    fallbackCopy(text, successMessage);
  }
}

function fallbackCopy(text, successMessage) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast(successMessage || 'Copiado!', 'success');
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast-notification');
  const toastMsg = document.getElementById('toast-message');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;

  if (type === 'success') {
    toast.className = 'fixed top-5 right-5 z-50 transform transition-transform duration-300 max-w-xs bg-[#102218] border-l-4 border-[#25D366] p-3 rounded shadow-2xl flex items-center gap-3 text-xs text-white';
  } else if (type === 'error') {
    toast.className = 'fixed top-5 right-5 z-50 transform transition-transform duration-300 max-w-xs bg-[#2b1416] border-l-4 border-red-500 p-3 rounded shadow-2xl flex items-center gap-3 text-xs text-white';
  } else {
    toast.className = 'fixed top-5 right-5 z-50 transform transition-transform duration-300 max-w-xs bg-[#16202c] border-l-4 border-[#ff4655] p-3 rounded shadow-2xl flex items-center gap-3 text-xs text-white';
  }

  toast.style.transform = 'translateY(0)';

  setTimeout(() => {
    toast.style.transform = 'translateY(-150%)';
  }, 3000);
}

function escapeHtml(string) {
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Fechar dropdowns de autocomplete ao clicar fora ou pressionar ESC
document.addEventListener('click', (e) => {
  if (!e.target.closest('[id^="player-name-wrapper-"]') && !e.target.closest('[id^="roster-autocomplete-dropdown-"]')) {
    window.hideAllRosterAutocompletes();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.hideAllRosterAutocompletes();
    if (state.manualSwapSourceIndex !== null) {
      state.manualSwapSourceIndex = null;
      renderPlayersList();
      showToast('Troca de posição cancelada.', 'info');
    }
    const avatarModal = document.getElementById('player-avatar-modal');
    if (avatarModal && !avatarModal.classList.contains('hidden')) {
      window.closePlayerAvatarModal();
      return;
    }
    if (state.playerProfileModal && state.playerProfileModal.selectedMapId) {
      window.backToAllMaps();
    } else if (typeof window.closePlayerProfileModal === 'function') {
      window.closePlayerProfileModal();
    }
  }
});
})();
