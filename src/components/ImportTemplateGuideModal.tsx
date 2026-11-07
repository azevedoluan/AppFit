import React, { useState } from 'react';
import { X, FileSpreadsheet, Image as ImageIcon, Download, CheckCircle2, AlertCircle, Lightbulb, Camera, ArrowRight } from 'lucide-react';
import { downloadTemplateSpreadsheet } from '../utils/importUtils';

interface ImportTemplateGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'sheet' | 'image';
}

export const ImportTemplateGuideModal: React.FC<ImportTemplateGuideModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'sheet'
}) => {
  const [activeTab, setActiveTab] = useState<'sheet' | 'image'>(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#0b1220] border border-slate-800 rounded-3xl w-full max-w-xl p-5 sm:p-6 shadow-2xl relative my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-teal-500 flex items-center justify-center text-white shadow-md shadow-cyan-500/30">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Modelos Recomendados de Ficha</h3>
              <p className="text-xs text-slate-400">Como estruturar sua ficha para importação automática</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/90 rounded-2xl my-3 border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('sheet')}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'sheet'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Modelo de Planilha (.xlsx)</span>
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'image'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Modelo de Foto / Imagem</span>
          </button>
        </div>

        {/* Tab Content (Scrollable) */}
        <div className="overflow-y-auto pr-1 space-y-4 text-xs">
          {/* TAB 1: MODELO PLANILHA */}
          {activeTab === 'sheet' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Download Action Card */}
              <div className="p-3.5 bg-gradient-to-r from-cyan-950/40 via-teal-950/30 to-slate-900 border border-cyan-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-extrabold text-cyan-300 text-xs flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    Planilha Modelo Pronta para Uso
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Baixe o arquivo Excel pré-formatado, preencha seus exercícios e importe.
                  </p>
                </div>
                <button
                  onClick={downloadTemplateSpreadsheet}
                  className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-extrabold text-xs shadow-lg shadow-teal-500/20 flex items-center gap-1.5 shrink-0 active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Planilha Modelo</span>
                </button>
              </div>

              {/* Visual Spreadsheet Table Mockup */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/70">
                <div className="bg-slate-900/90 px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">
                    Exemplo de Estrutura da Planilha
                  </span>
                  <span className="text-[10px] text-teal-400 font-bold bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-500/30">
                    Formato .xlsx ou .csv
                  </span>
                </div>

                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800/80 font-bold">
                        <th className="py-2 px-2.5">Coluna A</th>
                        <th className="py-2 px-2">Coluna B</th>
                        <th className="py-2 px-2">Coluna C</th>
                        <th className="py-2 px-2">Coluna D</th>
                        <th className="py-2 px-2.5">Coluna E</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {/* Day Header Row 1 */}
                      <tr className="bg-teal-950/40 font-extrabold text-teal-300">
                        <td colSpan={5} className="py-2 px-2.5 text-xs">
                          SEGUNDA — SUPERIORES A
                        </td>
                      </tr>
                      <tr className="bg-slate-900/30 text-slate-400 text-[10px] font-semibold">
                        <td className="py-1 px-2.5">Exercício</td>
                        <td className="py-1 px-2">Séries</td>
                        <td className="py-1 px-2">Repetições</td>
                        <td className="py-1 px-2">Descanso</td>
                        <td className="py-1 px-2.5">Orientações</td>
                      </tr>
                      <tr className="text-slate-200">
                        <td className="py-1.5 px-2.5 font-medium">Supino Reto com Halteres</td>
                        <td className="py-1.5 px-2 text-cyan-400 font-mono">3</td>
                        <td className="py-1.5 px-2 text-slate-300">10-12 reps</td>
                        <td className="py-1.5 px-2 text-slate-400">60-90 s</td>
                        <td className="py-1.5 px-2.5 text-slate-400 italic">Escápulas retraídas</td>
                      </tr>
                      <tr className="text-slate-200">
                        <td className="py-1.5 px-2.5 font-medium">Crucifixo Inclinado</td>
                        <td className="py-1.5 px-2 text-cyan-400 font-mono">3</td>
                        <td className="py-1.5 px-2 text-slate-300">12-15 reps</td>
                        <td className="py-1.5 px-2 text-slate-400">60 s</td>
                        <td className="py-1.5 px-2.5 text-slate-400 italic">Alongar bem o peitoral</td>
                      </tr>
                      <tr className="text-slate-200">
                        <td className="py-1.5 px-2.5 font-medium">Desenvolvimento com Halteres</td>
                        <td className="py-1.5 px-2 text-cyan-400 font-mono">3</td>
                        <td className="py-1.5 px-2 text-slate-300">10-12 reps</td>
                        <td className="py-1.5 px-2 text-slate-400">60 s</td>
                        <td className="py-1.5 px-2.5 text-slate-400 italic">Cotovelos alinhados</td>
                      </tr>

                      {/* Spacer Row */}
                      <tr className="bg-slate-950/90">
                        <td colSpan={5} className="py-1 text-center text-[10px] text-slate-600">
                          (Linha em branco entre os dias)
                        </td>
                      </tr>

                      {/* Day Header Row 2 */}
                      <tr className="bg-cyan-950/40 font-extrabold text-cyan-300">
                        <td colSpan={5} className="py-2 px-2.5 text-xs">
                          TERÇA — INFERIORES A
                        </td>
                      </tr>
                      <tr className="bg-slate-900/30 text-slate-400 text-[10px] font-semibold">
                        <td className="py-1 px-2.5">Exercício</td>
                        <td className="py-1 px-2">Séries</td>
                        <td className="py-1 px-2">Repetições</td>
                        <td className="py-1 px-2">Descanso</td>
                        <td className="py-1 px-2.5">Orientações</td>
                      </tr>
                      <tr className="text-slate-200">
                        <td className="py-1.5 px-2.5 font-medium">Agachamento no Smith</td>
                        <td className="py-1.5 px-2 text-cyan-400 font-mono">3</td>
                        <td className="py-1.5 px-2 text-slate-300">8-10 reps</td>
                        <td className="py-1.5 px-2 text-slate-400">90-120 s</td>
                        <td className="py-1.5 px-2.5 text-slate-400 italic">Descer até 90°</td>
                      </tr>
                      <tr className="text-slate-200">
                        <td className="py-1.5 px-2.5 font-medium">Leg Press 45°</td>
                        <td className="py-1.5 px-2 text-cyan-400 font-mono">3</td>
                        <td className="py-1.5 px-2 text-slate-300">10-12 reps</td>
                        <td className="py-1.5 px-2 text-slate-400">90 s</td>
                        <td className="py-1.5 px-2.5 text-slate-400 italic">Pés na largura dos ombros</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-2 bg-slate-900/50 border border-slate-800 p-3.5 rounded-2xl">
                <p className="font-extrabold text-white text-[11px] uppercase tracking-wider">
                  Regras para Reconhecimento da Planilha:
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                    <span><strong>Cabeçalho do Dia:</strong> Insira na 1ª coluna o dia da semana (ex: <em>SEGUNDA — SUPERIORES</em>) ou a letra (ex: <em>TREINO A</em>).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                    <span><strong>Ordem das Colunas:</strong> 1ª Exercício, 2ª Séries, 3ª Repetições, 4ª Descanso, 5ª Orientações (opcional).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                    <span><strong>Separação:</strong> Deixe uma linha em branco entre os dias para melhor organização.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: MODELO FOTO / IMAGEM */}
          {activeTab === 'image' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Photo Mockup Card */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/70 p-4 space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[11px] font-sans font-extrabold text-slate-300 uppercase tracking-wider">
                    Exemplo de Ficha Impressa ou Escrita
                  </span>
                  <span className="text-[10px] font-sans text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                    Foto da Academia
                  </span>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3 text-[11px] space-y-3 text-slate-300">
                  <div>
                    <p className="text-teal-400 font-bold text-xs">SEGUNDA — SUPERIORES A</p>
                    <p className="text-slate-400 text-[10px]">Peito, Ombro e Tríceps</p>
                    <div className="mt-1 space-y-0.5 text-[11px]">
                      <p>1. Supino reto com halteres - 3x 10-12</p>
                      <p>2. Crucifixo inclinado - 3x 12-15</p>
                      <p>3. Desenvolvimento halteres - 3x 10-12</p>
                      <p>4. Tríceps corda - 3x 12-15</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60">
                    <p className="text-cyan-400 font-bold text-xs">TERÇA — INFERIORES A</p>
                    <p className="text-slate-400 text-[10px]">Quadríceps e Glúteos</p>
                    <div className="mt-1 space-y-0.5 text-[11px]">
                      <p>1. Agachamento no Smith - 3x 8-10</p>
                      <p>2. Leg press 45° - 3x 10-12</p>
                      <p>3. Cadeira extensora - 3x 12-15</p>
                      <p>4. Elevação pélvica - 3x 10-12</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Photography Checklist */}
              <div className="space-y-2.5 bg-slate-900/50 border border-slate-800 p-3.5 rounded-2xl">
                <p className="font-extrabold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  Dicas para a Foto ser Reconhecida Perfeitamente:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                    <p className="font-bold text-teal-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-teal-400 shrink-0" />
                      1. Iluminação Uniforme
                    </p>
                    <p className="text-slate-400 text-[10px] leading-relaxed">
                      Evite sombras fortes do celular ou do corpo sobre o texto da ficha.
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                    <p className="font-bold text-teal-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-teal-400 shrink-0" />
                      2. Foto Reta e Paralela
                    </p>
                    <p className="text-slate-400 text-[10px] leading-relaxed">
                      Tire a foto de cima para baixo (visão de topo), evitando inclinações acentuadas.
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                    <p className="font-bold text-teal-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-teal-400 shrink-0" />
                      3. Divisão dos Dias Clara
                    </p>
                    <p className="text-slate-400 text-[10px] leading-relaxed">
                      Garanta que os nomes dos dias (Segunda, Terça...) ou letras (Treino A, B) estejam visíveis.
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                    <p className="font-bold text-teal-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-teal-400 shrink-0" />
                      4. Exercícios Numerados
                    </p>
                    <p className="text-slate-400 text-[10px] leading-relaxed">
                      Numerações (1, 2, 3...) ajudam a IA a separar as linhas de cada exercício com exatidão.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0 mt-3">
          <span>Tudo pronto para carregar seu treino!</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-extrabold text-xs shadow-md shadow-teal-500/20 active:scale-95 transition-all"
          >
            Entendi, Voltar
          </button>
        </div>
      </div>
    </div>
  );
};
