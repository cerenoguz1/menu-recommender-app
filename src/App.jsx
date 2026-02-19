import { useEffect, useMemo, useState } from "react";

const LS_KEY = "menuApp.preferences.v1";

/**
 * Cognito Hosted UI helpers
 * Uses Authorization Code flow: /login -> redirects back with ?code=...
 */
function buildCognitoLoginUrl() {
  const domain = import.meta.env.VITE_COGNITO_DOMAIN;
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_COGNITO_REDIRECT_URI;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: redirectUri,
  });

  return `https://${domain}/login?${params.toString()}`;
}

function buildCognitoLogoutUrl() {
  const domain = import.meta.env.VITE_COGNITO_DOMAIN;
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
  const logoutUri = import.meta.env.VITE_COGNITO_LOGOUT_URI;

  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: logoutUri,
  });

  return `https://${domain}/logout?${params.toString()}`;
}

function parseCommaList(str) {
  return str
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { likes: "", dislikes: "", allergies: "" };
    const obj = JSON.parse(raw);
    return {
      likes: obj.likes ?? "",
      dislikes: obj.dislikes ?? "",
      allergies: obj.allergies ?? "",
    };
  } catch {
    return { likes: "", dislikes: "", allergies: "" };
  }
}

function savePrefs(prefs) {
  localStorage.setItem(LS_KEY, JSON.stringify(prefs));
}

function scoreDish(dishText, likesArr, dislikesArr, allergiesArr) {
  const t = dishText.toLowerCase();

  // Hard exclude allergies
  const allergyHits = allergiesArr.filter((a) => a && t.includes(a));
  if (allergyHits.length > 0) {
    return {
      score: -9999,
      reasons: [`Contains allergy: ${allergyHits.join(", ")}`],
      excluded: true,
    };
  }

  const likeHits = likesArr.filter((x) => x && t.includes(x));
  const dislikeHits = dislikesArr.filter((x) => x && t.includes(x));

  const score = likeHits.length * 1 + dislikeHits.length * -3;
  const reasons = [];
  if (likeHits.length) reasons.push(`Matched likes: ${likeHits.join(", ")}`);
  if (dislikeHits.length) reasons.push(`Contains dislikes: ${dislikeHits.join(", ")}`);
  if (!reasons.length) reasons.push("No direct ingredient matches (yet).");

  return { score, reasons, excluded: false };
}

export default function App() {
  // Auth state (MVP):
  // We treat "has auth code" as signed-in for now.
  // Next step: exchange code for tokens in a backend (Lambda) and track real session.
  const [isSignedIn, setIsSignedIn] = useState(false);

  const [prefs, setPrefs] = useState(() => loadPrefs());
  const [savedMsg, setSavedMsg] = useState("");

  const [menuText, setMenuText] = useState("");
  const [results, setResults] = useState([]);

  const likesArr = useMemo(() => parseCommaList(prefs.likes), [prefs.likes]);
  const dislikesArr = useMemo(() => parseCommaList(prefs.dislikes), [prefs.dislikes]);
  const allergiesArr = useMemo(() => parseCommaList(prefs.allergies), [prefs.allergies]);

  // Persist prefs locally (temporary; later we’ll sync to DynamoDB per-user)
  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  // Handle Cognito redirect back: http://localhost:5173/?code=...
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("Cognito error:", error, url.searchParams.get("error_description"));
      return;
    }

    if (code) {
      console.log("Got auth code from Cognito:", code);
      setIsSignedIn(true);

      // Clean URL (remove ?code=...)
      url.searchParams.delete("code");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  function onSave() {
    savePrefs(prefs);
    setSavedMsg("Saved!");
    setTimeout(() => setSavedMsg(""), 1200);
  }

  function onRecommend() {
    const lines = menuText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const ranked = lines
      .map((line) => {
        const r = scoreDish(line, likesArr, dislikesArr, allergiesArr);
        return { dish: line, ...r };
      })
      .filter((x) => !x.excluded)
      .sort((a, b) => b.score - a.score);

    setResults(ranked);
  }

  function onSignIn() {
    const url = buildCognitoLoginUrl();
    console.log("Redirecting to:", url);
    window.location.href = url;
  }

  function onSignOut() {
    setIsSignedIn(false);
    window.location.href = buildCognitoLogoutUrl();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Menu Recommender</h1>
          <p className="mt-2 text-sm text-slate-300">
            Paste a menu and get a recommendation based on your preferences. (Later: science-based flavor similarity.)
          </p>
        </div>

        {!isSignedIn ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg shadow-black/30">
            <h2 className="text-lg font-semibold">Signed out</h2>
            <p className="mt-2 text-sm text-slate-300">
              Sign in with AWS Cognito (Hosted UI). After sign-in, you’ll be redirected back here.
            </p>

            <button
              onClick={onSignIn}
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 active:bg-indigo-600"
            >
              Sign in
            </button>

            <p className="mt-3 text-xs text-slate-400">
              (MVP note: we are not yet exchanging the auth code for tokens. Next step is a Lambda token exchange.)
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Preferences */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg shadow-black/30">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Preferences</h2>
                <button
                  onClick={onSignOut}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Sign out
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <label className="block">
                  <div className="text-xs font-medium text-slate-300">Likes (comma-separated)</div>
                  <input
                    value={prefs.likes}
                    onChange={(e) => setPrefs((p) => ({ ...p, likes: e.target.value }))}
                    placeholder="e.g., chicken, garlic, spicy"
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>

                <label className="block">
                  <div className="text-xs font-medium text-slate-300">Dislikes (comma-separated)</div>
                  <input
                    value={prefs.dislikes}
                    onChange={(e) => setPrefs((p) => ({ ...p, dislikes: e.target.value }))}
                    placeholder="e.g., mushrooms, olives"
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>

                <label className="block">
                  <div className="text-xs font-medium text-slate-300">Allergies (comma-separated — excluded)</div>
                  <input
                    value={prefs.allergies}
                    onChange={(e) => setPrefs((p) => ({ ...p, allergies: e.target.value }))}
                    placeholder="e.g., peanut, shellfish"
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>

                <div className="flex items-center gap-3">
                  <button
                    onClick={onSave}
                    className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 active:bg-indigo-600"
                  >
                    Save
                  </button>
                  <span className="text-sm text-emerald-400">{savedMsg}</span>
                </div>
              </div>
            </div>

            {/* Menu */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg shadow-black/30">
              <h2 className="text-lg font-semibold">Menu</h2>
              <p className="mt-2 text-sm text-slate-300">
                Paste the menu. For now, put <span className="font-semibold text-slate-200">one dish per line</span>.
              </p>

              <textarea
                value={menuText}
                onChange={(e) => setMenuText(e.target.value)}
                placeholder={`Spicy Garlic Chicken — grilled chicken with chili sauce\nMushroom Risotto — creamy rice with mushrooms\nMargherita Pizza — tomato, mozzarella, basil`}
                rows={10}
                className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <button
                onClick={onRecommend}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 active:bg-indigo-600"
              >
                Recommend
              </button>
            </div>

            {/* Results */}
            <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg shadow-black/30">
              <h2 className="text-lg font-semibold">Results</h2>

              {results.length === 0 ? (
                <p className="mt-2 text-sm text-slate-300">No results yet. Paste a menu and click Recommend.</p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {results.map((r, idx) => (
                    <li key={idx} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="font-semibold">{r.dish}</div>
                        <div className="text-sm text-slate-300">score: {r.score}</div>
                      </div>
                      <div className="mt-2 text-sm text-slate-300">{r.reasons.join(" • ")}</div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
