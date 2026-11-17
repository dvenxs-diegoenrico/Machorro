"use client";

import { decodeToBuffer, decrypt, unpack } from "@/lib/audio/codec";
import { fetchFile } from "@/lib/storage";
import { supabase } from "@/lib/supabase/browser";
import type { Comment, SessionSource, Track } from "./types";

function client() {
  const sb = supabase();
  if (!sb) throw new Error("Sessions aren't connected yet.");
  return sb;
}

export const supabaseSource: SessionSource = {
  async loadProject(id) {
    const sb = client();
    const [{ data: project, error }, { data: versions }, { data: admin }, { data: user }] = await Promise.all([
      sb.from("projects").select("id, catalogue_no, artist, title, sent").eq("id", id).single(),
      sb.from("versions").select("*").eq("project_id", id).order("created_at"),
      sb.rpc("is_admin"),
      sb.auth.getUser(),
    ]);
    if (error || !project) throw new Error("This session isn't shared with you.");
    const email = user.user?.email ?? "";
    const { data: me } = await sb.from("clients").select("name").eq("email", email.toLowerCase()).maybeSingle();
    return { project, versions: versions ?? [], isAdmin: Boolean(admin), meEmail: email.toLowerCase(), meName: admin ? "Chorro" : (me?.name ?? email.split("@")[0]) };
  },

  async loadTracks(versionId) {
    const { data, error } = await client().from("tracks").select("*").eq("version_id", versionId).order("sort");
    if (error) throw new Error("Couldn't load the tracks.");
    return (data ?? []) as Track[];
  },

  async loadComments(versionId) {
    const { data } = await client().from("comments").select("*").eq("version_id", versionId).order("time_seconds");
    return (data ?? []) as Comment[];
  },

  async addComment(versionId, seconds, body) {
    const sb = client();
    const me = (await sb.auth.getUser()).data.user;
    const { data: admin } = await sb.rpc("is_admin");
    const { data: row } = await sb.from("clients").select("name").eq("email", (me?.email ?? "").toLowerCase()).maybeSingle();
    const { data, error } = await sb
      .from("comments")
      .insert({ version_id: versionId, time_seconds: seconds, body, author_name: admin ? "Chorro" : (row?.name ?? me?.email?.split("@")[0] ?? "") })
      .select()
      .single();
    if (error || !data) throw new Error("Couldn't save the comment.");
    return data as Comment;
  },

  async setResolved(id, resolved) {
    const { error } = await client().from("comments").update({ resolved }).eq("id", id);
    if (error) throw new Error("Only Chorro can resolve comments.");
  },

  async loadAudio(track, ctx) {
    const sb = client();
    const [{ data: key, error }, cipher] = await Promise.all([sb.rpc("get_track_key", { p_track: track.id }), fetchFile(track.stream_path)]);
    if (error || !key) throw new Error(error?.code === "54000" ? "Too many plays in a short time. Wait a few minutes." : "No access to this track.");
    const plain = await decrypt(cipher, key as string);
    return decodeToBuffer(unpack(plain), ctx);
  },
};
