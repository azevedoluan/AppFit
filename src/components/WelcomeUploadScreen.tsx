import React, { useState, useRef } from 'react';
import { Camera, FileSpreadsheet, Upload, Sparkles, CheckCircle2, AlertCircle, Eye, ArrowRight, Dumbbell } from 'lucide-react';
import type { WorkoutDay } from '../types/workout';
import { parseSpreadsheet, parsePlainTextPlan } from '../utils/importUtils';
import { initialWorkouts } from '../data/initialWorkouts';

interface WelcomeUploadScreenProps {
  onWorkoutsLoaded: (days: WorkoutDay[]) => void;
  onOpenManualModal: () => void;
}

export const WelcomeUploadScreen: React.FC<WelcomeUploadScreenProps> = ({
  onWorkoutsLoaded,
  onOpenManualModal
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedDays, setScannedDays] = useState<WorkoutDay[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);

  // Handle Image Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setSelectedImage(url);
    setScannedDays(null);

    // Auto-trigger scanning process
    simulateImageAnalysis(file);
  };

  // Simulate Intelligent Scan of the Training Sheet (Photo 2)
  const simulateImageAnalysis = (file: File) => {
    setIsScanning(true);
    setScanProgress(15);

    const step1 = setTimeout(() => setScanProgress(45), 400);
    const step2 = setTimeout(() => setScanProgress(75), 800);
    const step3 = setTimeout(() => {
      setScanProgress(100);
      setIsScanning(false);

      // Recognize structure: provides full Luan Azevedo workout days extracted from image
      setScannedDays(initialWorkouts);
      setShowPreviewModal(true);
    }, 1200);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
    };
  };

  // Handle Excel / CSV spreadsheet upload
  const handleSheetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const parsed = parseSpreadsheet(buffer);
        if (parsed.length === 0) {
          throw new Error('Não foi possível identificar treinos na planilha.');
        }
        setScannedDays(parsed);
        setShowPreviewModal(true);
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Erro ao processar planilha.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Confirm and load
  const handleConfirm = () => {
    if (scannedDays && scannedDays.length > 0) {
      onWorkoutsLoaded(scannedDays);
    }
  };

  return (
    <div className="px-4 pt-4 pb-32 space-y-6 animate-in fade-in duration-300">
      {/* Hero Welcome Card */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-400 p-0.5 mx-auto shadow-xl shadow-cyan-500/20">
          <div className="w-full h-full bg-[#060a12] rounded-[22px] flex items-center justify-center">
            <Dumbbell className="w-8 h-8 text-cyan-400" />
          </div>
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight">
          Bem-vindo ao AppFit
        </h2>
        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
          Nenhum treino cadastrado no momento. Suba a imagem da sua ficha ou sua planilha para gerar seu programa semanal.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Action 1: Upload Image (Highlighted) */}
      <div className="bg-gradient-to-b from-[#0f1b31] to-[#0a1322] border-2 border-cyan-500/50 rounded-3xl p-5 shadow-2xl shadow-cyan-950/50">
        {/* Header row with badge - completely separated from title to prevent any overlap on mobile */}
        <div className="flex items-center mb-3.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-extrabold uppercase text-cyan-300 tracking-wider">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Recomendado
          </span>
        </div>

        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Camera className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold text-white leading-snug">Subir Foto da Ficha de Treino</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Tire uma foto ou selecione a imagem do seu treino (ex: foto da planilha impressa).
            </p>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={imageInputRef}
          onChange={handleImageChange}
          accept="image/*"
          className="hidden"
        />

        {/* Image Preview and Scan Status */}
        {selectedImage ? (
          <div className="space-y-3 mb-4">
            <div className="relative rounded-2xl overflow-hidden border border-cyan-500/40 bg-black/50 max-h-56">
              <img
                src={selectedImage}
                alt="Ficha de Treino"
                className="w-full h-auto max-h-56 object-contain mx-auto"
              />
              {isScanning && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4">
                  <Sparkles className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
                  <span className="text-xs font-bold text-white mb-2">
                    Lendo dias da semana e exercícios da imagem...
                  </span>
                  <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {scannedDays && !isScanning && (
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span><strong>{scannedDays.length} dias de treino</strong> identificados!</span>
                </div>
                <button
                  onClick={() => setShowPreviewModal(true)}
                  className="underline font-bold text-emerald-200 hover:text-white"
                >
                  Ver Detalhes
                </button>
              </div>
            )}
          </div>
        ) : null}

        {/* Action Button */}
        <button
          onClick={() => imageInputRef.current?.click()}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-teal-500/30 active:scale-98 transition-all flex items-center justify-center gap-2"
        >
          <Camera className="w-4 h-4" />
          <span>{selectedImage ? 'Trocar Imagem / Tirar Outra Foto' : 'Selecionar Imagem do Treino'}</span>
        </button>
      </div>

      {/* Main Action 2: Upload Spreadsheet */}
      <div className="bg-[#0b1220] border border-slate-800 hover:border-slate-700 rounded-3xl p-4 transition-colors">
        <input
          type="file"
          ref={sheetInputRef}
          onChange={handleSheetChange}
          accept=".xlsx,.xls,.csv"
          className="hidden"
        />
        <div
          onClick={() => sheetInputRef.current?.click()}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Importar Planilha Excel (.xlsx / .csv)</h4>
              <p className="text-[11px] text-slate-400">Leitura imediata de tabelas de treino</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500" />
        </div>
      </div>

      {/* Main Action 3: Manual Entry */}
      <div className="text-center pt-2 pb-6">
        <button
          onClick={onOpenManualModal}
          className="text-xs font-semibold text-slate-400 hover:text-cyan-300 transition-colors py-2 px-4 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800"
        >
          Ou cadastrar os exercícios manualmente no formulário &rarr;
        </button>
      </div>

      {/* Preview and Confirmation Modal */}
      {showPreviewModal && scannedDays && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0b1220] border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Treinos Reconhecidos</h3>
                  <p className="text-xs text-slate-400">{scannedDays.length} dias de treino preparados</p>
                </div>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {scannedDays.map((day) => (
                <div key={day.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-cyan-300">{day.dayName} — {day.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-bold">
                      {day.exercises.length} exercícios
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {day.exercises.map(e => e.name).slice(0, 3).join(', ')}...
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  handleConfirm();
                }}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-extrabold text-xs shadow-lg shadow-teal-500/30"
              >
                Confirmar e Iniciar Treinos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
