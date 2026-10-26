import type { User, PendingVerification } from '../types/auth';

interface RegisteredAccount {
  user: User;
  password?: string;
}

const STORAGE_KEY = 'appfit_registered_users_v3';
const PENDING_VERIFICATION_KEY = 'appfit_pending_verifications';

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

// Store pending verification
export function startEmailVerification(name: string, email: string, password?: string): string {
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getRegisteredAccounts();

  // Check if already registered
  const existing = accounts.find(a => a.user.email.toLowerCase() === cleanEmail);
  if (existing) {
    throw new Error('Este e-mail já está cadastrado. Alterne para a aba "Entrar" para fazer login.');
  }

  const code = generateVerificationCode();
  const pending: PendingVerification = {
    name: name.trim(),
    email: cleanEmail,
    password,
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
  const newUser: User = {
    id: `usr-${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
    name: pending.name,
    email: cleanEmail,
    provider: 'email',
    isEmailVerified: true,
    createdAt: new Date().toISOString()
  };

  accounts.push({
    user: newUser,
    password: pending.password
  });

  saveRegisteredAccounts(accounts);

  // Remove from pending
  const updatedPending = pendingList.filter(p => p.email !== cleanEmail);
  localStorage.setItem(PENDING_VERIFICATION_KEY, JSON.stringify(updatedPending));

  return newUser;
}

// Strict login validation
export function loginAccount(email: string, password: string): User {
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getRegisteredAccounts();

  const account = accounts.find(a => a.user.email.toLowerCase() === cleanEmail);
  if (!account) {
    throw new Error('E-mail não encontrado. Verifique o e-mail digitado ou crie uma conta na aba "Cadastrar".');
  }

  if (account.password !== password) {
    throw new Error('Senha incorreta. Verifique os dados e tente novamente.');
  }

  return account.user;
}

// Real Google Account Link (Google verified, no password needed)
export function loginOrRegisterGoogleAccount(email: string, name: string, avatarUrl?: string): User {
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getRegisteredAccounts();

  const existing = accounts.find(a => a.user.email.toLowerCase() === cleanEmail);
  if (existing) {
    // Update avatar or name if provided by Google
    if (avatarUrl && !existing.user.avatarUrl) {
      existing.user.avatarUrl = avatarUrl;
    }
    existing.user.provider = 'google';
    existing.user.isEmailVerified = true;
    saveRegisteredAccounts(accounts);
    return existing.user;
  }

  // Create new user directly verified via Google OAuth
  const newGoogleUser: User = {
    id: `google-${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
    name: name.trim() || 'Usuário Google',
    email: cleanEmail,
    avatarUrl,
    provider: 'google',
    isEmailVerified: true,
    createdAt: new Date().toISOString()
  };

  accounts.push({
    user: newGoogleUser
  });

  saveRegisteredAccounts(accounts);
  return newGoogleUser;
}
