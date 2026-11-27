import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { createServer } from '#/server/server.js'
import {
  discovery,
  entraSettings,
  fakeJwt,
  setConfig
} from '#/test-helpers/entra.js'

describe('#claimsController', () => {
  let restore
  let server

  const accessToken = fakeJwt({ roles: ['Platform.Demo.User'] })

  beforeEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(discovery))
    )
    restore = setConfig(entraSettings)
    server = await createServer()
    await server.initialize()
    server.plugins['hapi-auth-oidc'].oidc.callback = vi.fn(async () => ({
      accessToken,
      claims: {
        name: 'Test User',
        preferred_username: 'test.user@example.test',
        oid: 'abc-123'
      }
    }))
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    restore()
    await server.stop({ timeout: 0 })
  })

  async function signIn() {
    const response = await server.inject('/signin-oidc?code=abc&state=xyz')
    return response.headers['set-cookie']
      .map((value) => value.split(';')[0])
      .join('; ')
  }

  test('Signed-out users are sent to sign in', async () => {
    const { statusCode, headers } = await server.inject('/claims')

    expect(statusCode).toBe(302)
    expect(headers.location).toBe('/signin-oidc')
  })

  test('Lists the claims and the roles for a signed-in user', async () => {
    const cookie = await signIn()

    const response = await server.inject({
      url: '/claims',
      headers: { cookie }
    })

    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('Test User')
    expect(response.payload).toContain('test.user@example.test')
    expect(response.payload).toContain('abc-123')
    expect(response.payload).toContain('Platform.Demo.User')
    expect(response.payload).toContain('Access token claims')
  })

  test('Blurs identifying values, including the name in the heading', async () => {
    const cookie = await signIn()

    const response = await server.inject({
      url: '/claims',
      headers: { cookie }
    })

    expect(response.payload).toMatch(
      /<td[^>]*app-claim-blurred[^>]*>\s*abc-123/
    )
    expect(response.payload).toMatch(
      /app-claim-blurred[^>]*>\s*Signed in as Test User/
    )
    expect(response.payload).not.toMatch(/app-claim-blurred[^>]*>\s*Platform/)
  })

  test('Does not blur when CLAIMS_BLUR is off', async () => {
    const reset = setConfig({ 'claims.blur': false })
    const cookie = await signIn()

    const response = await server.inject({
      url: '/claims',
      headers: { cookie }
    })
    reset()

    expect(response.payload).not.toContain('app-claim-blurred')
  })

  test('Never shows the ID token', async () => {
    server.plugins['hapi-auth-oidc'].oidc.callback = vi.fn(async () => ({
      accessToken,
      idToken: 'secret-id-token',
      claims: { name: 'Test User' }
    }))
    const cookie = await signIn()

    const response = await server.inject({
      url: '/claims',
      headers: { cookie }
    })

    expect(response.payload).not.toContain('secret-id-token')
  })

  test('Shows My claims and Sign out in the navigation', async () => {
    const cookie = await signIn()

    const response = await server.inject({
      url: '/claims',
      headers: { cookie }
    })

    expect(response.payload).toContain('href="/logout"')
  })

  test('Never shows the tokens', async () => {
    const cookie = await signIn()

    const response = await server.inject({
      url: '/claims',
      headers: { cookie }
    })

    expect(response.payload).not.toContain(accessToken)
  })

  test('A session cannot be reused after sign out', async () => {
    const cookie = await signIn()

    await server.inject({ url: '/logout', headers: { cookie } })
    const after = await server.inject({ url: '/claims', headers: { cookie } })

    expect(after.statusCode).toBe(302)
    expect(after.headers.location).toBe('/signin-oidc')
  })
})
