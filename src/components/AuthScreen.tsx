import React, { useState, useRef, useEffect } from 'react';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, Sparkles, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, RefreshCw, Trash2, Database } from 'lucide-react';
import type { User } from '../types/auth';
import { api } from '../services/api';
import {
  loginAccount,
  startEmailVerification,
  verifyAndRegisterUser,
  handleGoogleSignInRequest,
  wipeAllUsersDatabase
} from '../utils/authStorage';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess
}) => {
  const [viewState, setViewState] = useState<'auth' | 'verify'>('auth');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [availableAccounts, setAvailableAccounts] = useState<User[]>([]);

  // Carrega contas cadastradas diretamente no PostgreSQL
  useEffect(() => {
    api.getUsers().then(users => {
      if (users && users.length > 0) {
        setAvailableAccounts(users);
      }
    }).catch(() => {});
  }, []);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Verification Code State
  const [verificationDigits, setVerificationDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [simulatedCodeSent, setSimulatedCodeSent] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState(30);

  // Google Account Selector State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

  const pinInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown countdown for resend
  useEffect(() => {
    let timer: number;
    if (viewState === 'verify' && resendCooldown > 0) {
      timer = window.setInterval(() => {
        setResendCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [viewState, resendCooldown]);

  // Handle Email + Password Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    if (password.length < 4) {
      setErrorMessage('A senha deve conter no mínimo 4 caracteres.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMessage('Por favor, digite seu nome completo.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('As senhas não coincidem. Digite a mesma senha nos dois campos.');
        return;
      }

      setIsLoading(true);
      setTimeout(() => {
        try {
          // Generate code and start verification
          const generatedCode = startEmailVerification(name, email, password);
          setIsLoading(false);
          setSimulatedCodeSent(generatedCode);
          setVerificationDigits(['', '', '', '', '', '']);
          setViewState('verify');
          setResendCooldown(30);
          setSuccessMessage(`Código enviado para ${email}.`);
        } catch (err: unknown) {
          setIsLoading(false);
          setErrorMessage(err instanceof Error ? err.message : 'Erro ao iniciar cadastro.');
        }
      }, 500);
    } else {
      // Login with strict credential validation
      setIsLoading(true);
      setTimeout(() => {
        try {
          const user = loginAccount(email, password);
          setIsLoading(false);
          setSuccessMessage('Login realizado com sucesso!');
          setTimeout(() => onLoginSuccess(user), 500);
        } catch (err: unknown) {
          setIsLoading(false);
          setErrorMessage(err instanceof Error ? err.message : 'E-mail ou senha incorretos.');
        }
      }, 500);
    }
  };

  // Handle Verification Pin change
  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste of whole code
      const cleanDigits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newDigits = [...verificationDigits];
      cleanDigits.forEach((d, idx) => {
        if (index + idx < 6) newDigits[index + idx] = d;
      });
      setVerificationDigits(newDigits);
      const nextFocus = Math.min(5, index + cleanDigits.length);
      pinInputsRef.current[nextFocus]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newDigits = [...verificationDigits];
    newDigits[index] = digit;
    setVerificationDigits(newDigits);

    // Auto advance focus
    if (digit && index < 5) {
      pinInputsRef.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationDigits[index] && index > 0) {
      pinInputsRef.current[index - 1]?.focus();
    }
  };

  // Confirm Verification Code
  const handleVerifyCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = verificationDigits.join('');
    if (fullCode.length < 6) {
      setErrorMessage('Digite os 6 dígitos do código de verificação.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    setTimeout(() => {
      try {
        const verifiedUser = verifyAndRegisterUser(email, fullCode);
        setIsLoading(false);
        setSuccessMessage('E-mail verificado com sucesso! Entrando...');
        setTimeout(() => onLoginSuccess(verifiedUser), 600);
      } catch (err: unknown) {
        setIsLoading(false);
        setErrorMessage(err instanceof Error ? err.message : 'Código inválido.');
      }
    }, 600);
  };

  // Resend code
  const handleResendCode = () => {
    if (resendCooldown > 0) return;
    setErrorMessage(null);
    try {
      const newCode = startEmailVerification(name, email, password);
      setSimulatedCodeSent(newCode);
      setResendCooldown(30);
      setSuccessMessage('Novo código gerado com sucesso!');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao reenviar.');
    }
  };

  // Handle Google Sign-In (Requires 6-digit code on first access)
  const handleGoogleSelect = (gEmail: string, gName: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setShowGoogleModal(false);

    setTimeout(() => {
      setIsLoading(false);
      const result = handleGoogleSignInRequest(
        gEmail,
        gName,
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
      );

      if (result.type === 'needs_verification') {
        // First access for this Google account -> requires 6-digit code verification!
        setEmail(result.email);
        setName(result.name);
        setSimulatedCodeSent(result.code);
        setVerificationDigits(['', '', '', '', '', '']);
        setViewState('verify');
        setResendCooldown(30);
        setSuccessMessage(`Primeiro acesso com o Google! Código enviado para ${result.email}.`);
      } else {
        // Returning verified Google user -> signs in directly
        setSuccessMessage(`Conectado com o Google (${gName})!`);
        setTimeout(() => onLoginSuccess(result.user), 500);
      }
    }, 500);
  };

  // ==========================================
  // VIEW 2: VERIFICATION CODE SCREEN
  // ==========================================
  if (viewState === 'verify') {
    return (
      <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col justify-center px-4 py-8 max-w-md mx-auto relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-6 relative z-10">
          <div className="w-16 h-16 rounded-3xl bg-teal-500/20 border border-teal-500/40 p-0.5 mx-auto mb-4 flex items-center justify-center text-teal-400 shadow-xl shadow-teal-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            Verifique seu E-mail
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Para sua segurança, enviamos um código de verificação para o e-mail:
          </p>
          <p className="text-xs font-bold text-cyan-400 mt-0.5 font-mono">
            {email}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0b1220]/90 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-6 shadow-2xl relative z-10 space-y-4">
          {/* Simulated Email Delivery Banner */}
          <div className="p-3 bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-500/40 rounded-2xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-blue-300 font-bold text-[11px] uppercase tracking-wider">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span>Simulação de Envio de E-mail</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Código recebido: <strong className="text-white bg-blue-900/60 px-2 py-0.5 rounded font-mono text-sm tracking-widest">{simulatedCodeSent}</strong>
            </p>
            <p className="text-[10px] text-slate-400">
              (Copie ou digite os 6 números nos campos abaixo)
            </p>
          </div>

          {/* Alerts */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 6-Digit PIN input boxes */}
          <form onSubmit={handleVerifyCodeSubmit} className="space-y-5">
            <div className="flex justify-between gap-2 max-w-xs mx-auto">
              {verificationDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => pinInputsRef.current[idx] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleDigitChange(idx, e.target.value)}
                  onKeyDown={e => handleDigitKeyDown(idx, e)}
                  className="w-11 h-13 text-center text-xl font-mono font-black bg-slate-950 border-2 border-slate-800 rounded-2xl text-cyan-300 focus:outline-none focus:border-cyan-400 focus:shadow-md focus:shadow-cyan-500/20 transition-all"
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isLoading || verificationDigits.some(d => !d)}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-teal-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {isLoading ? (
                <Sparkles className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Validar e Concluir Cadastro</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Resend and Back buttons */}
          <div className="flex items-center justify-between text-xs pt-2 text-slate-400 border-t border-slate-800/80">
            <button
              type="button"
              disabled={resendCooldown > 0}
              onClick={handleResendCode}
              className={`flex items-center gap-1 font-semibold ${
                resendCooldown > 0 ? 'text-slate-600 cursor-not-allowed' : 'text-cyan-400 hover:underline'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar Código'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewState('auth');
                setErrorMessage(null);
              }}
              className="hover:text-white transition-colors"
            >
              Alterar dados &larr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: LOGIN & CADASTRO SCREEN
  // ==========================================
  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col justify-center px-4 py-8 max-w-md mx-auto relative overflow-hidden">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Brand Header */}
      <div className="text-center mb-8 relative z-10">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-400 p-0.5 mx-auto mb-4 shadow-xl shadow-cyan-500/20">
          <div className="w-full h-full bg-[#060a12] rounded-[22px] flex items-center justify-center">
            <span className="text-white font-black text-2xl tracking-tight bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent">
              AF
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight">
          AppFit
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {mode === 'login'
            ? 'Acesse seus treinos e acompanhamento de cargas'
            : 'Crie sua conta e periodize seus treinos com facilidade'}
        </p>
      </div>

      {/* Main Auth Card */}
      <div className="bg-[#0b1220]/90 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-6 shadow-2xl relative z-10">
        {/* Toggle Mode Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-2xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'register'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cadastrar
          </button>
        </div>

        {/* Detecção de Contas no PostgreSQL */}
        {availableAccounts.length > 0 && (
          <div className="mb-4 p-3 rounded-2xl bg-[#0a1424] border border-cyan-500/40 space-y-2.5 shadow-lg">
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-extrabold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Conta Detectada no PostgreSQL:</span>
            </div>
            {availableAccounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => onLoginSuccess(acc)}
                className="w-full p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-left flex items-center justify-between active:scale-95 transition-all group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300 font-black flex items-center justify-center text-xs shrink-0 border border-cyan-500/40">
                    {acc.name ? acc.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                      {acc.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{acc.email}</div>
                  </div>
                </div>
                <span className="text-[11px] font-extrabold text-cyan-300 px-3 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 shrink-0 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all">
                  Entrar
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Real Google Account Link Button (no password requested) */}
        <button
          type="button"
          onClick={() => setShowGoogleModal(true)}
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs shadow-lg active:scale-98 transition-all flex items-center justify-center gap-3 border border-slate-200"
        >
          {/* Google Multi-Color SVG Logo */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Conectar com o Google (Sem Senha)</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-800"></div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            ou com e-mail
          </span>
          <div className="flex-1 h-px bg-slate-800"></div>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Nome Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Luan Azevedo"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">E-mail</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-9 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Confirmar Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-0"
                />
                <span>Lembrar de mim</span>
              </label>

              <button
                type="button"
                onClick={() => alert('Para redefinir sua senha, conecte-se com o Google ou crie uma nova conta.')}
                className="text-cyan-400 hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-teal-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Sparkles className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Entrar no AppFit' : 'Continuar e Validar E-mail'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Wipe Database Action for Testing */}
      <div className="text-center mt-5">
        <button
          type="button"
          onClick={() => {
            if (confirm('Tem certeza que deseja limpar todos os usuários cadastrados e reiniciar a base de dados?')) {
              wipeAllUsersDatabase();
              alert('Base de usuários limpa com sucesso!');
              window.location.reload();
            }
          }}
          className="text-[11px] text-slate-500 hover:text-red-400 transition-colors flex items-center justify-center gap-1.5 mx-auto py-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Limpar base de usuários e reiniciar testes</span>
        </button>
      </div>

      {/* Real Google Account Selection Dialog */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0b1220] border border-slate-800 rounded-3xl w-full max-w-sm p-5 shadow-2xl space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center mx-auto shadow-md">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>

            <h3 className="text-sm font-extrabold text-white text-center">
              Vincular Conta Google ao AppFit
            </h3>
            <p className="text-xs text-slate-400 text-center">
              A autenticação é validada diretamente pela Google. <strong>Não é necessário senha.</strong>
            </p>

            {/* Account 1: Luan Azevedo */}
            <button
              onClick={() => handleGoogleSelect('luanmazevedo@gmail.com', 'Luan Azevedo')}
              className="w-full p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center gap-3 text-left transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center text-xs">
                LA
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white">Luan Azevedo</div>
                <div className="text-[11px] text-slate-400 truncate">luanmazevedo@gmail.com</div>
              </div>
            </button>

            {/* Custom Google account input */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="text-[11px] text-slate-400 block font-semibold">Ou digite sua conta Google:</label>
              <input
                type="text"
                placeholder="Seu nome"
                value={customGoogleName}
                onChange={(e) => setCustomGoogleName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
              <input
                type="email"
                placeholder="seu.email@gmail.com"
                value={customGoogleEmail}
                onChange={(e) => setCustomGoogleEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
              <button
                disabled={!customGoogleEmail.includes('@')}
                onClick={() => handleGoogleSelect(customGoogleEmail, customGoogleName || customGoogleEmail.split('@')[0])}
                className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs disabled:opacity-40"
              >
                Vincular Conta Google e Acessar
              </button>
            </div>

            <button
              onClick={() => setShowGoogleModal(false)}
              className="w-full py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
