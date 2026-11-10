import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  UserCheck, 
  FileText, 
  Compass, 
  ClipboardCheck, 
  CheckCircle2, 
  Calendar, 
  Sparkles, 
  Settings, 
  LogOut, 
  ChevronRight,
  ShieldCheck,
  X,
  ExternalLink,
  Users
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RegistraLogo } from './RegistraLogo';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { 
    currentUser,
    activeTab, 
    setActiveTab, 
    profile, 
    documents,
    applications,
    exams,
    profileCompletion,
    setUserModalOpen,
    logout,
    addToast 
  } = useApp();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Dynamic counts strictly computed from user's actual database state
  const uploadedDocsCount = documents.filter((document) => Boolean(document.fileUrl)).length;
  const examsCount = exams.length;
  const applicationsCount = applications.length;
  const profileBadge = profileCompletion.overall === 100
    ? 'Complete'
    : `${profileCompletion.overall}%`;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { 
      id: 'profile', 
      label: 'My Profile', 
      icon: UserCheck, 
      badge: profileBadge, 
      badgeSuccess: profileCompletion.overall === 100 
    },
    { id: 'documents', label: 'My Documents', icon: FileText, count: uploadedDocsCount },
    { id: 'exams', label: 'Find Exams', icon: Compass, count: examsCount },
    { id: 'applications', label: 'My Applications', icon: ClipboardCheck, count: applicationsCount },
    { id: 'eligibility', label: 'Eligibility Checker', icon: CheckCircle2, badge: 'AI' },
    { id: 'deadlines', label: 'Deadline Calendar', icon: Calendar },
    { id: 'assistant', label: 'AI Assistant', icon: Sparkles, highlight: true },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    addToast('Logged out of candidate session.', 'info');
  };

  const userDisplayName = profile.personalInfo.fullName?.trim() || currentUser?.fullName?.trim() || 'Candidate';
  const userEmail = currentUser?.email || profile.personalInfo.email || 'student@university.edu';
  const userInitials = userDisplayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-slate-950 text-slate-300 flex flex-col border-r border-slate-800/80 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header with Ultra-Minimal Logo */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RegistraLogo variant="horizontal" theme="dark" size="md" />
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              PRO
            </span>
          </div>
          <button 
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Close navigation sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-900/30'
                    : item.highlight
                    ? 'text-indigo-300 hover:text-white hover:bg-slate-900/80 border border-indigo-500/20 bg-indigo-950/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-white' : item.highlight ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`} />
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : item.badgeSuccess 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && (
                    <span className={`text-xs tabular-nums px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {/* Quick Info Box */}
          <div className="pt-4 px-2">
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Zero Repetition Shield</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Your credentials are auto-mapped and never auto-submitted without your final verification step.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Student Profile Footer Card */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/90">
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div 
              className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 mr-2 group"
              onClick={() => handleNavClick('profile')}
              title="View & Edit Profile"
            >
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={userDisplayName}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/40 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-indigo-500/40 shrink-0 shadow-xs">
                  {userInitials}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate flex items-center gap-1 group-hover:text-indigo-300 transition-colors">
                  <span>{userDisplayName}</span>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    currentUser?.isVerified ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {userEmail}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setUserModalOpen(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                title="Switch Account"
                aria-label="Switch User Account"
              >
                <Users className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('settings')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Account Settings"
                aria-label="Account Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
