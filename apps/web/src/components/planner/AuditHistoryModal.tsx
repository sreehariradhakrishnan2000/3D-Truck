'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  History,
  X,
  Package,
  Sparkles,
  Trash2,
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  newState?: any;
  previousState?: any;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface AuditHistoryModalProps {
  loadId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditHistoryModal({ loadId, isOpen, onClose }: AuditHistoryModalProps) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['load-audit-logs', loadId],
    queryFn: () => api.get<AuditLogEntry[]>(`/loads/${loadId}/audit-logs`),
    enabled: isOpen,
    refetchInterval: isOpen ? 5000 : false,
  });

  if (!isOpen) return null;

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'AUTO_PACK_COMPLETED':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-purple-600" />,
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          label: 'Auto-Pack Engine',
        };
      case 'PACKAGE_PLACED':
        return {
          icon: <Package className="w-3.5 h-3.5 text-blue-600" />,
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          label: 'Cargo Placed',
        };
      case 'PACKAGE_REMOVED':
        return {
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          label: 'Cargo Removed',
        };
      case 'LOAD_CREATED':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Load Created',
        };
      default:
        return {
          icon: <History className="w-3.5 h-3.5 text-slate-600" />,
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          label: action.replace(/_/g, ' '),
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Load Audit Trail</h2>
              <p className="text-xs text-slate-500">Live immutable revision history & event logs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto divide-y divide-slate-100 flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading activity trail...</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No audit logs recorded for this load yet.
            </div>
          ) : (
            logs.map((log) => {
              const badge = getActionBadge(log.action);
              const formattedDate = new Date(log.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div key={log.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3">
                  <div className="mt-0.5">{badge.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        {formattedDate}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{log.user.firstName} {log.user.lastName} ({log.user.email})</span>
                    </div>

                    {log.newState && (
                      <div className="mt-1.5 bg-slate-50 rounded-lg p-2 text-[11px] font-mono text-slate-600 border border-slate-100 break-all">
                        {log.action === 'PACKAGE_PLACED' && (
                          <span>
                            X: {log.newState.x}mm | Y: {log.newState.y}mm | Z: {log.newState.z}mm | Rot: {log.newState.rotationIndex}
                          </span>
                        )}
                        {log.action === 'AUTO_PACK_COMPLETED' && (
                          <span>
                            Auto-packed {log.newState.placedCount} cargo items | Vol: {Number(log.newState.volumeUtilizationPct).toFixed(1)}% | Wt: {Number(log.newState.weightUtilizationPct).toFixed(1)}%
                          </span>
                        )}
                        {log.action !== 'PACKAGE_PLACED' && log.action !== 'AUTO_PACK_COMPLETED' && (
                          JSON.stringify(log.newState)
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>{logs.length} events logged</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-100 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

