import React from 'react';
import { useApp } from '../context/AppContext';

const navItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'profile', label: 'My Profile' },
  { id: 'documents', label: 'My Documents' },
  { id: 'exams', label: 'Find Exams' },
  { id: 'applications', label: 'My Applications' },
  { id: 'eligibility', label: 'Eligibility Checker' },
  { id: 'deadlines', label: 'Deadline Calendar' },
  { id: 'assistant', label: 'AI Assistant' },
  { id: 'settings', label: 'Settings' },
] as const;

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  return (
    <nav className="nav-scrollbar-hidden mx-auto mt-5 w-full max-w-[1280px] overflow-x-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
      <div className="flex min-w-max items-center gap-2 pb-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-registra focus-visible:ring-offset-2 ${
                isActive
                  ? 'border-registra bg-registra text-white shadow-sm hover:bg-registra-dark'
                  : 'border-registra/15 bg-white/75 text-ink hover:border-registra/35 hover:bg-registra-light'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
