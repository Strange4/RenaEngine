"use client";

import { Pause, Play, RotateCcw, RotateCw, SkipBack, SkipForward } from "lucide-react";

// TODO (171-175): connect the buttons to the ReplayController
interface ReplayControlsProps {
  playing?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onStepBackward?: () => void;
  onStepForward?: () => void;
  onGoToStart?: () => void;
  onGoToEnd?: () => void;
}

// the 1 in the middle of the step arrows
const stepNumber = (
  <text x="12" y="15.5" textAnchor="middle" fontSize="9" fontWeight="bold" stroke="none" fill="currentColor">
    1
  </text>
);

export default function ReplayControls({
  playing = false,
  onPlay,
  onPause,
  onStepBackward,
  onStepForward,
  onGoToStart,
  onGoToEnd,
}: ReplayControlsProps) {
  return (
    <div className="replay-controls" role="toolbar" aria-label="Replay controls">
      <button type="button" aria-label="Step back" title="Step back" onClick={onStepBackward}>
        <RotateCcw aria-hidden="true">{stepNumber}</RotateCcw>
      </button>
      <button type="button" aria-label="Go to start" title="Go to start" onClick={onGoToStart}>
        <SkipBack aria-hidden="true" fill="currentColor" />
      </button>
      {playing ? (
        <button type="button" className="replay-play" aria-label="Pause" title="Pause" onClick={onPause}>
          <Pause aria-hidden="true" fill="currentColor" />
        </button>
      ) : (
        <button type="button" className="replay-play" aria-label="Play" title="Play" onClick={onPlay}>
          <Play aria-hidden="true" fill="currentColor" />
        </button>
      )}
      <button type="button" aria-label="Go to end" title="Go to end" onClick={onGoToEnd}>
        <SkipForward aria-hidden="true" fill="currentColor" />
      </button>
      <button type="button" aria-label="Step forward" title="Step forward" onClick={onStepForward}>
        <RotateCw aria-hidden="true">{stepNumber}</RotateCw>
      </button>
      {/* TODO (174): speed dropdown */}
    </div>
  );
}
