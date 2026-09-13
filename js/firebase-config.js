// Gerenciador de Sincronização em Tempo Real (Firebase Realtime Database + LocalStorage Fallback)

const STORAGE_KEY_CONFIG = 'valorant_lineup_firebase_config';
const STORAGE_KEY_DATA = 'valorant_lineup_local_data';
const STORAGE_KEY_TEAM = 'valorant_lineup_team_name';

let dbInstance = null;
let isConnectedToFirebase = false;
let onSyncCallback = null;

// Configuração padrão que pode ser substituída pelo usuário na tela ou via localStorage
export function getSavedFirebaseConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Erro ao ler configuração salva:', e);
  }
  return null;
}

export function saveFirebaseConfig(configObj) {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(configObj));
    return true;
  } catch (e) {
    console.error('Erro ao salvar configuração do Firebase:', e);
    return false;
  }
}

export function clearFirebaseConfig() {
  localStorage.removeItem(STORAGE_KEY_CONFIG);
}

// Inicializa a conexão com o Firebase Realtime Database
export function initRealtimeSync(callback) {
  onSyncCallback = callback;
  const config = getSavedFirebaseConfig();

  if (!config || !config.apiKey || !config.databaseURL) {
    console.log('Firebase não configurado ainda. Rodando em modo LocalStorage.');
    loadLocalData();
    return { status: 'offline', message: 'Modo Local (Firebase não configurado)' };
  }

  try {
    if (!window.firebase) {
      console.warn('SDK do Firebase não carregado.');
      loadLocalData();
      return { status: 'offline', message: 'SDK Firebase indisponível' };
    }

    // Inicializa ou reutiliza app
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(config);
    }

    dbInstance = window.firebase.database();

    // Escuta estado de conexão do Firebase
    const connectedRef = dbInstance.ref('.info/connected');
    connectedRef.on('value', (snap) => {
      if (snap.val() === true) {
        isConnectedToFirebase = true;
        updateConnectionStatusBadge(true);
      } else {
        isConnectedToFirebase = false;
        updateConnectionStatusBadge(false);
      }
    });

    // Escuta alterações na árvore de dados 'lineups'
    const lineupsRef = dbInstance.ref('valorant_panel');
    lineupsRef.on('value', (snapshot) => {
      const val = snapshot.val();
      if (val) {
        // Salva backup local
        saveLocalData(val);
        if (typeof onSyncCallback === 'function') {
          onSyncCallback(val, 'firebase');
        }
      } else {
        // Se o banco estiver vazio, publica o estado local inicial
        const local = getLocalData();
        if (local) {
          lineupsRef.set(local);
        }
      }
    });

    return { status: 'connected', message: 'Conectado ao Firebase em Tempo Real' };
  } catch (err) {
    console.error('Erro ao inicializar Firebase:', err);
    loadLocalData();
    return { status: 'error', message: err.message };
  }
}

// Salva dados no Firebase e no LocalStorage
export function syncSaveData(fullData) {
  // Salva no LocalStorage sempre como garantia
  saveLocalData(fullData);

  if (dbInstance && isConnectedToFirebase) {
    try {
      dbInstance.ref('valorant_panel').set(fullData);
    } catch (e) {
      console.error('Erro ao salvar no Firebase:', e);
    }
  }

  // Notifica outras abas no mesmo navegador via StorageEvent
  window.dispatchEvent(new CustomEvent('valorant-local-update', { detail: fullData }));
}

// Salva apenas um jogador de um mapa de forma rápida
export function syncSavePlayer(mapId, playerIndex, playerData, allState) {
  // Atualiza no estado completo local
  if (allState && allState[mapId] && allState[mapId][playerIndex]) {
    allState[mapId][playerIndex] = { ...allState[mapId][playerIndex], ...playerData };
    saveLocalData(allState);
  }

  if (dbInstance && isConnectedToFirebase) {
    try {
      dbInstance.ref(`valorant_panel/${mapId}/${playerIndex}`).update(playerData);
    } catch (e) {
      console.error('Erro ao atualizar jogador no Firebase:', e);
    }
  }
}

// Persistência local (LocalStorage)
export function getLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveLocalData(data) {
  try {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
  } catch (e) {}
}

export function getSavedTeamName() {
  return localStorage.getItem(STORAGE_KEY_TEAM) || 'Lineup Feminina Valorant';
}

export function saveTeamName(name) {
  localStorage.setItem(STORAGE_KEY_TEAM, name);
  if (dbInstance && isConnectedToFirebase) {
    try {
      dbInstance.ref('valorant_panel/meta/teamName').set(name);
    } catch (e) {}
  }
}

function loadLocalData() {
  const local = getLocalData();
  if (local && typeof onSyncCallback === 'function') {
    onSyncCallback(local, 'local');
  }
  updateConnectionStatusBadge(false);
}

function updateConnectionStatusBadge(isOnline) {
  const badge = document.getElementById('connection-status-pill');
  const dot = document.getElementById('connection-status-dot');
  const text = document.getElementById('connection-status-text');

  if (!badge || !dot || !text) return;

  if (isOnline) {
    badge.className = 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]';
    dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
    text.textContent = 'Tempo Real Ativo';
  } else {
    badge.className = 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/60 border border-amber-500/40 text-amber-300 hover:bg-amber-900/60 cursor-pointer transition';
    dot.className = 'w-2 h-2 rounded-full bg-amber-400';
    text.textContent = 'Modo Local (Configurar Nuvem)';
  }
}
