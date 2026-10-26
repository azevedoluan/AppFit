import React, { useState, useEffect } from 'react';
import { X, Share, PlusSquare, DownloadCloud, Smartphone, Check, HelpCircle } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt
}) => {
  const [activeOs, setActiveOs] = useState<'ios' | 'android'>('android');
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    if (isIos) {
      setActiveOs('ios');
    }
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0b1220] border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl relative my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Salvar App no Celular</h3>
              <p className="text-xs text-teal-400">Instalação PWA Rápida (Android & iOS)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* OS Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 my-4 bg-slate-900 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTabAndOs('android')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              activeOs === 'android'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Android (Chrome)
          </button>
          <button
            onClick={() => setActiveTabAndOs('ios')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              activeOs === 'ios'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            iPhone / iPad (iOS)
          </button>
        </div>

        {/* Content for Android */}
        {activeOs === 'android' && (
          <div className="space-y-3.5">
            {deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-cyan-500/25 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <DownloadCloud className="w-5 h-5" />
                <span>Instalar AppFit no Android</span>
              </button>
            ) : (
              <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2">
                <p className="font-semibold text-white">Como instalar pelo navegador:</p>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
                  <span>Toque nos <strong>três pontinhos (⋮)</strong> no canto superior direito do Chrome.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
                  <span>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
                  <span>Confirme a instalação. O ícone do AppFit aparecerá junto aos seus outros apps!</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content for iOS */}
        {activeOs === 'ios' && (
          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-white block font-bold">1. Toque em Compartilhar</strong>
                  <span className="text-slate-400">Na barra inferior do Safari, toque no ícone do quadrado com a seta para cima.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-white block font-bold">2. Adicionar à Tela de Início</strong>
                  <span className="text-slate-400">Role o menu para baixo e selecione a opção "Adicionar à Tela de Início".</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-white block font-bold">3. Confirmar "Adicionar"</strong>
                  <span className="text-slate-400">Toque em "Adicionar" no canto superior direito. Pronto!</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PWA Benefits */}
        <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>✓ Funciona 100% Offline</span>
          <span>✓ Sem ocupar espaço</span>
          <span>✓ Sem App Store / Play Store</span>
        </div>
      </div>
    </div>
  );

  function setActiveTabAndOs(tab: 'ios' | 'android') {
    setActiveOs(tab);
  }
};
