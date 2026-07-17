'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, X, Loader2, AlertCircle, CheckCircle, User, Lock, Phone, Mail, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { login, getRememberedAccount, setRememberedAccount, validateAccount, validatePassword, generateVerificationCode, verifyCode, type User as UserType } from '@/lib/auth';
import { useAuth } from '@/components/auth-provider';

type LoginMode = 'password' | 'verification';
type FieldError = { error?: string; success?: boolean };

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser } = useAuth();

  const [mode, setMode] = useState<LoginMode>('password');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberAccount, setRememberAccount] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [accountValidation, setAccountValidation] = useState<FieldError>({});
  const [passwordValidation, setPasswordValidation] = useState<FieldError>({});
  const [phoneValidation, setPhoneValidation] = useState<FieldError>({});
  const [codeValidation, setCodeValidation] = useState<FieldError>({});
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Load remembered account
  useEffect(() => {
    const remembered = getRememberedAccount();
    if (remembered) {
      setAccount(remembered);
      setRememberAccount(true);
    }
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (codeCooldown > 0) {
      const timer = setTimeout(() => setCodeCooldown(codeCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [codeCooldown]);

  // Validate account on blur
  const handleAccountBlur = useCallback(() => {
    if (!account) {
      setAccountValidation({});
      return;
    }
    const result = validateAccount(account);
    setAccountValidation(result.valid ? { success: true } : { error: result.error });
  }, [account]);

  // Validate password on blur
  const handlePasswordBlur = useCallback(() => {
    if (!password) {
      setPasswordValidation({});
      return;
    }
    const result = validatePassword(password);
    setPasswordValidation(result.valid ? { success: true } : { error: result.error });
  }, [password]);

  // Validate phone on blur
  const handlePhoneBlur = useCallback(() => {
    if (!phone) {
      setPhoneValidation({});
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setPhoneValidation({ error: '手机号格式不正确' });
    } else {
      setPhoneValidation({ success: true });
    }
  }, [phone]);

  // Send verification code
  const handleSendCode = useCallback(() => {
    if (codeCooldown > 0) return;
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setPhoneValidation({ error: '请先输入正确的手机号' });
      return;
    }
    generateVerificationCode(phone);
    setCodeCooldown(60);
    setCodeValidation({});
  }, [phone, codeCooldown]);

  // Password login
  const handlePasswordLogin = useCallback(async () => {
    const accountResult = validateAccount(account);
    const passwordResult = validatePassword(password);

    if (!accountResult.valid) {
      setAccountValidation({ error: accountResult.error });
      return;
    }
    if (!passwordResult.valid) {
      setPasswordValidation({ error: passwordResult.error });
      return;
    }

    setLoading(true);
    try {
      const result = await login(account, password, autoLogin);
      if (result.success) {
        if (rememberAccount) {
          setRememberedAccount(account);
        } else {
          setRememberedAccount('');
        }
        await refreshUser();
        router.push('/');
      } else {
        setErrorDialog({
          open: true,
          title: '登录失败',
          message: result.error || '登录失败，请重试',
        });
      }
    } catch {
      setErrorDialog({
        open: true,
        title: '网络异常',
        message: '登录请求超时，请检查网络后重试',
      });
    } finally {
      setLoading(false);
    }
  }, [account, password, autoLogin, rememberAccount, refreshUser, router]);

  // Verification code login
  const handleCodeLogin = useCallback(async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setPhoneValidation({ error: '请输入正确的手机号' });
      return;
    }
    if (!/^\d{6}$/.test(verificationCode)) {
      setCodeValidation({ error: '请输入6位验证码' });
      return;
    }

    if (!verifyCode(phone, verificationCode)) {
      setCodeValidation({ error: '验证码错误或已过期' });
      return;
    }

    setLoading(true);
    try {
      // For verification code login, we use phone as account and a special password
      const result = await login(phone, 'xiongchao', autoLogin);
      if (result.success) {
        if (rememberAccount) {
          setRememberedAccount(phone);
        } else {
          setRememberedAccount('');
        }
        await refreshUser();
        router.push('/');
      } else {
        setErrorDialog({
          open: true,
          title: '登录失败',
          message: result.error || '该手机号未注册',
        });
      }
    } catch {
      setErrorDialog({
        open: true,
        title: '网络异常',
        message: '登录请求超时，请检查网络后重试',
      });
    } finally {
      setLoading(false);
    }
  }, [phone, verificationCode, autoLogin, rememberAccount, refreshUser, router]);

  // Handle enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      if (mode === 'password') {
        handlePasswordLogin();
      } else {
        handleCodeLogin();
      }
    }
  }, [mode, loading, handlePasswordLogin, handleCodeLogin]);

  // Check if form is valid
  const isFormValid = mode === 'password'
    ? account.length > 0 && password.length >= 6
    : /^1[3-9]\d{9}$/.test(phone) && /^\d{6}$/.test(verificationCode);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" onKeyDown={handleKeyDown}>
      {/* Left side - Brand area (PC only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-500 to-indigo-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mb-8 backdrop-blur-sm">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold mb-4">少儿编程成长馆</h1>
          <p className="text-xl text-white/80 text-center max-w-md">记录每一步成长，见证每一次进步</p>
          <div className="mt-12 flex gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold">1000+</div>
              <div className="text-sm text-white/70">学员档案</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">5000+</div>
              <div className="text-sm text-white/70">学习记录</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">100+</div>
              <div className="text-sm text-white/70">成长报告</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">少儿编程成长馆</h1>
            <p className="text-sm text-gray-500 mt-1">记录每一步成长</p>
          </div>

          {/* Login card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">欢迎回来</h2>
            <p className="text-gray-500 mb-6">登录您的教师账号</p>

            {/* Mode tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-100">
              <button
                className={`pb-3 px-2 text-sm font-medium transition-colors ${mode === 'password' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setMode('password')}
              >
                账号登录
              </button>
              <button
                className={`pb-3 px-2 text-sm font-medium transition-colors ${mode === 'verification' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setMode('verification')}
              >
                验证码登录
              </button>
            </div>

            {mode === 'password' ? (
              /* Password login form */
              <div className="space-y-4">
                <div>
                  <Label htmlFor="account" className="text-gray-700">账号</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="account"
                      type="text"
                      placeholder="手机号 / 用户名 / 邮箱"
                      value={account}
                      onChange={(e) => {
                        setAccount(e.target.value);
                        setAccountValidation({});
                      }}
                      onBlur={handleAccountBlur}
                      className={`pl-10 pr-10 h-11 rounded-lg ${accountValidation.error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : accountValidation.success ? 'border-green-300 focus:border-green-500 focus:ring-green-200' : 'border-gray-200'}`}
                      inputMode="text"
                      autoComplete="username"
                    />
                    {account && (
                      <button
                        type="button"
                        onClick={() => { setAccount(''); setAccountValidation({}); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {accountValidation.error && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {accountValidation.error}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password" className="text-gray-700">密码</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordValidation({});
                      }}
                      onBlur={handlePasswordBlur}
                      className={`pl-10 pr-20 h-11 rounded-lg ${passwordValidation.error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : passwordValidation.success ? 'border-green-300 focus:border-green-500 focus:ring-green-200' : 'border-gray-200'}`}
                      autoComplete="current-password"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {password && (
                        <button
                          type="button"
                          onClick={() => { setPassword(''); setPasswordValidation({}); }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {passwordValidation.error && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {passwordValidation.error}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={rememberAccount} onCheckedChange={(checked) => setRememberAccount(checked as boolean)} />
                      <span className="text-sm text-gray-600">记住账号</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={autoLogin} onCheckedChange={(checked) => setAutoLogin(checked as boolean)} />
                      <span className="text-sm text-gray-600">自动登录</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/forgot-password')}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    忘记密码？
                  </button>
                </div>

                <Button
                  className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium"
                  disabled={!isFormValid || loading}
                  onClick={handlePasswordLogin}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    '登录'
                  )}
                </Button>
              </div>
            ) : (
              /* Verification code login form */
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone" className="text-gray-700">手机号</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="请输入手机号"
                      value={phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setPhone(val);
                        setPhoneValidation({});
                      }}
                      onBlur={handlePhoneBlur}
                      className={`pl-10 pr-10 h-11 rounded-lg ${phoneValidation.error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : phoneValidation.success ? 'border-green-300 focus:border-green-500 focus:ring-green-200' : 'border-gray-200'}`}
                      inputMode="numeric"
                      autoComplete="tel"
                    />
                    {phone && (
                      <button
                        type="button"
                        onClick={() => { setPhone(''); setPhoneValidation({}); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {phoneValidation.error && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {phoneValidation.error}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="code" className="text-gray-700">验证码</Label>
                  <div className="flex gap-3 mt-1">
                    <div className="relative flex-1">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="code"
                        type="text"
                        placeholder="6位验证码"
                        value={verificationCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setVerificationCode(val);
                          setCodeValidation({});
                        }}
                        className={`pl-10 pr-10 h-11 rounded-lg ${codeValidation.error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'}`}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                      />
                      {verificationCode && (
                        <button
                          type="button"
                          onClick={() => { setVerificationCode(''); setCodeValidation({}); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      className="h-11 px-4 rounded-lg border-blue-200 text-blue-600 hover:bg-blue-50 whitespace-nowrap"
                      disabled={codeCooldown > 0 || !/^1[3-9]\d{9}$/.test(phone)}
                      onClick={handleSendCode}
                    >
                      {codeCooldown > 0 ? `${codeCooldown}s` : '获取验证码'}
                    </Button>
                  </div>
                  {codeValidation.error && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {codeValidation.error}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={rememberAccount} onCheckedChange={(checked) => setRememberAccount(checked as boolean)} />
                    <span className="text-sm text-gray-600">记住账号</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={autoLogin} onCheckedChange={(checked) => setAutoLogin(checked as boolean)} />
                    <span className="text-sm text-gray-600">自动登录</span>
                  </label>
                </div>

                <Button
                  className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium"
                  disabled={!isFormValid || loading}
                  onClick={handleCodeLogin}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    '登录'
                  )}
                </Button>
              </div>
            )}

            {/* Register link */}
            <div className="mt-6 text-center">
              <span className="text-sm text-gray-500">还没有账号？</span>
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium ml-1"
              >
                立即注册
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            登录即表示同意《用户协议》和《隐私政策》
          </p>
        </div>
      </div>

      {/* Error dialog */}
      <Dialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {errorDialog.title}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {errorDialog.message}
            </DialogDescription>
          </DialogHeader>
          <Button
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700"
            onClick={() => setErrorDialog({ ...errorDialog, open: false })}
          >
            确定
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
