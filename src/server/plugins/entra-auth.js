import {
  hapiAuthOidcPlugin,
  WebIdentityTokenProvider
} from '@defra/hapi-auth-oidc'

import { config } from '#/config/config.js'

const OUTBOUND_TIMEOUT_SECONDS = 20

export function entraBaseUrl() {
  return config.get('auth.baseUrl').replace(/\/+$/, '')
}

function baseUrlProblem() {
  const url = entraBaseUrl()
  const isDefault = url === config.default('auth.baseUrl')
  return config.get('isProduction') &&
    (isDefault || !url.startsWith('https://'))
    ? ['APP_BASE_URL (must be the public https URL)']
    : []
}

export function missingEntraSettings() {
  const entra = config.get('auth.entraId')
  const missing = [
    ['ENTRA_ID_AUTHORITY', entra.authority],
    ['ENTRA_ID_CLIENT_ID', entra.clientId],
    ...(entra.credentialType === 'secret'
      ? [['ENTRA_ID_CLIENT_SECRET', entra.clientSecret]]
      : [])
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name)
  return missing.length ? [...missing, ...baseUrlProblem()] : baseUrlProblem()
}

function authProvider() {
  const entra = config.get('auth.entraId')
  if (entra.credentialType === 'secret') {
    return {
      type: 'client_secret',
      getCredentials: async (_logger) => entra.clientSecret
    }
  }
  return new WebIdentityTokenProvider({
    audience: [entra.federatedAudience],
    earlyRefreshMs: 60 * 1000
  })
}

export function entraScopes() {
  return ['openid', 'profile', config.get('auth.entraId.apiScope')]
    .filter(Boolean)
    .join(' ')
}

export const entraAuth = {
  plugin: {
    name: 'entra-auth',
    async register(server) {
      const missing = missingEntraSettings()
      if (missing.length) {
        server.logger.warn(
          `Entra ID is not configured, sign-in will not work until these are set: ${missing.join(', ')}`
        )
        return
      }

      const { authority, clientId } = config.get('auth.entraId')
      const baseUrl = entraBaseUrl()

      await server.register({
        plugin: hapiAuthOidcPlugin,
        options: {
          oidc: {
            discoveryUri: `${authority.replace(/\/+$/, '')}/v2.0/.well-known/openid-configuration`,
            clientId,
            authProvider: authProvider(),
            scope: entraScopes(),
            loginCallbackUri: '/signin-oidc',
            responseMode: 'query',
            externalBaseUrl: baseUrl,
            discoveryRequestOptions: { timeout: OUTBOUND_TIMEOUT_SECONDS }
          },
          cookieOptions: {
            password: config.get('session.cookie.password'),
            isSecure: config.get('session.cookie.secure'),
            isSameSite: 'Lax'
          }
        }
      })
    }
  }
}
