import { Archivo, Graduate, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";

export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

/** Variable, with the width axis for poster mode (font-stretch: 62%). */
export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const graduate = Graduate({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-graduate",
  display: "swap",
});

export const fontVariables = [
  instrumentSerif.variable,
  archivo.variable,
  plexMono.variable,
  graduate.variable,
].join(" ");
