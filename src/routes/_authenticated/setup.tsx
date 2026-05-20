import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { RotateCcw, Search, X } from "lucide-react";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { SelectableChip } from "@/components/setup/SelectableChip";
import { NotificationCard } from "@/components/setup/NotificationCard";
import { ReviewRow } from "@/components/setup/ReviewRow";
import { StepHeader } from "@/components/setup/StepHeader";
import { Button } from "@/components/ui/button";
import {
  DEPARTMENT_OPTIONS,
  type Department,
  type StylePreference,
} from "@/data/setupStorage";
import { setupQueryOptions, useSetup, useSetupMutation } from "@/data/setupStore";
import { listSetupOptions } from "@/lib/setup-options.functions";

const setupOptionsQueryOptions = queryOptions({
  queryKey: ["setup", "options"] as const,
  queryFn: () => listSetupOptions(),
  staleTime: 5 * 60_000,
});


export const Route = createFileRoute("/_authenticated/setup")({
  head: () => ({
    meta: [
      { title: "Set your signals — The Get" },
      {
        name: "description",
        content: "Choose the houses and categories The Get should watch for you.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(setupQueryOptions);
    context.queryClient.ensureQueryData(setupOptionsQueryOptions);
  },
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const { setup, isLoading } = useSetup();
  const { save } = useSetupMutation();
  const { data: options } = useSuspenseQuery(setupOptionsQueryOptions);
  const [departments, setDepartments] = useState<Set<Department>>(new Set());
  const [houses, setHouses] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [styles, setStyles] = useState<Set<StylePreference>>(new Set());
  const [emailSignals, setEmailSignals] = useState(true);

  const [smsDrops, setSmsDrops] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Search & quick-filter state for chip pickers
  const [houseQuery, setHouseQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [styleQuery, setStyleQuery] = useState("");
  const [housesSelectedOnly, setHousesSelectedOnly] = useState(false);
  const [categoriesSelectedOnly, setCategoriesSelectedOnly] = useState(false);
  const [stylesSelectedOnly, setStylesSelectedOnly] = useState(false);

  const [hydrated, setHydrated] = useState(false);

  // Hydrate from the backend record once it arrives.
  useEffect(() => {
    if (isLoading || hydrated) return;
    if (setup) {
      setDepartments(new Set((setup.departments ?? []) as Department[]));
      setHouses(new Set(setup.houses));
      setCategories(new Set(setup.categories));
      setStyles(new Set((setup.styles ?? []) as StylePreference[]));
      setEmailSignals(setup.notifications.emailSignals);
      setSmsDrops(setup.notifications.smsDrops);
      setWeeklyDigest(setup.notifications.weeklyDigest);
    }
    setHydrated(true);
  }, [isLoading, setup, hydrated]);

  // Persist on every change after hydration. The mutation debounces optimistic
  // cache updates and the upsert is cheap; users rarely toggle dozens of chips
  // per second.
  useEffect(() => {
    if (!hydrated) return;
    save({
      departments: [...departments],
      houses: [...houses],
      categories: [...categories],
      styles: [...styles],
      notifications: { emailSignals, smsDrops, weeklyDigest },
    });
  }, [hydrated, departments, houses, categories, styles, emailSignals, smsDrops, weeklyDigest, save]);

  const toggle = <T extends string>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const valid = useMemo(
    () => departments.size >= 1 && houses.size >= 3 && categories.size >= 1,
    [departments, houses, categories],
  );

  const handleStart = () => {
    if (!valid) return;
    save({
      departments: [...departments],
      houses: [...houses],
      categories: [...categories],
      styles: [...styles],
      notifications: { emailSignals, smsDrops, weeklyDigest },
      markCompleted: true,
    });
    navigate({ to: "/dashboard" });
  };


  const scrollToStep = (id: string) => {
    if (typeof document === "undefined") return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PageLayout>
      <section className="pt-16 md:pt-24">
        <p className="eyebrow">Setup</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">
          Tell The Get what to watch first.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Follow the houses and categories you care about. We'll use this to surface sharper
          buy/wait signals and notify you only when the signal is worth your attention.
        </p>
      </section>

      <SectionRule />

      {/* Step 1 — Department */}
      <section id="step-departments">
        <StepHeader
          number="01"
          title="Department"
          hint={`${departments.size} selected${departments.size >= 1 ? "" : " · min 1"}`}
          onReset={() => setDepartments(new Set())}
          canReset={departments.size > 0}
        />

        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Tell us which collections to watch. You can pick more than one.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DEPARTMENT_OPTIONS.map((opt) => {
            const selected = departments.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setDepartments((s) => toggle(s, opt.value))}
                className={`border p-4 text-left transition-colors ${
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground hover:border-foreground"
                }`}
              >
                <p className="font-serif text-lg">{opt.value}</p>
                <p
                  className={`mt-1 text-xs ${
                    selected ? "text-background/70" : "text-muted-foreground"
                  }`}
                >
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <SectionRule />

      {/* Step 2 — Houses */}
      <section id="step-houses">
        <StepHeader
          number="02"
          title="Houses"
          hint={`${houses.size} selected${houses.size >= 3 ? "" : " · min 3"}`}
          onReset={() => setHouses(new Set())}
          canReset={houses.size > 0}
        />

        {/* Filter bar */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={houseQuery}
              onChange={(e) => setHouseQuery(e.target.value)}
              placeholder="Search houses…"
              className="flex h-10 w-full border border-border bg-transparent pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {houseQuery && (
              <button
                type="button"
                onClick={() => setHouseQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setHousesSelectedOnly((v) => !v)}
            className={`inline-flex h-10 items-center justify-center border px-4 text-xs uppercase tracking-wider transition-colors ${
              housesSelectedOnly
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
            aria-pressed={housesSelectedOnly}
          >
            Selected only
          </button>
        </div>

        <div className="mt-8 space-y-8">
          {options.houseGroups.map((group) => {
            const filteredHouses = group.houses.filter((h) => {
              const matchesQuery =
                !houseQuery ||
                h.name.toLowerCase().includes(houseQuery.toLowerCase());
              const matchesSelected = !housesSelectedOnly || houses.has(h.name);
              return matchesQuery && matchesSelected;
            });
            if (filteredHouses.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="eyebrow mb-3">{group.label}</p>
                <div className="flex flex-wrap gap-2">
                  {filteredHouses.map((house) => (
                    <SelectableChip
                      key={house.slug}
                      label={house.name}
                      selected={houses.has(house.name)}
                      onToggle={() => setHouses((s) => toggle(s, house.name))}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {(() => {
            const totalVisible = options.houseGroups.reduce(
              (acc, g) =>
                acc +
                g.houses.filter((h) => {
                  const mq =
                    !houseQuery ||
                    h.name.toLowerCase().includes(houseQuery.toLowerCase());
                  const ms = !housesSelectedOnly || houses.has(h.name);
                  return mq && ms;
                }).length,
              0,
            );
            if (totalVisible === 0) {
              return (
                <p className="text-sm text-muted-foreground">
                  No houses match your filters.
                </p>
              );
            }
            return null;
          })()}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">You can change this later.</p>
      </section>

      <SectionRule />

      {/* Step 3 — Categories */}
      <section id="step-categories">
        <StepHeader
          number="03"
          title="Categories"
          hint={`${categories.size} selected${categories.size >= 1 ? "" : " · min 1"}`}
          onReset={() => setCategories(new Set())}
          canReset={categories.size > 1}
        />

        {/* Filter bar */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={categoryQuery}
              onChange={(e) => setCategoryQuery(e.target.value)}
              placeholder="Search categories…"
              className="flex h-10 w-full border border-border bg-transparent pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {categoryQuery && (
              <button
                type="button"
                onClick={() => setCategoryQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCategoriesSelectedOnly((v) => !v)}
            className={`inline-flex h-10 items-center justify-center border px-4 text-xs uppercase tracking-wider transition-colors ${
              categoriesSelectedOnly
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
            aria-pressed={categoriesSelectedOnly}
          >
            Selected only
          </button>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {options.categories
            .filter((cat) => {
              const matchesQuery =
                !categoryQuery ||
                cat.label.toLowerCase().includes(categoryQuery.toLowerCase());
              const matchesSelected = !categoriesSelectedOnly || categories.has(cat.label);
              return matchesQuery && matchesSelected;
            })
            .map((cat) => (
              <SelectableChip
                key={cat.slug}
                label={cat.label}
                selected={categories.has(cat.label)}
                onToggle={() => setCategories((s) => toggle(s, cat.label))}
              />
            ))}
          {(() => {
            const visible = options.categories.filter((cat) => {
              const mq =
                !categoryQuery ||
                cat.label.toLowerCase().includes(categoryQuery.toLowerCase());
              const ms = !categoriesSelectedOnly || categories.has(cat.label);
              return mq && ms;
            });
            if (visible.length === 0) {
              return (
                <p className="w-full text-sm text-muted-foreground">
                  No categories match your filters.
                </p>
              );
            }
            return null;
          })()}
        </div>
      </section>

      <SectionRule />

      {/* Step 4 — Style */}
      <section id="step-styles">
        <StepHeader
          number="04"
          title="Style"
          hint={`${styles.size} selected · optional`}
          onReset={() => setStyles(new Set())}
          canReset={styles.size > 0}
        />

        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Pick the aesthetics that feel like you. We'll tune your first dashboard around them.
        </p>

        {/* Filter bar */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={styleQuery}
              onChange={(e) => setStyleQuery(e.target.value)}
              placeholder="Search styles…"
              className="flex h-10 w-full border border-border bg-transparent pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {styleQuery && (
              <button
                type="button"
                onClick={() => setStyleQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setStylesSelectedOnly((v) => !v)}
            className={`inline-flex h-10 items-center justify-center border px-4 text-xs uppercase tracking-wider transition-colors ${
              stylesSelectedOnly
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
            aria-pressed={stylesSelectedOnly}
          >
            Selected only
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {options.styles
            .filter((opt) => {
              const matchesQuery =
                !styleQuery ||
                opt.label.toLowerCase().includes(styleQuery.toLowerCase()) ||
                (opt.description ?? "").toLowerCase().includes(styleQuery.toLowerCase());
              const matchesSelected = !stylesSelectedOnly || styles.has(opt.label as StylePreference);
              return matchesQuery && matchesSelected;
            })
            .map((opt) => {
              const value = opt.label as StylePreference;
              const selected = styles.has(value);
              return (
                <button
                  key={opt.slug}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setStyles((s) => toggle(s, value))}
                  className={`border p-4 text-left transition-colors ${
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-foreground hover:border-foreground"
                  }`}
                >
                  <p className="font-serif text-lg">{opt.label}</p>
                  <p
                    className={`mt-1 text-xs ${
                      selected ? "text-background/70" : "text-muted-foreground"
                    }`}
                  >
                    {opt.description}
                  </p>
                </button>
              );
            })}
          {(() => {
            const visible = options.styles.filter((opt) => {
              const mq =
                !styleQuery ||
                opt.label.toLowerCase().includes(styleQuery.toLowerCase()) ||
                (opt.description ?? "").toLowerCase().includes(styleQuery.toLowerCase());
              const ms = !stylesSelectedOnly || styles.has(opt.label as StylePreference);
              return mq && ms;
            });
            if (visible.length === 0) {
              return (
                <p className="col-span-full text-sm text-muted-foreground">
                  No styles match your filters.
                </p>
              );
            }
            return null;
          })()}
        </div>
      </section>

      <SectionRule />

      {/* Step 5 — Notifications */}
      <section id="step-notifications">
        <StepHeader
          number="05"
          title="Notifications"
          onReset={() => {
            setEmailSignals(true);
            setSmsDrops(false);
            setWeeklyDigest(false);
          }}
          canReset={!emailSignals || smsDrops || weeklyDigest}
        />


        <div className="mt-8 grid grid-cols-1 gap-3">
          <NotificationCard
            title="Email signals"
            description="A quiet note when a house you follow shifts its read."
            checked={emailSignals}
            onCheckedChange={setEmailSignals}
          />
          <NotificationCard
            title="SMS urgent drops"
            description="Only for high-confidence price or availability signals."
            checked={smsDrops}
            onCheckedChange={setSmsDrops}
          />
          <NotificationCard
            title="Weekly digest"
            description="A Sunday summary of the market's posture across your houses."
            checked={weeklyDigest}
            onCheckedChange={setWeeklyDigest}
          />
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          You can edit notification preferences anytime.
        </p>
      </section>

      <SectionRule />

      {/* Step 6 — Review */}
      <section>
        <StepHeader number="06" title="Review" />

        <div className="mt-8">
          <ReviewRow
            title="Department"
            count={departments.size}
            onEdit={() => scrollToStep("step-departments")}
          >
            {departments.size === 0 ? (
              <p className="text-sm text-muted-foreground">
                None selected — pick at least one.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {[...departments].map((d) => (
                  <span
                    key={d}
                    className="border border-border px-3 py-1 text-xs text-foreground"
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
          </ReviewRow>

          <ReviewRow title="Houses" count={houses.size} onEdit={() => scrollToStep("step-houses")}>
            {houses.size === 0 ? (
              <p className="text-sm text-muted-foreground">
                None selected — pick at least three.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {[...houses].map((h) => (
                  <span
                    key={h}
                    className="border border-border px-3 py-1 text-xs text-foreground"
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}
          </ReviewRow>

          <ReviewRow
            title="Categories"
            count={categories.size}
            onEdit={() => scrollToStep("step-categories")}
          >
            {categories.size === 0 ? (
              <p className="text-sm text-muted-foreground">
                None selected — pick at least one.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {[...categories].map((c) => (
                  <span
                    key={c}
                    className="border border-border px-3 py-1 text-xs text-foreground"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </ReviewRow>

          <ReviewRow
            title="Style"
            count={styles.size}
            onEdit={() => scrollToStep("step-styles")}
          >
            {styles.size === 0 ? (
              <p className="text-sm text-muted-foreground">
                None selected — we'll show a balanced read.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {[...styles].map((s) => (
                  <span
                    key={s}
                    className="border border-border px-3 py-1 text-xs text-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </ReviewRow>



          <ReviewRow title="Notifications" onEdit={() => scrollToStep("step-notifications")}>
            <dl className="space-y-2 text-sm">
              {[
                { label: "Email signals", on: emailSignals },
                { label: "SMS urgent drops", on: smsDrops },
                { label: "Weekly digest", on: weeklyDigest },
              ].map((row) => (
                <div key={row.label} className="flex items-baseline justify-between">
                  <dt className="text-foreground">{row.label}</dt>
                  <dd className="text-muted-foreground">{row.on ? "On" : "Off"}</dd>
                </div>
              ))}
            </dl>
          </ReviewRow>
        </div>
      </section>

      <SectionRule />

      <div className="flex flex-col items-stretch gap-3 pb-8 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-muted-foreground">
          {valid ? "Ready when you are." : "Pick at least 1 department, 3 houses and 1 category to continue."}
        </p>
        <Button
          onClick={handleStart}
          disabled={!valid}
          className="h-12 rounded-none px-8 text-[12px] uppercase tracking-[0.18em]"
        >
          Start watching
        </Button>
      </div>
    </PageLayout>
  );
}
