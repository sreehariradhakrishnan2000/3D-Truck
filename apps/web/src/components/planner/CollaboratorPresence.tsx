'use client';

import React from 'react';
import { usePlannerStore } from '@/store/plannerStore';
import { Users } from 'lucide-react';

const AVATAR_COLORS = [
  'bg-blue-500 text-white',
  'bg-emerald-500 text-white',
  'bg-indigo-500 text-white',
  'bg-amber-500 text-white',
  'bg-purple-500 text-white',
  'bg-rose-500 text-white',
];

function getInitials(email: string) {
  const parts = email.split('@')[0].split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function CollaboratorPresence() {
  const { activeCollaborators } = usePlannerStore();

  if (!activeCollaborators || activeCollaborators.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Live sync</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center -space-x-2 overflow-hidden">
        {activeCollaborators.slice(0, 4).map((c, i) => {
          const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
          const initials = getInitials(c.email);
          return (
            <div
              key={c.userId || c.email}
              title={c.email}
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold ring-2 ring-white shadow-sm select-none ${color}`}
            >
              {initials}
            </div>
          );
        })}
        {activeCollaborators.length > 4 && (
          <div className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700 ring-2 ring-white select-none">
            +{activeCollaborators.length - 4}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>{activeCollaborators.length} active</span>
      </div>
    </div>
  );
}

