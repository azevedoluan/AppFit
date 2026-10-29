import type { User, PendingVerification } from '../types/auth';

interface RegisteredAccount {
  user: User;
  password?: string;
}

const STORAGE_KEY = 'appfit_registered_users_v3';
const PENDING_VERIFICATION_KEY = 'appfit_pending_verifications';

// Clear all users, workouts, and sessions from database
export function wipeAllUsersDatabase(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('appfit_registered_users_v2');
    localStorage.removeItem('appfit_registered_users');
    localStorage.removeItem(PENDING_VERIFICATION_KEY);
    localStorage.removeItem('appfit_current_session_user');
    localStorage.removeItem('appfit_user');
    localStorage.removeItem('appfit_is_guest');
    localStorage.removeItem('appfit_workout_days_v1');
    localStorage.removeItem('appfit_workout_days_v2');
    localStorage.removeItem('appfit_device_saved_google');

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('appfit_user_') || key.startsWith('appfit_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    // Ignore
  }
}

export function getRegisteredAccounts(): RegisteredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore
  }
  return [];
}

function saveRegisteredAccounts(accounts: RegisteredAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore
  }
}

// Generate 6-digit verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store pending verification for any signup (Email or Google first access)
export function startEmailVerification(
  name: string,
  email: string,
  password?: string,
  provider: 'email' | 'google' = 'email',
  avatarUrl?: string
): string {
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getRegisteredAccounts();

  // If email signup, check for duplicate email
  if (provider === 'email') {
    const existing = accounts.find(a => a.user.email.toLowerCase() === cleanEmail && a.user.isEmailVerified);
    if (existing) {
      throw new Error('Este e-mail já está cadastrado. Alterne para a aba "Entrar" para fazer login.');
    }
  }

  const code = generateVerificationCode();
  const pending: PendingVerification = {
    name: name.trim() || 'Usuário',
    email: cleanEmail,
    password,
    provider,
    avatarUrl,
    code,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  };

  try {
    const pendingList: PendingVerification[] = JSON.parse(
      localStorage.getItem(PENDING_VERIFICATION_KEY) || '[]'
    );
    const filtered = pendingList.filter(p => p.email !== cleanEmail);
    filtered.push(pending);
    localStorage.setItem(PENDING_VERIFICATION_KEY, JSON.stringify(filtered));
  } catch {
    // Fallback
  }

  return code;
}

// Verify code and complete account registration
export function verifyAndRegisterUser(email: string, inputCode: string): User {
  const cleanEmail = email.trim().toLowerCase();
  let pendingList: PendingVerification[] = [];
  try {
    pendingList = JSON.parse(localStorage.getItem(PENDING_VERIFICATION_KEY) || '[]');
  } catch {
    // Fallback
  }

  const pending = pendingList.find(p => p.email === cleanEmail);
  if (!pending) {
    throw new Error('Nenhum código pendente para este e-mail. Solicite um novo código.');
  }

  if (Date.now() > pending.expiresAt) {
    throw new Error('O código de verificação expirou. Clique em "Reenviar Código".');
  }

  if (pending.code !== inputCode.trim()) {
    throw new Error('Código de verificação incorreto. Verifique os 6 dígitos.');
  }

  // Code is valid! Create the verified user
  const accounts = getRegisteredAccounts();
  const provider = pending.provider || (pending.password ? 'email' : 'google');

  const newUser: User = {
    id: `${provider === 'google' ? 'google' : 'usr'}-${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
    name: pending.name,
    email: cleanEmail,
    avatarUrl: pending.avatarUrl,
    provider,
    isEmailVerified: true,
    createdAt: new Date().toISOString()
  };

  // Replace or add
  const existingIdx = accounts.findIndex(a => a.user.email.toLowerCase() === cleanEmail);
  if (existingIdx >= 0) {
    accounts[existingIdx] = { user: newUser, password: pending.password };
  } else {
    accounts.push({
      user: newUser,
      password: pending.password
    });
  }

  saveRegisteredAccounts(accounts);

  // Remove from pending
  const updatedPending = pendingList.filter(p => p.email !== cleanEmail);
  localStorage.setItem(PENDING_VERIFICATION_KEY, JSON.stringify(updatedPending));

  return newUser;
}

// Strict email + password login validation
export function loginAccount(email: string, password: string): User {
  const cleanInput = email.trim();
  const cleanLower = cleanInput.toLowerCase();

  // Credenciais do Administrador do Sistema (AppFit)
  if (cleanLower === 'appfit' || cleanLower === 'admin@appfit.com') {
    if (password === 'ATKa7ra7te&') {
      return {
        id: 'user-admin-001',
        name: 'AppFit',
        email: 'admin@appfit.com',
        provider: 'local',
        role: 'admin',
        isEmailVerified: true,
        createdAt: '2026-10-28T00:00:00.000Z'
      };
    } else {
      throw new Error('Senha de administrador incorreta.');
    }
  }

  const accounts = getRegisteredAccounts();

  const account = accounts.find(a => a.user.email.toLowerCase() === cleanLower);
  if (!account) {
    throw new Error('Usuário ou e-mail não encontrado. Verifique os dados digitados ou crie uma conta na aba "Cadastrar".');
  }

  if (account.password !== password) {
    throw new Error('Senha incorreta. Verifique os dados e tente novamente.');
  }

  if (account.user.isBlocked) {
    throw new Error('Esta conta de usuário foi bloqueada pela administração do sistema.');
  }

  return account.user;
}

export type GoogleAuthResult =
  | { type: 'success'; user: User }
  | { type: 'needs_verification'; code: string; email: string; name: string };

// Google Sign-In with First-Access Code Verification
export function handleGoogleSignInRequest(
  email: string,
  name: string,
  avatarUrl?: string
): GoogleAuthResult {
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getRegisteredAccounts();

  // If user is already registered and verified:
  const existing = accounts.find(a => a.user.email.toLowerCase() === cleanEmail && a.user.isEmailVerified);
  if (existing) {
    return { type: 'success', user: existing.user };
  }

  // First access: generate verification code and require validation!
  const code = startEmailVerification(name, cleanEmail, undefined, 'google', avatarUrl);
  return { type: 'needs_verification', code, email: cleanEmail, name };
}
