"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabaseClient";
import type { ScriptJSON, ScriptScene } from "@/types";
import { CheckCircle2, Upload, FileCode } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";

/* ── JSON validator ────────────────────────────────────── */
function validateScriptJSON(raw: string): {
  ok: boolean;
  data?: ScriptJSON;
  errors: string[];
} {
  const errors: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, errors: ["Invalid JSON — check your syntax."] };
  }

  const obj = parsed as Record<string, unknown>;

  if (!obj.episodeTitle || typeof obj.episodeTitle !== "string") {
    errors.push('"episodeTitle" (string) is required at the root.');
  }
  if (!Array.isArray(obj.scenes) || obj.scenes.length === 0) {
    errors.push('"scenes" must be a non-empty array.');
  } else {
    (obj.scenes as Record<string, unknown>[]).forEach((scene, i) => {
      if (!scene.sceneId) errors.push(`Scene ${i + 1}: missing "sceneId".`);
      if (!scene.sceneName)
        errors.push(`Scene ${i + 1}: missing "sceneName".`);
      if (!Array.isArray(scene.characters))
        errors.push(`Scene ${i + 1}: "characters" must be an array.`);
      else {
        (scene.characters as Record<string, unknown>[]).forEach((char, j) => {
          if (!char.name)
            errors.push(
              `Scene ${i + 1}, Character ${j + 1}: missing "name".`
            );
          if (!Array.isArray(char.dialogue))
            errors.push(
              `Scene ${i + 1}, Character ${j + 1}: "dialogue" must be an array.`
            );
        });
      }
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: parsed as ScriptJSON, errors: [] };
}

/* ── Helpers ───────────────────────────────────────────── */
function extractCharacters(scenes: ScriptScene[]) {
  const names = new Set<string>();
  scenes.forEach((s) => s.characters.forEach((c) => names.add(c.name)));
  return Array.from(names);
}

/* ── Available ElevenLabs Voices ──────────────────────── */
const AVAILABLE_VOICES = [
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", desc: "Deep, narrative (male)" },
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", desc: "Calm, warm (female)" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", desc: "Strong, confident (female)" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", desc: "Sweet, clear (female)" },
  { id: "jsCqWAovK2LkecY7zXl4", name: "Freya", desc: "Lively, expressive (female)" },
];
const _DEFAULT_VOICE = AVAILABLE_VOICES[0];

const EXAMPLE_JSON = JSON.stringify(
  {
    episodeTitle: "The Big Heist",
    scenes: [
      {
        sceneId: "scene_01",
        sceneName: "The Planning Room",
        background: "planning_room_bg",
        characters: [
          {
            name: "Jax",
            position: "left",
            dialogue: [
              { line: "Alright team, here's the plan...", mouthShape: "A" },
            ],
          },
          {
            name: "Mika",
            position: "right",
            dialogue: [
              { line: "This better work, Jax.", mouthShape: "E" },
            ],
          },
        ],
        props: ["table", "blueprint"],
      },
    ],
  },
  null,
  2
);

/* ── Page Component ────────────────────────────────────── */
export default function UploadScriptClient({ userId }: { userId: string }) {
  const [showTitle, setShowTitle] = useState("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<{
    sceneCount: number;
    characters: string[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const handleValidate = () => {
    setErrors([]);
    setPreview(null);
    setSaved(false);

    if (!scriptText.trim()) {
      setErrors(["Please paste or upload your script JSON."]);
      return;
    }

    const result = validateScriptJSON(scriptText);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    const chars = extractCharacters(result.data!.scenes);
    setPreview({
      sceneCount: result.data!.scenes.length,
      characters: chars,
    });

    if (!episodeTitle && result.data!.episodeTitle) {
      setEpisodeTitle(result.data!.episodeTitle);
    }
  };

  const handleSubmit = async () => {
    if (!showTitle.trim() || !episodeTitle.trim()) {
      setErrors(["Show Title and Episode Title are required."]);
      return;
    }

    const result = validateScriptJSON(scriptText);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setSaving(true);
    setErrors([]);

    try {
      const { error } = await supabase.from("episodes").insert({
        user_id: userId,
        title: `${showTitle} — ${episodeTitle}`,
        script: scriptText,
        status: "draft",
        metadata: {
          show_title: showTitle,
          episode_title: episodeTitle,
          scene_count: result.data!.scenes.length,
          characters: extractCharacters(result.data!.scenes),
        },
      });

      setSaving(false);

      if (error) {
        console.error("Supabase insert error:", error);
        setErrors([`Failed to save: ${error.message}`]);
      } else {
        setSaved(true);
        setShowTitle("");
        setEpisodeTitle("");
        setScriptText("");
        setPreview(null);
      }
    } catch (networkErr) {
      console.error("[UploadScriptPage] Catch error:", networkErr);
      setSaving(false);
      setErrors([
        "Network error — could not reach Supabase. Check your internet connection.",
      ]);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setScriptText(text);
      setErrors([]);
      setPreview(null);
      setSaved(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Upload Script</h1>
        <p className="mt-1 text-sm text-muted-text-1">
          Enter your show details and paste episode script JSON.
        </p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-md border border-green-800/50 bg-green-950/30 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          Episode saved as draft! View it in{" "}
          <Link
            href="/dashboard/episodes"
            className="font-medium underline hover:text-green-300"
          >
            My Episodes
          </Link>
          .
        </div>
      )}

      {/* Metadata fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="show-title"
            className="mb-1.5 block text-sm font-medium text-muted-text-1"
          >
            Show Title
          </label>
          <input
            id="show-title"
            type="text"
            value={showTitle}
            onChange={(e) => setShowTitle(e.target.value)}
            placeholder="SkunkTown Adventures"
            className="w-full rounded-md border border-sk-border bg-surface-2 px-3 py-2 text-sm text-white placeholder-muted-text-3 outline-none transition-colors duration-150 focus:border-violet-primary focus:ring-1 focus:ring-violet-primary/50"
          />
        </div>
        <div>
          <label
            htmlFor="episode-title"
            className="mb-1.5 block text-sm font-medium text-muted-text-1"
          >
            Episode Title
          </label>
          <input
            id="episode-title"
            type="text"
            value={episodeTitle}
            onChange={(e) => setEpisodeTitle(e.target.value)}
            placeholder="The Big Heist"
            className="w-full rounded-md border border-sk-border bg-surface-2 px-3 py-2 text-sm text-white placeholder-muted-text-3 outline-none transition-colors duration-150 focus:border-violet-primary focus:ring-1 focus:ring-violet-primary/50"
          />
        </div>
      </div>

      {/* Script JSON textarea */}
      <div className="rounded-lg border border-sk-border bg-surface-1 p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <label
            htmlFor="script-json"
            className="text-sm font-medium text-muted-text-1"
          >
            Script JSON
          </label>
          <button
            type="button"
            onClick={() => {
              setScriptText(EXAMPLE_JSON);
              setErrors([]);
              setPreview(null);
              setSaved(false);
            }}
            className="text-xs font-medium text-violet-primary hover:text-violet-hover"
          >
            Load example
          </button>
        </div>

        <textarea
          id="script-json"
          value={scriptText}
          onChange={(e) => {
            setScriptText(e.target.value);
            setPreview(null);
            setErrors([]);
            setSaved(false);
          }}
          rows={12}
          spellCheck={false}
          placeholder='{\n  "episodeTitle": "...",\n  "scenes": [ ... ]\n}'
          className="w-full resize-y rounded-md border border-sk-border bg-surface-2 px-4 py-3 font-mono text-sm text-muted-text-1 placeholder-muted-text-3 outline-none transition-colors duration-150 focus:border-violet-primary focus:ring-1 focus:ring-violet-primary/50"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleValidate}
            className="inline-flex items-center gap-2 rounded-md border border-violet-primary/50 px-4 py-2 text-sm font-semibold text-violet-primary transition-colors duration-150 hover:bg-violet-primary/10"
          >
            <FileCode className="h-4 w-4" />
            Validate JSON
          </button>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-sk-border px-4 py-2 text-sm font-medium text-muted-text-1 transition-colors duration-150 hover:bg-surface-2 hover:text-white">
            <Upload className="h-4 w-4" />
            Upload .json
            <input
              ref={fileRef}
              type="file"
              accept=".json,.txt"
              className="hidden"
              onChange={handleFile}
            />
          </label>
        </div>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="rounded-md border border-red-800/50 bg-red-950/30 p-4">
          <p className="mb-2 text-sm font-semibold text-red-400">
            Validation Errors
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-red-400/80">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview card */}
      {preview && (
        <div className="rounded-lg border border-violet-primary/30 bg-violet-primary/5 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-violet-primary">
            <CheckCircle2 className="h-4 w-4" />
            Script Validated
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-text-2">
                Scenes
              </p>
              <p className="mt-1 text-2xl font-bold text-white">
                {preview.sceneCount}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-text-2">
                Characters
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {preview.characters.map((name) => (
                  <span
                    key={name}
                    className="rounded-full bg-surface-3 px-3 py-1 text-xs font-medium text-muted-text-1"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-violet-primary py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-violet-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <LoadingSpinner size="sm" className="text-white" />}
            {saving ? "Saving..." : "Save as Draft"}
          </button>
        </div>
      )}
    </div>
  );
}
