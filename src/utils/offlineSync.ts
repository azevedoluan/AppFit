/**
 * AppFit Offline Synchronization Manager
 * 
 * Permite que o app funcione 100% offline (na academia sem sinal, modo avião, etc.)
 * e garanta que todas as alterações (séries marcadas, cargas, treinos finalizados e perfil)
 * sejam enfileiradas no aparelho e sincronizadas automaticamente com o PostgreSQL
 * assim que a conexão for restabelecida.
 */

export type MutationType =
  | 'saveWorkouts'
  | 'saveSession'
  | 'updateSet'
  | 'addSet'
  | 'deleteSets'
  | 'deleteExercise'
  | 'resetDayProgress'
  | 'clearAllWorkouts'
  | 'updateProfile';

export interface QueuedMutation {
  id: string;
  userId: string;
  type: MutationType;
  payload: any;
  timestamp: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: number | null;
}

const QUEUE_KEY_PREFIX = 'appfit_offline_sync_queue_';

function getQueueKey(userId: string): string {
  return `${QUEUE_KEY_PREFIX}${userId || 'anonymous'}`;
}

// Retorna todas as mutações pendentes para o usuário
export function getOfflineQueue(userId: string): QueuedMutation[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(getQueueKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore JSON error
  }
  return [];
}

// Salva a fila no localStorage
function saveOfflineQueue(userId: string, queue: QueuedMutation[]): void {
  if (!userId) return;
  try {
    if (queue.length === 0) {
      localStorage.removeItem(getQueueKey(userId));
    } else {
      localStorage.setItem(getQueueKey(userId), JSON.stringify(queue));
    }
    notifyListeners(userId);
  } catch {
    // Ignore
  }
}

// Retorna a quantidade de itens aguardando sincronização
export function getPendingCount(userId: string): number {
  return getOfflineQueue(userId).length;
}

// Enfileira uma mutação para envio posterior
export function enqueueOfflineMutation(userId: string, type: MutationType, payload: any): void {
  if (!userId) return;

  const currentQueue = getOfflineQueue(userId);

  // Otimização 1: Se for saveWorkouts, substitui saveWorkouts anteriores (pois é um snapshot completo)
  if (type === 'saveWorkouts') {
    const filtered = currentQueue.filter(item => item.type !== 'saveWorkouts');
    filtered.push({
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      type,
      payload,
      timestamp: Date.now()
    });
    saveOfflineQueue(userId, filtered);
    return;
  }

  // Otimização 2: Se for updateSet para o mesmo setId, atualiza o item existente na fila
  if (type === 'updateSet' && payload?.setId) {
    const existingIdx = currentQueue.findIndex(
      item => item.type === 'updateSet' && item.payload?.setId === payload.setId
    );
    if (existingIdx >= 0) {
      const existing = currentQueue[existingIdx];
      currentQueue[existingIdx] = {
        ...existing,
        payload: {
          ...existing.payload,
          ...payload,
          // Preserva valores se vierem indefinidos
          completed: payload.completed !== undefined ? payload.completed : existing.payload.completed,
          weight: payload.weight !== undefined ? payload.weight : existing.payload.weight
        },
        timestamp: Date.now()
      };
      saveOfflineQueue(userId, currentQueue);
      return;
    }
  }

  // Otimização 3: Se for updateProfile, mescla com updateProfile anterior
  if (type === 'updateProfile') {
    const existingIdx = currentQueue.findIndex(item => item.type === 'updateProfile');
    if (existingIdx >= 0) {
      currentQueue[existingIdx] = {
        ...currentQueue[existingIdx],
        payload: { ...currentQueue[existingIdx].payload, ...payload },
        timestamp: Date.now()
      };
      saveOfflineQueue(userId, currentQueue);
      return;
    }
  }

  currentQueue.push({
    id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    type,
    payload,
    timestamp: Date.now()
  });

  saveOfflineQueue(userId, currentQueue);
}

// Remove todas as mutações da fila (ex: após limpeza explícita)
export function clearOfflineQueue(userId: string): void {
  saveOfflineQueue(userId, []);
}

// ============================================================================
// STATUS & EVENT EMITTER
// ============================================================================

