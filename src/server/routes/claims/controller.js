import { config } from '#/config/config.js'
import { blurRows } from '#/server/routes/auth/claims-view.js'

export const claimsController = {
  handler(request, h) {
    const user = request.yar.get('user')
    if (!user) {
      return h.redirect('/signin-oidc')
    }
    const blur = config.get('claims.blur')
    return h.view('claims/index', {
      pageTitle: 'My claims',
      heading: 'My claims',
      captionClasses: blur ? 'app-claim-blurred' : '',
      user: {
        ...user,
        idTokenRows: blurRows(user.idTokenRows, blur),
        accessTokenRows: blurRows(user.accessTokenRows, blur)
      }
    })
  }
}
