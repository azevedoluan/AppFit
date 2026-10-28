import React, { useState } from 'react';
import { Trophy, Clock, CheckCircle2, MessageSquare, Calendar, X, Sparkles } from 'lucide-react';
import type { CompletedWorkoutRecord } from '../types/workout';

interface WorkoutCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: CompletedWorkoutRecord | null;
  onSaveRecord: (record: CompletedWorkoutRecord, comment: string) => void;
}

export const WorkoutCompletionModal: React.FC<WorkoutCompletionModalProps> = ({
  isOpen,
  onClose,
  record,
  onSaveRecord
}) => {
  const [comment, setComment] = useState('');

  if (!isOpen || !record) return null;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s} segundos`;
    return `${m} min ${s > 0 ? `${s}s` : ''}`;
  };

  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  const handleConfirm = () => {
    onSaveRecord(record, comment.trim());
    setComment('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0b1220] border-2 border-emerald-500/50 rounded-3xl w-full max-w-md p-6 shadow-2xl relative my-auto space-y-4">
        {/* Celebration Trophy Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 p-0.5 mx-auto shadow-xl shadow-emerald-500/30">
            <div className="w-full h-full bg-[#060a12] rounded-[22px] flex items-center justify-center text-emerald-400">
              <Trophy className="w-8 h-8" />
            </div>
          </div>

          <h3 className="text-2xl font-black text-white tracking-tight">
            Treino Concluído!
          </h3>
          <p className="text-xs text-slate-300">
            Excelente trabalho! Todas as séries foram finalizadas.
          </p>
        </div>

        {/* Workout Summary Card */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-cyan-300">
              {record.dayName} — {record.workoutTitle}
            </span>
            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {formatDate(record.endedAt)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Duration */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Tempo Gasto</span>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(record.durationSeconds)}</span>
              </div>
            </div>

            {/* Completed Sets */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Séries Feitas</span>
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>{record.completedSets}/{record.totalSets}</span>
              </div>
            </div>
          </div>

          {/* Time range */}
          <div className="text-[11px] text-slate-400 text-center">
            Horário: <strong className="text-white">{formatDateTime(record.startedAt)}</strong> até <strong className="text-white">{formatDateTime(record.endedAt)}</strong>
          </div>
        </div>

        {/* Brief Comment Field */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
            <span>Como foi o treino? (Comentário breve)</span>
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ex: Treino muito intenso, senti bem os quadríceps e aumentei a carga na cadeira extensora..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
          >
            Fechar sem salvar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-xs shadow-xl shadow-emerald-500/25 active:scale-98 transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Salvar no Histórico</span>
          </button>
        </div>
      </div>
    </div>
  );
};
