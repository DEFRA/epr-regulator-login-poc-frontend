import { buildNavigation } from './build-navigation.js'

function mockRequest(options) {
  return { ...options }
}

describe('#buildNavigation', () => {
  test('Should provide expected navigation details', () => {
    expect(
      buildNavigation(mockRequest({ path: '/non-existent-path' }))
    ).toEqual([
      {
        current: false,
        text: 'Home',
        href: '/'
      },
      {
        current: false,
        text: 'About',
        href: '/about'
      }
    ])
  })

  test('Should provide expected highlighted navigation details', () => {
    expect(buildNavigation(mockRequest({ path: '/' }))).toEqual([
      {
        current: true,
        text: 'Home',
        href: '/'
      },
      {
        current: false,
        text: 'About',
        href: '/about'
      }
    ])
  })

  test('Should add My claims and Sign out when signed in', () => {
    const request = mockRequest({
      path: '/claims',
      yar: { get: () => ({ name: 'Test User' }) }
    })

    expect(buildNavigation(request)).toEqual([
      { current: false, text: 'Home', href: '/' },
      { current: false, text: 'About', href: '/about' },
      { current: true, text: 'My claims', href: '/claims' },
      { current: undefined, text: 'Sign out', href: '/logout' }
    ])
  })

  test('Should not show the signed-in links when there is no session', () => {
    const request = mockRequest({
      path: '/',
      yar: {
        get: () => {
          throw new Error('no session')
        }
      }
    })

    expect(buildNavigation(request).map(({ text }) => text)).toEqual([
      'Home',
      'About'
    ])
  })
})
