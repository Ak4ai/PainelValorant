(() => {
const { MAPS_DATA, AGENTS, ALL_AGENTS, DEFAULT_PLAYERS, getAgentColor, getAgentRole, getAgentIcon } = window.ValorantData || {};
const { 
  initRealtimeSync, 
  syncSaveData, 
  syncSavePlayer, 
  getLocalData, 
  saveFirebaseConfig, 
  clearFirebaseConfig, 
  getSavedFirebaseConfig,
  getSavedTeamName,
  saveTeamName
} = window.ValorantSync || {};

// Estado Global da Aplicação
const state = {
  activeMapId: 'ascent',
  teamName: getSavedTeamName(),
  lineups: {}, // Estrutura: { ascent: [ {id, name, titular, reserva}, ... ], haven: [...] }
  activeModal: {
    playerIndex: null,
    agentSlot: null // 'titular' ou 'reserva'
  },
  whatsappView: 'current' // 'current' ou 'all'
};

// Inicializa a estrutura de lineups com os dados padrão se não existirem
function initializeDefaultLineups() {
  const local = getLocalData();
  if (local && typeof local === 'object') {
    state.lineups = local.lineups || local;
    if (local.meta && local.meta.teamName) {
      state.teamName = local.meta.teamName;
    }
  }

  // Garante que cada mapa tenha 5 jogadoras inicializadas
  MAPS_DATA.forEach(map => {
    if (!state.lineups[map.id] || !Array.isArray(state.lineups[map.id]) || state.lineups[map.id].length !== 5) {
      state.lineups[map.id] = DEFAULT_PLAYERS.map(p => ({ ...p }));
    }
  });
}

// Inicialização Principal
document.addEventListener('DOMContentLoaded', () => {
  initializeDefaultLineups();
  setupTeamNameInput();
  renderMapTabs();
  renderActiveMap();
  setupAgentModalFilters();

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
          changed = true;
        }
      });
      if (changed) {
        renderPlayersList();
      }
    }

    if (remoteData.meta && remoteData.meta.teamName) {
      state.teamName = remoteData.meta.teamName;
      const teamInput = document.getElementById('team-name-input');
      if (teamInput && document.activeElement !== teamInput) {
        teamInput.value = state.teamName;
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

// Renderiza as Tabs dos Mapas
function renderMapTabs() {
  const container = document.getElementById('map-tabs-list');
  if (!container) return;

  container.innerHTML = MAPS_DATA.map(map => {
    const isActive = map.id === state.activeMapId;
    const activeClasses = isActive 
      ? 'bg-[#ff4655] text-white font-bold border-[#ff4655] shadow-[0_0_15px_rgba(255,70,85,0.45)] ring-1 ring-white/30' 
      : 'bg-[#101822] text-gray-300 border-[#1e2c3c] hover:bg-[#16212e] hover:border-gray-500';

    return `
      <button onclick="window.switchMap('${map.id}')" 
              class="btn-tactical px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-tactical rounded border transition-all whitespace-nowrap flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ${activeClasses}">
        <img src="${map.listViewIcon}" alt="${map.name}" class="w-6 h-3.5 sm:w-8 sm:h-4 object-cover rounded border border-white/20 shadow-sm flex-shrink-0" loading="lazy">
        <span>${map.name}</span>
      </button>
    `;
  }).join('');
}

// Troca de Mapa
window.switchMap = function(mapId) {
  state.activeMapId = mapId;
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

  if (titleEl) titleEl.textContent = currentMap.name;
  if (bottomBarMap) bottomBarMap.textContent = currentMap.name;
  if (bannerImg) {
    bannerImg.style.backgroundImage = `url('${currentMap.splash}')`;
  }
  if (mapIconThumb) {
    mapIconThumb.src = currentMap.listViewIcon;
    mapIconThumb.alt = currentMap.name;
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

// Reseta a build (titulares e reservas) dos 5 jogadores no mapa atual
window.resetCurrentMapBuild = function() {
  const currentMap = MAPS_DATA.find(m => m.id === state.activeMapId) || { name: state.activeMapId };
  const currentPlayers = state.lineups[state.activeMapId];

  if (!currentPlayers || !Array.isArray(currentPlayers)) return;

  const hasPicks = currentPlayers.some(p => (p.titular && p.titular.trim() !== '') || (p.reserva && p.reserva.trim() !== ''));
  if (!hasPicks) {
    showToast(`O mapa ${currentMap.name} já está sem agentes definidos.`, 'info');
    return;
  }

  const confirmed = window.confirm(`Deseja limpar todos os agentes (Titulares e Reservas) escalados no mapa ${currentMap.name}?\n\nOs nomes das jogadoras serão mantidos.`);
  if (!confirmed) return;

  currentPlayers.forEach(p => {
    p.titular = '';
    p.reserva = '';
  });

  saveCurrentState();
  renderPlayersList();
  showToast(`Build de ${currentMap.name} resetada com sucesso!`, 'info');
};

// Renderiza a lista dos 5 Jogadores no Mapa
function renderPlayersList() {
  const container = document.getElementById('players-list-container');
  if (!container) return;

  const players = state.lineups[state.activeMapId] || DEFAULT_PLAYERS;

  container.innerHTML = players.map((player, index) => {
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

    return `
      <div class="tactical-card p-2.5 sm:p-3.5 rounded-lg border border-[#203043] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 w-full min-w-0">
        
        <!-- Identificador & Nome da Jogadora -->
        <div class="flex items-center gap-2 w-full md:w-56 flex-shrink-0 min-w-0">
          <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#162332] border border-[#283b50] flex items-center justify-center font-tactical font-bold text-xs sm:text-sm text-[#ff4655] shadow-inner flex-shrink-0">
            P${player.id}
          </div>
          <div class="flex-1 min-w-0">
            <input type="text" value="${escapeHtml(player.name || `Player ${player.id}`)}" 
                   onchange="window.updatePlayerName(${index}, this.value)"
                   placeholder="Nome da Jogadora"
                   class="w-full bg-[#0d141e] border border-[#223347] focus:border-[#ff4655] rounded px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-white focus:outline-none transition truncate">
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
}

// Atualiza o nome da jogadora
window.updatePlayerName = function(playerIndex, newName) {
  const currentPlayers = state.lineups[state.activeMapId];
  if (!currentPlayers || !currentPlayers[playerIndex]) return;

  currentPlayers[playerIndex].name = newName.trim() || `Player ${playerIndex + 1}`;
  saveCurrentState();
  syncSavePlayer(state.activeMapId, playerIndex, currentPlayers[playerIndex], state.lineups);
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
  if (modalTitle) modalTitle.textContent = slotType === 'titular' ? 'ESCOLHER AGENTE TITULAR' : 'ESCOLHER AGENTE RESERVA';
  if (searchInput) searchInput.value = '';

  renderAgentsGrid('all', '');

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

  const currentSelection = state.lineups[state.activeMapId]?.[state.activeModal.playerIndex]?.[state.activeModal.agentSlot] || '';

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
    const roleClass = `role-badge-${agent.role.toLowerCase()}`;

    return `
      <button onclick="window.selectAgent('${agent.name}')" 
              class="p-1.5 sm:p-2 rounded-lg border text-left transition-all flex items-center gap-2 group min-w-0 ${isSelected ? 'bg-[#ff4655]/20 border-[#ff4655] shadow-[0_0_12px_rgba(255,70,85,0.35)] ring-1 ring-[#ff4655]' : 'bg-[#141e2b] border-[#223347] hover:border-[#ff4655] hover:bg-[#1c2a3d]'}">
        <img src="${agent.icon}" alt="${agent.name}" class="w-8 h-8 sm:w-10 sm:h-10 rounded-md sm:rounded-lg object-cover bg-black/50 border flex-shrink-0 group-hover:scale-105 transition-transform" style="border-color: ${agent.color}" loading="lazy">
        <div class="truncate flex-1 min-w-0">
          <span class="text-[11px] sm:text-xs font-bold text-white block truncate leading-tight">${agent.name}</span>
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

  currentPlayers[playerIndex][agentSlot] = agentName;
  saveCurrentState();
  syncSavePlayer(state.activeMapId, playerIndex, currentPlayers[playerIndex], state.lineups);

  renderPlayersList();
  closeAgentModal();
  showToast(`${agentName} definido como ${agentSlot}!`, 'success');
};

// Limpa seleção do agente atual
window.clearSelectedAgent = function() {
  const { playerIndex, agentSlot } = state.activeModal;
  if (playerIndex === null || !agentSlot) return;

  const currentPlayers = state.lineups[state.activeMapId];
  if (!currentPlayers || !currentPlayers[playerIndex]) return;

  currentPlayers[playerIndex][agentSlot] = '';
  saveCurrentState();
  syncSavePlayer(state.activeMapId, playerIndex, currentPlayers[playerIndex], state.lineups);

  renderPlayersList();
  closeAgentModal();
  showToast('Agente removido', 'info');
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
  const btnAll = document.getElementById('tab-btn-all-maps');
  const preview = document.getElementById('whatsapp-preview-text');

  if (viewMode === 'current') {
    btnCurrent.className = 'px-3 py-1 text-xs font-tactical font-bold rounded bg-[#ff4655] text-white';
    btnAll.className = 'px-3 py-1 text-xs font-tactical font-bold rounded bg-[#16202c] text-gray-300 hover:bg-[#223142]';
    preview.value = generateWhatsappMapText(state.activeMapId);
  } else {
    btnAll.className = 'px-3 py-1 text-xs font-tactical font-bold rounded bg-[#ff4655] text-white';
    btnCurrent.className = 'px-3 py-1 text-xs font-tactical font-bold rounded bg-[#16202c] text-gray-300 hover:bg-[#223142]';
    preview.value = generateWhatsappAllMapsText();
  }
};

function generateWhatsappMapText(mapId) {
  const mapData = MAPS_DATA.find(m => m.id === mapId) || MAPS_DATA[0];
  const players = state.lineups[mapId] || DEFAULT_PLAYERS;

  let text = `🎯 *LINEUP VALORANT* 🎯\n`;
  text += `🏆 *Equipe:* ${state.teamName}\n`;
  text += `📍 *Mapa:* ${mapData.name.toUpperCase()}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;

  players.forEach((p, idx) => {
    const titular = p.titular || 'Não definido';
    const reserva = p.reserva ? `(Res: ${p.reserva})` : '';
    text += `${idx + 1}️⃣ *${p.name || `Player ${idx + 1}`}:* ${titular} ${reserva}\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `⚡ _Painel Tático Atualizado_`;
  return text;
}

function generateWhatsappAllMapsText() {
  let text = `🎯 *ESCALAÇÃO COMPLETA VALORANT* 🎯\n`;
  text += `🏆 *Equipe:* ${state.teamName}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  MAPS_DATA.forEach(map => {
    text += `📍 *MAPA: ${map.name.toUpperCase()}*\n`;
    const players = state.lineups[map.id] || DEFAULT_PLAYERS;
    players.forEach((p, idx) => {
      const titular = p.titular || '-';
      const reserva = p.reserva ? `[Res: ${p.reserva}]` : '';
      text += `• *${p.name || `P${idx + 1}`}:* ${titular} ${reserva}\n`;
    });
    text += `\n`;
  });

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
  if (!textarea) return;

  const rawText = textarea.value.trim();
  if (!rawText) {
    showToast('Por favor, cole a configuração do Firebase.', 'error');
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
})();
