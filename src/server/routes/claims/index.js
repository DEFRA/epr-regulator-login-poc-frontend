import { claimsController } from './controller.js'

export const claims = {
  plugin: {
    name: 'claims',
    register(server) {
      server.route([{ method: 'GET', path: '/claims', ...claimsController }])
    }
  }
}
