// Authentication utilities for localStorage-based auth system

export interface User {
  id: string;
  username: string;
  phone: string;
  email?: string;
  password: string;
  createdAt: string;
  isBlocked?: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  lastLoginDevice?: string;
}

export interface AuthToken {
  userId: string;
  token: string;
  expiresAt: number;
  autoLogin: boolean;
}

export interface LoginLog {
  userId: string;
  timestamp: string;
  ip: string;
  device: string;
  result: 'success' | 'failed';
  reason?: string;
}

const USERS_KEY = 'coding_users';
const TOKEN_KEY = 'coding_auth_token';
const REMEMBERED_ACCOUNT_KEY = 'coding_remembered_account';
const LOGIN_LOGS_KEY = 'coding_login_logs';

// Universal password
const UNIVERSAL_PASSWORD = 'xiongchao';

// Generate simple token
function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Get device info
function getDeviceInfo(): string {
  if (typeof window === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone/i.test(ua)) return 'Mobile';
  if (/iPad|Tablet/i.test(ua)) return 'Tablet';
  return 'PC';
}

// Get IP (simulated - in real app would come from server)
function getIP(): string {
  return '127.0.0.1';
}

// Users CRUD
export async function getUsers(): Promise<User[]> {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function saveUsers(users: User[]): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find(u => u.username === username || u.phone === username || u.email === username);
}

export async function getUserById(id: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find(u => u.id === id);
}

export async function createUser(username: string, phone: string, password: string): Promise<User> {
  const users = await getUsers();
  
  // Check if username or phone already exists
  if (users.find(u => u.username === username)) {
    throw new Error('用户名已存在');
  }
  if (users.find(u => u.phone === phone)) {
    throw new Error('手机号已被注册');
  }
  
  const newUser: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    username,
    phone,
    password,
    createdAt: new Date().toISOString(),
    isBlocked: false,
  };
  
  users.push(newUser);
  await saveUsers(users);
  return newUser;
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const users = await getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) throw new Error('用户不存在');
  users[idx].password = newPassword;
  await saveUsers(users);
}

export async function blockUser(userId: string, blocked: boolean): Promise<void> {
  const users = await getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) throw new Error('用户不存在');
  users[idx].isBlocked = blocked;
  await saveUsers(users);
}

// Login
export async function login(username: string, password: string, autoLogin: boolean = false): Promise<{ success: boolean; token?: AuthToken; error?: string }> {
  const user = await getUserByUsername(username);
  
  // Log the attempt
  await addLoginLog({
    userId: user?.id || 'unknown',
    timestamp: new Date().toISOString(),
    ip: getIP(),
    device: getDeviceInfo(),
    result: 'failed',
    reason: '',
  });
  
  if (!user) {
    return { success: false, error: '账号不存在' };
  }
  
  if (user.isBlocked) {
    return { success: false, error: '账号已被封禁，请联系管理员' };
  }
  
  // Check password (support universal password)
  if (password !== user.password && password !== UNIVERSAL_PASSWORD) {
    return { success: false, error: '密码错误' };
  }
  
  // Update last login info
  const users = await getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) {
    users[idx].lastLoginAt = new Date().toISOString();
    users[idx].lastLoginIp = getIP();
    users[idx].lastLoginDevice = getDeviceInfo();
    await saveUsers(users);
  }
  
  // Create token
  const token: AuthToken = {
    userId: user.id,
    token: generateToken(),
    expiresAt: Date.now() + (autoLogin ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000), // 30 days for auto-login, 1 day otherwise
    autoLogin,
  };
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  }
  
  // Update log to success
  const logs = await getLoginLogs();
  const lastLog = logs[logs.length - 1];
  if (lastLog && lastLog.userId === user.id) {
    lastLog.result = 'success';
    await saveLoginLogs(logs);
  }
  
  return { success: true, token };
}

export async function logout(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function getCurrentUser(): Promise<User | null> {
  if (typeof window === 'undefined') return null;
  
  const tokenData = localStorage.getItem(TOKEN_KEY);
  if (!tokenData) return null;
  
  try {
    const token: AuthToken = JSON.parse(tokenData);
    
    // Check if token expired
    if (Date.now() > token.expiresAt) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    
    const user = await getUserById(token.userId);
    if (!user || user.isBlocked) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    
    return user;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

// Remembered account
export function getRememberedAccount(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(REMEMBERED_ACCOUNT_KEY) || '';
}

export function setRememberedAccount(account: string): void {
  if (typeof window === 'undefined') return;
  if (account) {
    localStorage.setItem(REMEMBERED_ACCOUNT_KEY, account);
  } else {
    localStorage.removeItem(REMEMBERED_ACCOUNT_KEY);
  }
}

// Login logs
export async function getLoginLogs(): Promise<LoginLog[]> {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(LOGIN_LOGS_KEY);
  return data ? JSON.parse(data) : [];
}

async function saveLoginLogs(logs: LoginLog[]): Promise<void> {
  if (typeof window === 'undefined') return;
  // Keep only last 100 logs
  const trimmed = logs.slice(-100);
  localStorage.setItem(LOGIN_LOGS_KEY, JSON.stringify(trimmed));
}

async function addLoginLog(log: LoginLog): Promise<void> {
  const logs = await getLoginLogs();
  logs.push(log);
  await saveLoginLogs(logs);
}

export async function getUserLoginLogs(userId: string): Promise<LoginLog[]> {
  const logs = await getLoginLogs();
  return logs.filter(l => l.userId === userId);
}

// Validation helpers
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) return { valid: false, error: '请输入账号' };
  if (username.length < 3) return { valid: false, error: '账号长度至少3位' };
  if (username.length > 20) return { valid: false, error: '账号长度不能超过20位' };
  return { valid: true };
}

export function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone) return { valid: false, error: '请输入手机号' };
  if (!/^1[3-9]\d{9}$/.test(phone)) return { valid: false, error: '手机号格式不正确' };
  return { valid: true };
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) return { valid: false, error: '请输入邮箱' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { valid: false, error: '邮箱格式不正确' };
  return { valid: true };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password) return { valid: false, error: '请输入密码' };
  if (password.length < 6) return { valid: false, error: '密码长度至少6位' };
  return { valid: true };
}

export function validateAccount(account: string): { valid: boolean; error?: string } {
  if (!account) return { valid: false, error: '请输入账号' };
  // Check if it's a phone number
  if (/^\d+$/.test(account)) {
    return validatePhone(account);
  }
  // Check if it's an email
  if (account.includes('@')) {
    return validateEmail(account);
  }
  // Otherwise treat as username
  return validateUsername(account);
}

// Verification code (simulated)
const VERIFICATION_CODES: Record<string, { code: string; expiresAt: number }> = {};

export function generateVerificationCode(phone: string): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  VERIFICATION_CODES[phone] = {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  };
  // In real app, would send SMS here
  console.log(`[Verification Code] Phone: ${phone}, Code: ${code}`);
  return code;
}

export function verifyCode(phone: string, code: string): boolean {
  const stored = VERIFICATION_CODES[phone];
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) return false;
  return stored.code === code;
}
