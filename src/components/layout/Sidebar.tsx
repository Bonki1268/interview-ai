'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Brain,
  ClipboardList,
  Settings,
  Mic,
  FileText,
  LogOut,
  GraduationCap,
  Gauge,
} from 'lucide-react';

interface SidebarProps {
  userName: string;
  userRole: 'admin' | 'user';
  open: boolean;
  onClose: () => void;
}

const userMenuItems = [
  { href: '/lobby', label: '面試準備大廳', icon: Mic },
  { href: '/report', label: '面試表現報告', icon: FileText },
];

const adminMenuItems = [
  { href: '/admin/dashboard', label: '系統營運總覽', icon: LayoutDashboard },
  { href: '/admin/users', label: '使用者權限控制', icon: Users },
  { href: '/admin/ai-config', label: 'AI 評分模型配置', icon: Brain },
  { href: '/admin/usage', label: 'API 用量監控', icon: Gauge },
  { href: '/admin/audit', label: '面試詳細稽核', icon: ClipboardList },
  { href: '/admin/settings', label: '系統核心參數', icon: Settings },
];

export function Sidebar({ userName, userRole, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
      isActive
        ? 'bg-teal-500/15 text-teal-400 border border-teal-500/20'
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
    }`;

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-60 bg-slate-900 flex flex-col z-50 transition-transform duration-200 ease-out lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="p-6 border-b border-slate-700/50">
          <Link href="/lobby" className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-lg">
            <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              <GraduationCap size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">面試系統</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* User menu */}
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-2">
            面試功能
          </p>
          {userMenuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={linkClass(isActive)}
              >
                <item.icon size={18} className={isActive ? 'text-teal-400' : 'text-slate-500'} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}

          {/* Admin menu */}
          {userRole === 'admin' && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3">
                  管理後台
                </p>
              </div>
              {adminMenuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={linkClass(isActive)}
                  >
                    <item.icon size={18} className={isActive ? 'text-teal-400' : 'text-slate-500'} aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User info + Logout */}
        <div className="p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-white">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{userName}</p>
              <p className="text-xs text-slate-500">
                {userRole === 'admin' ? '管理員' : '一般使用者'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full mt-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            <LogOut size={18} aria-hidden="true" />
            登出系統
          </button>
        </div>
      </aside>
    </>
  );
}
