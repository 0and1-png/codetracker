'use client';

import { useAuth } from '@/hooks/useAuth';

export function UserNav() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-blue-200">
        欢迎，<span className="font-medium text-white">{user.name}</span>
      </span>
      <button
        onClick={logout}
        className="text-sm text-blue-200 hover:text-white transition-colors"
      >
        退出
      </button>
    </div>
  );
}
