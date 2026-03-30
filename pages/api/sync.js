require('dotenv').config()
const { setupDatabase, upsertPost } = require('../../lib/db')
const { getInstagramPosts } = require('../../lib/instagram')
const { getYouTubeVideos } = require('../../lib/youtube')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await setupDatabase()

    const results = { instagram: 0, youtube: 0, errors: [] }

    // Sync Instagram
    if (process.env.INSTAGRAM_ACCESS_TOKEN) {
      const posts = await getInstagramPosts(process.env.INSTAGRAM_ACCESS_TOKEN)
      for (const post of posts) {
        await upsertPost(post)
        results.instagram++
      }
    } else {
      results.errors.push('INSTAGRAM_ACCESS_TOKEN not set')
    }

    // Sync YouTube
    if (process.env.YOUTUBE_API_KEY) {
      const videos = await getYouTubeVideos(process.env.YOUTUBE_API_KEY)
      for (const video of videos) {
        await upsertPost(video)
        results.youtube++
      }
    } else {
      results.errors.push('YOUTUBE_API_KEY not set')
    }

    res.status(200).json({ success: true, synced: results })
  } catch (error) {
    console.error('Sync error:', error)
    res.status(500).json({ error: error.message })
  }
}
