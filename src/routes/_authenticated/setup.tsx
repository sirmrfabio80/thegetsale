import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { SelectableChip } from "@/components/setup/SelectableChip";
import { NotificationCard } from "@/components/setup/NotificationCard";
import { ReviewRow } from "@/components/setup/ReviewRow";
import { StepHeader } from "@/components/setup/StepHeader";
import { Button } from "@/components/ui/button";
import { brandGroups, setupCategories } from "@/data/setupBrands";
import { loadSetup, saveSetup } from "@/data/setupStorage";

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
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const [houses, setHouses] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [emailSignals, setEmailSignals] = useState(true);
  const [smsDrops, setSmsDrops] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount (SSR-safe).
  useEffect(() => {
    const stored = loadSetup();
    if (stored) {
      setHouses(new Set(stored.houses));
      setCategories(new Set(stored.categories));
      setEmailSignals(stored.notifications.emailSignals);
      setSmsDrops(stored.notifications.smsDrops);
      setWeeklyDigest(stored.notifications.weeklyDigest);
    }
    setHydrated(true);
  }, []);

  // Persist on every change, but only after hydration so initial defaults
  // don't overwrite stored state.
  useEffect(() => {
    if (!hydrated) return;
    saveSetup({
      houses: [...houses],
      categories: [...categories],
      notifications: { emailSignals, smsDrops, weeklyDigest },
    });
  }, [hydrated, houses, categories, emailSignals, smsDrops, weeklyDigest]);

  const toggle = (set: Set<string>, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const valid = useMemo(
    () => houses.size >= 3 && categories.size >= 1,
    [houses, categories],
  );

  const handleStart = () => {
    if (!valid) return;
    saveSetup({
      houses: [...houses],
      categories: [...categories],
      notifications: { emailSignals, smsDrops, weeklyDigest },
      completedAt: new Date().toISOString(),
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

      {/* Step 1 — Houses */}
      <section id="step-houses">
        <StepHeader
          number="01"
          title="Houses"
          hint={`${houses.size} selected${houses.size >= 3 ? "" : " · min 3"}`}
        />
        <div className="mt-8 space-y-8">
          {brandGroups.map((group) => (
            <div key={group.label}>
              <p className="eyebrow mb-3">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.brands.map((brand) => (
                  <SelectableChip
                    key={brand}
                    label={brand}
                    selected={houses.has(brand)}
                    onToggle={() => setHouses((s) => toggle(s, brand))}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">You can change this later.</p>
      </section>

      <SectionRule />

      {/* Step 2 — Categories */}
      <section id="step-categories">
        <StepHeader
          number="02"
          title="Categories"
          hint={`${categories.size} selected${categories.size >= 1 ? "" : " · min 1"}`}
        />
        <div className="mt-8 flex flex-wrap gap-2">
          {setupCategories.map((cat) => (
            <SelectableChip
              key={cat}
              label={cat}
              selected={categories.has(cat)}
              onToggle={() => setCategories((s) => toggle(s, cat))}
            />
          ))}
        </div>
      </section>

      <SectionRule />

      {/* Step 3 — Notifications */}
      <section id="step-notifications">
        <StepHeader number="03" title="Notifications" />
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

      {/* Step 4 — Review */}
      <section>
        <StepHeader number="04" title="Review" />
        <div className="mt-8">
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
          {valid ? "Ready when you are." : "Select at least 3 houses and 1 category to continue."}
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
