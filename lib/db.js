const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function setupDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS content_analytics (
      id SERIAL PRIMARY KEY,
      platform VARCHAR(20) NOT NULL,
      post_id VARCHAR(255) UNIQUE NOT NULL,
      title TEXT,
      thumbnail_url TEXT,
      published_at TIMESTAMP,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      saves INTEGER DEFAULT 0,
      reach INTEGER DEFAULT 0,
      engagement_rate FLOAT DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `)
}

async function upsertPost(post) {
  await pool.query(`
    INSERT INTO content_analytics
      (platform, post_id, title, thumbnail_url, published_at, views, likes, comments, shares, saves, reach, engagement_rate, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
    ON CONFLICT (post_id) DO UPDATE SET
      title = EXCLUDED.title,
      thumbnail_url = EXCLUDED.thumbnail_url,
      views = EXCLUDED.views,
      likes = EXCLUDED.likes,
      comments = EXCLUDED.comments,
      shares = EXCLUDED.shares,
      saves = EXCLUDED.saves,
      reach = EXCLUDED.reach,
      engagement_rate = EXCLUDED.engagement_rate,
      updated_at = NOW()
  `, [
    post.platform, post.post_id, post.title, post.thumbnail_url,
    post.published_at, post.views, post.likes, post.comments,
    post.shares, post.saves, post.reach, post.engagement_rate
  ])
}

async function getPosts({ platform, days, sortBy } = {}) {
  let where = []
  let params = []

  if (platform && platform !== 'all') {
    params.push(platform)
    where.push(`platform = $${params.length}`)
  }
  if (days) {
    params.push(days)
    where.push(`published_at >= NOW() - INTERVAL '1 day' * $${params.length}`)
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const orderCol = ['views','likes','shares','engagement_rate'].includes(sortBy) ? sortBy : 'views'

  const result = await pool.query(
    `SELECT * FROM content_analytics ${whereClause} ORDER BY ${orderCol} DESC LIMIT 50`,
    params
  )
  return result.rows
}

async function getKPIs({ platform, days } = {}) {
  let where = []
  let params = []

  if (platform && platform !== 'all') {
    params.push(platform)
    where.push(`platform = $${params.length}`)
  }
  if (days) {
    params.push(days)
    where.push(`published_at >= NOW() - INTERVAL '1 day' * $${params.length}`)
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const result = await pool.query(
    `SELECT
      COALESCE(SUM(views), 0) as total_views,
      COALESCE(SUM(reach), 0) as total_reach,
      COALESCE(AVG(engagement_rate), 0) as avg_engagement,
      COALESCE(SUM(shares), 0) as total_shares,
      COALESCE(SUM(saves), 0) as total_saves,
      COUNT(*) as post_count
    FROM content_analytics ${whereClause}`,
    params
  )
  return result.rows[0]
}

async function getTimeSeries({ platform, days } = {}) {
  let where = []
  let params = []

  if (platform && platform !== 'all') {
    params.push(platform)
    where.push(`platform = $${params.length}`)
  }
  if (days) {
    params.push(days)
    where.push(`published_at >= NOW() - INTERVAL '1 day' * $${params.length}`)
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const result = await pool.query(
    `SELECT
      DATE(published_at) as date,
      SUM(views) as views,
      SUM(reach) as reach
    FROM content_analytics ${whereClause}
    GROUP BY DATE(published_at)
    ORDER BY date ASC`,
    params
  )
  return result.rows
}

module.exports = { setupDatabase, upsertPost, getPosts, getKPIs, getTimeSeries, pool }