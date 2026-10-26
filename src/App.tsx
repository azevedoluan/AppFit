import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { initialWorkouts } from './data/initialWorkouts';
import type { WorkoutDay, Exercise } from './types/workout';
import { Header } from './components/Header';
import { DaySelector } from './components/DaySelector';
import { WorkoutHeader } from './components/WorkoutHeader';
import { ExerciseCard } from './components/ExerciseCard';
import { RestTimer } from './components/RestTimer';
import { ImportModal } from './components/ImportModal';
import { SettingsModal } from './components/SettingsModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { Plus, Sparkles, FileSpreadsheet, Timer as TimerIcon } from 'lucide-react';
import { sound } from './utils/sound';

export const App: React.FC = () => {
  // Load initial data from localStorage if available
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>(() => {
    const saved = localStorage.getItem('appfit_workout_days_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return initialWorkouts;
      }
    }
    return initialWorkouts;
  });

  // User Profile
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('appfit_username') || 'Luan Azevedo';
  });
  const [userRole, setUserRole] = useState<string>(() => {
    return localStorage.getItem('appfit_user_role') || 'FIFA FITNESS ATIVO';
  });
  const [badgeLevel, setBadgeLevel] = useState<string>(() => {
    return localStorage.getItem('appfit_user_badge') || 'Aço';
  });

  // Selected Day (default to Terça / Inf A to showcase Image 1 layout)
  const [selectedDayId, setSelectedDayId] = useState<string>(() => {
    const saved = localStorage.getItem('appfit_selected_day');
    return saved || 'ter-inf-a';
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
    localStorage.setItem('appfit_workout_days_v1', JSON.stringify(workoutDays));
  }, [workoutDays]);

  useEffect(() => {
    localStorage.setItem('appfit_username', userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('appfit_user_role', userRole);
  }, [userRole]);

  useEffect(() => {
    localStorage.setItem('appfit_user_badge', badgeLevel);
  }, [badgeLevel]);

  useEffect(() => {
    localStorage.setItem('appfit_selected_day', selectedDayId);
  }, [selectedDayId]);

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
    if (confirm('Deseja restaurar a ficha de treino original do Luan Azevedo?')) {
      setWorkoutDays(initialWorkouts);
      setSelectedDayId('ter-inf-a');
      localStorage.removeItem('appfit_workout_days_v1');
    }
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col max-w-lg mx-auto relative pb-28 shadow-2xl">
      {/* Top Header */}
      <Header
        userName={userName}
        userRole={userRole}
        badgeLevel={badgeLevel}
        totalSets={totalSets}
        completedSets={completedSets}
        onResetProgress={handleResetProgress}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenInstall={() => setIsInstallModalOpen(true)}
        isInstallable={!!deferredPrompt}
      />

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

        {currentWorkoutDay?.exercises.length === 0 && (
          <div className="text-center py-12 px-4 rounded-3xl bg-slate-900/40 border border-slate-800">
            <p className="text-sm text-slate-400 font-semibold mb-3">Nenhum exercício cadastrado para este dia.</p>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold text-xs shadow-lg"
            >
              Importar Planilha ou Criar Exercício
            </button>
          </div>
        )}
      </main>

      {/* Floating Action Button / Quick Bar (Image 1 replica bottom element) */}
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

          {/* Central Sparkle Action Button (Image 1 replica) */}
          <button
            onClick={() => handleStartRestTimer(60, 'Descanso Rápido')}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-400 text-slate-950 flex items-center justify-center shadow-xl shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-transform border-4 border-[#060a12]"
            title="Temporizador de Descanso"
          >
            <Sparkles className="w-7 h-7 fill-slate-950" />
          </button>

          {/* Quick Timer / Settings Button */}
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
        userRole={userRole}
        badgeLevel={badgeLevel}
        onUpdateProfile={(name, role, badge) => {
          setUserName(name);
          setUserRole(role);
          setBadgeLevel(badge);
          setIsSettingsModalOpen(false);
        }}
        workoutDays={workoutDays}
        onResetToDefault={handleResetToDefault}
        onRestoreBackup={(days) => setWorkoutDays(days)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
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
