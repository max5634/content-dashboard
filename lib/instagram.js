const axios = require('axios')

const BASE = 'https://graph.instagram.com/v19.0'

async function getInstagramPosts(accessToken) {
  try {
    // Get user ID
    const meRes = await axios.get(`${BASE}/me`, {
      params: { fields: 'id,username', access_token: accessToken }
    })
    const userId = meRes.data.id

    // Get recent media
    const mediaRes = await axios.get(`${BASE}/${userId}/media`, {
      params: {
        fields: 'id,caption,media_type,thumbnail_url,media_url,timestamp,like_count,comments_count',
        limit: 25,
        access_token: accessToken
      }
    })

    const posts = []
    for (const item of mediaRes.data.data || []) {
      // Get insights
      let reach = 0, shares = 0, saves = 0, impressions = 0
      try {
        const insightRes = await axios.get(`${BASE}/${item.id}/insights`, {
          params: {
            metric: 'reach,shares,saved,impressions',
            access_token: accessToken
          }
        })
        for (const metric of insightRes.data.data || []) {
          if (metric.name === 'reach') reach = metric.values?.[0]?.value || 0
          if (metric.name === 'shares') shares = metric.values?.[0]?.value || 0
          if (metric.name === 'saved') saves = metric.values?.[0]?.value || 0
          if (metric.name === 'impressions') impressions = metric.values?.[0]?.value || 0
        }
      } catch (e) {
        // Insights may not be available for all post types
      }

      const likes = item.like_count || 0
      const comments = item.comments_count || 0
      const engagementRate = impressions > 0
        ? ((likes + comments + shares + saves) / impressions) * 100
        : 0

      posts.push({
        platform: 'instagram',
        post_id: item.id,
        title: item.caption ? item.caption.substring(0, 200) : '',
        thumbnail_url: item.thumbnail_url || item.media_url || '',
        published_at: new Date(item.timestamp),
        views: impressions,
        likes,
        comments,
        shares,
        saves,
        reach,
        engagement_rate: Math.round(engagementRate * 100) / 100
      })
    }

    return posts
  } catch (error) {
    console.error('Instagram API error:', error.response?.data || error.message)
    return []
  }
}

module.exports = { getInstagramPosts }