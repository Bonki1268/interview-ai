'use client';

import React from 'react';
import { Sidebar } from './Sidebar';

interface ClientLayoutProps {
  userName: string;
  userRole: 'admin' | 'user';
  children: React.ReactNode;
}

export function ClientLayout({ userName, userRole, children }: ClientLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar userName={userName} userRole={userRole} />
      <main className="ml-60 p-8">{children}</main>
    </div>
  );
}
