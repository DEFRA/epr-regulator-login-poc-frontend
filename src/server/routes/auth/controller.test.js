import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { createServer } from '#/server/server.js'
import {
  AUTHORITY,
  BASE_URL,
  discovery,
  entraSettings,
  fakeJwt,
  setConfig
} from '#/test-helpers/entra.js'

describe('#auth controller', () => {
  let restore
  let server

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(discovery))
    )
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    restore?.()
    await server?.stop({ timeout: 0 })
    server = undefined
  })

  async function start(values = entraSettings) {
    restore = setConfig(values)
    server = await createServer()
    await server.initialize()
  }

  describe('sign in', () => {
    test('Redirects to Entra ID with PKCE, state and the redirect URI', async () => {
      await start()

      const response = await server.inject('/signin-oidc')
      const location = new URL(response.headers.location)

      expect(response.statusCode).toBe(302)
      expect(location.origin + location.pathname).toBe(
        discovery.authorization_endpoint
      )
      expect(location.searchParams.get('client_id')).toBe('test-client-id')
      expect(location.searchParams.get('redirect_uri')).toBe(
        `${BASE_URL}/signin-oidc`
      )
      expect(location.searchParams.get('code_challenge_method')).toBe('S256')
      expect(location.searchParams.get('code_challenge')).toBeTruthy()
      expect(location.searchParams.get('state')).toBeTruthy()
      expect(location.searchParams.get('scope')).toBe(
        'openid profile api://test-client-id/.default'
      )
      expect(response.headers['set-cookie'].join(';')).toMatch(/HttpOnly/i)
    })

    test('Shows an unavailable page when Entra cannot be reached', async () => {
      await start()
      fetch.mockRejectedValue(new Error('proxy blocked'))

      const response = await server.inject('/signin-oidc')

      expect(response.statusCode).toBe(503)
      expect(response.payload).toContain('Sign in unavailable')
    })

    test('Shows an unavailable page when Entra is not configured', async () => {
      await start({
        ...entraSettings,
        'auth.entraId.authority': '',
        'auth.entraId.clientId': ''
      })

      const response = await server.inject('/signin-oidc')

      expect(response.statusCode).toBe(503)
      expect(response.payload).toContain('Sign in is not configured')
    })
  })

  describe('callback', () => {
    test('Refuses a callback without the login cookie and creates no session', async () => {
      await start()

      const response = await server.inject('/signin-oidc?code=abc&state=forged')
      const claims = await server.inject('/claims')

      expect(response.statusCode).toBe(401)
      expect(response.payload).toContain('Sign in failed')
      expect(claims.statusCode).toBe(302)
      expect(claims.headers.location).toBe('/signin-oidc')
    })

    test('Shows the failed page when Entra returns an error', async () => {
      await start()

      const response = await server.inject('/signin-oidc?error=access_denied')

      expect(response.statusCode).toBe(401)
    })

    test('A successful sign in goes to the claims page with a session', async () => {
      await start()
      server.plugins['hapi-auth-oidc'].oidc.callback = vi.fn(async () => ({
        accessToken: fakeJwt({ roles: ['Platform.Demo.User'] }),
        claims: { name: 'Test User' }
      }))

      const response = await server.inject('/signin-oidc?code=abc&state=xyz')

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/claims')
      expect(response.headers['set-cookie'].join(';')).toMatch(/session=/)
    })
  })

  describe('sign out', () => {
    test('Clears the session and goes to the Entra logout', async () => {
      await start({ ...entraSettings, 'auth.baseUrl': `${BASE_URL}/` })

      const response = await server.inject('/logout')
      const location = new URL(response.headers.location)

      expect(response.statusCode).toBe(302)
      expect(location.origin + location.pathname).toBe(
        `${AUTHORITY}/oauth2/v2.0/logout`
      )
      expect(location.searchParams.get('post_logout_redirect_uri')).toBe(
        `${BASE_URL}/signed-out`
      )
    })

    test('Sends the ID token as a hint so Entra signs out without asking', async () => {
      await start({ ...entraSettings, 'auth.baseUrl': `${BASE_URL}/` })
      server.plugins['hapi-auth-oidc'].oidc.callback = vi.fn(async () => ({
        accessToken: fakeJwt({}),
        idToken: 'the-id-token',
        claims: { name: 'Test User' }
      }))
      const signIn = await server.inject('/signin-oidc?code=abc&state=xyz')
      const cookie = signIn.headers['set-cookie']
        .find((c) => c.startsWith('session='))
        .split(';')[0]

      const response = await server.inject({
        url: '/logout',
        headers: { cookie }
      })
      const location = new URL(response.headers.location)

      expect(location.searchParams.get('id_token_hint')).toBe('the-id-token')
    })

    test('Sends no hint when there is no ID token or it is too long', async () => {
      await start({ ...entraSettings, 'auth.baseUrl': `${BASE_URL}/` })

      const none = await server.inject('/logout')

      server.plugins['hapi-auth-oidc'].oidc.callback = vi.fn(async () => ({
        accessToken: fakeJwt({}),
        idToken: 'x'.repeat(4000),
        claims: { name: 'Test User' }
      }))
      const signIn = await server.inject('/signin-oidc?code=abc&state=xyz')
      const cookie = signIn.headers['set-cookie']
        .find((c) => c.startsWith('session='))
        .split(';')[0]
      const long = await server.inject({ url: '/logout', headers: { cookie } })

      expect(
        new URL(none.headers.location).searchParams.has('id_token_hint')
      ).toBe(false)
      expect(
        new URL(long.headers.location).searchParams.has('id_token_hint')
      ).toBe(false)
    })

    test('Does not fail when Entra is not configured', async () => {
      await start({ ...entraSettings, 'auth.entraId.authority': '' })

      const response = await server.inject('/logout')

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signed-out')
    })

    test('The signed-out page is open', async () => {
      await start()

      const response = await server.inject('/signed-out')

      expect(response.statusCode).toBe(200)
      expect(response.payload).toContain('You have signed out')
    })
  })
})
