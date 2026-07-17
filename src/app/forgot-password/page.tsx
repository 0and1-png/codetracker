'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, X, Loader2, AlertCircle, Shield, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getUserByUsername, updateUserPassword, generateVerificationCode, verifyCode, validatePhone } from '@/lib/auth';

type Step = 'phone' | 'code' | 'password';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [phoneValidation, setPhoneValidation] = useState<{ error?: string }>({});
  const [codeValidation, setCodeValidation] = useState<{ error?: string }>({});
  const [passwordValidation, setPasswordValidation] = useState<{ error?: string }>({});
  const [confirmPasswordValidation, setConfirmPasswordValidation] = useState<{ error?: string }>({});
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });
  const [successDialog, setSuccessDialog] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Cooldown timer
  useEffect(() => {
    if (codeCooldown > 0) {
      const timer = setTimeout(() => setCodeCooldown(codeCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [codeCooldown]);

  // Validate phone
  const handlePhoneBlur = useCallback(() => {
    if (!phone) {
      setPhoneValidation({});
      return;
    }
    const result = validatePhone(phone);
    setPhoneValidation(result.valid ? {} : { error: result.error });
  }, [phone]);

  // Send verification code
  const handleSendCode = useCallback(async () => {
    if (codeCooldown > 0) return;
    
    const result = validatePhone(phone);
    if (!result.valid) {
      setPhoneValidation({ error: result.error || '请输入正确的手机号' });
      return;
    }

    // Check if phone exists
    const user = await getUserByUsername(phone);
    if (!user) {
      setErrorDialog({
        open: true,
        title: '手机号未注册',
        message: '该手机号尚未注册账号',
      });
      return;
    }

    setUserId(user.id);
    generateVerificationCode(phone);
    setCodeCooldown(60);
    setStep('code');
  }, [phone, codeCooldown]);

  // Verify code
  const handleVerifyCode = useCallback(() => {
    if (!/^\d{6}$/.test(verificationCode)) {
      setCodeValidation({ error: '请输入6位验证码' });
      return;
    }

    if (!verifyCode(phone, verificationCode)) {
      setCodeValidation({ error: '验证码错误或已过期' });
      return;
    }

    setStep('password');
  }, [phone, verificationCode]);

  // Reset password
  const handleResetPassword = useCallback(async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordValidation({ error: '密码长度至少6位' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordValidation({ error: '两次输入的密码不一致' });
      return;
    }

    if (!userId) {
      setErrorDialog({
        open: true,
        title: '错误',
        message: '用户信息丢失，请重新操作',
      });
      return;
    }

    setLoading(true);
    try {
      await updateUserPassword(userId, newPassword);
      setSuccessDialog(true);
    } catch (err) {
      setErrorDialog({
        open: true,
        title: '重置失败',
        message: err instanceof Error ? err.message : '重置密码失败，请重试',
      });
    } finally {
      setLoading(false);
    }
  }, [newPassword, confirmPassword, userId]);

  // Handle success
  const handleSuccessClose = useCallback(() => {
    setSuccessDialog(false);
    router.push('/login');
  }, [router]);

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

        {/* Forgot password card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">重置密码</h2>
            <p className="text-gray-500 mt-1">通过手机验证重置您的密码</p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'phone' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
              {step === 'phone' ? '1' : <CheckCircle className="h-4 w-4" />}
            </div>
            <div className="w-8 h-px bg-gray-200"></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'code' ? 'bg-blue-500 text-white' : step === 'password' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {step === 'password' ? <CheckCircle className="h-4 w-4" /> : '2'}
            </div>
            <div className="w-8 h-px bg-gray-200"></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'password' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              3
            </div>
          </div>

          {step === 'phone' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="resetPhone" className="text-gray-700">手机号</Label>
                <div className="relative mt-1">
                  <Input
                    id="resetPhone"
                    type="tel"
                    placeholder="请输入注册时的手机号"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setPhone(val);
                      setPhoneValidation({});
                    }}
                    onBlur={handlePhoneBlur}
                    className={`h-11 rounded-lg pr-10 ${phoneValidation.error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'}`}
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

              <Button
                className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium"
                disabled={!/^1[3-9]\d{9}$/.test(phone)}
                onClick={handleSendCode}
              >
                获取验证码
              </Button>
            </div>
          )}

          {step === 'code' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 text-center">
                验证码已发送至 {phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
              </p>
              <div>
                <Label htmlFor="resetCode" className="text-gray-700">验证码</Label>
                <div className="flex gap-3 mt-1">
                  <div className="relative flex-1">
                    <Input
                      id="resetCode"
                      type="text"
                      placeholder="6位验证码"
                      value={verificationCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setVerificationCode(val);
                        setCodeValidation({});
                      }}
                      className={`h-11 rounded-lg pr-10 ${codeValidation.error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'}`}
                      inputMode="numeric"
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
                    disabled={codeCooldown > 0}
                    onClick={handleSendCode}
                  >
                    {codeCooldown > 0 ? `${codeCooldown}s` : '重新发送'}
                  </Button>
                </div>
                {codeValidation.error && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {codeValidation.error}
                  </p>
                )}
              </div>

              <Button
                className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium"
                disabled={!/^\d{6}$/.test(verificationCode)}
                onClick={handleVerifyCode}
              >
                下一步
              </Button>
            </div>
          )}

          {step === 'password' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="newPassword" className="text-gray-700">新密码</Label>
                <div className="relative mt-1">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="至少6位"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordValidation({});
                    }}
                    className={`h-11 rounded-lg pr-10 ${passwordValidation.error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'}`}
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

              <div>
                <Label htmlFor="confirmNewPassword" className="text-gray-700">确认新密码</Label>
                <div className="relative mt-1">
                  <Input
                    id="confirmNewPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="再次输入新密码"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setConfirmPasswordValidation({});
                    }}
                    className={`h-11 rounded-lg pr-10 ${confirmPasswordValidation.error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'}`}
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
                className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium"
                disabled={!newPassword || !confirmPassword || loading}
                onClick={handleResetPassword}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    重置中...
                  </>
                ) : (
                  '重置密码'
                )}
              </Button>
            </div>
          )}
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
              重置成功
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              密码重置成功，请使用新密码登录。
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
