import type { User } from '../types/auth';

interface RegisteredAccount {
  user: User;
  password?: string;
}

const STORAGE_KEY = 'appfit_registered_users_v2';

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

// Strict user registration
export function registerAccount(name: string, email: string, password: string): User {
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getRegisteredAccounts();

  // Check for duplicate email
  const existing = accounts.find(a => a.user.email.toLowerCase() === cleanEmail);
  if (existing) {
    throw new Error('Este e-mail já está cadastrado. Alterne para a aba "Entrar" para fazer login.');
  }

  const newUser: User = {
    id: `usr-${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
    name: name.trim(),
    email: cleanEmail,
    provider: 'email',
    createdAt: new Date().toISOString()
  };

  accounts.push({
    user: newUser,
    password: password
  });

  saveRegisteredAccounts(accounts);
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

// Google Login (finds existing or registers new Google user)
export function loginOrRegisterGoogleAccount(email: string, name: string, avatarUrl?: string): User {
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getRegisteredAccounts();

  const existing = accounts.find(a => a.user.email.toLowerCase() === cleanEmail);
  if (existing) {
    return existing.user;
  }

  const newGoogleUser: User = {
    id: `google-${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
    name: name.trim() || 'Usuário Google',
    email: cleanEmail,
    avatarUrl,
    provider: 'google',
    createdAt: new Date().toISOString()
  };

  accounts.push({
    user: newGoogleUser
  });

  saveRegisteredAccounts(accounts);
  return newGoogleUser;
}
