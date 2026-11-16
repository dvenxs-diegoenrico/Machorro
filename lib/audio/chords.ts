import { useSyncExternalStore } from "react";

/**
 * Chord shapes for the playable strings. Frets per string, low E → high E;
 * null = muted (×), 0 = open. Voicings are standard guitar grips.
 */
export type Chord = {
  id: string;
  /** how it's written on the button */
  label: string;
  /** how a screen reader says it */
  spoken: string;
  frets: readonly (number | null)[];
};

export const CHORDS: readonly Chord[] = [
  // C E B D: root, 3rd, 7th, 9th
  { id: "maj9", label: "Cmaj9", spoken: "C major nine", frets: [null, 3, 2, 4, 3, null] },
  // F# E A C: root, ♭7, ♭3, ♭5
  { id: "m7b5", label: "F#m7(b5)", spoken: "F sharp minor seven flat five", frets: [2, null, 2, 2, 1, null] },
  // E B D G# B F: root, 5th, ♭7, 3rd, 5th, ♭9
  { id: "7b9", label: "E7(b9)", spoken: "E seven flat nine", frets: [0, 2, 0, 1, 0, 1] },
  // B F G# D: root, ♭5, 𝄫7, ♭3
  { id: "dim7", label: "B°7", spoken: "B diminished seven", frets: [null, 2, 3, 1, 3, null] },
];

/** The fret the neck drawing runs to. */
export const NECK_FRETS = 5;

/* one chord held for the whole page, so every set of strings plays it */
let held: Chord | null = null;
const listeners = new Set<() => void>();

export function holdChord(chord: Chord | null) {
  held = chord;
  listeners.forEach((l) => l());
}

export function heldChord(): Chord | null {
  return held;
}

export function useHeldChord(): Chord | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => held,
    () => null,
  );
}

/** The note a string sounds: its open pitch raised by the held fret, or null if muted. */
export function stringPitch(open: number, string: number, chord: Chord | null): number | null {
  if (!chord) return open;
  const fret = chord.frets[string];
  return fret === null ? null : open * 2 ** (fret / 12);
}
