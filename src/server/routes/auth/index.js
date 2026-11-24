import {
  logoutController,
  signedOutController,
  signinController
} from './controller.js'

export const auth = {
  plugin: {
    name: 'auth',
    register(server) {
      server.route([
        { method: 'GET', path: '/signin-oidc', ...signinController },
        { method: 'GET', path: '/logout', ...logoutController },
        { method: 'GET', path: '/signed-out', ...signedOutController }
      ])
    }
  }
}
