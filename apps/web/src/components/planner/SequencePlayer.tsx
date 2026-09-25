'use client';

import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';

interface SequencePlayerProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  onNext: () => void;
  onPrev: () => void;
  onTogglePlay: () => void;
  onReset: () => void;
}

export function SequencePlayer({
  currentStep,
  totalSteps,
  isPlaying,
  onNext,
  onPrev,
  onTogglePlay,
  onReset,
}: SequencePlayerProps) {
  if (totalSteps === 0) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-5 py-2.5 shadow-apple-lg backdrop-blur-md">
      <div className="flex items-center gap-1.5 border-r border-slate-200 pr-3">
        <span className="text-xs font-bold text-slate-900">Sequence</span>
        <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
          Step {currentStep} / {totalSteps}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onReset}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          title="Reset to start"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={onPrev}
          disabled={currentStep <= 1}
          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 transition disabled:opacity-30"
          title="Previous Step"
        >
          <SkipBack className="h-4 w-4" />
        </button>

        <button
          onClick={onTogglePlay}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition"
          title={isPlaying ? 'Pause' : 'Play Sequence'}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>

        <button
          onClick={onNext}
          disabled={currentStep >= totalSteps}
          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 transition disabled:opacity-30"
          title="Next Step"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

