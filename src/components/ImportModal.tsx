import React, { useState, useRef } from 'react';
import { X, FileSpreadsheet, Image as ImageIcon, Plus, CheckCircle, AlertCircle, Sparkles, UploadCloud, Calendar, Layers } from 'lucide-react';
import type { WorkoutDay } from '../types/workout';
import { parseSpreadsheet, parsePlainTextPlan, convertToAlphabeticalDivision, convertToWeeklyDivision } from '../utils/importUtils';
import { processWorkoutImage } from '../utils/imageOcr';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportWorkoutDays: (newDays: WorkoutDay[]) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportWorkoutDays
}) => {
  const [activeTab, setActiveTab] = useState<'sheet' | 'image' | 'manual'>('sheet');
  const [previewDays, setPreviewDays] = useState<WorkoutDay[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Manual Form State
  const [manualDivisionMode, setManualDivisionMode] = useState<'weekly' | 'alphabetical'>('weekly');
  const [manualDay, setManualDay] = useState('SEG');
  const [manualTitle, setManualTitle] = useState('Superiores A');
  const [manualExerciseName, setManualExerciseName] = useState('');
  const [manualCategory, setManualCategory] = useState('PEITORAL');
  const [manualSeries, setManualSeries] = useState(2);
  const [manualReps, setManualReps] = useState('10-12 reps');
  const [manualRest, setManualRest] = useState('60-90 s');
  const [manualOrientation, setManualOrientation] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Excel/Spreadsheet File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const parsed = parseSpreadsheet(buffer);
        if (parsed.length === 0) {
          throw new Error('Nenhum treino reconhecido na planilha. Verifique o cabeçalho das colunas.');
        }
        setPreviewDays(parsed);
        setSuccessMessage(`${parsed.length} dias de treino identificados com sucesso!`);
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Erro ao processar planilha.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle Training Image Upload (OCR Real via Tesseract)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessMessage('Iniciando leitura OCR da foto da ficha...');
    setIsProcessing(true);

    const imageUrl = URL.createObjectURL(file);
    setImagePreviewUrl(imageUrl);

    try {
      const result = await processWorkoutImage(file, (pct, status) => {
        setSuccessMessage(`${status}`);
      });

      setPastedText(result.text);

      if (result.days.length > 0) {
        setPreviewDays(result.days);
        setSuccessMessage(`Leitura OCR concluída! ${result.days.length} rotina(s) de treino identificada(s) na imagem.`);
      } else {
        setSuccessMessage('Texto da imagem lido com sucesso! Você pode ajustar o texto abaixo e clicar em "Processar Texto".');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao processar imagem.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process text from OCR or user input
  const handleProcessText = () => {
    if (!pastedText.trim()) {
      setErrorMessage('Cole ou digite o texto da tabela de treino.');
      return;
    }
    try {
      const parsed = parsePlainTextPlan(pastedText);
      if (parsed.length === 0) {
        throw new Error('Não foi possível identificar exercícios. Formate as linhas com: Exercício | Séries | Repetições');
      }
      setPreviewDays(parsed);
      setSuccessMessage(`${parsed.length} dia(s) processado(s) com sucesso!`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao processar texto.');
    }
  };

  // Save imported days
  const handleConfirmImport = () => {
    if (previewDays.length === 0) {
      setErrorMessage('Nenhum treino para importar.');
      return;
    }
    onImportWorkoutDays(previewDays);
    onClose();
  };

  // Handle Manual Exercise Addition
  const handleAddManualExercise = () => {
    if (!manualExerciseName.trim()) {
      setErrorMessage('Digite o nome do exercício.');
      return;
    }

    const isAlpha = manualDivisionMode === 'alphabetical';
    const dayNameMap: Record<string, string> = isAlpha
      ? {
          A: 'Treino A',
          B: 'Treino B',
          C: 'Treino C',
          D: 'Treino D',
          E: 'Treino E',
          F: 'Treino F'
        }
      : {
          SEG: 'Segunda',
          TER: 'Terça',
          QUA: 'Quarta',
          QUI: 'Quinta',
          SEX: 'Sexta',
          SAB: 'Sábado',
          DOM: 'Domingo'
        };

    const newExercise = {
      id: `man-ex-${Date.now()}`,
      order: 1,
      name: manualExerciseName.trim(),
      category: manualCategory,
      seriesCount: manualSeries,
      repsDescription: manualReps,
      restDescription: manualRest,
      suggestedRestOptions: [45, 60, 90, 120],
      orientation: manualOrientation || 'Execução controlada.',
      sets: Array.from({ length: manualSeries }, (_, i) => ({
        id: `man-set-${Date.now()}-${i + 1}`,
        setNumber: i + 1,
        targetReps: manualReps,
        weight: 0,
        completed: false
      })),
      isExpanded: true
    };

    const existingDayIdx = previewDays.findIndex(d => d.dayCode === manualDay);
    if (existingDayIdx >= 0) {
      const updated = [...previewDays];
      newExercise.order = updated[existingDayIdx].exercises.length + 1;
      updated[existingDayIdx].exercises.push(newExercise);
      updated[existingDayIdx].subtitle = `${updated[existingDayIdx].exercises.length} exercícios planejados`;
      setPreviewDays(updated);
    } else {
      const dayDisplayName = dayNameMap[manualDay] || (isAlpha ? `Treino ${manualDay}` : 'Segunda');
      const newDay: WorkoutDay = {
        id: `man-day-${manualDay.toLowerCase()}-${Date.now()}`,
        dayCode: manualDay as any,
        dayName: dayDisplayName,
        title: manualTitle || dayDisplayName,
        shortLabel: isAlpha ? `Treino ${manualDay}` : manualTitle.slice(0, 8),
        categoryBadge: isAlpha ? `TREINO ${manualDay}` : manualTitle.toUpperCase(),
        subtitle: '1 exercício planejado',
        exercises: [newExercise],
        divisionType: manualDivisionMode
      };
      setPreviewDays([...previewDays, newDay]);
    }

    setManualExerciseName('');
    setManualOrientation('');
    setSuccessMessage(`Exercício adicionado a ${isAlpha ? `Treino ${manualDay}` : manualDay}!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0b1220] border border-slate-800 rounded-3xl w-full max-w-lg p-5 shadow-2xl relative my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-500 flex items-center justify-center text-white shadow-md shadow-cyan-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Importar ou Criar Treino</h3>
              <p className="text-xs text-slate-400">Planilha, Imagem da Ficha ou Cadastro Manual</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900/80 rounded-2xl my-4 border border-slate-800">
          <button
            onClick={() => setActiveTab('sheet')}
            className={`py-2 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'sheet'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Planilha
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`py-2 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'image'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Foto / Imagem
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`py-2 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'manual'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Manual
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mb-3 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab 1: Spreadsheet Upload */}
        {activeTab === 'sheet' && (
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-900/30 hover:bg-slate-900/60"
            >
              <div className="w-12 h-12 rounded-full bg-cyan-950/50 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mx-auto mb-2">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white">Carregar Arquivo Excel ou CSV</p>
              <p className="text-xs text-slate-400 mt-1">
                Suporta tabelas de treino distribuídas por Segunda, Terça, Quarta...
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Image Upload / OCR */}
        {activeTab === 'image' && (
          <div className="space-y-3">
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <div
              onClick={() => imageInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-900/30"
            >
              {imagePreviewUrl ? (
                <div className="space-y-2">
                  <img
                    src={imagePreviewUrl}
                    alt="Preview do treino"
                    className="max-h-40 mx-auto rounded-xl border border-slate-700 object-cover"
                  />
                  <p className="text-xs text-cyan-400 font-semibold">Clique para trocar a imagem</p>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-cyan-950/50 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mx-auto mb-1">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-white">Tirar Foto ou Selecionar Imagem da Ficha</p>
                  <p className="text-xs text-slate-400 mt-0.5">Ex: foto do plano de treino ou planilha impressa</p>
                </>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Texto / Linhas do Treino (copie ou ajuste as informações):
              </label>
              <textarea
                rows={3}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="SEGUNDA — SUPERIORES A&#10;Supino reto na máquina	2	10-12 reps	60-120 s	Expirar ao empurrar"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
              />
              <button
                onClick={handleProcessText}
                className="mt-1.5 w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs transition-colors border border-slate-700"
              >
                Interpretar Texto e Gerar Dias de Treino
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Manual Input */}
        {activeTab === 'manual' && (
          <div className="space-y-3">
            {/* Escolha do tipo de programa */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Tipo de Programa</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setManualDivisionMode('weekly');
                    setManualDay('SEG');
                    setManualTitle('Superiores A');
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    manualDivisionMode === 'weekly'
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Dias da Semana
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualDivisionMode('alphabetical');
                    setManualDay('A');
                    setManualTitle('Treino A - Superiores');
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    manualDivisionMode === 'alphabetical'
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Treinos A, B, C...
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  {manualDivisionMode === 'alphabetical' ? 'Ficha / Divisão' : 'Dia da Semana'}
                </label>
                {manualDivisionMode === 'alphabetical' ? (
                  <select
                    value={manualDay}
                    onChange={(e) => {
                      setManualDay(e.target.value);
                      if (manualTitle.startsWith('Treino ')) {
                        setManualTitle(`Treino ${e.target.value}`);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="A">Treino A</option>
                    <option value="B">Treino B</option>
                    <option value="C">Treino C</option>
                    <option value="D">Treino D</option>
                    <option value="E">Treino E</option>
                    <option value="F">Treino F</option>
                  </select>
                ) : (
                  <select
                    value={manualDay}
                    onChange={(e) => setManualDay(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="SEG">Segunda-feira</option>
                    <option value="TER">Terça-feira</option>
                    <option value="QUA">Quarta-feira</option>
                    <option value="QUI">Quinta-feira</option>
                    <option value="SEX">Sexta-feira</option>
                    <option value="SAB">Sábado</option>
                    <option value="DOM">Domingo</option>
                  </select>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Nome do Treino</label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder={manualDivisionMode === 'alphabetical' ? 'Ex: Treino A - Peito' : 'Ex: Superiores A'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Nome do Exercício</label>
              <input
                type="text"
                value={manualExerciseName}
                onChange={(e) => setManualExerciseName(e.target.value)}
                placeholder="Ex: Supino Reto na Máquina"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Séries</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={manualSeries}
                  onChange={(e) => setManualSeries(parseInt(e.target.value) || 2)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Repetições</label>
                <input
                  type="text"
                  value={manualReps}
                  onChange={(e) => setManualReps(e.target.value)}
                  placeholder="10-12 reps"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Descanso</label>
                <input
                  type="text"
                  value={manualRest}
                  onChange={(e) => setManualRest(e.target.value)}
                  placeholder="60-90 s"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Orientações / Dicas</label>
              <input
                type="text"
                value={manualOrientation}
                onChange={(e) => setManualOrientation(e.target.value)}
                placeholder="Ex: Não prender a respiração, movimento controlado"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={handleAddManualExercise}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold text-xs transition-colors border border-teal-500/30 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Adicionar Exercício ao Plano
            </button>
          </div>
        )}

        {/* Preview of Parsed Days */}
        {previewDays.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Treinos Preparados ({previewDays.length} {previewDays.length === 1 ? 'divisão' : 'divisões'})
              </span>
              <span className="text-[11px] text-teal-400 font-medium">
                {previewDays.reduce((acc, d) => acc + d.exercises.length, 0)} exercícios no total
              </span>
            </div>

            {/* Quick Switcher de Organização */}
            <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-950/80 rounded-xl border border-slate-800 mb-2.5">
              <span className="text-[10px] text-slate-400 font-bold px-1">Organizar como:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewDays(prev => convertToWeeklyDivision(prev))}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  📅 Dias da Semana
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDays(prev => convertToAlphabeticalDivision(prev))}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 transition-colors"
                >
                  🔤 Treinos A, B, C...
                </button>
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {previewDays.map((day) => (
                <div key={day.id} className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-cyan-300 mr-2">{day.dayName}</span>
                    <span className="text-slate-300">{day.title}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400">
                    {day.exercises.length} ex
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleConfirmImport}
              className="w-full mt-3 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-extrabold text-sm shadow-lg shadow-teal-500/25 active:scale-98 transition-all"
            >
              Aplicar Treinos no AppFit
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
