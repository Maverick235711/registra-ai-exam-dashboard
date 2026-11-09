import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  Sparkles, 
  Check, 
  ExternalLink, 
  Clock, 
  User, 
  ShieldCheck,
  ChevronDown,
  Users,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RegistraIcon } from './RegistraLogo';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileSidebar }) => {
  const { 
    currentUser,
    profile, 
    profileCompletion,
    searchQuery, 
    setSearchQuery, 
    notifications, 
    markNotificationsRead, 
    openWorkflow, 
    setActiveTab,
    setUserModalOpen,
    logout,
    setLogoModalOpen 
  } = useApp();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Dynamic greeting based on current time
  const currentHour = new Date().getHours();
  const timeOfDayGreeting = currentHour < 12 
    ? 'Good Morning' 
    : currentHour < 17 
      ? 'Good Afternoon' 
      : 'Good Evening';

  const userDisplayName = profile.personalInfo.fullName?.trim() || currentUser?.fullName?.trim() || '';
  const firstName = userDisplayName ? userDisplayName.split(' ')[0] : (currentUser?.email ? currentUser.email.split('@')[0] : 'Candidate');
  const userInitials = userDisplayName 
    ? userDisplayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (currentUser?.email ? currentUser.email.slice(0, 2).toUpperCase() : 'ST');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3.5 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Dynamic Greeting */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
            aria-label="Open navigation sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {timeOfDayGreeting}, {firstName} 👋
              </h1>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Let's make your exam applications effortless.
            </p>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-md mx-2 hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exams (JEE, NEET, GATE), forms, deadlines..."
              className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Actions, Notifications & Dynamic Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Logo Showcase Trigger */}
          <button
            type="button"
            onClick={() => setLogoModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/60 border border-slate-200/80 transition-all"
            title="Inspect Brand Identity"
          >
            <RegistraIcon size={14} className="text-indigo-600" />
            <span className="text-[11px]">Brand Logo</span>
          </button>

          {/* Quick Apply Action */}
          <button
            type="button"
            onClick={() => openWorkflow()}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm hover:shadow transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Apply with AI</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={markNotificationsRead}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-xl text-xs transition-colors ${
                        n.read ? 'bg-slate-50/60 hover:bg-slate-50' : 'bg-indigo-50/50 hover:bg-indigo-50/80 border border-indigo-100/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-semibold text-slate-900 truncate">{n.title}</span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{n.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile Quick Menu - Dynamic Profile Avatar & Details */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              aria-label="User profile options"
            >
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={userDisplayName}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/30"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-bold text-xs flex items-center justify-center ring-2 ring-indigo-500/20 shadow-xs">
                  {userInitials}
                </div>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {userDisplayName || 'Student Applicant'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {currentUser?.email || profile.personalInfo.email}
                  </div>
                  
                  {/* Dynamic Profile Progress Indicator */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Profile Readiness:</span>
                    <span className="font-bold text-indigo-600">{profileCompletion.overall}%</span>
                  </div>

                  <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>{currentUser?.isVerified ? 'Official Records Verified' : 'Standard Student Account'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('profile');
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg text-left"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>My Profile & Marks</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('documents');
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg text-left"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Document Vault</span>
                </button>

                {/* Account Switcher Button */}
                <button
                  type="button"
                  onClick={() => {
                    setUserModalOpen(true);
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50/70 rounded-lg text-left font-medium"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Switch Account / Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('settings');
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg text-left"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Security & Preferences</span>
                </button>

                <div className="pt-1 mt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg text-left"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Sign Out (Switch to Guest)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
