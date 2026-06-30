import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import {
  createTheme,
  listThemes,
  setActiveTheme,
  upsertThemeTokens,
  type ThemeRecord,
} from "@/lib/theme.functions";
import {
  seededDefaultsFor,
  THEME_GROUPS_ORDER,
  THEME_REGISTRY,
  type ThemeTokenDef,
  type ThemeTokenGroup,
} from "@/lib/theme/registry";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tokensToCss } from "@/lib/theme/css";
import { cn } from "@/lib/utils";

const THEMES_QUERY_KEY = ["themes"] as const;
const PREVIEW_STYLE_ID = "theme-tokens-preview";

function writePreviewStyle(css: string) {
  if (typeof document === "undefined") return;
  let el = document.getElementById(PREVIEW_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = PREVIEW_STYLE_ID;
    // Append last so it overrides the SSR-injected <style id="theme-tokens">.
    document.head.appendChild(el);
  }
  el.textContent = css;
}

function clearPreviewStyle() {
  if (typeof document === "undefined") return;
  document.getElementById(PREVIEW_STYLE_ID)?.remove();
}

export function ThemeTab() {
  const router = useRouter();
  const qc = useQueryClient();
  const listFn = useServerFn(listThemes);
  const upsertFn = useServerFn(upsertThemeTokens);
  const setActiveFn = useServerFn(setActiveTheme);
  const createFn = useServerFn(createTheme);

  const themesQ = useQuery({
    queryKey: THEMES_QUERY_KEY,
    queryFn: () => listFn(),
  });

  const themes = themesQ.data ?? [];
  const activeKey = useMemo(
    () => themes.find((t) => t.is_active)?.key ?? themes[0]?.key ?? "",
    [themes],
  );

  const [selectedKey, setSelectedKey] = useState<string>("");
  useEffect(() => {
    if (!selectedKey && activeKey) setSelectedKey(activeKey);
  }, [activeKey, selectedKey]);

  const selectedTheme = themes.find((t) => t.key === selectedKey);

  // Per-theme seeded defaults (what shipped in the migration for THIS theme).
  // Falls back to registry defaults for tokens not overridden by the seed.
  const seededDefaults = useMemo(
    () => seededDefaultsFor(selectedKey),
    [selectedKey],
  );

  // Local editable copy of the selected theme's tokens (merged with seeded defaults).
  const [draft, setDraft] = useState<Record<string, string>>({});
  // Undo stack: each entry is a prior draft snapshot. Capped to avoid growth.
  const [history, setHistory] = useState<Record<string, string>[]>([]);
  const HISTORY_LIMIT = 50;
  useEffect(() => {
    if (!selectedTheme) return;
    const merged: Record<string, string> = {};
    for (const def of THEME_REGISTRY) {
      merged[def.key] = selectedTheme.tokens[def.key] ?? seededDefaults[def.key];
    }
    setDraft(merged);
    setHistory([]);
  }, [selectedTheme, seededDefaults]);

  /** Apply a draft change and push the previous draft onto the undo stack.
   *  Consecutive edits to the same single token coalesce into one undo step
   *  so typing in a text field doesn't flood history. */
  function mutateDraft(next: Record<string, string>) {
    setDraft((prev) => {
      const changedKeys: string[] = [];
      for (const k of Object.keys(next)) {
        if (prev[k] !== next[k]) changedKeys.push(k);
      }
      if (changedKeys.length === 0) return prev;
      setHistory((h) => {
        // Coalesce: if previous step also differed from `prev` only in the
        // same single key, keep the older snapshot as the undo target.
        if (h.length > 0 && changedKeys.length === 1) {
          const top = h[h.length - 1];
          const topDiff: string[] = [];
          for (const k of Object.keys(prev)) {
            if (top[k] !== prev[k]) topDiff.push(k);
          }
          if (topDiff.length === 1 && topDiff[0] === changedKeys[0]) {
            return h;
          }
        }
        const nextH = [...h, prev];
        return nextH.length > HISTORY_LIMIT ? nextH.slice(-HISTORY_LIMIT) : nextH;
      });
      return next;
    });
  }


  function undo() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setDraft(prev);
      return h.slice(0, -1);
    });
  }

  const [savedGroup, setSavedGroup] = useState<ThemeTokenGroup | null>(null);
  const saveMutation = useMutation({
    mutationFn: (payload: { key: string; tokens: Record<string, string> }) =>
      upsertFn({ data: payload }),
    onSuccess: (row, vars) => {
      qc.setQueryData<ThemeRecord[] | undefined>(THEMES_QUERY_KEY, (prev) =>
        prev?.map((t) => (t.key === row.key ? { ...t, tokens: row.tokens } : t)),
      );
      // If the user just edited the active theme, re-run the root loader so
      // the injected <style id="theme-tokens"> picks up the new values.
      const wasActive = themes.find((t) => t.key === vars.key)?.is_active;
      if (wasActive) router.invalidate();
    },
  });

  const activateMutation = useMutation({
    mutationFn: (key: string) => setActiveFn({ data: { key } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: THEMES_QUERY_KEY });
      router.invalidate();
    },
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createFn({ data: { name } }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: THEMES_QUERY_KEY });
      setSelectedKey(row.key);
    },
  });

  const grouped = useMemo(() => {
    const out: Record<ThemeTokenGroup, ThemeTokenDef[]> = {
      Color: [],
      Typography: [],
      "Shape & Borders": [],
      Shadows: [],
      "Labels & Motion": [],
    };
    for (const def of THEME_REGISTRY) out[def.group].push(def);
    return out;
  }, []);

  function saveGroup(group: ThemeTokenGroup) {
    if (!selectedTheme) return;
    const tokens: Record<string, string> = {};
    for (const def of grouped[group]) tokens[def.key] = draft[def.key] ?? seededDefaults[def.key];
    setSavedGroup(null);
    saveMutation.mutate(
      { key: selectedTheme.key, tokens },
      {
        onSuccess: () => {
          setSavedGroup(group);
          window.setTimeout(() => setSavedGroup((g) => (g === group ? null : g)), 2000);
        },
      },
    );
  }

  function handleDuplicate() {
    const name = window.prompt("Name the new theme", `${selectedTheme?.name ?? "Theme"} copy`);
    if (!name) return;
    createMutation.mutate(name);
  }

  const disabled = themesQ.isLoading || saveMutation.isPending || activateMutation.isPending;

  // Live preview: inject draft tokens as a <style> block appended after the
  // SSR <style id="theme-tokens">, so changes apply globally before saving.
  const [livePreview, setLivePreview] = useState(true);
  const hasDraft = Object.keys(draft).length > 0;
  useEffect(() => {
    if (!livePreview || !hasDraft) {
      clearPreviewStyle();
      return;
    }
    writePreviewStyle(tokensToCss(draft));
  }, [livePreview, hasDraft, draft]);
  useEffect(() => () => clearPreviewStyle(), []);

  const isDirty = useMemo(() => {
    if (!selectedTheme) return false;
    for (const def of THEME_REGISTRY) {
      const current = selectedTheme.tokens[def.key] ?? seededDefaults[def.key];
      if ((draft[def.key] ?? seededDefaults[def.key]) !== current) return true;
    }
    return false;
  }, [draft, selectedTheme, seededDefaults]);

  function resetDraft() {
    if (!selectedTheme) return;
    const merged: Record<string, string> = {};
    for (const def of THEME_REGISTRY) {
      merged[def.key] = selectedTheme.tokens[def.key] ?? seededDefaults[def.key];
    }
    mutateDraft(merged);
  }

  // Human label for the active theme's seeded defaults (used in copy/tooltips).
  const seedLabel = selectedTheme?.name ?? "seeded";

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">Theme</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Edit the live design tokens. Changes apply globally — to logged-in and
          logged-out visitors — as soon as you save the active theme.
        </p>
      </div>

      {/* Live preview controls */}
      <div className="flex flex-col gap-3 border border-border bg-card p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={livePreview}
            onClick={() => setLivePreview((v) => !v)}
            className={cn(
              "mt-0.5 inline-flex h-5 w-9 shrink-0 items-center border border-border transition-colors",
              livePreview ? "bg-foreground" : "bg-background",
            )}
          >
            <span
              className={cn(
                "block h-3.5 w-3.5 bg-background transition-transform",
                livePreview ? "translate-x-[18px] bg-background" : "translate-x-[2px] bg-foreground",
              )}
            />
            <span className="sr-only">Toggle live preview</span>
          </button>
          <div>
            <p className="text-sm font-medium text-foreground">Live preview</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Apply unsaved token changes to this browser only. Other visitors keep
              seeing the saved theme until you press Save.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isDirty ? (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          ) : (
            <span className="text-xs text-muted-foreground/70">No changes</span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={history.length === 0}
            onClick={undo}
            title={
              history.length === 0
                ? "Nothing to undo"
                : `Undo last change (${history.length} step${history.length === 1 ? "" : "s"} available)`
            }
          >
            Undo{history.length > 0 ? ` (${history.length})` : ""}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!isDirty}
            onClick={resetDraft}
            title="Discard unsaved changes and return to the last saved values"
          >
            Revert
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selectedTheme}
            onClick={() => {
              if (!window.confirm(
                `Reset every variable to the seeded ${seedLabel} defaults? You'll still need to press Save in each section to persist.`,
              )) return;
              mutateDraft({ ...seededDefaults });
            }}
            title={`Restore every variable to the seeded ${seedLabel} defaults`}
          >
            Reset to {seedLabel} defaults
          </Button>
        </div>
      </div>


      {/* Theme selector + actions */}
      <div className="flex flex-col gap-3 border border-border bg-card p-5 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="eyebrow mb-2 block">Active theme set</label>
          <Select value={selectedKey} onValueChange={setSelectedKey} disabled={disabled}>
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder="Choose a theme" />
            </SelectTrigger>
            <SelectContent>
              {themes.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.name}
                  {t.is_active ? " · Active" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={
              disabled ||
              !selectedTheme ||
              selectedTheme.is_active ||
              activateMutation.isPending
            }
            onClick={() => selectedTheme && activateMutation.mutate(selectedTheme.key)}
          >
            {activateMutation.isPending ? "Activating…" : "Set as active"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || !selectedTheme || createMutation.isPending}
            onClick={handleDuplicate}
          >
            {createMutation.isPending ? "Duplicating…" : "Duplicate"}
          </Button>
        </div>
      </div>

      {selectedTheme && (
        <div className="space-y-10">
          {THEME_GROUPS_ORDER.map((group) => (
            <section key={group} className="border border-border bg-card">
              <header className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <p className="eyebrow">{group}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {grouped[group].length} variable{grouped[group].length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {savedGroup === group && (
                    <span className="text-xs text-muted-foreground">Saved</span>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    disabled={disabled}
                    onClick={() => saveGroup(group)}
                  >
                    {saveMutation.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              </header>
              <div className="divide-y divide-border">
                {grouped[group].map((def) => {
                  const seeded = seededDefaults[def.key];
                  return (
                    <TokenRow
                      key={def.key}
                      def={def}
                      seededDefault={seeded}
                      seedLabel={seedLabel}
                      value={draft[def.key] ?? seeded}
                      disabled={disabled}
                      onChange={(v) => mutateDraft({ ...draft, [def.key]: v })}
                      onReset={() => mutateDraft({ ...draft, [def.key]: seeded })}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TokenRow({
  def,
  seededDefault,
  seedLabel,
  value,
  disabled,
  onChange,
  onReset,
}: {
  def: ThemeTokenDef;
  seededDefault: string;
  seedLabel: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
  onReset: () => void;
}) {
  const isChanged = value !== seededDefault;
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-[1fr_1.2fr] md:items-center md:gap-6",
        isChanged && "bg-[var(--signal-soon)]/[0.03]",
      )}
    >
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{def.label}</p>
          {isChanged && (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground" aria-hidden />
              Changed
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{def.description}</p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">{def.cssVar}</p>
        {isChanged && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px]">
            <span className="text-muted-foreground/60">Before</span>
            <span className="max-w-[16ch] truncate text-muted-foreground/80" title={seededDefault}>
              {seededDefault}
            </span>
            <span className="text-muted-foreground/40">→</span>
            <span className="text-muted-foreground/60">After</span>
            <span className="max-w-[16ch] truncate text-foreground" title={value}>
              {value}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {def.type === "color" && (
          <span
            className="h-9 w-9 shrink-0 border border-border"
            style={{ backgroundColor: value }}
            aria-hidden
          />
        )}
        {def.type === "select" && def.options ? (
          <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {def.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <input
            type="text"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            className={cn(
              "h-9 w-full border border-input bg-background px-3 font-mono text-xs",
              "focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50",
            )}
          />
        )}
        <button
          type="button"
          onClick={onReset}
          disabled={disabled || !isChanged}
          title={isChanged ? `Reset to ${seededDefault}` : `Already matches ${seedLabel} default`}
          className={cn(
            "shrink-0 border border-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground",
            "hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground",
            "focus:outline-none focus:ring-1 focus:ring-ring",
          )}
        >
          Reset
        </button>
      </div>
    </div>
  );
}


