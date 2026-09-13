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
  whatsappView: 'current' // 'current', 'meta' ou 'all'
};

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

  // Inicializa roster com DEFAULT_ROSTER se estiver vazio
  if (!state.roster || state.roster.length === 0) {
    state.roster = Array.isArray(DEFAULT_ROSTER) ? [...DEFAULT_ROSTER] : [];
  }

  // Garante que c0rt3z#0303 esteja disponível no banco com estatísticas reais da API
  const c0rt3zData = {
    name: 'c0rt3z#0303',
    kd: '1.09',
    mostPlayed: ['Killjoy', 'Cypher', 'Omen'],
    role: 'Sentinela / Flex',
    overallRating: '7.5',
    mapRatings: {
      ascent: '9.0',
      fracture: '10.0',
      lotus: '8.3',
      sunset: '6.9',
      icebox: '5.4',
      haven: '5.3',
      breeze: '4.1'
    }
  };

  const c0rt3zIdx = state.roster.findIndex(p => p.name.toLowerCase() === 'c0rt3z#0303');
  if (c0rt3zIdx >= 0) {
    state.roster[c0rt3zIdx] = {
      ...c0rt3zData,
      ...state.roster[c0rt3zIdx],
      mapRatings: {
        ...c0rt3zData.mapRatings,
        ...(state.roster[c0rt3zIdx].mapRatings || {})
      }
    };
  } else {
    state.roster.unshift(c0rt3zData);
  }

  // Garante que cada mapa tenha 7 jogadoras (5 Titulares + 2 Reservas Flex)
  MAPS_DATA.forEach(map => {
    if (!state.lineups[map.id] || !Array.isArray(state.lineups[map.id])) {
      state.lineups[map.id] = DEFAULT_PLAYERS.map(p => ({ ...p, mostPlayed: [...(p.mostPlayed || [])] }));
    } else {
      while (state.lineups[map.id].length < 7) {
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

    // Coleta e sincroniza jogadoras cadastradas nos mapas com o roster
    state.lineups[map.id].forEach(p => {
      if (p.name && !p.name.startsWith('Player ') && !p.name.startsWith('Reserva ') && p.name.trim()) {
        const found = state.roster.find(r => r.name.toLowerCase() === p.name.trim().toLowerCase());
        if (!found) {
          state.roster.push({
            name: p.name.trim(),
            kd: p.kd || '',
            mostPlayed: Array.isArray(p.mostPlayed) ? [...p.mostPlayed] : [],
            role: 'Flex',
            rendimento: p.rendimento || '',
            mapRatings: p.rendimento ? { [map.id.toLowerCase()]: p.rendimento } : {}
          });
        } else {
          if (!p.kd && found.kd) p.kd = found.kd;
          if ((!p.mostPlayed || p.mostPlayed.length === 0) && found.mostPlayed) {
            p.mostPlayed = [...found.mostPlayed];
          }
          if (!p.rendimento) {
            const mRend = found.mapRatings?.[map.id.toLowerCase()] || found.overallRating;
            if (mRend) p.rendimento = mRend;
          }
        }
      }
    });
  });
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

    // Se o dado vier no formato { meta, lineups } ou direto
    const incomingLineups = remoteData.lineups || remoteData;
    if (incomingLineups && typeof incomingLineups === 'object') {
      let changed = false;
      MAPS_DATA.forEach(m => {
        if (incomingLineups[m.id]) {
          state.lineups[m.id] = incomingLineups[m.id];
          while (state.lineups[m.id].length < 7) {
            const subId = state.lineups[m.id].length + 1;
            state.lineups[m.id].push({
              id: subId,
              name: `Reserva ${subId - 5}`,
              isSub: true,
              flex1: '',
              flex2: '',
              flex3: '',
              kd: '',
              mostPlayed: []
            });
          }
          changed = true;
        }
      });
      if (changed) {
        renderPlayersList();
      }
    }

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
          <div class="flex items-center justify-between mb-1">
            <h4 class="font-tactical font-bold text-xs sm:text-sm text-white truncate">${build.title}</h4>
            <span class="text-[9px] sm:text-[10px] font-mono uppercase bg-[#182535] text-gray-400 px-1.5 py-0.5 rounded border border-[#263a50] flex-shrink-0 ml-1">${build.tag}</span>
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
    (p.flex3 && p.flex3.trim() !== '')
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
  });

  saveCurrentState();
  renderPlayersList();
  showToast(`Build de ${currentMap.name} resetada com sucesso!`, 'info');
};

