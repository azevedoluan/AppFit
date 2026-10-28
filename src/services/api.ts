import type { User } from '../types/auth';
import type { WorkoutDay, WorkoutCycle, CompletedWorkoutRecord, WeightHistoryEntry } from '../types/workout';

const BASE_URL = '/api';

export const api = {
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
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
    try {
      const res = await fetch(`${BASE_URL}/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, workoutDays, cycle, divisionType })
      });
      return res.ok;
    } catch (err) {
      console.warn('[API] Falha ao salvar treinos no PostgreSQL:', err);
      return false;
    }
  },

  async updateSet(
    userId: string,
    exerciseId: string,
    setId: string,
    completed?: boolean,
    weight?: number
  ): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/workouts/set`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, exerciseId, setId, completed, weight })
      });
      return res.ok;
    } catch (err) {
      console.warn('[API] Falha ao atualizar série no PostgreSQL:', err);
      return false;
    }
  },

  async addSet(userId: string, exerciseId: string, newSet: any): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/workouts/add-set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, exerciseId, newSet })
      });
      return res.ok;
    } catch (err) {
      console.warn('[API] Falha ao adicionar série no PostgreSQL:', err);
      return false;
    }
  },

  async deleteSets(userId: string, exerciseId: string, setIds: string[]): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/workouts/delete-sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, exerciseId, setIds })
      });
      return res.ok;
    } catch (err) {
      console.warn('[API] Falha ao remover séries no PostgreSQL:', err);
      return false;
    }
  },

  async deleteExercise(userId: string, exerciseId: string, workoutDayId?: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/workouts/delete-exercise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, exerciseId, workoutDayId })
      });
      return res.ok;
    } catch (err) {
      console.warn('[API] Falha ao remover exercício no PostgreSQL:', err);
      return false;
    }
  },

  async resetDayProgress(userId: string, dayId: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/workouts/reset-day`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, dayId })
      });
      return res.ok;
    } catch (err) {
      console.warn('[API] Falha ao resetar marcações no PostgreSQL:', err);
      return false;
    }
  },

  async clearAllWorkouts(userId: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/workouts?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (err) {
      console.warn('[API] Falha ao zerar treinos no PostgreSQL:', err);
      return false;
    }
  },

  async saveSession(record: CompletedWorkoutRecord, userId: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...record, userId })
      });
      return res.ok;
    } catch (err) {
      console.warn('[API] Falha ao salvar sessão de treino no PostgreSQL:', err);
      return false;
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
  }
};
