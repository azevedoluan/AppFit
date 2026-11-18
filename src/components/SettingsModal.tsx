import React, { useState, useRef } from 'react';
import { X, User, Download, Upload, Calendar, FileSpreadsheet, LogOut, Check, Camera, AlertCircle } from 'lucide-react';
import type { WorkoutDay, WorkoutCycle } from '../types/workout';
import { exportToExcel } from '../utils/importUtils';
import { calculateCycleFromDates, calculateEndDateFromWeeks, calculateEndDateFromMonths, formatDateBr } from '../utils/dateUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userEmail?: string;
  avatarUrl?: string;
  authProvider?: string;
  onUpdateAvatar?: (url: string) => void;
  onUpdateProfile: (name: string, email?: string, avatarUrl?: string) => Promise<void> | void;
  cycle: WorkoutCycle;
  onUpdateCycle: (cycle: WorkoutCycle) => void;
  workoutDays: WorkoutDay[];
  onResetToDefault: () => void;
  onRestoreBackup: (days: WorkoutDay[]) => void;
  onOpenInstallModal: () => void;
  onClearAllWorkouts?: () => void;
  onLogout: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  userName,
  userEmail,
  avatarUrl,
  authProvider,
  onUpdateAvatar,
  onUpdateProfile,
  cycle,
  onUpdateCycle,
  workoutDays,
  onRestoreBackup,
  onLogout
}) => {
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail || '');
  const [avatar, setAvatar] = useState(avatarUrl || '');
  const [startDate, setStartDate] = useState(cycle.startDate);
  const [endDate, setEndDate] = useState(cycle.endDate);
  const [durationWeeks, setDurationWeeks] = useState(cycle.durationWeeks);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const rawData = evt.target?.result as string;
      if (!rawData) return;

      // Otimização visual: redimensiona foto para max 320x320 para salvar levemente no PostgreSQL e localStorage
      const img = new Image();
      img.onload = () => {
        const maxDim = 320;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const optimized = canvas.toDataURL('image/jpeg', 0.88);
          setAvatar(optimized);
          onUpdateAvatar?.(optimized);
        } else {
          setAvatar(rawData);
          onUpdateAvatar?.(rawData);
        }
      };
      img.src = rawData;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      await onUpdateProfile(name.trim(), email.trim(), avatar);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      setSaveError(err?.message || 'Erro ao salvar alterações de perfil.');
    } finally {
      setIsSaving(false);
    }
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

        {/* Profile Settings */}
        <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Conta de Usuário
            </span>
            {authProvider && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-cyan-500/30">
                {authProvider === 'google' ? 'Google' : 'E-mail'}
              </span>
            )}
          </div>

          {/* Photo & Basic Info */}
          <div className="flex items-center gap-3 pt-1">
            <div className="relative group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center overflow-hidden border-2 border-slate-700 shadow-md">
                {avatar ? (
                  <img src={avatar} alt="Foto de perfil" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-extrabold text-xl">
                    {name ? name.slice(0, 1).toUpperCase() : 'U'}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Alterar foto de perfil"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg hover:bg-cyan-400 active:scale-95 transition-all"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1">
              <p className="text-xs font-bold text-white truncate">{name || 'Usuário'}</p>
              <p className="text-[11px] text-slate-400 font-mono truncate">{email || 'Sem e-mail'}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold mt-0.5 flex items-center gap-1"
              >
                <span>Trocar foto</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Luan Azevedo"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              disabled={authProvider === 'google'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed font-mono"
            />
          </div>

          {saveError && (
            <div className="p-2 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Perfil Salvo com Sucesso!</span>
                </>
              ) : isSaving ? (
                <span>Salvando...</span>
              ) : (
                <span>Salvar Alterações de Perfil</span>
              )}
            </button>
          </div>

          <button
            onClick={() => {
              if (confirm('Deseja sair da conta?')) {
                onLogout();
                onClose();
              }
            }}
            className="w-full py-1.5 rounded-xl bg-red-950/20 hover:bg-red-950/40 text-red-400 font-bold text-[11px] border border-red-500/20 transition-colors flex items-center justify-center gap-1.5 mt-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair da Conta</span>
          </button>
        </div>

        {/* Workout Validity / Cycle Settings */}
        <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Período de Validade do Treino
            </span>
          </div>

          {/* Quick presets */}
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
      </div>
    </div>
  );
};
