import { describe, expect, it } from "vitest";
import { audible, clock, dbLabel, effectiveGain, faderToGain, type Strip } from "./mixState";

const strip = (id: string, over: Partial<Strip> = {}): Strip => ({ id, gain: 1, pan: 0, mute: false, solo: false, ...over });

describe("solo and mute", () => {
  it("plays everything when nothing is soloed or muted", () => {
    const all = [strip("vox"), strip("bv"), strip("gtr")];
    expect(all.map((s) => audible(s, all))).toEqual([true, true, true]);
  });

  it("mute silences only that track", () => {
    const all = [strip("vox"), strip("bv", { mute: true }), strip("gtr")];
    expect(all.map((s) => audible(s, all))).toEqual([true, false, true]);
  });

  it("solo plays only soloed tracks", () => {
    const all = [strip("vox", { solo: true }), strip("bv"), strip("gtr")];
    expect(all.map((s) => audible(s, all))).toEqual([true, false, false]);
  });

  it("several solos play together", () => {
    const all = [strip("vox", { solo: true }), strip("bv"), strip("gtr", { solo: true })];
    expect(all.map((s) => audible(s, all))).toEqual([true, false, true]);
  });

  it("mute wins over solo on the same track", () => {
    const all = [strip("vox", { solo: true, mute: true }), strip("bv")];
    expect(all.map((s) => audible(s, all))).toEqual([false, false]);
  });

  it("the acceptance case: solo the vocal, mute the backing vocals", () => {
    const all = [strip("vox", { solo: true }), strip("bv", { mute: true }), strip("drums")];
    expect(all.map((s) => effectiveGain(s, all))).toEqual([1, 0, 0]);
  });

  it("keeps the fader level when audible", () => {
    const all = [strip("vox", { gain: 0.5 })];
    expect(effectiveGain(all[0], all)).toBe(0.5);
  });
});

describe("fader and readouts", () => {
  it("maps 0.75 to unity and the ends to silence and +6 dB", () => {
    expect(faderToGain(0)).toBe(0);
    expect(faderToGain(0.75)).toBeCloseTo(1, 6);
    expect(faderToGain(1)).toBeCloseTo(10 ** (6 / 20), 6);
  });

  it("formats dB and time", () => {
    expect(dbLabel(1)).toBe("0.0");
    expect(dbLabel(0)).toBe("-inf");
    expect(dbLabel(2)).toBe("+6.0");
    expect(clock(92)).toBe("1:32");
    expect(clock(228)).toBe("3:48");
  });
});
