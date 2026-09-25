'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { WS_EVENTS } from '@cargoflow/shared-types';
import { usePlannerStore } from '@/store/plannerStore';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { envConfig } from '@/lib/config';

export function useLoadRealtime(loadId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuthStore();
  const {
    updatePlacementOptimistic,
    removePlacementOptimistic,
    setConflictMessage,
    activeCollaborators,
    setActiveCollaborators,
    setLoadVersion,
  } = usePlannerStore();

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loadId || !user || !envConfig.wsUrl) return;

    const token = api.getToken();
    const socket = io(`${envConfig.wsUrl}/ws`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 15000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit(WS_EVENTS.JOIN_LOAD, { loadId });
    });

    socket.on(WS_EVENTS.LOAD_PRESENCE, (payload: { users: Array<{ userId: string; email: string }> }) => {
      if (payload?.users) {
        setActiveCollaborators(payload.users);
      }
    });

    socket.on(WS_EVENTS.USER_JOINED, (payload: { userId: string; email: string }) => {
      setActiveCollaborators((prev) => {
        if (prev.some((p) => p.userId === payload.userId)) return prev;
        return [...prev, payload];
      });
    });

    socket.on(WS_EVENTS.USER_LEFT, (payload: { userId: string }) => {
      setActiveCollaborators((prev) => prev.filter((c) => c.userId !== payload.userId));
    });

    socket.on(WS_EVENTS.PLACEMENT_ADDED, (data: any) => {
      updatePlacementOptimistic({
        id: data.id,
        loadPackageId: data.loadPackageId,
        x: data.x,
        y: data.y,
        z: data.z,
        rotationIndex: data.rotationIndex,
        isOptimistic: false,
      });
      if (data.loadVersion) setLoadVersion(data.loadVersion);
      queryClient.invalidateQueries({ queryKey: ['load', loadId] });
      queryClient.invalidateQueries({ queryKey: ['load-sequence', loadId] });
      queryClient.invalidateQueries({ queryKey: ['load-audit-logs', loadId] });
    });

    socket.on(WS_EVENTS.PLACEMENT_UPDATED, (data: any) => {
      updatePlacementOptimistic({
        id: data.id,
        loadPackageId: data.loadPackageId,
        x: data.x,
        y: data.y,
        z: data.z,
        rotationIndex: data.rotationIndex,
        isOptimistic: false,
      });
      if (data.loadVersion) setLoadVersion(data.loadVersion);
      queryClient.invalidateQueries({ queryKey: ['load', loadId] });
      queryClient.invalidateQueries({ queryKey: ['load-sequence', loadId] });
      queryClient.invalidateQueries({ queryKey: ['load-audit-logs', loadId] });
    });

    socket.on(WS_EVENTS.PLACEMENT_REMOVED, (data: { loadPackageId: string; loadVersion?: number }) => {
      removePlacementOptimistic(data.loadPackageId);
      if (data.loadVersion) setLoadVersion(data.loadVersion);
      queryClient.invalidateQueries({ queryKey: ['load', loadId] });
      queryClient.invalidateQueries({ queryKey: ['load-sequence', loadId] });
      queryClient.invalidateQueries({ queryKey: ['load-audit-logs', loadId] });
    });

    socket.on(WS_EVENTS.LOAD_UPDATED, (data: { version?: number }) => {
      if (data.version) setLoadVersion(data.version);
      queryClient.invalidateQueries({ queryKey: ['load', loadId] });
      queryClient.invalidateQueries({ queryKey: ['load-sequence', loadId] });
      queryClient.invalidateQueries({ queryKey: ['load-audit-logs', loadId] });
    });

    socket.on(WS_EVENTS.PACKING_COMPLETED, () => {
      queryClient.invalidateQueries({ queryKey: ['load', loadId] });
      queryClient.invalidateQueries({ queryKey: ['load-sequence', loadId] });
      queryClient.invalidateQueries({ queryKey: ['load-audit-logs', loadId] });
    });

    socket.on(WS_EVENTS.LOAD_CONFLICT, (data: { message: string; currentVersion?: number }) => {
      setConflictMessage(data.message || 'Conflict detected. Scene refreshed.');
      if (data.currentVersion) setLoadVersion(data.currentVersion);
      queryClient.invalidateQueries({ queryKey: ['load', loadId] });
    });

    return () => {
      socket.emit(WS_EVENTS.LEAVE_LOAD, { loadId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [loadId, user]);

  return { socket: socketRef.current };
}