type StatusListener = (status: SyncStatus) => void;
const listeners = new Set<{ userId: string; cb: StatusListener }>();

let isSyncingState = false;
let lastSyncedAtState: number | null = null;

export function isDeviceOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function notifyListeners(userId: string) {
  const status: SyncStatus = {
    isOnline: isDeviceOnline(),
    isSyncing: isSyncingState,
    pendingCount: getPendingCount(userId),
    lastSyncedAt: lastSyncedAtState
  };

  listeners.forEach(entry => {
    if (entry.userId === userId || !entry.userId) {
      entry.cb(status);
    }
  });
}

export function subscribeToSyncStatus(userId: string, callback: StatusListener): () => void {
  const entry = { userId, cb: callback };
  listeners.add(entry);

  // Notifica imediatamente com estado atual
  callback({
    isOnline: isDeviceOnline(),
    isSyncing: isSyncingState,
    pendingCount: getPendingCount(userId),
    lastSyncedAt: lastSyncedAtState
  });

  return () => {
    listeners.delete(entry);
  };
}

// ============================================================================
// DRAIN QUEUE (Execução real no servidor quando online)
// ============================================================================

// Callback de injeção da API pura para evitar dependência cíclica
let rawApiExecutor: ((type: MutationType, userId: string, payload: any) => Promise<boolean>) | null = null;

export function registerRawApiExecutor(
  executor: (type: MutationType, userId: string, payload: any) => Promise<boolean>
): void {
  rawApiExecutor = executor;
}

export async function drainOfflineQueue(userId: string): Promise<{ success: boolean; processed: number; remaining: number }> {
  if (!userId || !rawApiExecutor) {
    return { success: false, processed: 0, remaining: getPendingCount(userId) };
  }

  if (!isDeviceOnline()) {
    return { success: false, processed: 0, remaining: getPendingCount(userId) };
  }

  const queue = getOfflineQueue(userId);
  if (queue.length === 0) {
    return { success: true, processed: 0, remaining: 0 };
  }

  isSyncingState = true;
  notifyListeners(userId);

  let processed = 0;
  const remainingQueue: QueuedMutation[] = [...queue];

  try {
    while (remainingQueue.length > 0) {
      // Checa se a conexão caiu no meio do processo
      if (!isDeviceOnline()) {
        break;
      }

      const item = remainingQueue[0];

      try {
        const ok = await rawApiExecutor(item.type, userId, item.payload);
        if (ok) {
          // Remove da fila o item processado com sucesso
          remainingQueue.shift();
          processed++;
          saveOfflineQueue(userId, remainingQueue);
        } else {
          // Se o servidor retornou erro de rede/indisponibilidade, interrompe para tentar depois
          break;
        }
      } catch (err) {
        // Falha de rede durante o envio
        console.warn('[Offline Sync] Interrompendo envio devido a falha de conexão:', err);
        break;
      }
    }

    if (processed > 0 && remainingQueue.length === 0) {
      lastSyncedAtState = Date.now();
    }

    return {
      success: remainingQueue.length === 0,
      processed,
      remaining: remainingQueue.length
    };
  } finally {
    isSyncingState = false;
    notifyListeners(userId);
  }
}

// Configura listeners de rede no navegador (window online/offline)
export function initOfflineSync(getUserId: () => string | undefined): void {
  if (typeof window === 'undefined') return;

  const handleOnline = async () => {
    console.log('[Offline Sync] Conexão restabelecida. Drenando fila de alterações...');
    const userId = getUserId();
    if (userId) {
      notifyListeners(userId);
      await drainOfflineQueue(userId);
    }
  };

  const handleOffline = () => {
    console.log('[Offline Sync] Dispositivo desconectado da rede. Modo offline ativado.');
    const userId = getUserId();
    if (userId) {
      notifyListeners(userId);
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Drena na inicialização caso haja pendências guardadas e o celular já esteja online
  setTimeout(() => {
    const userId = getUserId();
    if (userId && isDeviceOnline() && getPendingCount(userId) > 0) {
      drainOfflineQueue(userId);
    }
  }, 2000);
}
