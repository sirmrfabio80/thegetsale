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
import { cn } from "@/lib/utils";

const THEMES_QUERY_KEY = ["themes"] as const;

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

  // Local editable copy of the selected theme's tokens (merged with defaults).
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!selectedTheme) return;
    const merged: Record<string, string> = {};
    for (const def of THEME_REGISTRY) {
      merged[def.key] = selectedTheme.tokens[def.key] ?? def.default;
    }
    setDraft(merged);
  }, [selectedTheme]);

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
    for (const def of grouped[group]) tokens[def.key] = draft[def.key] ?? def.default;
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

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">Theme</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Edit the live design tokens. Changes apply globally — to logged-in and
          logged-out visitors — as soon as you save the active theme.
        </p>
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
                {grouped[group].map((def) => (
                  <TokenRow
                    key={def.key}
                    def={def}
                    value={draft[def.key] ?? def.default}
                    disabled={disabled}
                    onChange={(v) => setDraft((d) => ({ ...d, [def.key]: v }))}
                  />
                ))}
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
  value,
  disabled,
  onChange,
}: {
  def: ThemeTokenDef;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-[1fr_1.2fr] md:items-center md:gap-6">
      <div>
        <p className="text-sm font-medium text-foreground">{def.label}</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{def.description}</p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">{def.cssVar}</p>
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
      </div>
    </div>
  );
}
