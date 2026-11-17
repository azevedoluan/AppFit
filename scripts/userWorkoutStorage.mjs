// src/utils/dateUtils.ts
function calculateCycleFromDates(startDateStr, endDateStr) {
  const start = /* @__PURE__ */ new Date(startDateStr + "T00:00:00");
  const end = /* @__PURE__ */ new Date(endDateStr + "T23:59:59");
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = Math.max(0, end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
  const durationWeeks = Math.max(1, Math.round(diffDays / 7));
  const durationMonths = Math.max(0.5, Math.round(diffDays / 30.4375 * 10) / 10);
  const isActive = today >= start && today <= end;
  return {
    startDate: startDateStr,
    endDate: endDateStr,
    durationWeeks,
    durationMonths,
    isActive
  };
}
function calculateEndDateFromWeeks(startDateStr, weeks) {
  const start = /* @__PURE__ */ new Date(startDateStr + "T00:00:00");
  const end = new Date(start.getTime() + weeks * 7 * 24 * 60 * 60 * 1e3);
  return end.toISOString().split("T")[0];
}

// src/utils/userWorkoutStorage.ts
function getWorkoutsKey(userId) {
  return `appfit_user_workouts_${userId}`;
}
function getCycleKey(userId) {
  return `appfit_user_cycle_${userId}`;
}
function getSelectedDayKey(userId) {
  return `appfit_user_selected_day_${userId}`;
}
function getAvatarKey(userId) {
  return `appfit_user_avatar_${userId}`;
}
function getActiveSessionKey(userId) {
  return `appfit_active_session_${userId}`;
}
function saveUserActiveSession(userId, session) {
  if (!userId) return;
  try {
    if (!session || !session.isWorkoutActive) {
      localStorage.removeItem(getActiveSessionKey(userId));
    } else {
      localStorage.setItem(getActiveSessionKey(userId), JSON.stringify(session));
    }
  } catch {
  }
}
function loadUserActiveSession(userId) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(getActiveSessionKey(userId));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
  }
  return null;
}
function mergeWorkoutsPreservingLocal(localDays, remoteDays) {
  if (!remoteDays || remoteDays.length === 0) return localDays;
  if (!localDays || localDays.length === 0) return remoteDays;
  return remoteDays.map((remoteDay) => {
    const localDay = localDays.find((d) => d.id === remoteDay.id || d.dayCode === remoteDay.dayCode);
    if (!localDay) return remoteDay;
    return {
      ...remoteDay,
      exercises: remoteDay.exercises.map((remoteEx) => {
        const localEx = localDay.exercises.find(
          (e) => e.id === remoteEx.id || e.name.trim().toLowerCase() === remoteEx.name.trim().toLowerCase()
        );
        if (!localEx) return remoteEx;
        return {
          ...remoteEx,
          isExpanded: localEx.isExpanded !== void 0 ? localEx.isExpanded : remoteEx.isExpanded,
          metricUnit: localEx.metricUnit || remoteEx.metricUnit,
          metricType: localEx.metricType || remoteEx.metricType,
          sets: remoteEx.sets.map((remoteSet, sIdx) => {
            const localSet = localEx.sets.find(
              (s) => s.id === remoteSet.id || s.setNumber === remoteSet.setNumber
            ) || localEx.sets[sIdx];
            if (!localSet) return remoteSet;
            const completed = localSet.completed || remoteSet.completed;
            const weight = localSet.weight > 0 ? localSet.weight : remoteSet.weight;
            return {
              ...remoteSet,
              completed,
              weight
            };
          })
        };
      })
    };
  });
}
function loadUserWorkouts(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(getWorkoutsKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
  }
  return [];
}
function saveUserWorkouts(userId, days) {
  if (!userId) return;
  try {
    localStorage.setItem(getWorkoutsKey(userId), JSON.stringify(days));
  } catch {
  }
}
function loadUserCycle(userId) {
  const defaultCycle = () => {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
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
  }
  return defaultCycle();
}
function saveUserCycle(userId, cycle) {
  if (!userId) return;
  try {
    localStorage.setItem(getCycleKey(userId), JSON.stringify(cycle));
  } catch {
  }
}
function loadUserSelectedDay(userId) {
  if (!userId) return "";
  return localStorage.getItem(getSelectedDayKey(userId)) || "";
}
function saveUserSelectedDay(userId, dayId) {
  if (!userId) return;
  localStorage.setItem(getSelectedDayKey(userId), dayId);
}
function loadUserAvatar(userId) {
  if (!userId) return void 0;
  return localStorage.getItem(getAvatarKey(userId)) || void 0;
}
function saveUserAvatar(userId, avatarUrl) {
  if (!userId) return;
  if (avatarUrl) {
    localStorage.setItem(getAvatarKey(userId), avatarUrl);
  } else {
    localStorage.removeItem(getAvatarKey(userId));
  }
}
function clearUserWorkouts(userId) {
  if (!userId) return;
  localStorage.removeItem(getWorkoutsKey(userId));
  localStorage.removeItem(getSelectedDayKey(userId));
}
function getHistoryKey(userId) {
  return `appfit_user_history_${userId}`;
}
function loadUserWorkoutHistory(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(getHistoryKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
  }
  return [];
}
function saveUserWorkoutHistory(userId, history) {
  if (!userId) return;
  try {
    localStorage.setItem(getHistoryKey(userId), JSON.stringify(history));
  } catch {
  }
}
function addUserWorkoutHistoryRecord(userId, record) {
  if (!userId) return;
  const existing = loadUserWorkoutHistory(userId);
  const updated = [record, ...existing];
  saveUserWorkoutHistory(userId, updated);
}
function purgeAllUserDataLocally(userId, email) {
  const cleanEmail = email ? email.trim().toLowerCase() : "";
  if (userId) {
    localStorage.removeItem(getWorkoutsKey(userId));
    localStorage.removeItem(getCycleKey(userId));
    localStorage.removeItem(getSelectedDayKey(userId));
    localStorage.removeItem(getAvatarKey(userId));
    localStorage.removeItem(getHistoryKey(userId));
    localStorage.removeItem(getActiveSessionKey(userId));
  }
  if (cleanEmail) {
    const emailSanitized = cleanEmail.replace(/[^a-z0-9]/g, "_");
    localStorage.removeItem(`appfit_user_workouts_google-${emailSanitized}`);
    localStorage.removeItem(`appfit_user_workouts_usr-${emailSanitized}`);
    localStorage.removeItem(`appfit_user_cycle_google-${emailSanitized}`);
    localStorage.removeItem(`appfit_user_cycle_usr-${emailSanitized}`);
    localStorage.removeItem(`appfit_user_selected_day_google-${emailSanitized}`);
    localStorage.removeItem(`appfit_user_selected_day_usr-${emailSanitized}`);
    localStorage.removeItem(`appfit_user_history_google-${emailSanitized}`);
    localStorage.removeItem(`appfit_user_history_usr-${emailSanitized}`);
  }
  try {
    const raw = localStorage.getItem("appfit_registered_users_v3");
    if (raw) {
      const accounts = JSON.parse(raw);
      const filtered = accounts.filter((a) => {
        const idMatches = userId && a.user?.id === userId;
        const emailMatches = cleanEmail && a.user?.email?.toLowerCase() === cleanEmail;
        return !idMatches && !emailMatches;
      });
      localStorage.setItem("appfit_registered_users_v3", JSON.stringify(filtered));
    }
  } catch {
  }
  try {
    const savedGoogle = localStorage.getItem("appfit_device_saved_google");
    if (savedGoogle) {
      const parsed = JSON.parse(savedGoogle);
      if (cleanEmail && parsed.email?.toLowerCase() === cleanEmail || userId && parsed.id === userId) {
        localStorage.removeItem("appfit_device_saved_google");
      }
    }
  } catch {
  }
  try {
    const currentSession = localStorage.getItem("appfit_current_session_user");
    if (currentSession) {
      const parsed = JSON.parse(currentSession);
      if (userId && parsed.id === userId || cleanEmail && parsed.email?.toLowerCase() === cleanEmail) {
        localStorage.removeItem("appfit_current_session_user");
      }
    }
  } catch {
  }
}
export {
  addUserWorkoutHistoryRecord,
  clearUserWorkouts,
  loadUserActiveSession,
  loadUserAvatar,
  loadUserCycle,
  loadUserSelectedDay,
  loadUserWorkoutHistory,
  loadUserWorkouts,
  mergeWorkoutsPreservingLocal,
  purgeAllUserDataLocally,
  saveUserActiveSession,
  saveUserAvatar,
  saveUserCycle,
  saveUserSelectedDay,
  saveUserWorkoutHistory,
  saveUserWorkouts
};
