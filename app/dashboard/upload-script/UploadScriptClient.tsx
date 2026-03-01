"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabaseClient";
import type { ScriptJSON, ScriptScene } from "@/types";
import { CheckCircle2, Upload, FileCode, AlertCircle } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";

/* ── Validator ──────────────────────────────────── */
function validateScriptJSON(raw: string): { ok: boolean; data?: ScriptJSON; errors: string[] } {
  const errors: string[] = [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { return { ok: false, errors: ["Invalid JSON — check your syntax."] }; }

  const obj = parsed as Record<string, unknown>;
  if (!obj.episodeTitle || typeof obj.episodeTitle !== "string") errors.push('"episodeTitle" (string) is required at the root.');
  if (!Array.isArray(obj.scenes) || obj.scenes.length === 0) {
    errors.push('"scenes" must be a non-empty array.');
  } else {
    (obj.scenes as Record<string, unknown>[]).forEach((scene, i) => {
      if (!scene.sceneId) errors.push(`Scene ${i + 1}: missing "sceneId".`);
      if (!scene.sceneName) errors.push(`Scene ${i + 1}: missing "sceneName".`);
      if (!Array.isArray(scene.characters)) {
        errors.push(`Scene ${i + 1}: "characters" must be an array.`);
      } else {
        (scene.characters as Record<string, unknown>[]).forEach((char, j) => {
          if (!char.name) errors.push(`Scene ${i + 1}, Character ${j + 1}: missing "name".`);
          if (!Array.isArray(char.dialogue)) errors.push(`Scene ${i + 1}, Character ${j + 1}: "dialogue" must be an array.`);
        });
      }
    });
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: parsed as ScriptJSON, errors: [] };
}

function extractCharacters(scenes: ScriptScene[]) {
  const names = new Set<string>();
  scenes.forEach((s) => s.characters.forEach((c) => names.add(c.name)));
  return Array.from(names);
}

const EXAMPLE_JSON = JSON.stringify({
  episodeTitle: "The Big Heist",
  scenes: [{
    sceneId: "scene_01", sceneName: "The Planning Room", background: "planning_room_bg",
    characters: [
      { name: "Jax", position: "left", dialogue: [{ line: "Alright team, here's the plan...", mouthShape: "A" }] },
      { name: "Mika", position: "right", dialogue: [{ line: "This better work, Jax.", mouthShape: "E" }] },
    ],
    props: ["table", "blueprint"],
  }],
}, null, 2);

/* ── Component ──────────────────────────────────── */
export default function UploadScriptClient({ userId }: { userId: string }) {
  const [showTitle, setShowTitle] = useState("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ sceneCount: number; characters: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleValidate = () => {
    setErrors([]); setPreview(null); setSaved(false);
    if (!scriptText.trim()) { setErrors(["Please paste or upload your script JSON."]); return; }
    const result = validateScriptJSON(scriptText);
    if (!result.ok) { setErrors(result.errors); return; }
    const chars = extractCharacters(result.data!.scenes);
    setPreview({ sceneCount: result.data!.scenes.length, characters: chars });
    if (!episodeTitle && result.data!.episodeTitle) setEpisodeTitle(result.data!.episodeTitle);
  };

  const handleSubmit = async () => {
    if (!showTitle.trim() || !episodeTitle.trim()) { setErrors(["Show Title and Episode Title are required."]); return; }
    const result = validateScriptJSON(scriptText);
    if (!result.ok) { setErrors(result.errors); return; }
    setSaving(true); setErrors([]);
    try {
      const { error } = await supabase.from("episodes").insert({
        user_id: userId,
        title: `${showTitle} — ${episodeTitle}`,
        script: scriptText,
        status: "draft",
        metadata: {
          show_title: showTitle, episode_title: episodeTitle,
          scene_count: result.data!.scenes.length,
          characters: extractCharacters(result.data!.scenes),
        },
      });
      setSaving(false);
      if (error) { console.error("Supabase insert error:", error); setErrors([`Failed to save: ${error.message}`]); }
      else { setSaved(true); setShowTitle(""); setEpisodeTitle(""); setScriptText(""); setPreview(null); }
    } catch (e) {
      console.error("[UploadScriptPage] Catch error:", e);
      setSaving(false);
      setErrors(["Network error — could not reach Supabase."]);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setScriptText(reader.result as string); setErrors([]); setPreview(null); setSaved(false); };
    reader.readAsText(file);
  };

  return (
    <div className="mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Upload Script</h1>
        <p className="mt-1 text-sm text-muted-text-2">
          Paste your JSON script or upload a file to create a draft episode.
        </p>
      </div>

      {saved && (
        <div className="flex items-center gap-2.5 rounded-lg border border-green-900/40 bg-green-950/20 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          Saved as draft.{" "}
          <Link href="/dashboard/episodes" className="font-semibold underline hover:text-green-300">
            View in Episodes →
          </Link>
        </div>
      )}

      {/* Metadata */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { id: "show-title", label: "Show Title", value: showTitle, set: setShowTitle, placeholder: "e.g. South Park" },
          { id: "episode-title", label: "Episode Title", value: episodeTitle, set: setEpisodeTitle, placeholder: "e.g. The Pandemic Special" },
        ].map(({ id, label, value, set, placeholder }) => (
          <div key={id}>
            <label htmlFor={id} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-text-3">
              {label}
            </label>
            <input
              id={id} type="text" value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder}
              className="w-full rounded-md border border-sk-border bg-surface-1 px-3 py-2.5 text-sm text-white placeholder-muted-text-3 outline-none transition-colors focus:border-sk-border-hover"
            />
          </div>
        ))}
      </div>

      {/* Script editor */}
      <div className="overflow-hidden rounded-lg border border-sk-border bg-surface-1">
        <div className="flex items-center justify-between border-b border-sk-border px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-text-3">
            <FileCode className="h-3.5 w-3.5 text-violet-primary" />
            Script JSON
          </div>
          <button
            type="button"
            onClick={() => { setScriptText(EXAMPLE_JSON); setErrors([]); setPreview(null); setSaved(false); }}
            className="text-xs font-medium text-violet-primary hover:underline"
          >
            Load example
          </button>
        </div>

        <div className="p-4">
          <textarea
            id="script-json"
            value={scriptText}
            onChange={(e) => { setScriptText(e.target.value); setPreview(null); setErrors([]); setSaved(false); }}
            rows={12}
            spellCheck={false}
            placeholder={'{\n  "episodeTitle": "...",\n  "scenes": [ ... ]\n}'}
            className="w-full resize-y rounded-md border border-sk-border bg-surface-2 px-3 py-2.5 font-mono text-[13px] text-muted-text-1 placeholder-muted-text-3 outline-none transition-colors focus:border-sk-border-hover"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button" onClick={handleValidate}
              className="inline-flex items-center gap-2 rounded-md border border-violet-primary/40 px-4 py-2 text-sm font-semibold text-violet-primary transition-colors hover:bg-violet-primary/5"
            >
              <FileCode className="h-3.5 w-3.5" />
              Validate
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-sk-border px-4 py-2 text-sm font-medium text-muted-text-1 transition-colors hover:bg-surface-2 hover:text-white">
              <Upload className="h-3.5 w-3.5" />
              Upload .json
              <input ref={fileRef} type="file" accept=".json,.txt" className="hidden" onChange={handleFile} />
            </label>
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
            <p className="text-xs font-semibold uppercase tracking-wide text-red-400">Validation Errors</p>
          </div>
          <ul className="space-y-1 pl-1 text-sm text-red-400/80">
            {errors.map((err, i) => <li key={i}>— {err}</li>)}
          </ul>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="rounded-lg border border-sk-border bg-surface-1 p-5">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-green-400">Script Validated</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-text-3">Total Scenes</p>
              <p className="mt-1 text-3xl font-bold text-white">{preview.sceneCount}</p>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-text-3">Characters</p>
              <div className="flex flex-wrap gap-1.5">
                {preview.characters.map((name) => (
                  <span key={name} className="rounded-full bg-violet-primary px-2.5 py-0.5 text-xs font-semibold text-white">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button" onClick={handleSubmit} disabled={saving}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-violet-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving && <LoadingSpinner size="sm" className="text-white" />}
            {saving ? "Saving…" : "Save as Draft"}
          </button>
        </div>
      )}
    </div>
  );
}
