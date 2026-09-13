// Gerenciador de Sincronização em Tempo Real (Firebase Realtime Database + LocalStorage Fallback)
(() => {
const STORAGE_KEY_CONFIG = 'valorant_lineup_firebase_config';
const STORAGE_KEY_DATA = 'valorant_lineup_local_data';
const STORAGE_KEY_TEAM = 'valorant_lineup_team_name';

// Configuração padrão do projeto fornecida pelo usuário
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDWqTxRoxdYUzhRj9iNOf9KYThWYe0dOWE",
  authDomain: "coachvalorants-ceacc.firebaseapp.com",
  databaseURL: "https://coachvalorants-ceacc-default-rtdb.firebaseio.com",
  projectId: "coachvalorants-ceacc",
  storageBucket: "coachvalorants-ceacc.firebasestorage.app",
  messagingSenderId: "634844411782",
  appId: "1:634844411782:web:d3c80de544360a3a01de07",
  measurementId: "G-K280XM8LTW"
};

let dbInstance = null;
let isConnectedToFirebase = false;
let onSyncCallback = null;

// Retorna a configuração salva ou a configuração padrão do projeto
function getSavedFirebaseConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.apiKey) {
        if (!parsed.databaseURL && parsed.projectId) {
          parsed.databaseURL = `https://${parsed.projectId}-default-rtdb.firebaseio.com`;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler configuração salva:', e);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

function saveFirebaseConfig(configObj) {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(configObj));
    return true;
  } catch (e) {
    console.error('Erro ao salvar configuração do Firebase:', e);
    return false;
  }
}

function clearFirebaseConfig() {
  localStorage.removeItem(STORAGE_KEY_CONFIG);
}

// Inicializa a conexão com o Firebase Realtime Database
function initRealtimeSync(callback) {
  onSyncCallback = callback;
  const config = getSavedFirebaseConfig();

  if (!config || !config.apiKey) {
    console.log('Firebase não configurado ainda. Rodando em modo LocalStorage.');
    loadLocalData();
    return { status: 'offline', message: 'Modo Local (Firebase não configurado)' };
  }

  // Garante que o databaseURL esteja preenchido
  if (!config.databaseURL && config.projectId) {
    config.databaseURL = `https://${config.projectId}-default-rtdb.firebaseio.com`;
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
    }, (error) => {
      console.error('Erro de conexão ou permissão no Firebase Realtime Database:', error);
      updateConnectionStatusBadge(false, 'Ativar Realtime DB no Firebase');
    });

    return { status: 'connected', message: 'Conectado ao Firebase em Tempo Real' };
  } catch (err) {
    console.error('Erro ao inicializar Firebase:', err);
    loadLocalData();
    return { status: 'error', message: err.message };
  }
}

// Salva dados no Firebase e no LocalStorage
function syncSaveData(fullData) {
  saveLocalData(fullData);

  if (dbInstance && isConnectedToFirebase) {
    try {
      dbInstance.ref('valorant_panel').set(fullData);
    } catch (e) {
      console.error('Erro ao salvar no Firebase:', e);
    }
  }

  window.dispatchEvent(new CustomEvent('valorant-local-update', { detail: fullData }));
}

// Salva apenas um jogador de um mapa de forma rápida
function syncSavePlayer(mapId, playerIndex, playerData, allState) {
  if (allState && allState[mapId] && allState[mapId][playerIndex]) {
    allState[mapId][playerIndex] = { ...allState[mapId][playerIndex], ...playerData };
    saveLocalData(allState);
  }

  if (dbInstance && isConnectedToFirebase) {
    try {
      dbInstance.ref(`valorant_panel/lineups/${mapId}/${playerIndex}`).update(playerData);
    } catch (e) {
      console.error('Erro ao atualizar jogador no Firebase:', e);
    }
  }
}

// Persistência local (LocalStorage)
function getLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveLocalData(data) {
  try {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
  } catch (e) {}
}

function getSavedTeamName() {
  return localStorage.getItem(STORAGE_KEY_TEAM) || 'Lineup Feminina Valorant';
}

function saveTeamName(name) {
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

function updateConnectionStatusBadge(isOnline, customLabel) {
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
    text.textContent = customLabel || 'Modo Local (Verificar Nuvem)';
  }
}

// Compatibilidade Universal (Window Global + ES Modules)
window.ValorantSync = {
  DEFAULT_FIREBASE_CONFIG,
  getSavedFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig,
  initRealtimeSync,
  syncSaveData,
  syncSavePlayer,
  getLocalData,
  saveLocalData,
  getSavedTeamName,
  saveTeamName
};
})();
