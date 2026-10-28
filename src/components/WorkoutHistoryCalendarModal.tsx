import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, CheckCircle2, MessageSquare, Dumbbell, Award } from 'lucide-react';
import type { CompletedWorkoutRecord } from '../types/workout';

interface WorkoutHistoryCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: CompletedWorkoutRecord[];
}

export const WorkoutHistoryCalendarModal: React.FC<WorkoutHistoryCalendarModalProps> = ({
  isOpen,
  onClose,
  history
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Calendar math
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create date map for fast lookup
  const historyByDate: Record<string, CompletedWorkoutRecord[]> = {};
  history.forEach(item => {
    try {
      const dateKey = item.endedAt.split('T')[0];
      if (!historyByDate[dateKey]) {
        historyByDate[dateKey] = [];
      }
      historyByDate[dateKey].push(item);
    } catch {
      // Ignore
    }
  });

  // Calculate monthly stats
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const thisMonthWorkouts = history.filter(h => h.endedAt.startsWith(currentMonthPrefix));
  const totalMonthSeconds = thisMonthWorkouts.reduce((acc, curr) => acc + curr.durationSeconds, 0);
  const totalMonthHours = Math.floor(totalMonthSeconds / 3600);
  const totalMonthMinutes = Math.floor((totalMonthSeconds % 3600) / 60);

  const selectedWorkouts = selectedDateStr ? (historyByDate[selectedDateStr] || []) : [];

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s > 0 ? `${s}s` : ''}`;
  };

  const formatTimeOnly = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0b1220] border border-slate-800 rounded-3xl w-full max-w-lg p-5 shadow-2xl relative my-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Histórico de Treinos</h3>
              <p className="text-xs text-slate-400">Calendário de Execução e Comentários</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between px-1">
          <h4 className="text-sm font-extrabold text-white">
            {monthNames[month]} {year}
          </h4>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Monthly Summary Chips */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0 font-bold">
              {thisMonthWorkouts.length}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Treinos no Mês</span>
              <span className="font-extrabold text-white">{thisMonthWorkouts.length} sessões</span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-950 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Tempo Total</span>
              <span className="font-extrabold text-white">{totalMonthHours}h {totalMonthMinutes}m</span>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
            <span>Dom</span>
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank padding */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9"></div>
            ))}

            {/* Days in month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const hasWorkout = Boolean(historyByDate[dateKey] && historyByDate[dateKey].length > 0);
              const isSelected = selectedDateStr === dateKey;

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDateStr(dateKey)}
                  className={`h-9 rounded-xl flex flex-col items-center justify-center relative transition-all active:scale-95 ${
                    isSelected
                      ? 'border-2 border-cyan-400 bg-cyan-950/40 text-cyan-200 font-extrabold shadow-md shadow-cyan-500/20'
                      : hasWorkout
                      ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-bold hover:bg-emerald-950/60'
                      : 'hover:bg-slate-800/80 text-slate-300 font-medium'
                  }`}
                >
                  <span className="text-xs">{dayNum}</span>
                  {hasWorkout && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Details for Selected Day */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
            <span>Treinos do Dia ({selectedDateStr.split('-').reverse().join('/')}):</span>
            <span className="text-cyan-400 font-semibold">{selectedWorkouts.length} registrado(s)</span>
          </div>

          {selectedWorkouts.length > 0 ? (
            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
              {selectedWorkouts.map((rec) => (
                <div key={rec.id} className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-white text-sm">
                      {rec.dayName} — {rec.workoutTitle}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-500/40 font-bold text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(rec.durationSeconds)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Horário: {formatTimeOnly(rec.startedAt)} - {formatTimeOnly(rec.endedAt)}</span>
                    <span className="text-cyan-300 font-semibold">{rec.completedSets}/{rec.totalSets} séries</span>
                  </div>

                  {rec.comment && (
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 text-slate-300 text-xs italic flex items-start gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                      <span>"{rec.comment}"</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 px-4 rounded-2xl bg-slate-900/30 border border-slate-800 text-slate-400 text-xs">
              Nenhum treino realizado nesta data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
