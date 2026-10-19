"use client";
import { publicPath } from "@/lib/public-path";
import { useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export function VideoPlayer({
  src,
  poster,
  label,
  captionSrc,
  className,
  aspectRatio = "16/9",
  labels = {
    play: "Play",
    pause: "Pause",
    mute: "Mute",
    unmute: "Unmute",
    fullscreen: "Fullscreen",
    seek: "Playback position",
    unavailable: "Video unavailable",
  },
}: {
  src: string;
  poster?: string;
  label: string;
  captionSrc?: string;
  className?: string;
  aspectRatio?: string;
  labels?: {
    play: string;
    pause: string;
    mute: string;
    unmute: string;
    fullscreen: string;
    seek: string;
    unavailable: string;
  };
}) {
  const ref = useRef<HTMLVideoElement>(null),
    [playing, setPlaying] = useState(false),
    [muted, setMuted] = useState(false),
    [time, setTime] = useState(0),
    [duration, setDuration] = useState(0),
    [failed, setFailed] = useState(false);
  const format = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  const toggle = async () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        setFailed(true);
      }
    } else video.pause();
  };
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface",
        className,
      )}
    >
      <video
        ref={ref}
        src={publicPath(src)}
        poster={poster === undefined ? undefined : publicPath(poster)}
        aria-label={label}
        preload="metadata"
        playsInline
        muted={muted}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={() => setTime(ref.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(ref.current?.duration ?? 0)}
        onError={() => setFailed(true)}
        style={{ aspectRatio }}
        className="w-full object-cover"
      >
        {captionSrc && (
          <track
            kind="captions"
            src={publicPath(captionSrc)}
            srcLang="en"
            label="English"
            default
          />
        )}
      </video>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggle}
          aria-label={playing ? labels.pause : labels.play}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <span className="w-9 text-[10px] tabular-nums">{format(time)}</span>
        <input
          aria-label={labels.seek}
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={Math.min(time, duration || 1)}
          disabled={!duration}
          className="min-w-0 flex-1 accent-primary"
          onChange={(e) => {
            if (ref.current) ref.current.currentTime = Number(e.target.value);
            setTime(Number(e.target.value));
          }}
        />
        <span className="w-9 text-[10px] tabular-nums text-muted-foreground">
          {format(duration)}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={muted ? labels.unmute : labels.mute}
          onClick={() => setMuted(!muted)}
        >
          {muted ? <VolumeX /> : <Volume2 />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={labels.fullscreen}
          onClick={() => ref.current?.requestFullscreen?.()}
        >
          <Maximize />
        </Button>
      </div>
      {failed && (
        <p
          role="alert"
          className="px-4 pb-3 text-xs text-destructive-foreground"
        >
          {labels.unavailable}
        </p>
      )}
    </div>
  );
}
