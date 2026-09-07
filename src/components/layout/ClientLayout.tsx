'use client';

import React, { useState } from 'react';
import { Menu, GraduationCap } from 'lucide-react';
import { Sidebar } from './Sidebar';

interface ClientLayoutProps {
  userName: string;
  userRole: 'admin' | 'user';
  children: React.ReactNode;
}

export function ClientLayout({ userName, userRole, children }: ClientLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar userName={userName} userRole={userRole} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-slate-900 border-b border-slate-700/50">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="開啟導覽選單"
          aria-expanded={sidebarOpen}
          className="p-2 -ml-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">面試系統</span>
        </div>
      </header>

      <main id="main-content" className="lg:ml-60 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
