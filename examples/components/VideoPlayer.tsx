"use client";

import type { ComponentProps } from "react";
import { VideoPlayer } from "@/components/ui/video-player";

const labels: NonNullable<ComponentProps<typeof VideoPlayer>["labels"]> = {
  play: "Play introduction",
  pause: "Pause introduction",
  mute: "Mute introduction",
  unmute: "Unmute introduction",
  fullscreen: "Show introduction fullscreen",
  seek: "Introduction playback position",
  unavailable: "The introduction video is unavailable.",
};

export default function VideoPlayerExample() {
  return (
    <VideoPlayer
      src="/assets/aureform-motion.webm"
      poster="/assets/art/arc.svg"
      captionSrc="/assets/aureform-motion.vtt"
      label="Aureform original motion introduction"
      labels={labels}
      aspectRatio="16/9"
      className="max-w-3xl"
    />
  );
}