// Renderiza a lista das 5 Jogadoras Titulares e 2 Reservas Flex
function renderPlayersList() {
  const containerTitulares = document.getElementById('players-list-container');
  const containerReserves = document.getElementById('reserves-list-container');
  if (!containerTitulares) return;

  const activeMap = MAPS_DATA.find(m => m.id === state.activeMapId) || MAPS_DATA[0];
  const players = state.lineups[state.activeMapId] || DEFAULT_PLAYERS;
  const titulares = players.slice(0, 5);
  const reserves = players.slice(5, 7);

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

    return `
      <div class="tactical-card p-2.5 sm:p-3.5 rounded-lg border border-[#203043] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 w-full min-w-0"
           id="player-card-${index}"
           style="position: relative; z-index: ${30 - index};">
        
        <!-- Identificador, Nome & Autocomplete & Stats Tracker -->
        <div class="flex flex-col gap-1.5 w-full md:w-64 flex-shrink-0 min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#162332] border border-[#283b50] flex items-center justify-center font-tactical font-bold text-xs sm:text-sm text-[#ff4655] shadow-inner flex-shrink-0">
              P${player.id}
            </div>
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
            <button onclick="window.openTrackerModal(${index})" 
                    title="Abrir painel de estatísticas, K/D e agentes do Tracker"
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
            <div class="inline-flex items-center gap-1 bg-[#0d141e] border ${ratingVisual.border} hover:border-amber-400/50 px-1.5 py-0.5 rounded transition" title="Pontuação de Rendimento da jogadora em ${escapeHtml(activeMap.name)} (0 a 10)">
              <span class="text-[9px] font-tactical font-bold ${ratingVisual.labelColor}">Rend:</span>
              <input type="text" value="${escapeHtml(player.rendimento || '')}" placeholder="--" 
                     onchange="window.updatePlayerRendimento(${index}, this.value)" 
                     class="w-8 bg-transparent text-[10px] sm:text-xs font-mono font-bold ${ratingVisual.valColor} placeholder-gray-600 focus:outline-none text-center">
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

      </div>
    `;
  }).join('');

  // Renderiza as 2 Reservas com Bonecos Flex
  if (containerReserves) {
    containerReserves.innerHTML = reserves.map((player, rIdx) => {
      const actualIndex = rIdx + 5;
      const rRatingVisual = getRatingVisuals(player.rendimento);
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

      return `
        <div class="tactical-card p-2.5 sm:p-3.5 rounded-lg border border-amber-900/40 hover:border-amber-500/50 bg-[#101722] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 w-full min-w-0"
             id="player-card-${actualIndex}"
             style="position: relative; z-index: ${20 - rIdx};">
          
          <!-- Identificador R1/R2, Nome & Autocomplete & Stats Tracker -->
          <div class="flex flex-col gap-1.5 w-full md:w-64 flex-shrink-0 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-950/70 border border-amber-500/50 flex items-center justify-center font-tactical font-bold text-xs sm:text-sm text-amber-300 shadow-inner flex-shrink-0">
                R${rIdx + 1}
              </div>
              <div class="flex-1 min-w-0 relative" id="player-name-wrapper-${actualIndex}">
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
              <button onclick="window.openTrackerModal(${actualIndex})" 
                      title="Abrir painel de estatísticas, K/D e agentes do Tracker"
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
              <div class="inline-flex items-center gap-1 bg-[#0d141e] border ${rRatingVisual.border} hover:border-amber-400/50 px-1.5 py-0.5 rounded transition" title="Pontuação de Rendimento da jogadora em ${escapeHtml(activeMap.name)} (0 a 10)">
                <span class="text-[9px] font-tactical font-bold ${rRatingVisual.labelColor}">Rend:</span>
                <input type="text" value="${escapeHtml(player.rendimento || '')}" placeholder="--" 
                       onchange="window.updatePlayerRendimento(${actualIndex}, this.value)" 
                       class="w-8 bg-transparent text-[10px] sm:text-xs font-mono font-bold ${rRatingVisual.valColor} placeholder-gray-600 focus:outline-none text-center">
              </div>
              <div class="flex items-center gap-1" title="Agentes mais jogados (Tracker)">
                <span class="text-[8px] font-tactical uppercase text-gray-500">Top:</span>
                ${mostPlayedIconsHtml}
                ${addMostPlayedBtn}
              </div>
            </div>
          </div>

          <!-- 3 Slots de Bonecos Flex -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full flex-1 min-w-0">
            ${flexSlots}
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
    breeze: ['Viper', 'Sova', 'Cypher', 'Jett', 'KAY/O', 'Harbor'],
    bind: ['Brimstone', 'Raze', 'Viper', 'Skye', 'Fade', 'Cypher', 'Gekko'],
    ascent: ['Omen', 'Sova', 'Killjoy', 'Jett', 'KAY/O'],
    split: ['Raze', 'Omen', 'Cypher', 'Skye', 'Breach', 'Viper'],
    haven: ['Omen', 'Sova', 'Killjoy', 'Jett', 'Breach'],
    lotus: ['Omen', 'Fade', 'Killjoy', 'Raze', 'Viper', 'Tejo'],
    sunset: ['Cypher', 'Omen', 'Raze', 'Fade', 'Breach', 'Gekko'],
    abyss: ['Omen', 'Astra', 'Sova', 'Cypher', 'Jett', 'Tejo'],
    icebox: ['Viper', 'Sova', 'Killjoy', 'Jett', 'Sage'],
    fracture: ['Brimstone', 'Breach', 'Raze', 'Cypher', 'Fade'],
    pearl: ['Astra', 'Viper', 'Fade', 'Killjoy', 'Jett']
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
    const roleClass = `role-badge-${rec.role.toLowerCase()}`;
    return `
      <button onclick="window.selectAgent('${escapeHtml(rec.name)}')"
              class="p-2 rounded-lg bg-[#0e1c2d] hover:bg-[#15273e] border border-sky-500/40 hover:border-amber-400 flex items-center gap-2 text-left transition group shadow-sm">
        <img src="${rec.icon}" alt="${rec.name}" class="w-8 h-8 rounded object-cover border flex-shrink-0 group-hover:scale-105 transition-transform" style="border-color: ${rec.color}">
        <div class="truncate flex-1 min-w-0">
          <div class="flex items-center gap-1 truncate">
            <span class="text-xs font-bold text-white group-hover:text-amber-300 truncate">${rec.name}</span>
            <span class="text-[8px] font-mono px-1 py-0.2 rounded ${roleClass} uppercase flex-shrink-0">${rec.role}</span>
          </div>
          <span class="text-[9px] text-sky-300 font-tactical truncate block" title="${escapeHtml(rec.reason)}">
            ★ ${escapeHtml(rec.reason)}
          </span>
        </div>
      </button>
    `;
  }).join('');

  container.classList.remove('hidden');
}

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

// Adiciona ou atualiza jogadora no roster
function upsertRosterPlayer(playerObj) {
  if (!playerObj || !playerObj.name) return;
  if (!Array.isArray(state.roster)) state.roster = [];

  const existingIdx = state.roster.findIndex(p => p.name.toLowerCase() === playerObj.name.trim().toLowerCase());
  if (existingIdx >= 0) {
    state.roster[existingIdx] = {
      ...state.roster[existingIdx],
      ...playerObj,
      name: playerObj.name.trim(),
      mapRatings: {
        ...(state.roster[existingIdx].mapRatings || {}),
        ...(playerObj.mapRatings || {})
      },
      overallRating: playerObj.overallRating || state.roster[existingIdx].overallRating || ''
    };
  } else {
    state.roster.push({
      name: playerObj.name.trim(),
      kd: playerObj.kd || '',
      mostPlayed: Array.isArray(playerObj.mostPlayed) ? [...playerObj.mostPlayed] : [],
      role: playerObj.role || 'Flex',
      mapRatings: playerObj.mapRatings || {},
      overallRating: playerObj.overallRating || ''
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

// Processa o histórico de partidas retornado pela API e extrai estatísticas por mapa
function processMatchesData(matches, puuid, name, tag) {
  let totalKills = 0, totalDeaths = 0, totalScore = 0, totalRounds = 0, totalWins = 0;
  const agentCounts = {};
  const mapStats = {};

  matches.forEach(m => {
    const rawMap = (m.metadata?.map || '').toLowerCase().trim();
    const p = m.players?.all_players?.find(pl => 
      (puuid && pl.puuid === puuid) ||
      (pl.name?.toLowerCase() === name.toLowerCase() && pl.tag?.toLowerCase() === tag.toLowerCase())
    );
    if (!p) return;

    const k = p.stats?.kills || 0;
    const d = p.stats?.deaths || 0;
    const s = p.stats?.score || 0;
    const r = m.metadata?.rounds_played || 1;
    const myTeam = p.team?.toLowerCase();
    const won = !!m.teams?.[myTeam]?.has_won;

    totalKills += k;
    totalDeaths += d;
    totalScore += s;
    totalRounds += r;
    if (won) totalWins++;

    if (p.character) {
      agentCounts[p.character] = (agentCounts[p.character] || 0) + 1;
    }

    if (rawMap) {
      if (!mapStats[rawMap]) {
        mapStats[rawMap] = { kills: 0, deaths: 0, score: 0, rounds: 0, wins: 0, total: 0 };
      }
      mapStats[rawMap].kills += k;
      mapStats[rawMap].deaths += d;
      mapStats[rawMap].score += s;
      mapStats[rawMap].rounds += r;
      mapStats[rawMap].total++;
      if (won) mapStats[rawMap].wins++;
    }
  });

  const kd = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : (totalKills > 0 ? totalKills.toFixed(2) : '');
  const topAgents = Object.entries(agentCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]).slice(0, 3);
  const overallRating = calculatePerformanceRating(totalKills, totalDeaths, totalScore, totalRounds, totalWins, matches.length);

  const mapRatings = {};
  for (const [mId, s] of Object.entries(mapStats)) {
    mapRatings[mId] = calculatePerformanceRating(s.kills, s.deaths, s.score, s.rounds, s.wins, s.total);
  }

  return {
    kd,
    topAgents,
    overallRating,
    mapRatings,
    totalKills,
    totalDeaths
  };
}

// Busca automática em segundo plano via HenrikDev API
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

    const matchRes = await fetch(`https://api.henrikdev.xyz/valorant/v3/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=10`, {
      headers: { 'Authorization': apiKey }
    });
    if (!matchRes.ok) return;

    const matchData = await matchRes.json();
    if (matchData.data && Array.isArray(matchData.data)) {
      const stats = processMatchesData(matchData.data, puuid, name, tag);

      const currentPlayers = state.lineups[state.activeMapId];
      if (currentPlayers && currentPlayers[playerIndex]) {
        if (stats.kd) currentPlayers[playerIndex].kd = stats.kd;
        if (stats.topAgents.length > 0) currentPlayers[playerIndex].mostPlayed = stats.topAgents;

        const activeMapRating = stats.mapRatings[state.activeMapId.toLowerCase()] || stats.overallRating;
        if (activeMapRating) {
          currentPlayers[playerIndex].rendimento = activeMapRating;
        }

        // Atualiza também nas outras lineups onde esta jogadora estiver escalada
        MAPS_DATA.forEach(map => {
          const mapLineup = state.lineups[map.id];
          if (mapLineup && mapLineup[playerIndex] && mapLineup[playerIndex].name?.toLowerCase() === riotId.toLowerCase()) {
            const mapRating = stats.mapRatings[map.id.toLowerCase()] || stats.overallRating;
            if (mapRating) {
              mapLineup[playerIndex].rendimento = mapRating;
              if (stats.kd) mapLineup[playerIndex].kd = stats.kd;
              if (stats.topAgents.length > 0) mapLineup[playerIndex].mostPlayed = [...stats.topAgents];
              syncSavePlayer(map.id, playerIndex, mapLineup[playerIndex], state.lineups);
            }
          }
        });

        upsertRosterPlayer({
          name: riotId,
          kd: currentPlayers[playerIndex].kd,
          mostPlayed: currentPlayers[playerIndex].mostPlayed,
          mapRatings: stats.mapRatings,
          overallRating: stats.overallRating
        });

        saveCurrentState();
        syncSavePlayer(state.activeMapId, playerIndex, currentPlayers[playerIndex], state.lineups);
        renderPlayersList();
        
        const topStr = stats.topAgents.length > 0 ? ` (${stats.topAgents.join(', ')})` : '';
        const rendStr = activeMapRating ? ` • Rend. ${state.activeMapId}: ${activeMapRating}/10` : '';
        showToast(`⚡ API Riot: ${riotId} sincronizado (K/D ${currentPlayers[playerIndex].kd}${rendStr}${topStr})`, 'success');
      }
    }
  } catch (err) {
    console.warn('Erro na busca em segundo plano do Tracker:', err);
  }
}

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
      <div class="tactical-card p-2.5 rounded-lg border border-[#203043] flex items-center justify-between gap-3 bg-[#0f1722] hover:border-[#ff4655]/40 transition">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-[#162332] border border-[#283b50] flex items-center justify-center font-tactical font-bold text-xs text-emerald-400 flex-shrink-0">
            ${idx + 1}
          </div>
          <div class="truncate min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-white truncate">${escapeHtml(item.name)}</span>
              ${item.kd ? `<span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">K/D: ${item.kd}</span>` : ''}
              ${item.role ? `<span class="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#182637] text-gray-300 border border-[#263c54]">${item.role}</span>` : ''}
            </div>
            <div class="flex items-center gap-1 mt-1">
              <span class="text-[8px] uppercase text-gray-500 font-tactical">Mais jogadas:</span>
              ${topIcons || '<span class="text-[9px] text-gray-500 italic">Nenhum definido</span>'}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1.5 flex-shrink-0">
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

    const matchRes = await fetch(`https://api.henrikdev.xyz/valorant/v3/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=10`, {
      headers: { 'Authorization': apiKey }
    });

    let calculatedKd = '';
    let topAgents = [];
    let totalKills = 0, totalDeaths = 0;

    if (matchRes.ok) {
      const matchData = await matchRes.json();
      if (matchData.data && Array.isArray(matchData.data)) {
        const stats = processMatchesData(matchData.data, puuid, name, tag);
        calculatedKd = stats.kd;
        topAgents = stats.topAgents;
        totalKills = stats.totalKills;
        totalDeaths = stats.totalDeaths;
        state.trackerModal.tempMapRatings = stats.mapRatings;
        state.trackerModal.tempOverallRating = stats.overallRating;
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
    upsertRosterPlayer({
      name: newNick,
      kd: newKd,
      mostPlayed: currentPlayers[pIdx].mostPlayed,
      mapRatings: state.trackerModal.tempMapRatings || {},
      overallRating: state.trackerModal.tempOverallRating || '',
      role: 'Flex'
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
  const modalTitle = document.getElementById('agent-modal-title');
  const searchInput = document.getElementById('agent-search-input');

  const player = state.lineups[state.activeMapId][playerIndex];
  const playerName = player ? player.name : `Player ${playerIndex + 1}`;

  if (modalSub) modalSub.textContent = `Player: ${playerName}`;
  if (modalTitle) {
    if (slotType === 'titular') modalTitle.textContent = 'ESCOLHER AGENTE TITULAR';
    else if (slotType === 'reserva') modalTitle.textContent = 'ESCOLHER AGENTE RESERVA';
    else if (slotType.startsWith('flex')) modalTitle.textContent = `ESCOLHER AGENTE FLEX (${slotType.toUpperCase()})`;
    else if (slotType.startsWith('top')) modalTitle.textContent = 'ESCOLHER AGENTE MAIS JOGADO (TRACKER)';
    else modalTitle.textContent = 'ESCOLHER AGENTE';
  }
  if (searchInput) searchInput.value = '';

  renderAgentsGrid('all', '');
  renderModalAgentSuggestions(playerIndex, slotType);

  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

window.closeAgentModal = function() {
  const modal = document.getElementById('agent-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
};

// Renderiza os cards de agentes dentro do modal
function renderAgentsGrid(roleFilter = 'all', searchQuery = '') {
  const grid = document.getElementById('agents-grid');
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

  const filtered = ALL_AGENTS.filter(agent => {
    const matchesRole = roleFilter === 'all' || agent.role === roleFilter;
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="col-span-2 sm:col-span-3 text-center py-6 text-xs text-gray-500">Nenhum agente encontrado</div>`;
    return;
  }

  grid.innerHTML = filtered.map(agent => {
    const isSelected = agent.name.toLowerCase() === currentSelection.toLowerCase();
    const isRec = recNames.includes(agent.name.toLowerCase());
    const roleClass = `role-badge-${agent.role.toLowerCase()}`;

    return `
      <button onclick="window.selectAgent('${agent.name}')" 
              class="p-1.5 sm:p-2 rounded-lg border text-left transition-all flex items-center gap-2 group min-w-0 ${isSelected ? 'bg-[#ff4655]/20 border-[#ff4655] shadow-[0_0_12px_rgba(255,70,85,0.35)] ring-1 ring-[#ff4655]' : isRec ? 'bg-[#142132] border-sky-500/40 hover:border-amber-400 hover:bg-[#1a2c42]' : 'bg-[#141e2b] border-[#223347] hover:border-[#ff4655] hover:bg-[#1c2a3d]'}">
        <img src="${agent.icon}" alt="${agent.name}" class="w-8 h-8 sm:w-10 sm:h-10 rounded-md sm:rounded-lg object-cover bg-black/50 border flex-shrink-0 group-hover:scale-105 transition-transform" style="border-color: ${agent.color}" loading="lazy">
        <div class="truncate flex-1 min-w-0">
          <div class="flex items-center gap-1">
            <span class="text-[11px] sm:text-xs font-bold text-white block truncate leading-tight">${agent.name}</span>
            ${isRec ? '<span class="text-[7px] font-bold uppercase font-tactical px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-500/30 flex-shrink-0">★ Meta</span>' : ''}
          </div>
          <span class="text-[8px] sm:text-[9px] font-mono uppercase px-1 py-0.2 rounded inline-block mt-0.5 leading-none ${roleClass}">${agent.role}</span>
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
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const activeBtn = document.querySelector('.role-filter-btn.bg-\\[\\#ff4655\\]');
      const currentRole = activeBtn ? activeBtn.getAttribute('data-role') : 'all';
      renderAgentsGrid(currentRole, e.target.value);
    });
  }

  const roleButtons = document.querySelectorAll('.role-filter-btn');
  roleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      roleButtons.forEach(b => {
        b.className = 'role-filter-btn px-2.5 py-1 rounded bg-[#16202c] text-gray-300 font-tactical text-xs hover:bg-[#202d3e]';
      });
      btn.className = 'role-filter-btn px-2.5 py-1 rounded bg-[#ff4655] text-white font-tactical font-semibold text-xs';

      const role = btn.getAttribute('data-role');
      const searchVal = searchInput ? searchInput.value : '';
      renderAgentsGrid(role, searchVal);
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

  // 2 Reservas
  const reserves = players.slice(5, 7);
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
    const reserves = players.slice(5, 7);
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
      const reserves = players.slice(5, 7);
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
  }
});
})();
