import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, ChevronDown, Clock, ExternalLink, LogOut, Search, ShieldCheck, Sparkles, User, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Header: React.FC = () => {
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
  } = useApp();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const currentDate = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  const userDisplayName = currentUser?.fullName?.trim() || profile.personalInfo.fullName?.trim() || '';
  const firstName = userDisplayName.split(/\s+/)[0] || 'Candidate';
  const userInitials = userDisplayName
    ? userDisplayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotificationsOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigate = (tab: string) => {
    setActiveTab(tab);
    setProfileDropdownOpen(false);
  };

  return (
    <header className="w-full px-4 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[11px] font-medium text-muted">{currentDate}</span>
          </div>
          <h1 className="font-display mt-3 text-[2rem] font-extrabold leading-tight text-ink sm:text-[2.4rem]">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted">Let&apos;s make your exam applications effortless.</p>
        </div>

        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2 md:flex md:w-auto md:shrink-0">
          <label className="relative min-w-0">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/70" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search exams (JEE, NEET, GATE...)"
              aria-label="Search exams"
              className="h-10 w-full min-w-0 rounded-full border border-registra/15 bg-white/80 pl-10 pr-3 text-[11px] text-ink shadow-sm outline-none transition placeholder:text-muted focus:border-registra focus:ring-2 focus:ring-registra/15 md:w-52 lg:w-56"
            />
          </label>

          <button
            type="button"
            onClick={() => openWorkflow()}
            className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-registra px-3 text-[11px] font-bold text-white shadow-sm transition hover:bg-registra-dark focus-visible:ring-2 focus-visible:ring-registra focus-visible:ring-offset-2 sm:px-4"
          >
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            Apply with AI
          </button>

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((open) => !open)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-registra/15 bg-white/80 text-ink transition hover:bg-registra-light"
              aria-label="View notifications"
              aria-expanded={notificationsOpen}
            >
              <Bell aria-hidden="true" className="h-4 w-4" />
              {unreadCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-registra ring-2 ring-white" />}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-registra/15 bg-white p-3 shadow-lg">
                <div className="mb-2 flex items-center justify-between border-b border-registra/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-registra-light px-2 py-0.5 text-[10px] font-semibold text-registra-dark">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={markNotificationsRead}
                    disabled={unreadCount === 0}
                    className="rounded-full px-2 py-1 text-[11px] font-semibold text-registra-dark hover:bg-registra-light disabled:opacity-50"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-72 space-y-1.5 overflow-y-auto">
                  {notifications.length === 0 && (
                    <p className="rounded-2xl bg-slate-50 p-4 text-center text-xs text-muted">No notifications yet.</p>
                  )}
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`rounded-2xl p-3 text-xs ${notification.read ? 'bg-slate-50/70' : 'border border-registra/10 bg-registra-light/60'}`}
                    >
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <span className="truncate font-semibold text-ink">{notification.title}</span>
                        <span className="whitespace-nowrap text-[10px] text-muted">{notification.time}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted">{notification.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileDropdownOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-registra text-xs font-bold text-white shadow-sm transition hover:bg-registra-dark"
              aria-label="User profile options"
              aria-expanded={profileDropdownOpen}
            >
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                userInitials
              )}
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-3xl border border-registra/15 bg-white p-2.5 shadow-lg">
                <div className="mb-1 border-b border-registra/10 px-3 py-2">
                  <div className="truncate text-xs font-bold text-ink">{userDisplayName || 'Candidate'}</div>
                  <div className="truncate text-[11px] text-muted">{currentUser?.email || profile.personalInfo.email}</div>
                  <div className="mt-2 flex items-center justify-between border-t border-registra/10 pt-2 text-[11px]">
                    <span className="text-muted">Profile readiness</span>
                    <span className="font-bold text-registra-dark">{profileCompletion.overall}%</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-emerald-800">
                    <ShieldCheck aria-hidden="true" className="h-3 w-3 shrink-0" />
                    {currentUser?.isVerified ? 'Official Records Verified' : 'Standard Student Account'}
                  </div>
                </div>

                <button type="button" onClick={() => navigate('profile')} className="flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-left text-xs text-ink hover:bg-registra-light">
                  <User aria-hidden="true" className="h-3.5 w-3.5 text-registra" />
                  My Profile &amp; Marks
                </button>
                <button type="button" onClick={() => navigate('documents')} className="flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-left text-xs text-ink hover:bg-registra-light">
                  <Clock aria-hidden="true" className="h-3.5 w-3.5 text-registra" />
                  Document Vault
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserModalOpen(true);
                    setProfileDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-left text-xs font-medium text-registra-dark hover:bg-registra-light"
                >
                  <Users aria-hidden="true" className="h-3.5 w-3.5" />
                  Account / Sign In
                </button>
                <button type="button" onClick={() => navigate('settings')} className="flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-left text-xs text-ink hover:bg-registra-light">
                  <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 text-registra" />
                  Security &amp; Preferences
                </button>
                <div className="mt-1 border-t border-registra/10 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      void logout();
                      setProfileDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-left text-xs text-registra-dark hover:bg-registra-light"
                  >
                    <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
                    Sign out
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
