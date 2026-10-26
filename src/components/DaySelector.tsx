import React from 'react';
import { Flame, Lock, ChevronRight } from 'lucide-react';
import type { WorkoutDay } from '../types/workout';

interface DaySelectorProps {
  days: WorkoutDay[];
  selectedDayId: string;
  onSelectDay: (dayId: string) => void;
}

export const DaySelector: React.FC<DaySelectorProps> = ({
  days,
  selectedDayId,
  onSelectDay
}) => {
  const currentIndex = days.findIndex(d => d.id === selectedDayId);
  const currentDay = days[currentIndex] || days[0];
  const nextDay = days[(currentIndex + 1) % days.length];

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Quick Status / Transition Banner (Image 1 replica) */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-2.5 shadow-sm">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-2">
          <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>Transição Iniciada (Início do Treino)</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Today Button */}
          <button
            onClick={() => onSelectDay(currentDay.id)}
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-teal-950/40 border border-teal-500/40 text-teal-300 text-xs font-semibold shadow-sm hover:bg-teal-950/60 active:scale-98 transition-all"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="truncate">Hoje ({currentDay.dayName}) • {currentDay.shortLabel}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-teal-400/70 shrink-0 ml-1" />
          </button>

          {/* Tomorrow / Next Workout Button */}
          {nextDay && (
            <button
              onClick={() => onSelectDay(nextDay.id)}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs font-semibold shadow-sm hover:bg-amber-950/50 active:scale-98 transition-all"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="truncate">Amanhã • {nextDay.shortLabel}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-amber-400/70 shrink-0 ml-1" />
            </button>
          )}
        </div>
      </div>

      {/* Regular Week Cycle (Image 1 replica) */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-2.5">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>Ciclo Regular (Dias da Semana)</span>
        </div>

        {/* Horizontal scrollable days row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {days.map((day) => {
            const isSelected = day.id === selectedDayId;
            return (
              <button
                key={day.id}
                onClick={() => onSelectDay(day.id)}
                className={`flex-1 min-w-[70px] py-2 px-2 rounded-xl text-center transition-all ${
                  isSelected
                    ? 'bg-gradient-to-b from-teal-500/20 to-cyan-500/10 border-2 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-[10px] font-extrabold tracking-wider uppercase">
                  {day.dayCode}
                </div>
                <div className={`text-[11px] font-bold mt-0.5 truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {day.shortLabel}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
