export function decodeJwtPayload(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
  } catch {
    return {}
  }
}

const SENSITIVE_CLAIMS = new Set([
  'name',
  'preferred_username',
  'email',
  'upn',
  'unique_name',
  'oid',
  'sub',
  'tid',
  'aud',
  'azp',
  'appid',
  'iss',
  'groups',
  'wids',
  'ipaddr',
  'uti',
  'rh',
  'nonce',
  'aio',
  'c_hash',
  'at_hash'
])

function toRows(claims) {
  return Object.entries(claims).map(([name, value]) => [
    { text: name },
    {
      text: typeof value === 'object' ? JSON.stringify(value) : String(value),
      ...(SENSITIVE_CLAIMS.has(name) && { classes: 'app-claim-blurred' })
    }
  ])
}

/**
 * What goes in the session: only claims, never the tokens themselves.
 * Access token claims (including app roles) are present only when the app
 * asks for its own api scope.
 */
export function userFromCredentials({ accessToken, claims }, hasApiScope) {
  const access =
    hasApiScope && accessToken ? decodeJwtPayload(accessToken) : null
  return {
    name:
      claims.name ??
      claims.preferred_username ??
      claims.email ??
      'your account',
    roles: access?.roles ?? [],
    idTokenRows: toRows(claims),
    accessTokenRows: access ? toRows(access) : null
  }
}
