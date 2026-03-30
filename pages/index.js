import { useState, useEffect, useCallback } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const PLATFORMS = ['all', 'instagram', 'youtube']
const DAYS = ['7', '14', '30', '90']
const SORT_OPTIONS = [
  { value: 'views', label: 'Views' },
  { value: 'likes', label: 'Likes' },
  { value: 'shares', label: 'Shares' },
  { value: 'engagement_rate', label: 'Engagement Rate' }
]

function fmt(n) {
  n = Number(n) || 0
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

function KPICard({ label, value, suffix = '' }) {
  return (
    <div style={styles.kpiCard}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue}>{fmt(value)}{suffix}</div>
    </div>
  )
}

function PlatformBadge({ platform }) {
  const color = platform === 'instagram' ? '#E1306C' : '#FF0000'
  return (
    <span style={{ ...styles.badge, background: color }}>
      {platform === 'instagram' ? 'IG' : 'YT'}
    </span>
  )
}

export default function Dashboard() {
  const [platform, setPlatform] = useState('all')
  const [days, setDays] = useState('30')
  const [sortBy, setSortBy] = useState('views')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [instagramConnected, setInstagramConnected] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('instagram_connected') === 'true') {
      setInstagramConnected(true)
      setSyncMsg('Instagram erfolgreich verbunden!')
      window.history.replaceState({}, '', '/')
    }
    if (params.get('instagram_error')) {
      setSyncMsg('Instagram Fehler: ' + params.get('instagram_error'))
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/data?platform=${platform}&days=${days}&sortBy=${sortBy}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [platform, days, sortBy])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSync() {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setSyncMsg(`Sync erfolgreich: ${json.synced.instagram} Instagram, ${json.synced.youtube} YouTube Posts`)
        fetchData()
      } else {
        setSyncMsg('Fehler: ' + json.error)
      }
    } catch (e) {
      setSyncMsg('Sync fehlgeschlagen')
    }
    setSyncing(false)
  }

  const kpis = data?.kpis || {}
  const posts = data?.posts || []
  const timeSeries = (data?.timeSeries || []).map(row => ({
    date: row.date?.toString().slice(0, 10),
    Views: Number(row.views) || 0,
    Reach: Number(row.reach) || 0
  }))

  const engagementData = posts.slice(0, 10).map(p => ({
    name: p.title?.slice(0, 20) + '...',
    Likes: p.likes,
    Kommentare: p.comments,
    Shares: p.shares,
    Saves: p.saves
  }))

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Content Dashboard</h1>
        <div style={styles.headerRight}>
          {syncMsg && <span style={styles.syncMsg}>{syncMsg}</span>}
          {!instagramConnected && (
            <a href="/api/instagram-auth" style={styles.igBtn}>Instagram verbinden</a>
          )}
          <button style={styles.syncBtn} onClick={handleSync} disabled={syncing}>
            {syncing ? 'Sync läuft...' : 'Daten aktualisieren'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          {PLATFORMS.map(p => (
            <button
              key={p}
              style={platform === p ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setPlatform(p)}
            >
              {p === 'all' ? 'Alle' : p === 'instagram' ? 'Instagram' : 'YouTube'}
            </button>
          ))}
        </div>
        <div style={styles.filterGroup}>
          {DAYS.map(d => (
            <button
              key={d}
              style={days === d ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Lade Daten...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={styles.kpiGrid}>
            <KPICard label="Views" value={kpis.total_views} />
            <KPICard label="Reach" value={kpis.total_reach} />
            <KPICard label="Engagement Rate" value={Number(kpis.avg_engagement || 0).toFixed(1)} suffix="%" />
            <KPICard label="Posts" value={kpis.post_count} />
            <KPICard label="Shares" value={kpis.total_shares} />
            <KPICard label="Saves" value={kpis.total_saves} />
          </div>

          {/* Charts */}
          <div style={styles.chartsRow}>
            <div style={styles.chartBox}>
              <h3 style={styles.chartTitle}>Views & Reach</h3>
              {timeSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={timeSeries}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="Views" stroke="#6366f1" fill="#6366f120" />
                    <Area type="monotone" dataKey="Reach" stroke="#10b981" fill="#10b98120" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={styles.noData}>Noch keine Daten — sync starten</div>
              )}
            </div>

            <div style={styles.chartBox}>
              <h3 style={styles.chartTitle}>Engagement Breakdown (Top 10)</h3>
              {engagementData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={engagementData}>
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Likes" fill="#6366f1" />
                    <Bar dataKey="Kommentare" fill="#10b981" />
                    <Bar dataKey="Shares" fill="#f59e0b" />
                    <Bar dataKey="Saves" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={styles.noData}>Noch keine Daten — sync starten</div>
              )}
            </div>
          </div>

          {/* Top Posts */}
          <div style={styles.tableBox}>
            <div style={styles.tableHeader}>
              <h3 style={styles.chartTitle}>Top Posts</h3>
              <select
                style={styles.select}
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {posts.length === 0 ? (
              <div style={styles.noData}>Noch keine Posts — erst "Daten aktualisieren" klicken</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Post</th>
                    <th style={styles.th}>Plattform</th>
                    <th style={styles.th}>Datum</th>
                    <th style={styles.th}>Views</th>
                    <th style={styles.th}>Likes</th>
                    <th style={styles.th}>Shares</th>
                    <th style={styles.th}>Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map(post => (
                    <tr key={post.post_id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.postCell}>
                          {post.thumbnail_url && (
                            <img src={post.thumbnail_url} style={styles.thumb} alt="" />
                          )}
                          <span style={styles.postTitle}>{post.title?.slice(0, 60) || '—'}</span>
                        </div>
                      </td>
                      <td style={styles.td}><PlatformBadge platform={post.platform} /></td>
                      <td style={styles.td}>{post.published_at?.toString().slice(0, 10)}</td>
                      <td style={styles.td}>{fmt(post.views)}</td>
                      <td style={styles.td}>{fmt(post.likes)}</td>
                      <td style={styles.td}>{fmt(post.shares)}</td>
                      <td style={styles.td}>{Number(post.engagement_rate || 0).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: 700, margin: 0 },
  syncBtn: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14 },
  igBtn: { background: '#E1306C', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14, textDecoration: 'none' },
  syncMsg: { fontSize: 13, color: '#10b981' },
  filters: { display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' },
  filterGroup: { display: 'flex', gap: 8 },
  filterBtn: { background: '#1f1f1f', color: '#aaa', border: '1px solid #333', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 },
  filterBtnActive: { background: '#6366f1', color: '#fff', border: '1px solid #6366f1', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 24 },
  kpiCard: { background: '#1a1a1a', borderRadius: 12, padding: '20px 16px', border: '1px solid #2a2a2a' },
  kpiLabel: { fontSize: 12, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  kpiValue: { fontSize: 28, fontWeight: 700 },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 },
  chartBox: { background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' },
  chartTitle: { fontSize: 14, fontWeight: 600, margin: '0 0 16px 0', color: '#ccc' },
  noData: { color: '#555', fontSize: 13, padding: '40px 0', textAlign: 'center' },
  tableBox: { background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  select: { background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: 8, padding: '6px 12px', fontSize: 13 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '8px 12px', fontSize: 12, color: '#888', borderBottom: '1px solid #2a2a2a', textTransform: 'uppercase' },
  td: { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #1f1f1f', verticalAlign: 'middle' },
  tr: { transition: 'background 0.1s' },
  postCell: { display: 'flex', alignItems: 'center', gap: 10 },
  thumb: { width: 48, height: 36, objectFit: 'cover', borderRadius: 4 },
  postTitle: { color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 },
  badge: { fontSize: 11, fontWeight: 700, color: '#fff', padding: '2px 8px', borderRadius: 4 },
  loading: { textAlign: 'center', color: '#555', padding: 60 }
}
