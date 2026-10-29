import type { WorkoutDay, WorkoutCycle, CompletedWorkoutRecord } from '../types/workout';
import { calculateCycleFromDates, calculateEndDateFromWeeks } from './dateUtils';

// Get storage keys scoped to user
function getWorkoutsKey(userId: string): string {
  return `appfit_user_workouts_${userId}`;
}

function getCycleKey(userId: string): string {
  return `appfit_user_cycle_${userId}`;
}

function getSelectedDayKey(userId: string): string {
  return `appfit_user_selected_day_${userId}`;
}

function getAvatarKey(userId: string): string {
  return `appfit_user_avatar_${userId}`;
}

// Load workouts for specific user
export function loadUserWorkouts(userId: string): WorkoutDay[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(getWorkoutsKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore error
  }
  return [];
}

// Save workouts for specific user
export function saveUserWorkouts(userId: string, days: WorkoutDay[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(getWorkoutsKey(userId), JSON.stringify(days));
  } catch {
    // Ignore error
  }
}

// Load cycle for specific user
export function loadUserCycle(userId: string): WorkoutCycle {
  const defaultCycle = () => {
    const today = new Date().toISOString().split('T')[0];
    const end = calculateEndDateFromWeeks(today, 8);
    return calculateCycleFromDates(today, end);
  };

  if (!userId) return defaultCycle();

  try {
    const raw = localStorage.getItem(getCycleKey(userId));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Fallback
  }
  return defaultCycle();
}

// Save cycle for specific user
export function saveUserCycle(userId: string, cycle: WorkoutCycle): void {
  if (!userId) return;
  try {
    localStorage.setItem(getCycleKey(userId), JSON.stringify(cycle));
  } catch {
    // Ignore error
  }
}

// Load selected day for specific user
export function loadUserSelectedDay(userId: string): string {
  if (!userId) return '';
  return localStorage.getItem(getSelectedDayKey(userId)) || '';
}

// Save selected day for specific user
export function saveUserSelectedDay(userId: string, dayId: string): void {
  if (!userId) return;
  localStorage.setItem(getSelectedDayKey(userId), dayId);
}

// Load avatar for specific user
export function loadUserAvatar(userId: string): string | undefined {
  if (!userId) return undefined;
  return localStorage.getItem(getAvatarKey(userId)) || undefined;
}

// Save avatar for specific user
export function saveUserAvatar(userId: string, avatarUrl: string | undefined): void {
  if (!userId) return;
  if (avatarUrl) {
    localStorage.setItem(getAvatarKey(userId), avatarUrl);
  } else {
    localStorage.removeItem(getAvatarKey(userId));
  }
}

// Clear all workouts for specific user
export function clearUserWorkouts(userId: string): void {
  if (!userId) return;
  localStorage.removeItem(getWorkoutsKey(userId));
  localStorage.removeItem(getSelectedDayKey(userId));
}

function getHistoryKey(userId: string): string {
  return `appfit_user_history_${userId}`;
}

export function loadUserWorkoutHistory(userId: string): CompletedWorkoutRecord[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(getHistoryKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore error
  }
  return [];
}

export function saveUserWorkoutHistory(userId: string, history: CompletedWorkoutRecord[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(getHistoryKey(userId), JSON.stringify(history));
  } catch {
    // Ignore error
  }
}

export function addUserWorkoutHistoryRecord(userId: string, record: CompletedWorkoutRecord): void {
  if (!userId) return;
  const existing = loadUserWorkoutHistory(userId);
  const updated = [record, ...existing];
  saveUserWorkoutHistory(userId, updated);
}

// Limpa completa e profundamente qualquer resquício local de um usuário
export function purgeAllUserDataLocally(userId: string, email?: string): void {
  const cleanEmail = email ? email.trim().toLowerCase() : '';

  // 1. Chaves com o ID
  if (userId) {
    localStorage.removeItem(getWorkoutsKey(userId));
    localStorage.removeItem(getCycleKey(userId));
    localStorage.removeItem(getSelectedDayKey(userId));
    localStorage.removeItem(getAvatarKey(userId));
    localStorage.removeItem(getHistoryKey(userId));
  }

  // 2. Chaves com base no e-mail (caso o ID seja construído pelo e-mail)
  if (cleanEmail) {
    const emailSanitized = cleanEmail.replace(/[^a-z0-9]/g, '_');
    localStorage.removeItem(`appfit_user_workouts_google-${emailSanitized}`);
    localStorage.removeItem(`appfit_user_workouts_usr-${emailSanitized}`);
    localStorage.removeItem(`appfit_user_cycle_google-${emailSanitized}`);
    localStorage.removeItem(`appfit_user_cycle_usr-${emailSanitized}`);
    localStorage.removeItem(`appfit_user_selected_day_google-${emailSanitized}`);
    localStorage.removeItem(`appfit_user_selected_day_usr-${emailSanitized}`);
    localStorage.removeItem(`appfit_user_history_google-${emailSanitized}`);
    localStorage.removeItem(`appfit_user_history_usr-${emailSanitized}`);
  }

  // 3. Remove da lista de contas salvas no navegador
  try {
    const raw = localStorage.getItem('appfit_registered_users_v3');
    if (raw) {
      const accounts = JSON.parse(raw);
      const filtered = accounts.filter((a: any) => {
        const idMatches = userId && a.user?.id === userId;
        const emailMatches = cleanEmail && a.user?.email?.toLowerCase() === cleanEmail;
        return !idMatches && !emailMatches;
      });
      localStorage.setItem('appfit_registered_users_v3', JSON.stringify(filtered));
    }
  } catch {
    // Ignore
  }

  // 4. Remove atalho Google salvo neste aparelho
  try {
    const savedGoogle = localStorage.getItem('appfit_device_saved_google');
    if (savedGoogle) {
      const parsed = JSON.parse(savedGoogle);
      if (
        (cleanEmail && parsed.email?.toLowerCase() === cleanEmail) ||
        (userId && parsed.id === userId)
      ) {
        localStorage.removeItem('appfit_device_saved_google');
      }
    }
  } catch {
    // Ignore
  }

  // 5. Remove da sessão corrente se for o mesmo usuário
  try {
    const currentSession = localStorage.getItem('appfit_current_session_user');
    if (currentSession) {
      const parsed = JSON.parse(currentSession);
      if (
        (userId && parsed.id === userId) ||
        (cleanEmail && parsed.email?.toLowerCase() === cleanEmail)
      ) {
        localStorage.removeItem('appfit_current_session_user');
      }
    }
  } catch {
    // Ignore
  }
}
