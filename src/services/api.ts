import type { User } from '../types/auth';
import type { WorkoutDay, WorkoutCycle, CompletedWorkoutRecord, WeightHistoryEntry } from '../types/workout';
import {
  enqueueOfflineMutation,
  isDeviceOnline,
  registerRawApiExecutor
} from '../utils/offlineSync';

const BASE_URL = '/api';

/**
 * Chamadas diretas HTTP à API sem enfileiramento automático
 * (usadas internamente pelo drenador de fila offline).
 */
export const rawApi = {
  async updateProfile(userId: string, data: { name?: string; avatarUrl?: string }): Promise<User | null> {
    const res = await fetch(`${BASE_URL}/users/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...data }),
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error('Erro ao atualizar perfil');
    return await res.json();
  },

  async saveWorkouts(
    userId: string,
    workoutDays: WorkoutDay[],
    cycle?: WorkoutCycle | null,
    divisionType?: string
  ): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, workoutDays, cycle, divisionType }),
      signal: AbortSignal.timeout(12000)
    });
    return res.ok;
  },

  async updateSet(
    userId: string,
    exerciseId: string,
    setId: string,
    completed?: boolean,
    weight?: number
  ): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/workouts/set`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, exerciseId, setId, completed, weight }),
      signal: AbortSignal.timeout(8000)
    });
    return res.ok;
  },

  async addSet(userId: string, exerciseId: string, newSet: any): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/workouts/add-set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, exerciseId, newSet }),
      signal: AbortSignal.timeout(8000)
    });
    return res.ok;
  },

  async deleteSets(userId: string, exerciseId: string, setIds: string[]): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/workouts/delete-sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, exerciseId, setIds }),
      signal: AbortSignal.timeout(8000)
    });
    return res.ok;
  },

  async deleteExercise(userId: string, exerciseId: string, workoutDayId?: string): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/workouts/delete-exercise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, exerciseId, workoutDayId }),
      signal: AbortSignal.timeout(8000)
    });
    return res.ok;
  },

  async resetDayProgress(userId: string, dayId: string): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/workouts/reset-day`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, dayId }),
      signal: AbortSignal.timeout(8000)
    });
    return res.ok;
  },

  async clearAllWorkouts(userId: string): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/workouts?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(8000)
    });
    return res.ok;
  },

  async saveSession(record: CompletedWorkoutRecord, userId: string): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...record, userId }),
      signal: AbortSignal.timeout(10000)
    });
    return res.ok;
  }
};

// Registra executor para o motor de sincronização offline
registerRawApiExecutor(async (type, userId, payload) => {
  switch (type) {
    case 'saveWorkouts':
      return await rawApi.saveWorkouts(userId, payload.workoutDays, payload.cycle, payload.divisionType);
    case 'saveSession':
      return await rawApi.saveSession(payload.record || payload, userId);
    case 'updateSet':
      return await rawApi.updateSet(userId, payload.exerciseId, payload.setId, payload.completed, payload.weight);
    case 'addSet':
      return await rawApi.addSet(userId, payload.exerciseId, payload.newSet);
    case 'deleteSets':
      return await rawApi.deleteSets(userId, payload.exerciseId, payload.setIds);
    case 'deleteExercise':
      return await rawApi.deleteExercise(userId, payload.exerciseId, payload.workoutDayId);
    case 'resetDayProgress':
      return await rawApi.resetDayProgress(userId, payload.dayId);
    case 'clearAllWorkouts':
      return await rawApi.clearAllWorkouts(userId);
    case 'updateProfile':
      return (await rawApi.updateProfile(userId, payload)) !== null;
    default:
      return false;
  }
});

export const api = {
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  },

  async sendVerificationCode(email: string, code: string, name?: string): Promise<{ success: boolean; simulated?: boolean; error?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/auth/send-verification-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, name })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Erro ao enviar código de verificação por e-mail' };
      }
      return { success: true, simulated: Boolean(data.simulated) };
    } catch (err: any) {
      console.warn('[API] Falha de conexão ao enviar código:', err);
      return { success: true, simulated: true, error: err.message };
    }
  },

  async analyzeWorkoutImage(imageBase64: string): Promise<{ text: string; days: WorkoutDay[]; confidence?: number } | null> {
    try {
      const res = await fetch(`${BASE_URL}/ocr/analyze-workout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getUsers(): Promise<User[]> {
    try {
      const res = await fetch(`${BASE_URL}/users`);
      if (!res.ok) throw new Error('Erro ao listar usuários');
      return await res.json();
    } catch (err) {
      console.warn('[API] Falha ao buscar usuários do PostgreSQL:', err);
      return [];
    }
  },

  async checkUser(params: { email?: string; userId?: string }): Promise<{ exists: boolean; user?: any; networkError?: boolean }> {
    try {
      const query = new URLSearchParams();
      if (params.email) query.set('email', params.email);
      if (params.userId) query.set('userId', params.userId);
      const res = await fetch(`${BASE_URL}/users/check?${query.toString()}`);
      if (!res.ok) {
        // Erro HTTP (servidor ocupado, 502/503) -> não é confirmação de deleção
        return { exists: true, networkError: true };
      }
      const data = await res.json();
      return {
        exists: Boolean(data.exists),
        user: data.user,
        networkError: false
      };
    } catch (err) {
      // Falha de rede (ex: Safari acordando do repouso, celular sem sinal)
      console.warn('[API] Falha de conexão ao checar usuário (offline/standby):', err);
      return { exists: true, networkError: true };
    }
  },

  async syncUser(user: User): Promise<User> {
    try {
      const res = await fetch(`${BASE_URL}/users/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (!res.ok) throw new Error('Erro ao sincronizar usuário no PostgreSQL');
      return await res.json();
    } catch (err) {
      console.warn('[API] Falha ao sincronizar usuário:', err);
      return user;
    }
  },

  async updateProfile(userId: string, data: { name?: string; avatarUrl?: string }): Promise<User | null> {
    if (!isDeviceOnline()) {
      enqueueOfflineMutation(userId, 'updateProfile', data);
      return null;
    }
    try {
      return await rawApi.updateProfile(userId, data);
    } catch (err) {
      console.warn('[API] Falha de conexão ao atualizar perfil. Enfileirando offline:', err);
      enqueueOfflineMutation(userId, 'updateProfile', data);
      return null;
    }
  },

  async getWorkouts(userId: string): Promise<{
    workoutDays: WorkoutDay[];
    cycle: WorkoutCycle | null;
    divisionType?: string;
  } | null> {
    try {
      const res = await fetch(`${BASE_URL}/workouts?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Erro ao buscar treinos');
      return await res.json();
    } catch (err) {
      console.warn('[API] Falha ao carregar treinos do PostgreSQL:', err);
      return null;
    }
  },

  async saveWorkouts(
    userId: string,
    workoutDays: WorkoutDay[],
    cycle?: WorkoutCycle | null,
    divisionType?: string
  ): Promise<boolean> {
    if (!isDeviceOnline()) {
      enqueueOfflineMutation(userId, 'saveWorkouts', { workoutDays, cycle, divisionType });
      return true;
    }
    try {
      const ok = await rawApi.saveWorkouts(userId, workoutDays, cycle, divisionType);
      if (!ok) {
        enqueueOfflineMutation(userId, 'saveWorkouts', { workoutDays, cycle, divisionType });
      }
      return true;
    } catch (err) {
      console.warn('[API] Falha de conexão ao salvar treinos. Enfileirando offline:', err);
      enqueueOfflineMutation(userId, 'saveWorkouts', { workoutDays, cycle, divisionType });
      return true;
    }
  },

  async updateSet(
    userId: string,
    exerciseId: string,
    setId: string,
    completed?: boolean,
    weight?: number
  ): Promise<boolean> {
    if (!isDeviceOnline()) {
      enqueueOfflineMutation(userId, 'updateSet', { exerciseId, setId, completed, weight });
      return true;
    }
    try {
      const ok = await rawApi.updateSet(userId, exerciseId, setId, completed, weight);
      if (!ok) {
        enqueueOfflineMutation(userId, 'updateSet', { exerciseId, setId, completed, weight });
      }
      return true;
    } catch (err) {
      console.warn('[API] Falha de conexão ao atualizar série. Enfileirando offline:', err);
      enqueueOfflineMutation(userId, 'updateSet', { exerciseId, setId, completed, weight });
      return true;
    }
  },

  async addSet(userId: string, exerciseId: string, newSet: any): Promise<boolean> {
    if (!isDeviceOnline()) {
      enqueueOfflineMutation(userId, 'addSet', { exerciseId, newSet });
      return true;
    }
    try {
      const ok = await rawApi.addSet(userId, exerciseId, newSet);
      if (!ok) {
        enqueueOfflineMutation(userId, 'addSet', { exerciseId, newSet });
      }
      return true;
    } catch (err) {
      console.warn('[API] Falha de conexão ao adicionar série. Enfileirando offline:', err);
      enqueueOfflineMutation(userId, 'addSet', { exerciseId, newSet });
      return true;
    }
  },

  async deleteSets(userId: string, exerciseId: string, setIds: string[]): Promise<boolean> {
    if (!isDeviceOnline()) {
      enqueueOfflineMutation(userId, 'deleteSets', { exerciseId, setIds });
      return true;
    }
    try {
      const ok = await rawApi.deleteSets(userId, exerciseId, setIds);
      if (!ok) {
        enqueueOfflineMutation(userId, 'deleteSets', { exerciseId, setIds });
      }
      return true;
    } catch (err) {
      console.warn('[API] Falha de conexão ao remover séries. Enfileirando offline:', err);
      enqueueOfflineMutation(userId, 'deleteSets', { exerciseId, setIds });
      return true;
    }
  },

  async deleteExercise(userId: string, exerciseId: string, workoutDayId?: string): Promise<boolean> {
    if (!isDeviceOnline()) {
      enqueueOfflineMutation(userId, 'deleteExercise', { exerciseId, workoutDayId });
      return true;
    }
    try {
      const ok = await rawApi.deleteExercise(userId, exerciseId, workoutDayId);
      if (!ok) {
        enqueueOfflineMutation(userId, 'deleteExercise', { exerciseId, workoutDayId });
      }
      return true;
    } catch (err) {
      console.warn('[API] Falha de conexão ao remover exercício. Enfileirando offline:', err);
      enqueueOfflineMutation(userId, 'deleteExercise', { exerciseId, workoutDayId });
      return true;
    }
  },

  async resetDayProgress(userId: string, dayId: string): Promise<boolean> {
    if (!isDeviceOnline()) {
      enqueueOfflineMutation(userId, 'resetDayProgress', { dayId });
      return true;
    }
    try {
      const ok = await rawApi.resetDayProgress(userId, dayId);
      if (!ok) {
        enqueueOfflineMutation(userId, 'resetDayProgress', { dayId });
      }
      return true;
    } catch (err) {
      console.warn('[API] Falha de conexão ao resetar dia. Enfileirando offline:', err);
      enqueueOfflineMutation(userId, 'resetDayProgress', { dayId });
      return true;
    }
  },

  async clearAllWorkouts(userId: string): Promise<boolean> {
    if (!isDeviceOnline()) {
      enqueueOfflineMutation(userId, 'clearAllWorkouts', {});
      return true;
    }
    try {
      const ok = await rawApi.clearAllWorkouts(userId);
      if (!ok) {
        enqueueOfflineMutation(userId, 'clearAllWorkouts', {});
      }
      return true;
    } catch (err) {
      console.warn('[API] Falha de conexão ao zerar treinos. Enfileirando offline:', err);
      enqueueOfflineMutation(userId, 'clearAllWorkouts', {});
      return true;
    }
  },

  async saveSession(record: CompletedWorkoutRecord, userId: string): Promise<boolean> {
    if (!isDeviceOnline()) {
      enqueueOfflineMutation(userId, 'saveSession', { record });
      return true;
    }
    try {
      const ok = await rawApi.saveSession(record, userId);
      if (!ok) {
        enqueueOfflineMutation(userId, 'saveSession', { record });
      }
      return true;
    } catch (err) {
      console.warn('[API] Falha de conexão ao salvar sessão de treino. Enfileirando offline:', err);
      enqueueOfflineMutation(userId, 'saveSession', { record });
      return true;
    }
  },

  async getSessions(userId: string): Promise<CompletedWorkoutRecord[]> {
    try {
      const res = await fetch(`${BASE_URL}/sessions?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Erro ao buscar histórico');
      return await res.json();
    } catch (err) {
      console.warn('[API] Falha ao carregar histórico do PostgreSQL:', err);
      return [];
    }
  },

  async getWeightHistory(userId: string, exerciseId: string): Promise<WeightHistoryEntry[]> {
    try {
      const res = await fetch(
        `${BASE_URL}/history/weight?exerciseId=${encodeURIComponent(exerciseId)}&userId=${encodeURIComponent(userId)}`
      );
      if (!res.ok) throw new Error('Erro ao buscar evolução de peso');
      return await res.json();
    } catch (err) {
      console.warn('[API] Falha ao buscar histórico de peso:', err);
      return [];
    }
  },

  async getSyncVersion(userId: string): Promise<{ version: number; timestamp: number } | null> {
    try {
      const res = await fetch(`${BASE_URL}/sync/version?userId=${encodeURIComponent(userId)}`, {
        signal: AbortSignal.timeout(2000)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  // ==========================================
  // ADMIN API CALLS
  // ==========================================
  async getAdminUsers(): Promise<any[]> {
    try {
      const res = await fetch(`${BASE_URL}/admin/users`);
      if (!res.ok) throw new Error('Erro ao listar usuários no painel admin');
      return await res.json();
    } catch (err) {
      console.warn('[Admin API] Falha ao listar usuários:', err);
      return [];
    }
  },

  async blockUser(targetUserId: string, isBlocked: boolean): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/admin/users/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, isBlocked })
      });
      return res.ok;
    } catch (err) {
      console.warn('[Admin API] Falha ao bloquear/desbloquear usuário:', err);
      return false;
    }
  },

  async deleteUserWorkouts(targetUserId: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/admin/users/delete-workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId })
      });
      return res.ok;
    } catch (err) {
      console.warn('[Admin API] Falha ao apagar treinos do usuário:', err);
      return false;
    }
  },

  async deleteUser(targetUserId: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/admin/users/delete-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId })
      });
      return res.ok;
    } catch (err) {
      console.warn('[Admin API] Falha ao apagar usuário:', err);
      return false;
    }
  },

  async cleanupHistory(options: { targetUserId?: string; olderThanDays?: number; clearAll?: boolean }): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/admin/history/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      return res.ok;
    } catch (err) {
      console.warn('[Admin API] Falha ao limpar históricos:', err);
      return false;
    }
  },

  async resetAllSystemData(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/reset-all`, { method: 'POST' });
      return res.ok;
    } catch (err) {
      console.warn('[Admin API] Falha ao zerar banco:', err);
      return false;
    }
  }
};
