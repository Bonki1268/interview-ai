import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'danger' | 'info' | 'warning';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'info', children, className = '' }: BadgeProps) {
  const variants = {
    success: 'bg-green-100 text-green-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
