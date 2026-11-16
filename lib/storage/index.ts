"use client";

/**
 * The one place that talks to file storage. Swap this module to move to Cloudflare R2
 * (or anything else) without touching the panels or the console.
 */
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { supabase } from "@/lib/supabase/browser";

export const BUCKET = "sessions";

/** Upload bytes with progress (0–1). Producer only; storage rules refuse everyone else. */
export async function uploadFile(path: string, bytes: Uint8Array<ArrayBuffer>, onProgress?: (p: number) => void): Promise<void> {
  const sb = supabase();
  const token = (await sb?.auth.getSession())?.data.session?.access_token;
  if (!sb || !token) throw new Error("Not signed in.");
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`);
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", SUPABASE_KEY);
    xhr.setRequestHeader("content-type", "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("cache-control", "no-store");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error("Upload failed. Check the connection and try again."));
    xhr.send(new Blob([bytes]));
  });
}

/** Fetch a stored file through a 60-second signed URL. Only works for people with access. */
export async function fetchFile(path: string): Promise<Uint8Array<ArrayBuffer>> {
  const sb = supabase();
  if (!sb) throw new Error("Sessions aren't connected yet.");
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error || !data) throw new Error("No access to this file.");
  const res = await fetch(data.signedUrl, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
  if (!res.ok) throw new Error(`Couldn't load the audio (${res.status}).`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function removeFiles(paths: string[]): Promise<void> {
  const sb = supabase();
  if (!sb || !paths.length) return;
  await sb.storage.from(BUCKET).remove(paths);
}
