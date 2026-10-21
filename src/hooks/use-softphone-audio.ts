"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SoftphoneAudioState =
  "idle" | "testing" | "ready" | "denied" | "unavailable" | "error";

/** Explicit device check only. The provider SDK owns call media separately. */
export function useSoftphoneAudio() {
  const [state, setState] = useState<SoftphoneAudioState>("idle");
  const [deviceCount, setDeviceCount] = useState(0);
  const [level, setLevel] = useState(0);
  const [speakerState, setSpeakerState] = useState<
    "idle" | "playing" | "error"
  >("idle");
  const stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null);
  const speakerContext = useRef<AudioContext | null>(null);
  const frame = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const mounted = useRef(false);

  const releaseMicrophone = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (timer.current !== null) clearTimeout(timer.current);
    frame.current = null;
    timer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    const audioContext = context.current;
    context.current = null;
    if (audioContext && audioContext.state !== "closed") {
      void audioContext.close().catch(() => undefined);
    }
  }, []);

  const stop = useCallback(() => {
    generation.current += 1;
    releaseMicrophone();
    if (speakerTimer.current !== null) clearTimeout(speakerTimer.current);
    speakerTimer.current = null;
    const audioContext = speakerContext.current;
    speakerContext.current = null;
    if (audioContext && audioContext.state !== "closed") {
      void audioContext.close().catch(() => undefined);
    }
    if (mounted.current) {
      setLevel(0);
      setSpeakerState("idle");
      setState((previous) => (previous === "testing" ? "idle" : previous));
    }
  }, [releaseMicrophone]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop();
    };
  }, [stop]);

  const testMicrophone = useCallback(async () => {
    stop();
    const request = generation.current;
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setState("unavailable");
      return;
    }
    setState("testing");
    let media: MediaStream | undefined;
    let createdContext: AudioContext | undefined;
    try {
      media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      if (!mounted.current || generation.current !== request) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      if (navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!mounted.current || generation.current !== request) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        setDeviceCount(
          devices.filter((device) => device.kind === "audioinput").length,
        );
      }
      if (typeof AudioContext !== "undefined") {
        const audioContext = new AudioContext();
        createdContext = audioContext;
        context.current = audioContext;
        const input = audioContext.createMediaStreamSource(media);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        input.connect(analyser);
        const samples = new Uint8Array(analyser.frequencyBinCount);
        await audioContext.resume();
        if (!mounted.current || generation.current !== request) {
          media.getTracks().forEach((track) => track.stop());
          await audioContext.close().catch(() => undefined);
          return;
        }
        const readLevel = () => {
          if (!mounted.current || generation.current !== request) return;
          analyser.getByteTimeDomainData(samples);
          const average =
            samples.reduce((sum, sample) => sum + Math.abs(sample - 128), 0) /
            samples.length;
          setLevel(Math.min(100, Math.round(average * 5)));
          frame.current = requestAnimationFrame(readLevel);
        };
        frame.current = requestAnimationFrame(readLevel);
      }
      if (!mounted.current || generation.current !== request) {
        media.getTracks().forEach((track) => track.stop());
        if (createdContext && createdContext.state !== "closed") {
          void createdContext.close().catch(() => undefined);
        }
        return;
      }
      timer.current = setTimeout(() => {
        releaseMicrophone();
        if (mounted.current && generation.current === request) {
          setLevel(0);
          setState("ready");
        }
      }, 4000);
    } catch (error) {
      if (!mounted.current || generation.current !== request) {
        media?.getTracks().forEach((track) => track.stop());
        if (createdContext && createdContext.state !== "closed") {
          void createdContext.close().catch(() => undefined);
        }
        return;
      }
      releaseMicrophone();
      setState(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "denied"
          : error instanceof DOMException && error.name === "NotFoundError"
            ? "unavailable"
            : "error",
      );
    }
  }, [releaseMicrophone, stop]);

  const testSpeaker = useCallback(async () => {
    if (typeof AudioContext === "undefined") {
      setSpeakerState("error");
      return;
    }
    const request = generation.current;
    setSpeakerState("playing");
    const previous = speakerContext.current;
    if (previous?.state !== "closed")
      await previous?.close().catch(() => undefined);
    if (speakerTimer.current !== null) clearTimeout(speakerTimer.current);
    if (!mounted.current || generation.current !== request) return;
    try {
      const audioContext = new AudioContext();
      speakerContext.current = audioContext;
      await audioContext.resume();
      if (
        !mounted.current ||
        generation.current !== request ||
        speakerContext.current !== audioContext
      ) {
        await audioContext.close().catch(() => undefined);
        return;
      }
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 440;
      gain.gain.setValueAtTime(0, audioContext.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, audioContext.currentTime + 0.03);
      gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.45);
      setSpeakerState("playing");
      speakerTimer.current = setTimeout(() => {
        if (speakerContext.current === audioContext)
          speakerContext.current = null;
        void audioContext.close().catch(() => undefined);
        if (mounted.current) setSpeakerState("idle");
      }, 500);
    } catch {
      if (mounted.current) setSpeakerState("error");
    }
  }, []);

  return {
    state,
    deviceCount,
    level,
    speakerState,
    testMicrophone,
    testSpeaker,
    stop,
  };
}
