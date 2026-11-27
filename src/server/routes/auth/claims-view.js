export function decodeJwtPayload(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
  } catch {
    return {}
  }
}

const VISIBLE_CLAIMS = new Set(['ver', 'iat', 'nbf', 'exp', 'amr', 'roles'])

function toRows(claims) {
  return Object.entries(claims).map(([name, value]) => [
    { text: name },
    { text: typeof value === 'object' ? JSON.stringify(value) : String(value) }
  ])
}

export function blurRows(rows, enabled) {
  if (!enabled || !rows) {
    return rows
  }
  return rows.map(([name, value]) =>
    VISIBLE_CLAIMS.has(name.text)
      ? [name, value]
      : [name, { ...value, classes: 'app-claim-blurred' }]
  )
}

/**
 * What goes in the session for display: only claims, never the tokens.
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
