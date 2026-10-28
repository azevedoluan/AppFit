import React from 'react';
import { X, TrendingUp, Dumbbell, Calendar, ArrowUpRight, Award, History } from 'lucide-react';
import type { Exercise, CompletedWorkoutRecord, WeightHistoryEntry } from '../types/workout';

interface ExerciseWeightHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise | null;
  workoutHistory: CompletedWorkoutRecord[];
}

export const ExerciseWeightHistoryModal: React.FC<ExerciseWeightHistoryModalProps> = ({
  isOpen,
  onClose,
  exercise,
  workoutHistory
}) => {
  if (!isOpen || !exercise) return null;

  // Derive consolidated weight history points from exercise sets, weightHistory and past workouts
  const points: { date: string; weight: number; formattedDate: string }[] = [];

  // 1. Check workoutHistory from past sessions
  workoutHistory.forEach(record => {
    const match = record.exercisesSummary?.find(
      e => e.name.trim().toLowerCase() === exercise.name.trim().toLowerCase()
    );
    if (match && match.maxWeight > 0) {
      const d = new Date(record.endedAt || record.startedAt);
      points.push({
        date: record.endedAt || record.startedAt,
        weight: match.maxWeight,
        formattedDate: !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'Treino'
      });
    }
  });

  // 2. Add any explicit weightHistory entries
  if (exercise.weightHistory) {
    exercise.weightHistory.forEach(entry => {
      if (entry.weight > 0) {
        const d = new Date(entry.date);
        points.push({
          date: entry.date,
          weight: entry.weight,
          formattedDate: !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : entry.date
        });
      }
    });
  }

  // 3. Current active load in sets
  const currentMaxWeight = Math.max(
    0,
    ...(exercise.sets?.map(s => s.weight) || [0]),
    exercise.lastWeight || 0
  );

  if (currentMaxWeight > 0) {
    points.push({
      date: new Date().toISOString(),
      weight: currentMaxWeight,
      formattedDate: 'Hoje (Atual)'
    });
  }

  // Deduplicate by formattedDate, keeping the latest weight
  const uniquePointsMap = new Map<string, { date: string; weight: number; formattedDate: string }>();
  points.forEach(p => {
    uniquePointsMap.set(p.formattedDate, p);
  });

  // Sort chronological
  const sortedPoints = Array.from(uniquePointsMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const initialWeight = sortedPoints.length > 0 ? sortedPoints[0].weight : currentMaxWeight;
  const highestWeight = sortedPoints.length > 0 ? Math.max(...sortedPoints.map(p => p.weight)) : currentMaxWeight;
  const totalGain = highestWeight - initialWeight;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0b1220] border-2 border-cyan-500/40 rounded-3xl w-full max-w-md p-5 shadow-2xl relative my-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                  {exercise.category}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">Evolução de Carga</span>
              </div>
              <h3 className="text-base font-extrabold text-white leading-tight mt-0.5">
                {exercise.name}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Stat Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Carga Atual</span>
            <div className="text-2xl font-black text-cyan-300 font-mono">
              {currentMaxWeight > 0 ? `${currentMaxWeight} kg` : 'Sem carga'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Progressão Total</span>
            <div className={`text-2xl font-black font-mono ${totalGain > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
              {totalGain > 0 ? `+${totalGain} kg` : totalGain === 0 ? '0 kg' : `${totalGain} kg`}
            </div>
          </div>
        </div>

        {/* History Timeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-cyan-400" />
              Histórico Registrado
            </span>
            <span>{sortedPoints.length} {sortedPoints.length === 1 ? 'registro' : 'registros'}</span>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {sortedPoints.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                Nenhuma carga registrada anteriormente. Conforme você treinar, a evolução aparecerá aqui!
              </div>
            ) : (
              // Display in reverse chronological order (latest on top)
              [...sortedPoints].reverse().map((item, idx, arr) => {
                const prev = arr[idx + 1];
                const diff = prev ? item.weight - prev.weight : 0;

                return (
                  <div
                    key={`${item.date}-${idx}`}
                    className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-white block">{item.formattedDate}</span>
                        <span className="text-[10px] text-slate-400">Sessão de treino</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {diff !== 0 && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                          diff > 0
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                        }`}>
                          {diff > 0 ? `+${diff} kg` : `${diff} kg`}
                        </span>
                      )}
                      <span className="text-sm font-black text-cyan-300 font-mono">
                        {item.weight} kg
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Notice about preservation */}
        <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-200/90 leading-relaxed">
          💡 <strong>Cargas Salvas:</strong> A carga registrada é mantida permanentemente em cada exercício para os seus próximos treinos. Somente você pode alterá-la.
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs active:scale-95 transition-all"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
