"use client";

import { useEffect, useRef, useState } from "react";
import type { HeroVideo as HeroVideoSource } from "@/lib/types";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import { useReady } from "@/lib/motion";

/** Below this width the lighter `mobileSrc` rendition is used. */
const MOBILE_QUERY = "(max-width: 767px)";

type Props = {
  video: HeroVideoSource;
  /** Accessible description of what the film shows. */
  label: string;
};

/**
 * Full-bleed brand film for the hero. Plays muted and looping on its own
 * (browsers only allow muted autoplay), pauses while scrolled out of view,
 * and offers Sound on/off and Pause/Play. Under reduced motion or the data
 * saver it does not autoplay: the poster shows with a Play button instead.
 */
export default function HeroVideo({ video, label }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotionSafe();
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [autoplay, setAutoplay] = useState(false);

  // Pick the rendition and decide on autoplay after mount (both depend on the
  // device), so the server markup is just the poster.
  useEffect(() => {
    const mobile = window.matchMedia(MOBILE_QUERY).matches;
    setSrc(mobile && video.mobileSrc ? video.mobileSrc : video.src);
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    setAutoplay(!reduce && !conn?.saveData);
  }, [video.src, video.mobileSrc, reduce]);

  // Start from the first frame once the preloader lifts (so nobody misses the
  // opening seconds behind it); pause off-screen, resume on return (only if
  // the visitor has not paused it themselves).
  const ready = useReady();
  const userPaused = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !src || !ready) return;
    if (autoplay) {
      el.currentTime = 0;
      el.play().catch(() => setPlaying(false));
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          if (!userPaused.current && autoplay) el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src, autoplay, ready]);

  const togglePlay = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      userPaused.current = false;
      el.play().catch(() => {});
    } else {
      userPaused.current = true;
      el.pause();
    }
  };

  const toggleSound = () => {
    const el = ref.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    // Unmuting is a user gesture, so playback may start here too.
    if (el.paused && !el.muted) {
      userPaused.current = false;
      el.play().catch(() => {});
    }
  };

  return (
    <>
      <video
        ref={ref}
        className="absolute inset-0 h-full w-full object-cover"
        src={src ?? undefined}
        poster={video.poster}
        muted
        loop
        playsInline
        preload={autoplay ? "auto" : "none"}
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
      />

      {/* Controls, top-right under the nav; ink on a paper chip so they read
          over any frame. */}
      <div className="absolute right-[var(--gutter)] top-24 z-10 flex gap-2">
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={!muted}
          data-cursor="link"
          className="label rounded-full bg-paper/80 px-4 py-3 text-ink backdrop-blur-sm transition-colors hover:bg-paper"
        >
          {muted ? "Sound on" : "Sound off"}
        </button>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause the film" : "Play the film"}
          data-cursor="link"
          className="label rounded-full bg-paper/80 px-4 py-3 text-ink backdrop-blur-sm transition-colors hover:bg-paper"
        >
          {playing ? "Pause" : "Play"}
        </button>
      </div>
    </>
  );
}
