'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, X, Loader2, AlertCircle, Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { createUser, validateUsername, validatePhone, validatePassword } from '@/lib/auth';

const INVITE_CODE = 'xiongchao';

type FieldError = { error?: string; success?: boolean };

export default function RegisterPage() {
  const router = useRouter();

  const [inviteCode, setInviteCode] = useState('');
  const [inviteCodeValid, setInviteCodeValid] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameValidation, setUsernameValidation] = useState<FieldError>({});
  const [phoneValidation, setPhoneValidation] = useState<FieldError>({});
  const [passwordValidation, setPasswordValidation] = useState<FieldError>({});
  const [confirmPasswordValidation, setConfirmPasswordValidation] = useState<FieldError>({});
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });
  const [successDialog, setSuccessDialog] = useState(false);

  // Validate invite code
  const handleInviteCodeBlur = useCallback(() => {
    if (!inviteCode) {
      setInviteCodeValid(null);
      return;
    }
    setInviteCodeValid(inviteCode === INVITE_CODE);
  }, [inviteCode]);

  // Validate username
  const handleUsernameBlur = useCallback(() => {
    if (!username) {
      setUsernameValidation({});
      return;
    }
    const result = validateUsername(username);
    setUsernameValidation(result.valid ? { success: true } : { error: result.error });
  }, [username]);

  // Validate phone
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

  // Validate password
  const handlePasswordBlur = useCallback(() => {
    if (!password) {
      setPasswordValidation({});
      return;
    }
    const result = validatePassword(password);
    setPasswordValidation(result.valid ? { success: true } : { error: result.error });
  }, [password]);

  // Validate confirm password
  const handleConfirmPasswordBlur = useCallback(() => {
    if (!confirmPassword) {
      setConfirmPasswordValidation({});
      return;
    }
    if (confirmPassword !== password) {
      setConfirmPasswordValidation({ error: '两次输入的密码不一致' });
    } else {
      setConfirmPasswordValidation({ success: true });
    }
  }, [confirmPassword, password]);

  // Handle register
  const handleRegister = useCallback(async () => {
    // Validate invite code
    if (inviteCode !== INVITE_CODE) {
      setInviteCodeValid(false);
      return;
    }

    // Validate all fields
    const usernameResult = validateUsername(username);
    if (!usernameResult.valid) {
      setUsernameValidation({ error: usernameResult.error });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setPhoneValidation({ error: '请输入正确的手机号' });
      return;
    }

    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      setPasswordValidation({ error: passwordResult.error });
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordValidation({ error: '两次输入的密码不一致' });
      return;
    }

    setLoading(true);
    try {
      await createUser(username, phone, password);
      setSuccessDialog(true);
    } catch (err) {
      setErrorDialog({
        open: true,
        title: '注册失败',
        message: err instanceof Error ? err.message : '注册失败，请重试',
      });
    } finally {
      setLoading(false);
    }
  }, [inviteCode, username, phone, password, confirmPassword]);

  // Handle success dialog close
  const handleSuccessClose = useCallback(() => {
    setSuccessDialog(false);
    router.push('/login');
  }, [router]);

  const isFormValid = inviteCode === INVITE_CODE &&
    username.length >= 3 &&
    /^1[3-9]\d{9}$/.test(phone) &&
    password.length >= 6 &&
    password === confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          onClick={() => router.push('/login')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">返回登录</span>
        </button>

        {/* Register card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">注册账号</h2>
            <p className="text-gray-500 mt-1">创建您的教师账号</p>
          </div>

          <div className="space-y-4">
            {/* Invite code */}
            <div>
              <Label htmlFor="inviteCode" className="text-gray-700">验证ID</Label>
              <div className="relative mt-1">
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="请输入验证ID"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value);
                    setInviteCodeValid(null);
                  }}
                  onBlur={handleInviteCodeBlur}
                  className={`h-11 rounded-lg ${inviteCodeValid === false ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : inviteCodeValid === true ? 'border-green-300 focus:border-green-500 focus:ring-green-200' : 'border-gray-200'}`}
                />
                {inviteCode && (
                  <button
                    type="button"
                    onClick={() => { setInviteCode(''); setInviteCodeValid(null); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {inviteCodeValid === false && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  验证ID不正确
                </p>
              )}
              {inviteCodeValid === true && (
                <p className="mt-1 text-xs text-green-500 flex items-center gap-1">
                  验证ID正确
                </p>
              )}
            </div>

            {/* Username */}
            <div>
              <Label htmlFor="username" className="text-gray-700">用户名</Label>
              <div className="relative mt-1">
                <Input
                  id="username"
                  type="text"
                  placeholder="3-20位字符"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameValidation({});
                  }}
                  onBlur={handleUsernameBlur}
                  className={`h-11 rounded-lg pr-10 ${usernameValidation.error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : usernameValidation.success ? 'border-green-300 focus:border-green-500 focus:ring-green-200' : 'border-gray-200'}`}
                />
                {username && (
                  <button
                    type="button"
                    onClick={() => { setUsername(''); setUsernameValidation({}); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {usernameValidation.error && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {usernameValidation.error}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="regPhone" className="text-gray-700">手机号</Label>
              <div className="relative mt-1">
                <Input
                  id="regPhone"
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setPhone(val);
                    setPhoneValidation({});
                  }}
                  onBlur={handlePhoneBlur}
                  className={`h-11 rounded-lg pr-10 ${phoneValidation.error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : phoneValidation.success ? 'border-green-300 focus:border-green-500 focus:ring-green-200' : 'border-gray-200'}`}
                  inputMode="numeric"
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

            {/* Password */}
            <div>
              <Label htmlFor="regPassword" className="text-gray-700">密码</Label>
              <div className="relative mt-1">
                <Input
                  id="regPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="至少6位"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordValidation({});
                  }}
                  onBlur={handlePasswordBlur}
                  className={`h-11 rounded-lg pr-10 ${passwordValidation.error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : passwordValidation.success ? 'border-green-300 focus:border-green-500 focus:ring-green-200' : 'border-gray-200'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordValidation.error && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {passwordValidation.error}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <Label htmlFor="confirmPassword" className="text-gray-700">确认密码</Label>
              <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setConfirmPasswordValidation({});
                  }}
                  onBlur={handleConfirmPasswordBlur}
                  className={`h-11 rounded-lg pr-10 ${confirmPasswordValidation.error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : confirmPasswordValidation.success ? 'border-green-300 focus:border-green-500 focus:ring-green-200' : 'border-gray-200'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPasswordValidation.error && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {confirmPasswordValidation.error}
                </p>
              )}
            </div>

            <Button
              className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium mt-6"
              disabled={!isFormValid || loading}
              onClick={handleRegister}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  注册中...
                </>
              ) : (
                '注册'
              )}
            </Button>
          </div>

          {/* Login link */}
          <div className="mt-6 text-center">
            <span className="text-sm text-gray-500">已有账号？</span>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium ml-1"
            >
              立即登录
            </button>
          </div>
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

      {/* Success dialog */}
      <Dialog open={successDialog} onOpenChange={setSuccessDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              注册成功
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              账号注册成功，即将跳转到登录页面。
            </DialogDescription>
          </DialogHeader>
          <Button
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
            onClick={handleSuccessClose}
          >
            去登录
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
