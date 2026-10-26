import React, { useState } from 'react';
import { X, User, Download, Upload, RotateCcw, Cloud, Dumbbell, Calendar, FileSpreadsheet } from 'lucide-react';
import type { WorkoutDay, WorkoutCycle } from '../types/workout';
import { exportToExcel } from '../utils/importUtils';
import { calculateCycleFromDates, calculateEndDateFromWeeks, calculateEndDateFromMonths, formatDateBr } from '../utils/dateUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onUpdateProfile: (name: string) => void;
  cycle: WorkoutCycle;
  onUpdateCycle: (cycle: WorkoutCycle) => void;
  workoutDays: WorkoutDay[];
  onResetToDefault: () => void;
  onRestoreBackup: (days: WorkoutDay[]) => void;
  onOpenInstallModal: () => void;
  onClearAllWorkouts: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  userName,
  onUpdateProfile,
  cycle,
  onUpdateCycle,
  workoutDays,
  onResetToDefault,
  onRestoreBackup,
  onOpenInstallModal,
  onClearAllWorkouts
}) => {
  const [name, setName] = useState(userName);
  const [startDate, setStartDate] = useState(cycle.startDate);
  const [endDate, setEndDate] = useState(cycle.endDate);
  const [durationWeeks, setDurationWeeks] = useState(cycle.durationWeeks);
  const [showOciInfo, setShowOciInfo] = useState(false);

  if (!isOpen) return null;

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    const newEnd = calculateEndDateFromWeeks(newStart, durationWeeks);
    setEndDate(newEnd);
    onUpdateCycle(calculateCycleFromDates(newStart, newEnd));
  };

  const handleWeeksChange = (weeks: number) => {
    const validWeeks = Math.max(1, weeks);
    setDurationWeeks(validWeeks);
    const newEnd = calculateEndDateFromWeeks(startDate, validWeeks);
    setEndDate(newEnd);
    onUpdateCycle(calculateCycleFromDates(startDate, newEnd));
  };

  const handleMonthsChange = (months: number) => {
    const validMonths = Math.max(0.5, months);
    const newEnd = calculateEndDateFromMonths(startDate, validMonths);
    setEndDate(newEnd);
    const calc = calculateCycleFromDates(startDate, newEnd);
    setDurationWeeks(calc.durationWeeks);
    onUpdateCycle(calc);
  };

  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    const calc = calculateCycleFromDates(startDate, newEnd);
    setDurationWeeks(calc.durationWeeks);
    onUpdateCycle(calc);
  };

  const handleSaveProfile = () => {
    onUpdateProfile(name);
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(workoutDays, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `appfit_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (Array.isArray(json)) {
          onRestoreBackup(json);
          onClose();
        }
      } catch {
        alert('Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0b1220] border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl relative my-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Configurações & Ciclo</h3>
              <p className="text-xs text-slate-400">Perfil e Validade do Treino</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Settings (Apenas Nome) */}
        <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Nome do Atleta
          </span>

          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Luan Azevedo"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleSaveProfile}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-slate-700 transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>

        {/* Workout Validity / Cycle Settings */}
        <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Período de Validade do Treino
            </span>
          </div>

          {/* Quick presets (Semanas e Meses) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Duração Rápida:</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[4, 6, 8, 12].map((w) => (
                <button
                  key={w}
                  onClick={() => handleWeeksChange(w)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    durationWeeks === w
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {w} sem (~{Math.round((w / 4) * 10) / 10} m)
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Data de Início</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Data de Término</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Calculation summary */}
          <div className="p-2.5 rounded-xl bg-[#080d1a] border border-slate-800 text-xs flex items-center justify-between text-slate-300">
            <div>
              <span className="text-slate-400">Duração calculada: </span>
              <strong className="text-cyan-400">{cycle.durationWeeks} semanas</strong> ({cycle.durationMonths} meses)
            </div>
            <span className="text-emerald-400 font-semibold text-[11px]">
              {formatDateBr(cycle.startDate)} a {formatDateBr(cycle.endDate)}
            </span>
          </div>
        </div>

        {/* Export / Backup Options */}
        <div className="space-y-2.5 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Exportar & Backup
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => exportToExcel(workoutDays, name)}
              className="py-2.5 px-3 rounded-xl bg-teal-950/40 hover:bg-teal-950/70 border border-teal-500/30 text-teal-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel
            </button>

            <button
              onClick={handleExportJson}
              className="py-2.5 px-3 rounded-xl bg-blue-950/40 hover:bg-blue-950/70 border border-blue-500/30 text-blue-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" />
              Backup JSON
            </button>
          </div>

          <label className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition-colors">
            <Upload className="w-4 h-4 text-slate-400" />
            <span>Restaurar Backup JSON</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>

        {/* OCI Info Accordion */}
        <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setShowOciInfo(!showOciInfo)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider"
          >
            <div className="flex items-center gap-1.5 text-amber-400">
              <Cloud className="w-4 h-4" />
              <span>Hospedagem Oracle OCI</span>
            </div>
            <span>{showOciInfo ? '▲' : '▼'}</span>
          </button>

          {showOciInfo && (
            <div className="mt-3 text-xs text-slate-400 space-y-2 border-t border-slate-800 pt-2 leading-relaxed">
              <p>
                O AppFit foi empacotado com <strong>Dockerfile</strong> e <strong>docker-compose.yml</strong>, pronto para rodar na VM Always Free da Oracle Cloud.
              </p>
              <code className="block p-2 rounded-lg bg-black text-cyan-300 font-mono text-[11px]">
                docker compose up -d --build
              </code>
            </div>
          )}
        </div>

        {/* Danger zone: Clear / Reset */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={onClearAllWorkouts}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold"
            title="Zerar todos os treinos para subir nova imagem"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Zerar treinos atuais
          </button>

          <button
            onClick={onResetToDefault}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Recarregar treino exemplo
          </button>
        </div>
      </div>
    </div>
  );
};
