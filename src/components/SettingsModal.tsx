import React, { useState } from 'react';
import { X, User, Download, Upload, RotateCcw, Cloud, Dumbbell, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import type { WorkoutDay } from '../types/workout';
import { exportToExcel } from '../utils/importUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userRole: string;
  badgeLevel: string;
  onUpdateProfile: (name: string, role: string, badge: string) => void;
  workoutDays: WorkoutDay[];
  onResetToDefault: () => void;
  onRestoreBackup: (days: WorkoutDay[]) => void;
  onOpenInstallModal: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  userName,
  userRole,
  badgeLevel,
  onUpdateProfile,
  workoutDays,
  onResetToDefault,
  onRestoreBackup,
  onOpenInstallModal
}) => {
  const [name, setName] = useState(userName);
  const [role, setRole] = useState(userRole);
  const [badge, setBadge] = useState(badgeLevel);
  const [showOciInfo, setShowOciInfo] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = () => {
    onUpdateProfile(name, role, badge);
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
              <h3 className="text-base font-extrabold text-white">Configurações & Dados</h3>
              <p className="text-xs text-slate-400">Perfil, Exportação e OCI</p>
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
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Dados do Atleta
          </span>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Status / Subtítulo</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Emblema</label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-slate-700 transition-colors"
          >
            Atualizar Perfil
          </button>
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
              <span>Publicação na Nuvem (Oracle OCI)</span>
            </div>
            <span>{showOciInfo ? '▲' : '▼'}</span>
          </button>

          {showOciInfo && (
            <div className="mt-3 text-xs text-slate-400 space-y-2 border-t border-slate-800 pt-2 leading-relaxed">
              <p>
                O AppFit foi empacotado com <strong>Dockerfile</strong> e <strong>docker-compose.yml</strong>, ideal para a VM gratuita (Always Free) do Oracle Cloud Infrastructure.
              </p>
              <p>
                Para rodar na OCI: basta clonar o repositório git na máquina e executar:
                <code className="block mt-1 p-2 rounded-lg bg-black text-cyan-300 font-mono text-[11px]">
                  docker compose up -d --build
                </code>
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={onResetToDefault}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar ficha original
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenInstallModal();
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5"
          >
            <Dumbbell className="w-3.5 h-3.5 text-teal-400" />
            Salvar no Celular
          </button>
        </div>
      </div>
    </div>
  );
};
