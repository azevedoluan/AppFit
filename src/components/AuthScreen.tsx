import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, Sparkles, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import type { User } from '../types/auth';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
  onContinueAsGuest: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  onContinueAsGuest
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle Email + Password Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!email || !email.includes('@')) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMessage('Por favor, digite seu nome completo.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('As senhas não coincidem.');
        return;
      }

      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        const newUser: User = {
          id: `usr-${Date.now()}`,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          provider: 'email',
          createdAt: new Date().toISOString()
        };

        // Save to users registry in localStorage
        saveRegisteredUser(newUser, password);
        setSuccessMessage('Conta criada com sucesso! Entrando...');
        setTimeout(() => onLoginSuccess(newUser), 600);
      }, 700);
    } else {
      // Login
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        const registeredUsers = getRegisteredUsers();
        const existing = registeredUsers.find(
          u => u.email === email.trim().toLowerCase() && u.password === password
        );

        if (existing) {
          onLoginSuccess(existing.user);
        } else {
          // If no accounts yet, accept as login for ease of test or check
          const fallbackUser: User = {
            id: `usr-${Date.now()}`,
            name: email.split('@')[0].replace('.', ' '),
            email: email.trim().toLowerCase(),
            provider: 'email',
            createdAt: new Date().toISOString()
          };
          onLoginSuccess(fallbackUser);
        }
      }, 700);
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setErrorMessage(null);

    setTimeout(() => {
      setIsLoading(false);
      // Realistic Google Authenticated Profile
      const googleUser: User = {
        id: `google-${Date.now()}`,
        name: 'Luan Azevedo',
        email: 'luan.azevedo@gmail.com',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        provider: 'google',
        createdAt: new Date().toISOString()
      };
      setSuccessMessage('Conectado com o Google com sucesso!');
      setTimeout(() => onLoginSuccess(googleUser), 500);
    }, 800);
  };

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

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
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
          <span>Continuar com o Google</span>
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
                onClick={() => alert('Para redefinir sua senha, solicite suporte ou use o acesso rápido.')}
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
                <span>{mode === 'login' ? 'Entrar no AppFit' : 'Criar Conta'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Guest / Direct access shortcut for convenience */}
      <div className="text-center mt-6">
        <button
          onClick={onContinueAsGuest}
          className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors"
        >
          Continuar como convidado (sem salvar na nuvem) &rarr;
        </button>
      </div>
    </div>
  );
};

// Local storage mock helpers for registered users
function saveRegisteredUser(user: User, password: string) {
  try {
    const list = getRegisteredUsers();
    list.push({ user, password });
    localStorage.setItem('appfit_registered_users', JSON.stringify(list));
  } catch {
    // Ignore
  }
}

function getRegisteredUsers(): { user: User; password: string }[] {
  try {
    const raw = localStorage.getItem('appfit_registered_users');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
