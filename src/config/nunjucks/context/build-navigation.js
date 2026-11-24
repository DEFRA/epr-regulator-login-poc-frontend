export function buildNavigation(request) {
  let signedIn = false
  try {
    signedIn = Boolean(request?.yar?.get('user'))
  } catch {
    // no session on requests that never matched a route, such as a 404
  }
  return [
    { text: 'Home', href: '/', current: request?.path === '/' },
    { text: 'About', href: '/about', current: request?.path === '/about' },
    ...(signedIn
      ? [
          {
            text: 'My claims',
            href: '/claims',
            current: request?.path === '/claims'
          },
          { text: 'Sign out', href: '/logout' }
        ]
      : [])
  ]
}
