const axios = require('axios')

const BASE = 'https://www.googleapis.com/youtube/v3'

async function getYouTubeVideos(apiKey) {
  try {
    // Get channel ID by handle
    const channelRes = await axios.get(`${BASE}/channels`, {
      params: { part: 'id,snippet', forHandle: 'An_Der_Wurzel', key: apiKey }
    })

    if (!channelRes.data.items?.length) {
      console.log('No YouTube channel found')
      return []
    }

    const channelId = channelRes.data.items[0].id

    // Get recent videos
    const searchRes = await axios.get(`${BASE}/search`, {
      params: {
        part: 'snippet',
        channelId,
        order: 'date',
        maxResults: 25,
        type: 'video',
        key: apiKey
      }
    })

    const videoIds = searchRes.data.items?.map(v => v.id.videoId).join(',')
    if (!videoIds) return []

    // Get video stats
    const statsRes = await axios.get(`${BASE}/videos`, {
      params: {
        part: 'snippet,statistics',
        id: videoIds,
        key: apiKey
      }
    })

    return (statsRes.data.items || []).map(video => {
      const stats = video.statistics || {}
      const views = parseInt(stats.viewCount) || 0
      const likes = parseInt(stats.likeCount) || 0
      const comments = parseInt(stats.commentCount) || 0
      const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0

      return {
        platform: 'youtube',
        post_id: video.id,
        title: video.snippet?.title || '',
        thumbnail_url: video.snippet?.thumbnails?.medium?.url || '',
        published_at: new Date(video.snippet?.publishedAt),
        views,
        likes,
        comments,
        shares: 0,
        saves: 0,
        reach: views,
        engagement_rate: Math.round(engagementRate * 100) / 100
      }
    })
  } catch (error) {
    console.error('YouTube API error:', error.response?.data || error.message)
    return []
  }
}

module.exports = { getYouTubeVideos }