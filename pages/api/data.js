require('dotenv').config()
const { getPosts, getKPIs, getTimeSeries } = require('../../lib/db')

export default async function handler(req, res) {
  const { platform = 'all', days = '30', sortBy = 'views' } = req.query

  try {
    const daysNum = parseInt(days)
    const [posts, kpis, timeSeries] = await Promise.all([
      getPosts({ platform, days: daysNum, sortBy }),
      getKPIs({ platform, days: daysNum }),
      getTimeSeries({ platform, days: daysNum })
    ])

    res.status(200).json({ posts, kpis, timeSeries })
  } catch (error) {
    console.error('Data error:', error)
    res.status(500).json({ error: error.message })
  }
}
