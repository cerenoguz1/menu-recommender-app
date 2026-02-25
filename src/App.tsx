import { useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { Callback } from "./auth/Callback";

type Ingredient = { id: string; name: string; aliases: string[] };

type Profile = {
  like: string[];
  dislike: string[];
  avoid: string[];
};

type RecResult = {
  dish: string;
  score: number;
  matchedLiked: string[];
  matchedDisliked: string[];
  matchedAvoid: string[];
  explanation: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-60";
  const styles =
    variant === "primary"
      ? "bg-zinc-900 text-white hover:bg-zinc-800"
      : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200";

  return (
    <button
      className={`${base} ${styles}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  );
}

function Chip({
  label,
  onRemove,
  tone = "neutral",
}: {
  label: string;
  onRemove?: () => void;
  tone?: "neutral" | "good" | "bad" | "danger";
}) {
  const toneCls =
    tone === "good"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : tone === "bad"
      ? "bg-amber-50 border-amber-200 text-amber-800"
      : tone === "danger"
      ? "bg-red-50 border-red-200 text-red-800"
      : "bg-zinc-50 border-zinc-200 text-zinc-800";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${toneCls}`}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full px-1 text-xs opacity-70 hover:opacity-100"
          aria-label={`Remove ${label}`}
        >
          ✕
        </button>
      )}
    </span>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-zinc-900">{title}</div>
      {subtitle && <div className="mt-1 text-xs text-zinc-600">{subtitle}</div>}
    </div>
  );
}

