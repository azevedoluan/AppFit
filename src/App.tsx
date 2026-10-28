import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import type { WorkoutDay, WorkoutCycle, CompletedWorkoutRecord } from './types/workout';
import type { User } from './types/auth';
import { AuthScreen } from './components/AuthScreen';
import { Header } from './components/Header';
import { DaySelector } from './components/DaySelector';
import { WorkoutHeader } from './components/WorkoutHeader';
import { ExerciseCard } from './components/ExerciseCard';
import { RestTimer } from './components/RestTimer';
import { ImportModal } from './components/ImportModal';
import { SettingsModal } from './components/SettingsModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { WelcomeUploadScreen } from './components/WelcomeUploadScreen';
import { WorkoutCompletionModal } from './components/WorkoutCompletionModal';
import { WorkoutHistoryCalendarModal } from './components/WorkoutHistoryCalendarModal';
import { Sparkles, FileSpreadsheet, Timer as TimerIcon, Calendar as CalendarIcon } from 'lucide-react';
import { sound } from './utils/sound';
import { wipeAllUsersDatabase } from './utils/authStorage';
import {
  loadUserWorkouts,
  saveUserWorkouts,
  loadUserCycle,
  saveUserCycle,
  loadUserSelectedDay,
  saveUserSelectedDay,
  loadUserAvatar,
  saveUserAvatar,
  clearUserWorkouts,
  loadUserWorkoutHistory,
  addUserWorkoutHistoryRecord
} from './utils/userWorkoutStorage';

