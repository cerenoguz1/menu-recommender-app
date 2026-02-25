import type { UserManagerSettings } from "oidc-client-ts";

const required = (key: string, value: string | undefined) => {
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
};

const region = required("VITE_COGNITO_REGION", import.meta.env.VITE_COGNITO_REGION);
const userPoolId = required("VITE_COGNITO_USER_POOL_ID", import.meta.env.VITE_COGNITO_USER_POOL_ID);
const domain = required("VITE_COGNITO_DOMAIN", import.meta.env.VITE_COGNITO_DOMAIN);

export const oidcConfig: UserManagerSettings = {

  authority: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,

  client_id: required("VITE_COGNITO_CLIENT_ID", import.meta.env.VITE_COGNITO_CLIENT_ID),
  redirect_uri: required("VITE_COGNITO_REDIRECT_URI", import.meta.env.VITE_COGNITO_REDIRECT_URI),
  post_logout_redirect_uri: required("VITE_COGNITO_LOGOUT_URI", import.meta.env.VITE_COGNITO_LOGOUT_URI),

  response_type: "code",
  scope: "openid profile email",


  metadata: {
    issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
    authorization_endpoint: `https://${domain}/oauth2/authorize`,
    token_endpoint: `https://${domain}/oauth2/token`,
    userinfo_endpoint: `https://${domain}/oauth2/userInfo`,
    end_session_endpoint: `https://${domain}/logout`,
    revocation_endpoint: `https://${domain}/oauth2/revoke`,
    jwks_uri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
  },
};