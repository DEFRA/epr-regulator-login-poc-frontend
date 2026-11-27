import { config } from '#/config/config.js'
import { userFromCredentials } from './claims-view.js'
import { entraBaseUrl } from '#/server/plugins/entra-auth.js'

const MAX_ID_TOKEN_HINT_LENGTH = 3500

const SIGN_IN_FAILED = {
  pageTitle: 'Sign in failed',
  heading: 'Sign in failed',
  message: 'We could not sign you in. Try again.'
}

const SIGN_IN_UNAVAILABLE = {
  pageTitle: 'Sign in unavailable',
  heading: 503,
  message: 'Sign in is not available right now. Try again later.'
}

export const signinController = {
  async handler(request, h) {
    if (!request.login) {
      return h
        .view('error/index', {
          pageTitle: 'Sign in unavailable',
          heading: 503,
          message: 'Sign in is not configured'
        })
        .code(503)
    }

    if (!request.query.code && !request.query.error) {
      try {
        return await request.login(h)
      } catch (error) {
        request.logger.warn(error, 'Sign in could not start')
        return h.view('error/index', SIGN_IN_UNAVAILABLE).code(503)
      }
    }

    try {
      const credentials = await request.callback(h)
      request.yar.reset()
      request.yar.set(
        'user',
        userFromCredentials(
          credentials,
          Boolean(config.get('auth.entraId.apiScope'))
        )
      )
      if (credentials.idToken) {
        request.yar.set('idToken', credentials.idToken)
      }
      return h.redirect('/claims')
    } catch (error) {
      request.logger.warn(error, 'Sign in failed')
      return h.view('error/index', SIGN_IN_FAILED).code(401)
    }
  }
}

export const logoutController = {
  handler(request, h) {
    const idToken = request.yar.get('idToken')
    request.yar.reset()
    if (!config.get('auth.entraId.authority')) {
      return h.redirect('/signed-out')
    }
    const url = new URL(
      `${config.get('auth.entraId.authority').replace(/\/+$/, '')}/oauth2/v2.0/logout`
    )
    if (idToken && idToken.length <= MAX_ID_TOKEN_HINT_LENGTH) {
      url.searchParams.set('id_token_hint', idToken)
    }
    url.searchParams.set(
      'post_logout_redirect_uri',
      `${entraBaseUrl()}/signed-out`
    )
    return h.redirect(url.href)
  }
}

export const signedOutController = {
  handler(_request, h) {
    return h.view('auth/signed-out', {
      pageTitle: 'You have signed out',
      heading: 'You have signed out'
    })
  }
}
