export const claimsController = {
  handler(request, h) {
    const user = request.yar.get('user')
    if (!user) {
      return h.redirect('/signin-oidc')
    }
    return h.view('claims/index', {
      pageTitle: 'My claims',
      heading: 'My claims',
      user
    })
  }
}
