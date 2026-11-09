import React, { useState } from 'react';
import { 
  X, 
  User, 
  Mail, 
  ShieldCheck, 
  CheckCircle2, 
  LogIn, 
  UserPlus, 
  Building2, 
  Calendar,
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const UserAccountModal: React.FC = () => {
  const { 
    currentUser, 
    availableUsers, 
    switchUser, 
    login, 
    userModalOpen, 
    setUserModalOpen,
    profileCompletion 
  } = useApp();

  const [inputEmail, setInputEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!userModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEmail.trim()) return;
    setIsSubmitting(true);
    try {
      await login(inputEmail.trim());
      setInputEmail('');
      setUserModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectUser = async (userId: string) => {
    setIsSubmitting(true);
    try {
      await switchUser(userId);
      setUserModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">User Account & Authentication</h3>
              <p className="text-xs text-slate-500">Each account accesses their own private records & documents</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUserModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Active User Card */}
          {currentUser && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/80 via-blue-50/60 to-slate-50 border border-indigo-100/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                  Currently Authenticated
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  currentUser.isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {currentUser.isVerified ? 'Verified Student' : 'Candidate Account'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                  {currentUser.fullName ? currentUser.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'ST'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {currentUser.fullName || 'Student Applicant'}
                  </div>
                  <div className="text-xs text-slate-600 truncate flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{currentUser.email}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-indigo-100/60 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400">User ID:</span>{' '}
                  <span className="font-mono text-slate-700">{currentUser.id}</span>
                </div>
                <div>
                  <span className="text-slate-400">Profile Completion:</span>{' '}
                  <span className="font-bold text-indigo-700">{profileCompletion.overall}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Account Switcher */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Switch Test Account (Real Partitioned Database)
            </label>
            <div className="space-y-2">
              {availableUsers.map((u) => {
                const isSelected = u.id === currentUser?.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u.id)}
                    disabled={isSubmitting}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/30' 
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{u.fullName}</span>
                          {u.id === 'usr_26ucc005' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-semibold">
                              Current User
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400">{u.role?.split(' ')[0]}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Or Sign in with custom email */}
          <div className="pt-2 border-t border-slate-100">
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Sign in with Any Student Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder="e.g. your.email@university.edu"
                  required
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !inputEmail.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 shrink-0"
                >
                  Sign In / Create
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                New emails automatically create a fresh isolated student profile in the database.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
