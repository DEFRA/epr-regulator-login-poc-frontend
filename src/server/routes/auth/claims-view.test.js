import { blurRows, userFromCredentials } from './claims-view.js'
import { fakeJwt } from '#/test-helpers/entra.js'

describe('#userFromCredentials', () => {
  const accessToken = fakeJwt({ roles: ['Regulator'] })

  test('Lists ID token claims and roles from the access token', () => {
    const user = userFromCredentials(
      { accessToken, claims: { name: 'Test User', oid: 'abc-123' } },
      true
    )

    expect(user.name).toBe('Test User')
    expect(user.roles).toEqual(['Regulator'])
    expect(user.idTokenRows).toContainEqual([
      { text: 'oid' },
      { text: 'abc-123' }
    ])
  })

  describe('#blurRows', () => {
    const rows = [
      [{ text: 'ver' }, { text: '2.0' }],
      [{ text: 'given_name' }, { text: 'Test' }],
      [{ text: 'login_hint' }, { text: 'abc' }]
    ]

    test('Blurs every claim that is not on the harmless list', () => {
      expect(blurRows(rows, true)).toEqual([
        [{ text: 'ver' }, { text: '2.0' }],
        [
          { text: 'given_name' },
          { text: 'Test', classes: 'app-claim-blurred' }
        ],
        [{ text: 'login_hint' }, { text: 'abc', classes: 'app-claim-blurred' }]
      ])
    })

    test('Leaves the rows alone when blurring is off or there are none', () => {
      expect(blurRows(rows, false)).toBe(rows)
      expect(blurRows(null, true)).toBeNull()
    })
  })

  test('Shows non-string claim values as JSON', () => {
    const user = userFromCredentials(
      { accessToken, claims: { amr: ['pwd', 'mfa'] } },
      false
    )

    expect(user.idTokenRows).toContainEqual([
      { text: 'amr' },
      { text: '["pwd","mfa"]' }
    ])
  })

  test('Skips access token claims without an api scope', () => {
    const user = userFromCredentials(
      { accessToken, claims: { name: 'T' } },
      false
    )

    expect(user.roles).toEqual([])
    expect(user.accessTokenRows).toBeNull()
  })

  test('Handles an access token that is not a JWT', () => {
    const user = userFromCredentials(
      { accessToken: 'not-a-jwt', claims: { name: 'T' } },
      true
    )

    expect(user.roles).toEqual([])
  })

  test('Falls back when the ID token has no name', () => {
    const user = userFromCredentials(
      { accessToken, claims: { oid: '1' } },
      false
    )

    expect(user.name).toBe('your account')
  })
})
