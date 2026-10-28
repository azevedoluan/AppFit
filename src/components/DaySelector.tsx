import React from 'react';
import { Layers } from 'lucide-react';
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
  return (
    <div className="px-4 py-2 space-y-2">
      {/* Programa de Treino (Seleção do Treino Ativo) */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-2.5">
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>Programa de Treino</span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold">
            {days.length} {days.length === 1 ? 'divisão' : 'divisões'}
          </span>
        </div>

        {/* Horizontal scrollable workouts row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {days.map((day) => {
            const isSelected = day.id === selectedDayId;
            const isAlphabetical = day.divisionType === 'alphabetical' || /^[A-Z]$/i.test(day.dayCode) || /^treino\s+[a-z]/i.test(day.dayName);
            const displayCode = isAlphabetical
              ? (day.dayCode.length === 1 ? `TREINO ${day.dayCode}` : day.dayCode)
              : day.dayCode;

            return (
              <button
                key={day.id}
                onClick={() => onSelectDay(day.id)}
                className={`flex-1 min-w-[76px] py-2 px-2.5 rounded-xl text-center transition-all ${
                  isSelected
                    ? 'bg-gradient-to-b from-teal-500/25 to-cyan-500/15 border-2 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20 scale-[1.02]'
                    : 'bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`text-[10px] font-black tracking-wider uppercase ${isSelected ? 'text-cyan-300' : 'text-slate-400'}`}>
                  {displayCode}
                </div>
                <div className={`text-[11px] font-bold mt-0.5 truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {day.shortLabel || day.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
