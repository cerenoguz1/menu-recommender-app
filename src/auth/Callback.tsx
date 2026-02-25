import { useAuth } from "react-oidc-context";

export function Callback() {
  const auth = useAuth();

  if (auth.isLoading) return <div className="p-6">Signing you in…</div>;
  if (auth.error) return <div className="p-6">Auth error: {auth.error.message}</div>;

  return <div className="p-6">Signed in. Redirecting…</div>;
}