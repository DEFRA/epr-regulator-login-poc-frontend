import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { createServer } from '#/server/server.js'
import { missingEntraSettings } from '#/server/plugins/entra-auth.js'
import {
  BASE_URL,
  discovery,
  entraSettings,
  setConfig
} from '#/test-helpers/entra.js'

describe('#entraAuth', () => {
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

  async function start(values) {
    restore = setConfig(values)
    server = await createServer()
    await server.initialize()
  }

  test('Starts when fully configured with a client secret', async () => {
    await start(entraSettings)

    expect(server.plugins['hapi-auth-oidc']).toBeDefined()
  })

  test('Starts when fully configured with a federated credential', async () => {
    await start({
      ...entraSettings,
      'auth.entraId.credentialType': 'federated',
      'auth.entraId.clientSecret': ''
    })

    expect(server.plugins['hapi-auth-oidc']).toBeDefined()
  })

  test('Starts without Entra settings and registers no sign in', async () => {
    await start({
      ...entraSettings,
      'auth.entraId.authority': '',
      'auth.entraId.clientId': ''
    })

    expect(server.plugins['hapi-auth-oidc']).toBeUndefined()
  })

  describe('#missingEntraSettings', () => {
    test('Lists the Entra settings that are not set', () => {
      restore = setConfig({
        ...entraSettings,
        'auth.entraId.authority': '',
        'auth.entraId.clientId': ''
      })

      expect(missingEntraSettings()).toEqual([
        'ENTRA_ID_AUTHORITY',
        'ENTRA_ID_CLIENT_ID'
      ])
    })

    test('Needs a client secret in secret mode', () => {
      restore = setConfig({ ...entraSettings, 'auth.entraId.clientSecret': '' })

      expect(missingEntraSettings()).toEqual(['ENTRA_ID_CLIENT_SECRET'])
    })

    test('Needs the public https APP_BASE_URL in production', () => {
      restore = setConfig({
        ...entraSettings,
        isProduction: true,
        'auth.baseUrl': 'http://localhost:3000'
      })

      expect(missingEntraSettings()).toEqual([
        'APP_BASE_URL (must be the public https URL)'
      ])
    })

    test('Accepts an https APP_BASE_URL with a trailing slash in production', () => {
      restore = setConfig({
        ...entraSettings,
        isProduction: true,
        'auth.baseUrl': `${BASE_URL}/`
      })

      expect(missingEntraSettings()).toEqual([])
    })
  })
})
