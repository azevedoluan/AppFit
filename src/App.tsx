import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { initialWorkouts } from './data/initialWorkouts';
import type { WorkoutDay, WorkoutCycle } from './types/workout';
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
import { Sparkles, FileSpreadsheet, Timer as TimerIcon } from 'lucide-react';
import { sound } from './utils/sound';
import { calculateCycleFromDates, calculateEndDateFromWeeks } from './utils/dateUtils';

export const App: React.FC = () => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('appfit_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem('appfit_is_guest') === 'true';
  });

  // Workouts state - Initialized to empty array [] so user tests uploading via image
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>(() => {
    const saved = localStorage.getItem('appfit_workout_days_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // User Profile (Apenas Nome e Foto)
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('appfit_username') || 'Luan Azevedo';
  });

  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(() => {
    return localStorage.getItem('appfit_avatar_url') || undefined;
  });

  // Workout Cycle (Validade do Treino em semanas e meses)
  const [cycle, setCycle] = useState<WorkoutCycle>(() => {
    const saved = localStorage.getItem('appfit_workout_cycle');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    const today = new Date().toISOString().split('T')[0];
    const end = calculateEndDateFromWeeks(today, 8);
    return calculateCycleFromDates(today, end);
  });

  // Selected Day
  const [selectedDayId, setSelectedDayId] = useState<string>(() => {
    return localStorage.getItem('appfit_selected_day') || '';
  });

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
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

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('appfit_workout_days_v2', JSON.stringify(workoutDays));
  }, [workoutDays]);

  useEffect(() => {
    localStorage.setItem('appfit_username', userName);
  }, [userName]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('appfit_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('appfit_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('appfit_is_guest', String(isGuest));
  }, [isGuest]);

  useEffect(() => {
    if (avatarUrl) {
      localStorage.setItem('appfit_avatar_url', avatarUrl);
    } else {
      localStorage.removeItem('appfit_avatar_url');
    }
  }, [avatarUrl]);

  useEffect(() => {
    localStorage.setItem('appfit_workout_cycle', JSON.stringify(cycle));
  }, [cycle]);

  useEffect(() => {
    if (selectedDayId) {
      localStorage.setItem('appfit_selected_day', selectedDayId);
    }
  }, [selectedDayId]);

  // If workoutDays changes and selectedDayId is not valid, pick the first
  useEffect(() => {
    if (workoutDays.length > 0 && (!selectedDayId || !workoutDays.some(d => d.id === selectedDayId))) {
      setSelectedDayId(workoutDays[0].id);
    }
  }, [workoutDays, selectedDayId]);

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

  // Timer interval handling
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

  // Auth Handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsGuest(false);
    setUserName(user.name);
    if (user.avatarUrl) {
      setAvatarUrl(user.avatarUrl);
    }
  };

  const handleContinueAsGuest = () => {
    setIsGuest(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsGuest(false);
    localStorage.removeItem('appfit_user');
    localStorage.removeItem('appfit_is_guest');
  };

  // Currently selected workout day
  const currentWorkoutDay = workoutDays.find(d => d.id === selectedDayId) || workoutDays[0];

  // Calculate total and completed sets for progress
  const totalSets = currentWorkoutDay?.exercises.reduce((acc, ex) => acc + ex.sets.length, 0) || 0;
  const completedSets = currentWorkoutDay?.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter(s => s.completed).length,
    0
  ) || 0;

  // Trigger celebration confetti when workout completes
  const checkWorkoutCompletion = (updatedDays: WorkoutDay[]) => {
    const day = updatedDays.find(d => d.id === selectedDayId);
    if (!day) return;
    const allSets = day.exercises.flatMap(e => e.sets);
    if (allSets.length > 0 && allSets.every(s => s.completed)) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      sound.playTimerCompleteSound();
    }
  };

  // Handlers
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
    setWorkoutDays(updated);
    checkWorkoutCompletion(updated);
  };

  const handleUpdateWeight = (exerciseId: string, setId: string, weight: number) => {
    setWorkoutDays(prev => prev.map(day => {
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
    }));
  };

  const handleToggleExpand = (exerciseId: string) => {
    setWorkoutDays(prev => prev.map(day => {
      if (day.id !== selectedDayId) return day;
      return {
        ...day,
        exercises: day.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          return { ...ex, isExpanded: ex.isExpanded === false };
        })
      };
    }));
  };

  const handleExpandAll = () => {
    setWorkoutDays(prev => prev.map(day => {
      if (day.id !== selectedDayId) return day;
      return {
        ...day,
        exercises: day.exercises.map(ex => ({ ...ex, isExpanded: true }))
      };
    }));
  };

  const handleCollapseAll = () => {
    setWorkoutDays(prev => prev.map(day => {
      if (day.id !== selectedDayId) return day;
      return {
        ...day,
        exercises: day.exercises.map(ex => ({ ...ex, isExpanded: false }))
      };
    }));
  };

  const handleResetProgress = () => {
    if (confirm('Deseja zerar as marcações de conclusão do treino de hoje? As cargas registradas serão mantidas.')) {
      setWorkoutDays(prev => prev.map(day => {
        if (day.id !== selectedDayId) return day;
        return {
          ...day,
          exercises: day.exercises.map(ex => ({
            ...ex,
            sets: ex.sets.map(s => ({ ...s, completed: false }))
          }))
        };
      }));
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
    setWorkoutDays(prev => prev.map(day => {
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
    }));
  };

  const handleDeleteExercise = (exerciseId: string) => {
    if (confirm('Tem certeza que deseja remover este exercício do treino?')) {
      setWorkoutDays(prev => prev.map(day => {
        if (day.id !== selectedDayId) return day;
        const filtered = day.exercises.filter(ex => ex.id !== exerciseId);
        return {
          ...day,
          subtitle: `${filtered.length} exercícios planejados`,
          exercises: filtered.map((ex, idx) => ({ ...ex, order: idx + 1 }))
        };
      }));
    }
  };

  const handleAddQuickExercise = () => {
    setIsImportModalOpen(true);
  };

  const handleImportWorkoutDays = (newDays: WorkoutDay[]) => {
    setWorkoutDays(newDays);
    if (newDays.length > 0) {
      setSelectedDayId(newDays[0].id);
    }
  };

  const handleResetToDefault = () => {
    if (confirm('Deseja carregar a ficha de treino modelo do Luan Azevedo?')) {
      setWorkoutDays(initialWorkouts);
      setSelectedDayId('ter-inf-a');
    }
  };

  const handleClearAllWorkouts = () => {
    if (confirm('Tem certeza que deseja zerar todos os treinos do aplicativo para subir um novo?')) {
      setWorkoutDays([]);
      setSelectedDayId('');
      localStorage.removeItem('appfit_workout_days_v2');
      setIsSettingsModalOpen(false);
    }
  };

  const hasWorkouts = workoutDays.length > 0;
  const isAuthenticated = currentUser !== null || isGuest;

  // Se o usuário não estiver autenticado, exibe a tela de login/cadastro
  if (!isAuthenticated) {
    return (
      <AuthScreen
        onLoginSuccess={handleLoginSuccess}
        onContinueAsGuest={handleContinueAsGuest}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col max-w-lg mx-auto relative pb-28 shadow-2xl">
      {/* Top Header com Nome, Espaço de Foto e Ciclo */}
      <Header
        userName={userName}
        avatarUrl={avatarUrl}
        onUpdateAvatar={(url) => setAvatarUrl(url)}
        cycle={cycle}
        totalSets={totalSets}
        completedSets={completedSets}
        onResetProgress={handleResetProgress}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenInstall={() => setIsInstallModalOpen(true)}
        isInstallable={!!deferredPrompt}
        hasWorkouts={hasWorkouts}
      />

      {/* Se houver treinos cadastrados, mostra o ciclo de dias e a ficha */}
      {hasWorkouts ? (
        <>
          {/* Week Day & Quick Status Navigator */}
          <DaySelector
            days={workoutDays}
            selectedDayId={selectedDayId}
            onSelectDay={(dayId) => setSelectedDayId(dayId)}
          />

          {/* Current Workout Title & Subtitle */}
          {currentWorkoutDay && (
            <WorkoutHeader
              workoutDay={currentWorkoutDay}
              onExpandAll={handleExpandAll}
              onCollapseAll={handleCollapseAll}
              onAddExercise={handleAddQuickExercise}
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
        /* Tela Inicial de Boas-Vindas e Upload de Treino (quando zerado) */
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

          {/* Quick Settings Button */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#0e172a]/90 backdrop-blur-md border border-slate-700/80 text-slate-200 text-xs font-bold shadow-xl hover:bg-slate-800 active:scale-95 transition-all"
          >
            <TimerIcon className="w-4 h-4 text-teal-400" />
            <span>Ajustes</span>
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
          setIsSettingsModalOpen(false);
        }}
        cycle={cycle}
        onUpdateCycle={(newCycle) => setCycle(newCycle)}
        workoutDays={workoutDays}
        onResetToDefault={handleResetToDefault}
        onRestoreBackup={(days) => setWorkoutDays(days)}
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
