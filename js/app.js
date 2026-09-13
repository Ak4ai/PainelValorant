import { MAPS_DATA, AGENTS, ALL_AGENTS, DEFAULT_PLAYERS, getAgentColor, getAgentRole } from './data.js';
import { 
  initRealtimeSync, 
  syncSaveData, 
  syncSavePlayer, 
  getLocalData, 
  saveFirebaseConfig, 
  clearFirebaseConfig, 
  getSavedFirebaseConfig,
  getSavedTeamName,
  saveTeamName
} from './firebase-config.js';

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
      ? 'bg-[#ff4655] text-white font-bold border-[#ff4655] shadow-[0_0_12px_rgba(255,70,85,0.4)]' 
      : 'bg-[#101822] text-gray-300 border-[#1e2c3c] hover:bg-[#16212e] hover:border-gray-600';

    return `
      <button onclick="window.switchMap('${map.id}')" 
              class="btn-tactical px-3.5 py-2 text-xs font-tactical rounded border transition-all whitespace-nowrap flex items-center gap-1.5 ${activeClasses}">
        <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${map.accentColor}"></span>
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

  if (titleEl) titleEl.textContent = currentMap.name;
  if (bottomBarMap) bottomBarMap.textContent = currentMap.name;
  if (bannerImg) {
    bannerImg.style.backgroundImage = `url('${currentMap.bgImage}')`;
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
      const roleClass = `role-badge-${role.toLowerCase()}`;
      return `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${roleClass}">
          ${agentName}
        </span>
      `;
    }).join('');

    return `
      <div class="tactical-card p-3 rounded-lg border border-[#203043] flex flex-col justify-between hover:border-[#ff4655]/50 transition">
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <h4 class="font-tactical font-bold text-sm text-white">${build.title}</h4>
            <span class="text-[10px] font-mono uppercase bg-[#182535] text-gray-400 px-2 py-0.5 rounded border border-[#263a50]">${build.tag}</span>
          </div>
          
          <div class="flex flex-wrap gap-1.5 my-2">
            ${agentsListHtml}
          </div>
        </div>

        <button onclick="window.applyBuildToTeam(${index})" 
                class="btn-tactical mt-2 w-full py-1.5 px-2 bg-[#162230] hover:bg-[#ff4655] hover:text-white text-gray-300 text-xs font-tactical font-bold rounded border border-[#2a3e54] transition flex items-center justify-center gap-1.5 group">
          <svg class="w-3.5 h-3.5 text-[#ff4655] group-hover:text-white transition" fill="currentColor" viewBox="0 0 20 20">
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

    return `
      <div class="tactical-card p-3 sm:p-4 rounded-lg border border-[#203043] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        <!-- Identificador & Nome da Jogadora -->
        <div class="flex items-center gap-2.5 min-w-[200px]">
          <div class="w-7 h-7 rounded bg-[#162332] border border-[#283b50] flex items-center justify-center font-tactical font-bold text-xs text-[#ff4655]">
            P${player.id}
          </div>
          <div class="flex-1">
            <input type="text" value="${escapeHtml(player.name || `Player ${player.id}`)}" 
                   onchange="window.updatePlayerName(${index}, this.value)"
                   placeholder="Nome da Jogadora"
                   class="w-full bg-[#0d141e] border border-[#223347] focus:border-[#ff4655] rounded px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-white focus:outline-none transition">
          </div>
        </div>

        <!-- Seleção de Agentes (Titular e Reserva) -->
        <div class="grid grid-cols-2 gap-2 flex-1 max-w-xl">
          
          <!-- Botão Agente Titular -->
          <div>
            <label class="text-[10px] uppercase font-tactical tracking-wider text-gray-400 block mb-1">
              Agente Titular ⭐
            </label>
            <button onclick="window.openAgentModal(${index}, 'titular')" 
                    class="w-full flex items-center justify-between p-2 rounded bg-[#0d141e] border ${titularAgent ? 'border-[#ff4655]/50 shadow-[0_0_8px_rgba(255,70,85,0.15)]' : 'border-[#223347]'} hover:border-[#ff4655] transition text-left">
              <div class="flex items-center gap-2 truncate">
                <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${titularAgent ? getAgentColor(titularAgent) : '#4b5563'}"></span>
                <span class="text-xs font-semibold ${titularAgent ? 'text-white' : 'text-gray-400'} truncate">
                  ${titularAgent || 'Selecionar...'}
                </span>
              </div>
              ${titularRole ? `<span class="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#1a2636] text-gray-300">${titularRole}</span>` : ''}
            </button>
          </div>

          <!-- Botão Agente Reserva -->
          <div>
            <label class="text-[10px] uppercase font-tactical tracking-wider text-gray-400 block mb-1">
              Agente Reserva 🔄
            </label>
            <button onclick="window.openAgentModal(${index}, 'reserva')" 
                    class="w-full flex items-center justify-between p-2 rounded bg-[#0d141e] border ${reservaAgent ? 'border-[#00f5d4]/40 shadow-[0_0_8px_rgba(0,245,212,0.1)]' : 'border-[#223347]'} hover:border-[#00f5d4] transition text-left">
              <div class="flex items-center gap-2 truncate">
                <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${reservaAgent ? getAgentColor(reservaAgent) : '#4b5563'}"></span>
                <span class="text-xs font-semibold ${reservaAgent ? 'text-white' : 'text-gray-400'} truncate">
                  ${reservaAgent || 'Selecionar...'}
                </span>
              </div>
              ${reservaRole ? `<span class="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#1a2636] text-gray-300">${reservaRole}</span>` : ''}
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
    grid.innerHTML = `<div class="col-span-3 text-center py-6 text-xs text-gray-500">Nenhum agente encontrado</div>`;
    return;
  }

  grid.innerHTML = filtered.map(agent => {
    const isSelected = agent.name.toLowerCase() === currentSelection.toLowerCase();
    const roleClass = `role-badge-${agent.role.toLowerCase()}`;

    return `
      <button onclick="window.selectAgent('${agent.name}')" 
              class="p-2.5 rounded-lg border text-left transition flex items-center justify-between gap-2 ${isSelected ? 'bg-[#ff4655]/20 border-[#ff4655] shadow-[0_0_10px_rgba(255,70,85,0.3)]' : 'bg-[#141e2b] border-[#223347] hover:border-[#ff4655] hover:bg-[#1b283a]'}">
        <div class="flex items-center gap-2 truncate">
          <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${agent.color}"></span>
          <span class="text-xs font-bold text-white truncate">${agent.name}</span>
        </div>
        <span class="text-[9px] font-mono px-1 py-0.5 rounded ${roleClass}">${agent.role.slice(0, 4)}</span>
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