export default function App() {
  const auth = useAuth();

  // Cognito redirect path
  if (window.location.pathname === "/callback") return <Callback />;

  const [profile, setProfile] = useState<Profile>({
    like: [],
    dislike: [],
    avoid: [],
  });

  const [ingredientQuery, setIngredientQuery] = useState("");
  const [ingredientResults, setIngredientResults] = useState<Ingredient[]>([]);
  const [ingredientLoading, setIngredientLoading] = useState(false);
  const [ingredientError, setIngredientError] = useState<string | null>(null);

  const [activeBucket, setActiveBucket] = useState<keyof Profile>("like");

  const [menuText, setMenuText] = useState("");
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [results, setResults] = useState<RecResult[]>([]);

  // Cache of ingredient id -> display name
  const [ingredientNameById, setIngredientNameById] = useState<Record<string, string>>({});

  const bucketTone: Record<keyof Profile, "good" | "bad" | "danger"> = {
    like: "good",
    dislike: "bad",
    avoid: "danger",
  };

  const bucketLabel: Record<keyof Profile, string> = {
    like: "Liked",
    dislike: "Disliked",
    avoid: "Avoid completely",
  };

  const selectedIds = useMemo(
    () => new Set([...profile.like, ...profile.dislike, ...profile.avoid]),
    [profile.like, profile.dislike, profile.avoid]
  );

  // Ingredient search (backend-controlled vocabulary)
  useEffect(() => {
    const q = ingredientQuery.trim();
    setIngredientError(null);

    if (q.length < 2) {
      setIngredientResults([]);
      return;
    }

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        setIngredientLoading(true);
        const res = await fetch(`${API_BASE}/ingredients?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`Ingredients request failed (${res.status})`);
        const data = (await res.json()) as { items: Ingredient[] };
        setIngredientResults(data.items ?? []);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setIngredientError(e?.message ?? "Failed to load ingredients");
        setIngredientResults([]);
      } finally {
        setIngredientLoading(false);
      }
    }, 250);

    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [ingredientQuery]);

  const addIngredient = (ing: Ingredient) => {
    // Ensure ingredient exists and isn't already selected
    if (selectedIds.has(ing.id)) return;

    setIngredientNameById((prev) => ({ ...prev, [ing.id]: ing.name }));

    setProfile((prev) => ({
      ...prev,
      [activeBucket]: [...prev[activeBucket], ing.id],
    }));

    setIngredientQuery("");
    setIngredientResults([]);
  };

  const removeIngredient = (bucket: keyof Profile, id: string) => {
    setProfile((prev) => ({
      ...prev,
      [bucket]: prev[bucket].filter((x) => x !== id),
    }));
  };

  const analyzeMenu = async () => {
    setRecError(null);
    setResults([]);

    const text = menuText.trim();
    if (!text) {
      setRecError("Paste menu text first.");
      return;
    }

    try {
      setRecLoading(true);
      const res = await fetch(`${API_BASE}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuText: text, profile }),
      });
      if (!res.ok) throw new Error(`Recommend request failed (${res.status})`);
      const data = (await res.json()) as { results: RecResult[] };
      setResults(data.results ?? []);
    } catch (e: any) {
      setRecError(e?.message ?? "Failed to get recommendations");
    } finally {
      setRecLoading(false);
    }
  };

  const nameForId = (id: string) => ingredientNameById[id] ?? id;

  return (
    <Container>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Menu-based Dish Recommender</h1>
          <p className="text-sm text-zinc-600">
            Ingredient-level personalization from any restaurant menu
          </p>
        </div>

        {auth.isAuthenticated ? (
          <Button variant="secondary" onClick={() => void auth.signoutRedirect()}>
            Sign out
          </Button>
        ) : (
          <div className="text-sm text-zinc-500">Not signed in</div>
        )}
      </header>

      {auth.isLoading && (
        <Card>
          <div className="text-sm font-semibold text-zinc-900">Loading…</div>
          <div className="mt-1 text-sm text-zinc-600">Preparing your session</div>
        </Card>
      )}

      {auth.error && (
        <Card>
          <div className="text-sm font-semibold text-red-600">Auth error</div>
          <div className="mt-1 text-sm text-zinc-700">{auth.error.message}</div>
          <div className="mt-4">
            <Button onClick={() => void auth.signinRedirect()}>Try again</Button>
          </div>
        </Card>
      )}

      {!auth.isLoading && !auth.error && !auth.isAuthenticated && (
        <Card>
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-zinc-900">Sign in to continue</h2>
            <p className="text-sm text-zinc-600">Log in with Cognito to build your taste profile.</p>
            <div className="mt-4">
              <Button onClick={() => void auth.signinRedirect()}>Sign in with Cognito</Button>
            </div>
          </div>
        </Card>
      )}

      {!auth.isLoading && !auth.error && auth.isAuthenticated && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile */}
          <Card>
            <SectionTitle
              title="Taste profile"
              subtitle="Select ingredients from the known catalog (no free-text)."
            />

            <div className="mt-4 flex gap-2">
              {(["like", "dislike", "avoid"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setActiveBucket(b)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    activeBucket === b
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                  }`}
                >
                  {bucketLabel[b]}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700">
                Add ingredient to:{" "}
                <span className="font-semibold text-zinc-900">{bucketLabel[activeBucket]}</span>
              </label>
              <input
                value={ingredientQuery}
                onChange={(e) => setIngredientQuery(e.target.value)}
                placeholder="Search ingredients (e.g., garlic, chicken)…"
                className="mt-1 w-full rounded-xl border border-zinc-300 px-4 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />

              <div className="mt-2 text-xs text-zinc-500">
                {ingredientLoading ? "Searching…" : "Type at least 2 characters."}
              </div>

              {ingredientError && (
                <div className="mt-2 text-xs font-semibold text-red-600">{ingredientError}</div>
              )}

              {ingredientResults.length > 0 && (
                <div className="mt-3 max-h-48 overflow-auto rounded-xl border border-zinc-200 bg-white">
                  {ingredientResults.slice(0, 30).map((ing) => {
                    const disabled = selectedIds.has(ing.id);
                    return (
                      <button
                        key={ing.id}
                        type="button"
                        onClick={() => addIngredient(ing)}
                        disabled={disabled}
                        className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-sm transition ${
                          disabled ? "cursor-not-allowed opacity-50" : "hover:bg-zinc-50"
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-zinc-900">{ing.name}</div>
                          {ing.aliases?.length > 0 && (
                            <div className="text-xs text-zinc-500">
                              aka: {ing.aliases.slice(0, 3).join(", ")}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500">{disabled ? "added" : "add"}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 space-y-4">
              {(["like", "dislike", "avoid"] as const).map((b) => (
                <div key={b}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {bucketLabel[b]}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profile[b].length === 0 ? (
                      <span className="text-xs text-zinc-500">None</span>
                    ) : (
                      profile[b].map((id) => (
                        <Chip
                          key={id}
                          label={nameForId(id)}
                          tone={bucketTone[b]}
                          onRemove={() => removeIngredient(b, id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Menu + Results */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <SectionTitle
                title="Menu input"
                subtitle="Paste menu text. Phase 2: camera scan → OCR."
              />

              <textarea
                value={menuText}
                onChange={(e) => setMenuText(e.target.value)}
                placeholder={`Paste menu items (one per line), e.g.\nChicken Alfredo - creamy garlic parmesan\nShrimp Tacos - cilantro lime slaw\nPad Thai - peanuts`}
                className="mt-4 h-40 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button onClick={() => void analyzeMenu()} disabled={recLoading}>
                  {recLoading ? "Analyzing…" : "Analyze menu"}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => {
                    setMenuText("");
                    setResults([]);
                    setRecError(null);
                  }}
                  disabled={recLoading}
                >
                  Clear
                </Button>

                <button
                  type="button"
                  disabled
                  className="sm:ml-auto inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-500"
                  title="Phase 2 feature"
                >
                  Scan menu (coming soon)
                </button>
              </div>

              {recError && <div className="mt-3 text-sm font-semibold text-red-600">{recError}</div>}
            </Card>

            <Card>
              <SectionTitle
                title="Recommendations"
                subtitle="Ranked dishes with ingredient-level explanations."
              />

              {results.length === 0 ? (
                <div className="mt-4 text-sm text-zinc-600">
                  Run analysis to see recommendations.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {results.slice(0, 10).map((r, idx) => (
                    <div
                      key={`${r.dish}-${idx}`}
                      className="rounded-xl border border-zinc-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-zinc-900">
                            #{idx + 1} — {r.dish}
                          </div>
                          <div className="mt-1 text-xs text-zinc-600">{r.explanation}</div>
                        </div>
                        <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800">
                          score: {r.score}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.matchedLiked.map((x) => (
                          <Chip key={`l-${r.dish}-${x}`} label={`+ ${x}`} tone="good" />
                        ))}
                        {r.matchedDisliked.map((x) => (
                          <Chip key={`d-${r.dish}-${x}`} label={`- ${x}`} tone="bad" />
                        ))}
                        {r.matchedAvoid.map((x) => (
                          <Chip key={`a-${r.dish}-${x}`} label={`✖ ${x}`} tone="danger" />
                        ))}
                        {r.matchedLiked.length === 0 &&
                          r.matchedDisliked.length === 0 &&
                          r.matchedAvoid.length === 0 && (
                            <span className="text-xs text-zinc-500">
                              No recognized ingredients in this line (expand ingredient catalog).
                            </span>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </Container>
  );
}