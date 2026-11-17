/** `sent`: Dani has delivered the song, so the listening protections are off. */
export type Project = { id: string; catalogue_no: string; artist: string; title: string; sent?: boolean };
export type Version = { id: string; project_id: string; label: string; notes: string; is_current: boolean; created_at: string };
export type TrackKind = "stem" | "group" | "mix" | "master";
export type Track = {
  id: string;
  version_id: string;
  name: string;
  kind: TrackKind;
  grp: string;
  sort: number;
  stream_path: string;
  channels: number;
  frames: number;
  duration: number;
  peaks: number[];
};
export type Comment = {
  id: string;
  version_id: string;
  author_id: string;
  author_name: string;
  time_seconds: number;
  body: string;
  resolved: boolean;
  created_at: string;
};

/** Everything the console needs, from wherever it comes (Supabase, or the demo). */
export interface SessionSource {
  loadProject(id: string): Promise<{ project: Project; versions: Version[]; isAdmin: boolean; meName: string; meEmail: string }>;
  loadTracks(versionId: string): Promise<Track[]>;
  loadComments(versionId: string): Promise<Comment[]>;
  addComment(versionId: string, seconds: number, body: string): Promise<Comment>;
  setResolved(id: string, resolved: boolean): Promise<void>;
  /** Fetch, decrypt and decode one track into `ctx`. */
  loadAudio(track: Track, ctx: BaseAudioContext): Promise<AudioBuffer>;
}
