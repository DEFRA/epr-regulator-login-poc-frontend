import { config } from '#/config/config.js'

export const AUTHORITY =
  'https://login.microsoftonline.com/6f504113-6b64-43f2-ade9-242e05780007'
export const BASE_URL = 'https://epr-regulator-login-poc-frontend.example.test'

export const discovery = {
  issuer: `${AUTHORITY}/v2.0`,
  authorization_endpoint: `${AUTHORITY}/oauth2/v2.0/authorize`,
  token_endpoint: `${AUTHORITY}/oauth2/v2.0/token`,
  end_session_endpoint: `${AUTHORITY}/oauth2/v2.0/logout`,
  jwks_uri: `${AUTHORITY}/discovery/v2.0/keys`,
  code_challenge_methods_supported: ['S256']
}

export const entraSettings = {
  'auth.baseUrl': BASE_URL,
  'auth.entraId.authority': AUTHORITY,
  'auth.entraId.clientId': 'test-client-id',
  'auth.entraId.apiScope': 'api://test-client-id/.default',
  'auth.entraId.credentialType': 'secret',
  'auth.entraId.clientSecret': 'test-secret'
}

export function setConfig(values) {
  const previous = {}
  for (const [key, value] of Object.entries(values)) {
    previous[key] = config.get(key)
    config.set(key, value)
  }
  return () => {
    for (const [key, value] of Object.entries(previous)) {
      config.set(key, value)
    }
  }
}

export function fakeJwt(payload) {
  return `x.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.y`
}
