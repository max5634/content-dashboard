const axios = require('axios')
const fs = require('fs')
const path = require('path')

export default async function handler(req, res) {
  const { code, error } = req.query

  if (error) {
    return res.redirect('/?instagram_error=' + error)
  }

  if (!code) {
    return res.status(400).send('Kein Code erhalten')
  }

  try {
    const redirectUri = 'https://content-dashboard-snowy.vercel.app/api/instagram-callback'

    // Exchange code for short-lived token
    const tokenRes = await axios.post('https://graph.facebook.com/v19.0/oauth/access_token', null, {
      params: {
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri: redirectUri,
        code
      }
    })

    const shortToken = tokenRes.data.access_token

    // Exchange for long-lived token
    const longTokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        fb_exchange_token: shortToken
      }
    })

    const longToken = longTokenRes.data.access_token

    // Save token to .env file
    const envPath = path.join(process.cwd(), '.env')
    let envContent = fs.readFileSync(envPath, 'utf8')

    if (envContent.includes('INSTAGRAM_ACCESS_TOKEN=')) {
      envContent = envContent.replace(/INSTAGRAM_ACCESS_TOKEN=.*/g, `INSTAGRAM_ACCESS_TOKEN=${longToken}`)
    } else {
      envContent += `\nINSTAGRAM_ACCESS_TOKEN=${longToken}`
    }

    fs.writeFileSync(envPath, envContent)
    process.env.INSTAGRAM_ACCESS_TOKEN = longToken

    res.redirect('/?instagram_connected=true')
  } catch (err) {
    console.error('Instagram OAuth error:', err.response?.data || err.message)
    res.redirect('/?instagram_error=token_exchange_failed')
  }
}
