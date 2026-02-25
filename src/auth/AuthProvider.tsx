import { AuthProvider as OidcProvider } from "react-oidc-context";
import { oidcConfig } from "./oidcConfig";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <OidcProvider
      {...oidcConfig}
      onSigninCallback={() => {
        window.history.replaceState({}, document.title, "/");
      }}
    >
      {children}
    </OidcProvider>
  );
}