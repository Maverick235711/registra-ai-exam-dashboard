import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, LockKeyhole, Mail, ShieldCheck, User, UserPlus, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/apiService';

type AuthMode = 'login' | 'register' | 'verify';

export const UserAccountModal: React.FC = () => {
  const { currentUser, login, userModalOpen, setUserModalOpen, profileCompletion, authNotice, clearAuthNotice } = useApp();
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!userModalOpen && currentUser) return null;

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearAuthNotice();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      setPassword('');
      setUserModalOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearAuthNotice();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);
    try {
      const result = await apiService.register({ fullName: fullName.trim(), email: email.trim(), password, confirmPassword });
      setMode('verify');
      clearAuthNotice();
      setSuccessMessage(result.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearAuthNotice();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);
    try {
      const result = await apiService.verifyEmail(email.trim(), otp.trim());
      setMode('login');
      clearAuthNotice();
      setPassword('');
      setConfirmPassword('');
      setOtp('');
      setSuccessMessage(`${result.message} You can now sign in.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'OTP verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    clearAuthNotice();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);
    try {
      const result = await apiService.resendOtp(email.trim());
      setSuccessMessage(result.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not resend the OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    clearAuthNotice();
    setMode(nextMode);
    setErrorMessage('');
    setSuccessMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              {mode === 'register' ? <UserPlus className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {mode === 'verify' ? 'Verify your email' : mode === 'register' ? 'Create your REGISTRA account' : 'Sign in to REGISTRA'}
              </h3>
              <p className="text-xs text-slate-500">Your account securely accesses your private records and documents</p>
            </div>
          </div>
          {currentUser && (
            <button type="button" onClick={() => setUserModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" aria-label="Close account dialog">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {!currentUser && authNotice && (
            <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {authNotice}
            </div>
          )}
          {currentUser && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/80 via-blue-50/60 to-slate-50 border border-indigo-100/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Currently authenticated</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-3 h-3 inline mr-1" />Verified
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900">{currentUser.fullName}</div>
              <div className="text-xs text-slate-600 mt-0.5">{currentUser.email}</div>
              <div className="text-[11px] text-slate-500 mt-2">Profile completion: {profileCompletion.overall}%</div>
            </div>
          )}

          {mode !== 'verify' && (
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button type="button" onClick={() => switchMode('login')} className={`flex-1 rounded-lg py-2 text-xs font-semibold ${mode === 'login' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
                Sign in
              </button>
              <button type="button" onClick={() => switchMode('register')} className={`flex-1 rounded-lg py-2 text-xs font-semibold ${mode === 'register' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
                Create account
              </button>
            </div>
          )}

          {errorMessage && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Email address
                <span className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus-within:border-indigo-500 focus-within:bg-white">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full bg-transparent text-xs font-normal outline-none" placeholder="you@example.com" />
                </span>
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Password
                <span className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus-within:border-indigo-500 focus-within:bg-white">
                  <LockKeyhole className="w-4 h-4 text-slate-400" />
                  <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="w-full bg-transparent text-xs font-normal outline-none" placeholder="Your password" />
                </span>
              </label>
              <button type="submit" disabled={isSubmitting || !email.trim() || !password} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50">
                {isSubmitting && <LoaderCircle className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Full name
                <input type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-normal outline-none focus:border-indigo-500 focus:bg-white" placeholder="Your full name" />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Email address
                <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-normal outline-none focus:border-indigo-500 focus:bg-white" placeholder="you@example.com" />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Password
                <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-normal outline-none focus:border-indigo-500 focus:bg-white" placeholder="8+ characters, uppercase and number" />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Confirm password
                <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-normal outline-none focus:border-indigo-500 focus:bg-white" placeholder="Re-enter your password" />
              </label>
              <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50">
                {isSubmitting && <LoaderCircle className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Creating account…' : 'Create account and send OTP'}
              </button>
            </form>
          )}

          {mode === 'verify' && (
            <form onSubmit={handleVerifySubmit} className="space-y-3">
              <p className="text-xs text-slate-600">Enter the 6-digit code sent to <strong>{email}</strong>.</p>
              <label className="block text-xs font-bold text-slate-700">
                Verification code
                <input type="text" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} required minLength={6} maxLength={6} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm tracking-[0.3em] font-semibold outline-none focus:border-indigo-500 focus:bg-white" placeholder="000000" />
              </label>
              <button type="submit" disabled={isSubmitting || otp.length !== 6} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50">
                {isSubmitting && <LoaderCircle className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Verifying…' : 'Verify email'}
              </button>
              <button type="button" onClick={handleResendOtp} disabled={isSubmitting} className="w-full text-xs font-semibold text-indigo-700 hover:text-indigo-900 disabled:opacity-50">
                Resend verification code
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
