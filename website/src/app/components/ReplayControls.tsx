"use client";

import { ChevronRight, Pause, Play, RotateCcw, RotateCw, SkipBack, SkipForward } from "lucide-react";
import { PLAYBACK_SPEEDS } from "../viewer/replayController";
import {useEffect, useRef, useState} from "react";

// TODO (171-175): connect the buttons to the ReplayController
interface ReplayControlsProps {
  playing?: boolean;
  speed?: number; //default is 1x
  onPlay?: () => void;
  onPause?: () => void;
  onStepBackward?: () => void;
  onStepForward?: () => void;
  onGoToStart?: () => void;
  onGoToEnd?: () => void;
  onSpeedChange?: (speed: number) => void;
}

// the 1 in the middle of the step arrows
const stepNumber = (
  <text x="12" y="15.5" textAnchor="middle" fontSize="9" fontWeight="bold" stroke="none" fill="currentColor">
    1
  </text>
);

//format the speed such that it has the "x" after the number, like 2x speed
const formatSpeed = (speed: number) => `${speed}x`;

//Speed selector is a dropdown menu containing the speed #x and the options
interface SpeedMenuItem{
  speed: number;
  onSpeedChange?: (speed: number) => void;
}

//the speed menu has a triangle pointer just like on Youtube that points to the options
//Returns the whole speed menu dropdown component with the options list and the triangle chevron
function SpeedMenuDropdown({speed, onSpeedChange}: SpeedMenuItem){

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null); //menu gets wrapped

  //if the menu is open, you can click anywhere on the screen to close it
  useEffect(()=>{
    if (!open){
      return;
    }
    const closeOnClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnClickOutside);
    return()=>{
      document.removeEventListener("mousedown", closeOnClickOutside);
    };
  }, [open]);


  //chosen speed will be made evident
  const chooseSpeed = (choice: number) => {
    setOpen(false);
    onSpeedChange?.(choice);
  };


//whole speed menu dropdown gets returned as suggested above
  return(
    <div className="replay-speed" ref={menuRef}>
      <button type="button" className="replay-speed-button" aria-label={`Speed ${formatSpeed(speed)}`} aria-haspopup="menu" aria-expanded = {open} title="Playback speed"
      onClick={()=> setOpen((wasOpen) => !wasOpen)}>

        Speed {formatSpeed(speed)}
        {/* Right next to 1x there is a triangle that point right, but when menu is selected it points down to show options */}
        <ChevronRight aria-hidden="true" className={open ? "replay-speed-arrow open": "replay-speed-arrow"} />

      </button>

      {/* options menu list when open menu */}
      {open && (
        <div className="replay-speed-menu" role="menu" aria-label="Playback speed">

          {PLAYBACK_SPEEDS.map((choice) =>(
            <button key={choice} type="button" role="menuitemradio" aria-checked={choice === speed} onClick={()=> chooseSpeed(choice)}>
              {formatSpeed(choice)}
            </button>
          ))}


        </div>
      )}
    </div>
  );
}


export default function ReplayControls({
  playing = false,
  speed = 1,
  onPlay,
  onPause,
  onStepBackward,
  onStepForward,
  onGoToStart,
  onGoToEnd,
  onSpeedChange,
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
      <SpeedMenuDropdown speed={speed} onSpeedChange = {onSpeedChange} />
    </div>
  );
}
