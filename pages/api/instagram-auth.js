export default function handler(req, res) {
  const appId = process.env.META_APP_ID
  const redirectUri = 'https://content-dashboard-snowy.vercel.app/api/instagram-callback'
  const scope = 'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement'

  const authUrl = 'https://www.facebook.com/v19.0/dialog/oauth' +
    '?client_id=' + appId +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&scope=' + scope +
    '&response_type=code'

  return res.redirect(302, authUrl)
}