export const App: React.FC = () => {
  // Current Authenticated User (Strictly Scoped)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Automatically wipe database for clean testing if not yet performed
    if (!localStorage.getItem('appfit_database_clean_v7')) {
      wipeAllUsersDatabase();
      localStorage.setItem('appfit_database_clean_v7', 'true');
      return null;
    }

    const saved = localStorage.getItem('appfit_current_session_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // User-specific states (loaded dynamically per user)
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [cycle, setCycle] = useState<WorkoutCycle>(() => loadUserCycle(''));
  const [userName, setUserName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [workoutHistory, setWorkoutHistory] = useState<CompletedWorkoutRecord[]>([]);

  // Active Workout Stopwatch State
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [workoutStartedAt, setWorkoutStartedAt] = useState<string>('');
  const [workoutElapsedSeconds, setWorkoutElapsedSeconds] = useState(0);

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [pendingCompletionRecord, setPendingCompletionRecord] = useState<CompletedWorkoutRecord | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Rest Timer State
  const [restTimer, setRestTimer] = useState<{
    isActive: boolean;
    secondsRemaining: number;
    totalDuration: number;
    exerciseName?: string;
  }>({
    isActive: false,
    secondsRemaining: 0,
    totalDuration: 0
  });

  const timerIntervalRef = useRef<number | null>(null);
  const workoutStopwatchIntervalRef = useRef<number | null>(null);

  // Whenever currentUser changes, load that user's specific data
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('appfit_current_session_user', JSON.stringify(currentUser));
      const userWorkouts = loadUserWorkouts(currentUser.id);
      const userCycle = loadUserCycle(currentUser.id);
      const userSelectedDay = loadUserSelectedDay(currentUser.id);
      const userAvatar = currentUser.avatarUrl || loadUserAvatar(currentUser.id);
      const userHistory = loadUserWorkoutHistory(currentUser.id);

      setWorkoutDays(userWorkouts);
      setCycle(userCycle);
      setUserName(currentUser.name);
      setAvatarUrl(userAvatar);
      setWorkoutHistory(userHistory);

      if (userWorkouts.length > 0) {
        const validDay = userWorkouts.some(d => d.id === userSelectedDay)
          ? userSelectedDay
          : userWorkouts[0].id;
        setSelectedDayId(validDay);
      } else {
        setSelectedDayId('');
      }
    } else {
      localStorage.removeItem('appfit_current_session_user');
      setWorkoutDays([]);
      setSelectedDayId('');
      setUserName('');
      setAvatarUrl(undefined);
      setWorkoutHistory([]);
    }
  }, [currentUser]);

  // Workout Stopwatch Interval
  useEffect(() => {
    if (isWorkoutActive) {
      workoutStopwatchIntervalRef.current = window.setInterval(() => {
        setWorkoutElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (workoutStopwatchIntervalRef.current) {
        clearInterval(workoutStopwatchIntervalRef.current);
      }
    }
    return () => {
      if (workoutStopwatchIntervalRef.current) {
        clearInterval(workoutStopwatchIntervalRef.current);
      }
    };
  }, [isWorkoutActive]);

  // Rest Timer Interval
  useEffect(() => {
    if (restTimer.isActive && restTimer.secondsRemaining > 0) {
      timerIntervalRef.current = window.setInterval(() => {
        setRestTimer((prev) => {
          if (prev.secondsRemaining <= 1) {
            sound.playTimerCompleteSound();
            return { ...prev, isActive: false, secondsRemaining: 0 };
          }
          if (prev.secondsRemaining <= 4) {
            sound.playTickSound();
          }
          return { ...prev, secondsRemaining: prev.secondsRemaining - 1 };
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [restTimer.isActive, restTimer.secondsRemaining]);

  // PWA Install Prompt Listener
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Sync workouts to this user's storage whenever modified
  const updateAndSaveWorkouts = (newDays: WorkoutDay[]) => {
    setWorkoutDays(newDays);
    if (currentUser) {
      saveUserWorkouts(currentUser.id, newDays);
    }
  };

  // Sync cycle to this user's storage
  const updateAndSaveCycle = (newCycle: WorkoutCycle) => {
    setCycle(newCycle);
    if (currentUser) {
      saveUserCycle(currentUser.id, newCycle);
    }
  };

  // Sync selected day to this user's storage
  const handleSelectDay = (dayId: string) => {
    setSelectedDayId(dayId);
    if (currentUser) {
      saveUserSelectedDay(currentUser.id, dayId);
    }
  };

  // Sync avatar to this user's storage
  const handleUpdateAvatar = (url: string) => {
    setAvatarUrl(url);
    if (currentUser) {
      saveUserAvatar(currentUser.id, url);
    }
  };

  // Auth Handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsWorkoutActive(false);
  };

  // Workout Session Handlers
  const handleStartWorkout = () => {
    setIsWorkoutActive(true);
    setWorkoutStartedAt(new Date().toISOString());
    setWorkoutElapsedSeconds(0);
  };

  const handleEndWorkoutManually = () => {
    if (confirm('Deseja encerrar o treino agora?')) {
      finishWorkoutSession();
    }
  };

  // Finish Workout Session (Called automatically on last exercise or manually)
  const finishWorkoutSession = (explicitDays?: WorkoutDay[]) => {
    setIsWorkoutActive(false);
    const daysToUse = explicitDays || workoutDays;
    const currentDay = daysToUse.find(d => d.id === selectedDayId) || daysToUse[0];
    if (!currentDay) return;

    const allDaySets = currentDay.exercises.flatMap(e => e.sets);
    const completedDaySets = allDaySets.filter(s => s.completed).length;

    const record: CompletedWorkoutRecord = {
      id: `rec-${Date.now()}`,
      workoutDayId: currentDay.id,
      workoutTitle: currentDay.title,
      dayName: currentDay.dayName,
      startedAt: workoutStartedAt || new Date(Date.now() - Math.max(60, workoutElapsedSeconds) * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: Math.max(1, workoutElapsedSeconds),
      totalSets: allDaySets.length,
      completedSets: completedDaySets,
      exercisesSummary: currentDay.exercises.map(e => ({
        name: e.name,
        completedSets: e.sets.filter(s => s.completed).length,
        maxWeight: Math.max(0, ...e.sets.map(s => s.weight))
      }))
    };

    setPendingCompletionRecord(record);
    setIsCompletionModalOpen(true);

    confetti({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.6 }
    });
    sound.playTimerCompleteSound();
  };

  // Save Record with user comment
  const handleSaveCompletedWorkout = (record: CompletedWorkoutRecord, comment: string) => {
    if (!currentUser) return;
    const finalRecord: CompletedWorkoutRecord = {
      ...record,
      comment: comment || undefined
    };

    addUserWorkoutHistoryRecord(currentUser.id, finalRecord);
    setWorkoutHistory(prev => [finalRecord, ...prev]);
    setIsCompletionModalOpen(false);
    setPendingCompletionRecord(null);
  };

  // Exercise and Sets Handlers
  const handleToggleSet = (exerciseId: string, setId: string) => {
    const updated = workoutDays.map(day => {
      if (day.id !== selectedDayId) return day;
      return {
        ...day,
        exercises: day.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          return {
            ...ex,
            sets: ex.sets.map(set => {
              if (set.id !== setId) return set;
              return { ...set, completed: !set.completed };
            })
          };
        })
      };
    });

    updateAndSaveWorkouts(updated);

    // Check if the workout just finished (all sets marked completed)
    const activeDay = updated.find(d => d.id === selectedDayId);
    if (activeDay) {
      const allSets = activeDay.exercises.flatMap(e => e.sets);
      if (allSets.length > 0 && allSets.every(s => s.completed)) {
        finishWorkoutSession(updated);
      }
    }
  };

  const handleUpdateWeight = (exerciseId: string, setId: string, weight: number) => {
    const updated = workoutDays.map(day => {
      if (day.id !== selectedDayId) return day;
      return {
        ...day,
        exercises: day.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          return {
            ...ex,
            sets: ex.sets.map(set => {
              if (set.id !== setId) return set;
              return { ...set, weight };
            })
          };
        })
      };
    });
    updateAndSaveWorkouts(updated);
  };

  const handleToggleExpand = (exerciseId: string) => {
    const updated = workoutDays.map(day => {
      if (day.id !== selectedDayId) return day;
      return {
        ...day,
        exercises: day.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          return { ...ex, isExpanded: ex.isExpanded === false };
        })
      };
    });
    updateAndSaveWorkouts(updated);
  };

  const handleExpandAll = () => {
    const updated = workoutDays.map(day => {
      if (day.id !== selectedDayId) return day;
      return {
        ...day,
        exercises: day.exercises.map(ex => ({ ...ex, isExpanded: true }))
      };
    });
    updateAndSaveWorkouts(updated);
  };

  const handleCollapseAll = () => {
    const updated = workoutDays.map(day => {
      if (day.id !== selectedDayId) return day;
      return {
        ...day,
        exercises: day.exercises.map(ex => ({ ...ex, isExpanded: false }))
      };
    });
    updateAndSaveWorkouts(updated);
  };

  const handleResetProgress = () => {
    if (confirm('Deseja zerar as marcações de conclusão do treino de hoje? As cargas registradas serão mantidas.')) {
      const updated = workoutDays.map(day => {
        if (day.id !== selectedDayId) return day;
        return {
          ...day,
          exercises: day.exercises.map(ex => ({
            ...ex,
            sets: ex.sets.map(s => ({ ...s, completed: false }))
          }))
        };
      });
      updateAndSaveWorkouts(updated);
      setIsWorkoutActive(false);
      setWorkoutElapsedSeconds(0);
    }
  };

  const handleStartRestTimer = (seconds: number, exerciseName: string) => {
    setRestTimer({
      isActive: true,
      secondsRemaining: seconds,
      totalDuration: seconds,
      exerciseName
    });
  };

  const handleAdjustTimer = (delta: number) => {
    setRestTimer(prev => ({
      ...prev,
      secondsRemaining: Math.max(5, prev.secondsRemaining + delta),
      totalDuration: Math.max(5, prev.totalDuration + delta)
    }));
  };

  const handleCloseTimer = () => {
    setRestTimer(prev => ({ ...prev, isActive: false, secondsRemaining: 0 }));
  };

  const handleAddSet = (exerciseId: string) => {
    const updated = workoutDays.map(day => {
      if (day.id !== selectedDayId) return day;
      return {
        ...day,
        exercises: day.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          const newSetNumber = ex.sets.length + 1;
          const lastSet = ex.sets[ex.sets.length - 1];
          const newSet = {
            id: `set-${Date.now()}-${newSetNumber}`,
            setNumber: newSetNumber,
            targetReps: lastSet?.targetReps || ex.repsDescription,
            weight: lastSet?.weight || 0,
            completed: false
          };
          return {
            ...ex,
            seriesCount: newSetNumber,
            sets: [...ex.sets, newSet]
          };
        })
      };
    });
    updateAndSaveWorkouts(updated);
  };

  const handleDeleteExercise = (exerciseId: string) => {
    if (confirm('Tem certeza que deseja remover este exercício do treino?')) {
      const updated = workoutDays.map(day => {
        if (day.id !== selectedDayId) return day;
        const filtered = day.exercises.filter(ex => ex.id !== exerciseId);
        return {
          ...day,
          subtitle: `${filtered.length} exercícios planejados`,
          exercises: filtered.map((ex, idx) => ({ ...ex, order: idx + 1 }))
        };
      });
      updateAndSaveWorkouts(updated);
    }
  };

  const handleImportWorkoutDays = (newDays: WorkoutDay[]) => {
    updateAndSaveWorkouts(newDays);
    if (newDays.length > 0) {
      handleSelectDay(newDays[0].id);
    }
  };

  const handleClearAllWorkouts = () => {
    if (confirm('Tem certeza que deseja zerar todos os seus treinos atuais para subir um novo?')) {
      if (currentUser) {
        clearUserWorkouts(currentUser.id);
      }
      setWorkoutDays([]);
      setSelectedDayId('');
      setIsWorkoutActive(false);
      setIsSettingsModalOpen(false);
    }
  };

  // Currently selected workout day
  const currentWorkoutDay = workoutDays.find(d => d.id === selectedDayId) || workoutDays[0];

  // Calculate total and completed sets for progress
  const totalSets = currentWorkoutDay?.exercises.reduce((acc, ex) => acc + ex.sets.length, 0) || 0;
  const completedSets = currentWorkoutDay?.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter(s => s.completed).length,
    0
  ) || 0;

  const hasWorkouts = workoutDays.length > 0;

  // Se não estiver logado, exibe tela de autenticação estrita
  if (!currentUser) {
    return (
      <AuthScreen
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col max-w-lg mx-auto relative pb-28 shadow-2xl">
      {/* Top Header com Nome, Espaço de Foto e Ciclo (Oculto se sem treino) */}
      <Header
        userName={userName}
        avatarUrl={avatarUrl}
        onUpdateAvatar={handleUpdateAvatar}
        cycle={cycle}
        totalSets={totalSets}
        completedSets={completedSets}
        onResetProgress={handleResetProgress}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenInstall={() => setIsInstallModalOpen(true)}
        onOpenCalendar={() => setIsHistoryModalOpen(true)}
        isInstallable={!!deferredPrompt}
        hasWorkouts={hasWorkouts}
      />

      {/* Se o usuário já tiver treinos ativos, mostra os dias da semana e os exercícios */}
      {hasWorkouts ? (
        <>
          {/* Week Day & Quick Status Navigator */}
          <DaySelector
            days={workoutDays}
            selectedDayId={selectedDayId}
            onSelectDay={handleSelectDay}
          />

          {/* Current Workout Title, Iniciar Treino e Contagem de Tempo */}
          {currentWorkoutDay && (
            <WorkoutHeader
              workoutDay={currentWorkoutDay}
              onExpandAll={handleExpandAll}
              onCollapseAll={handleCollapseAll}
              onAddExercise={() => setIsImportModalOpen(true)}
              isWorkoutActive={isWorkoutActive}
              elapsedSeconds={workoutElapsedSeconds}
              onStartWorkout={handleStartWorkout}
              onEndWorkout={handleEndWorkoutManually}
            />
          )}

          {/* Exercises List */}
          <main className="px-4 space-y-3 flex-1">
            {currentWorkoutDay?.exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onToggleExpand={handleToggleExpand}
                onUpdateWeight={handleUpdateWeight}
                onToggleSet={handleToggleSet}
                onStartRestTimer={handleStartRestTimer}
                onAddSet={handleAddSet}
                onDeleteExercise={handleDeleteExercise}
              />
            ))}
          </main>
        </>
      ) : (
        /* Se este usuário NÃO tiver treino cadastrado, abre a tela para subir o treino (Foto / Planilha / Manual) */
        <WelcomeUploadScreen
          onWorkoutsLoaded={handleImportWorkoutDays}
          onOpenManualModal={() => setIsImportModalOpen(true)}
        />
      )}

      {/* Floating Action Button / Quick Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div className="max-w-lg mx-auto px-4 pb-4 flex items-center justify-between pointer-events-auto">
          {/* Quick Import Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#0e172a]/90 backdrop-blur-md border border-slate-700/80 text-cyan-300 text-xs font-bold shadow-xl hover:bg-slate-800 active:scale-95 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            <span>Ficha / Imagem</span>
          </button>

          {/* Central Sparkle Action Button */}
          <button
            onClick={() => handleStartRestTimer(60, 'Descanso Rápido')}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-400 text-slate-950 flex items-center justify-center shadow-xl shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-transform border-4 border-[#060a12]"
            title="Temporizador de Descanso"
          >
            <Sparkles className="w-7 h-7 fill-slate-950" />
          </button>

          {/* Quick Calendar / History Button */}
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#0e172a]/90 backdrop-blur-md border border-slate-700/80 text-slate-200 text-xs font-bold shadow-xl hover:bg-slate-800 active:scale-95 transition-all"
          >
            <CalendarIcon className="w-4 h-4 text-teal-400" />
            <span>Histórico</span>
          </button>
        </div>
      </div>

      {/* Active Rest Timer Floating Banner */}
      {restTimer.isActive && (
        <RestTimer
          secondsRemaining={restTimer.secondsRemaining}
          totalDuration={restTimer.totalDuration}
          exerciseName={restTimer.exerciseName}
          onClose={handleCloseTimer}
          onAdjustTime={handleAdjustTimer}
        />
      )}

      {/* Completion Modal with Comment */}
      <WorkoutCompletionModal
        isOpen={isCompletionModalOpen}
        onClose={() => setIsCompletionModalOpen(false)}
        record={pendingCompletionRecord}
        onSaveRecord={handleSaveCompletedWorkout}
      />

      {/* History Calendar Modal */}
      <WorkoutHistoryCalendarModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={workoutHistory}
      />

      {/* Modals */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportWorkoutDays={handleImportWorkoutDays}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        userName={userName}
        userEmail={currentUser?.email}
        authProvider={currentUser?.provider}
        onUpdateProfile={(name) => {
          setUserName(name);
          if (currentUser) {
            const updated = { ...currentUser, name };
            setCurrentUser(updated);
            localStorage.setItem('appfit_current_session_user', JSON.stringify(updated));
          }
        }}
        cycle={cycle}
        onUpdateCycle={updateAndSaveCycle}
        workoutDays={workoutDays}
        onResetToDefault={() => {}}
        onRestoreBackup={(days) => updateAndSaveWorkouts(days)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onClearAllWorkouts={handleClearAllWorkouts}
        onLogout={handleLogout}
      />

      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
      />
    </div>
  );
};

export default App;
