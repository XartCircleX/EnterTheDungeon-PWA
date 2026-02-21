import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const API_URL = (import.meta.env.VITE_CHAR_API ?? '/api/characters').replace(/\/$/, '')
const CLOUDINARY_UPLOAD_URL = import.meta.env.VITE_CLOUDINARY_UPLOAD_URL
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const emptyForm = { name: '', description: '', image: '' }
const CACHE_KEY = 'characters-cache'

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null
  } catch { return null }
}

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}
function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function IconTarget() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  )
}
function IconCrown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 20h20M5 20l2-10 5 5 5-5 2 10" />
    </svg>
  )
}
function IconBook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}
function IconHeart() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
function IconSword() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
    </svg>
  )
}
function IconShield() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
function IconStar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}
function IconArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  )
}
function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function StatBar({ icon, label, value, max = 600 }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="stat-row">
      <div className="stat-label-wrap">
        <span className="stat-icon">{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      <span className="stat-value">{value}</span>
      <div className="stat-track">
        <div className="stat-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function App() {
  const [characters, setCharacters] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(!navigator.onLine)
  const [query, setQuery] = useState('')
  const [, setUploading] = useState(false)
  const [view, setView] = useState('list')
  const [showEdit, setShowEdit] = useState(false)
  // allCharacters holds the full API set; characters is filtered from it
  const [allCharacters, setAllCharacters] = useState([])

  const selectedCharacter = useMemo(
    () => characters.find((item) => item.id === selectedId) ?? null,
    [characters, selectedId],
  )

  // Search and filter are purely client-side — no extra API call on every keystroke
  const visibleCharacters = useMemo(() => {
    const term = query.trim().toLowerCase()
    let list = allCharacters
    if (term) list = list.filter((c) =>
      c.name?.toLowerCase().includes(term) ||
      c.type?.toLowerCase().includes(term) ||
      c.description?.toLowerCase().includes(term)
    )
    return list
  }, [allCharacters, query])

  // fetchCharacters: loads ALL entries once (or on manual refresh).
  // On failure it uses the localStorage cache as the PWA offline fallback.
  // It never falls back to hardcoded data.
  const fetchCharacters = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(API_URL, { headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error(`API error ${response.status}`)
      const data = await response.json()
      if (!Array.isArray(data)) throw new Error('Invalid payload')
      setAllCharacters(data)
      setCharacters(data)
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
      setSelectedId((current) => {
        if (data.length === 0) return null
        if (data.some((item) => item.id === current)) return current
        return data[0]?.id ?? null
      })
    } catch (err) {
      console.error('Fetch failed:', err)
      const cached = loadCache()
      if (cached) {
        setAllCharacters(cached)
        setCharacters(cached)
        setOffline(true)
        setError('Could not reach the API. Showing cached data.')
        setSelectedId((current) => {
          if (cached.some((item) => item.id === current)) return current
          return cached[0]?.id ?? null
        })
      } else {
        setAllCharacters([])
        setCharacters([])
        setError('Could not connect to the dungeon and no cache is available.')
      }
    } finally {
      setLoading(false)
    }
  }, []) // no deps — only runs on mount and explicit refresh

  useEffect(() => {
    // Instantly show cache while the real fetch is in flight
    const cached = loadCache()
    if (cached) {
      setAllCharacters(cached)
      setCharacters(cached)
      setSelectedId((c) => c ?? cached[0]?.id ?? null)
    }
    fetchCharacters()
  }, [fetchCharacters])

  useEffect(() => {
    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (selectedCharacter) {
      setForm({
        name: selectedCharacter.name ?? '',
        description: selectedCharacter.description ?? '',
        image: selectedCharacter.image ?? '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [selectedId, selectedCharacter])

  function handleSelect(id) {
    setSelectedId(id)
    setMessage('')
    setError('')
    setShowEdit(false)
    setView('detail')
  }

  function handleBack() {
    setView('list')
    setShowEdit(false)
    setMessage('')
    setError('')
  }

  function handleFormChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function ensureCloudinaryUrlIfConfigured() {
    const currentUrl = form.image.trim()
    if (!currentUrl) return null
    const isCloudinary = currentUrl.includes('res.cloudinary.com')
    if (isCloudinary) return currentUrl
    if (!CLOUDINARY_UPLOAD_URL || !CLOUDINARY_UPLOAD_PRESET) return currentUrl
    setUploading(true)
    const fd = new FormData()
    fd.append('file', currentUrl)
    fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    try {
      const response = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: fd })
      if (!response.ok) throw new Error(await response.text())
      const data = await response.json()
      if (!data.secure_url) throw new Error('Cloudinary did not return secure_url')
      setForm((prev) => ({ ...prev, image: data.secure_url }))
      return data.secure_url
    } catch (err) {
      console.error('Cloudinary auto upload failed', err)
      setError('Could not upload the image to Cloudinary before PATCH.')
      return null
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving) return
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      image: form.image.trim(),
    }
    if (!payload.name || !payload.description || !payload.image) {
      setError('Please fill name, description, and image before continuing.')
      return
    }
    const targetId = selectedCharacter?.id
    if (!targetId) { setError('Select a character to update it.'); return }
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const finalImage = await ensureCloudinaryUrlIfConfigured()
      if (!finalImage) throw new Error('Could not prepare the image for PATCH.')
      const response = await fetch(API_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...payload, image: finalImage, id: targetId }),
      })
      if (!response.ok) { const text = await response.text(); throw new Error(text || `Error ${response.status}`) }
      // Refresh full list and update cache
      await fetchCharacters()
      setMessage('Character updated successfully.')
      setShowEdit(false)
    } catch (err) {
      console.error('PATCH failed', err)
      setError('Could not save changes. Verify the endpoint allows PATCH or try again later.')
    } finally {
      setSaving(false)
    }
  }

  if (view === 'detail' && selectedCharacter) {
    const ch = selectedCharacter
    const hasStats = ch.stats && (ch.stats.hp || ch.stats.damage || ch.stats.defense)
    const hasAttributes = Array.isArray(ch.attributes) && ch.attributes.length > 0
    const rarityColor = {
      LEGENDARY: '#c9963e',
      EPIC: '#9b59b6',
      RARE: '#2980b9',
      COMMON: '#7f8c8d',
    }[ch.rarity] ?? '#c9963e'

    return (
      <div className="page">
        <div className="detail-hero" style={{ backgroundImage: `url(${ch.image})` }}>
          <div className="detail-hero__overlay" />
          <div className="detail-hero__content">
            <button className="back-btn" onClick={handleBack} type="button">
              <IconArrowLeft /><span>Back</span>
            </button>
            <div className="detail-hero__text">
              {ch.type && <p className="detail-type">{ch.type.toUpperCase()}</p>}
              <h1 className="detail-name">{ch.name}</h1>
            </div>
          </div>
        </div>

        <div className="detail-body">
          {(message || error) && (
            <div className="detail-messages">
              {message && <span className="msg-pill success">{message}</span>}
              {error && <span className="msg-pill danger">{error}</span>}
            </div>
          )}

          <div className="detail-grid">
            <div className="detail-left">
              <div className="info-card">
                <h3 className="info-card__title"><IconBook /><span>Lore</span></h3>
                <p className="info-card__body">{ch.lore ?? ch.description}</p>
              </div>

              {hasAttributes && (
                <div className="attributes-section">
                  <h4 className="attributes-title">Attributes</h4>
                  <div className="attributes-list">
                    {ch.attributes.map((attr) => (
                      <span key={attr} className="attr-tag">{attr}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="detail-right">
              {hasStats && (
                <div className="info-card">
                  <h3 className="info-card__title--plain">Statistics</h3>
                  <div className="stats-list">
                    <StatBar icon={<IconHeart />} label="HP" value={ch.stats.hp} max={600} />
                    <StatBar icon={<IconSword />} label="Damage" value={ch.stats.damage} max={300} />
                    <StatBar icon={<IconShield />} label="Defense" value={ch.stats.defense} max={200} />
                  </div>
                  {ch.rarity && (
                    <div className="rarity-row">
                      <span className="rarity-label"><IconStar /> Rarity</span>
                      <span className="rarity-value" style={{ color: rarityColor }}>{ch.rarity}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="detail-thumb-wrap">
                <img src={ch.image} alt={ch.name} className="detail-thumb" loading="lazy" />
              </div>

              <button className="edit-btn" type="button" onClick={() => setShowEdit((v) => !v)}>
                <IconEdit /><span>{showEdit ? 'Cancel Edit' : 'Edit Entry'}</span>
              </button>

              {showEdit && (
                <div className="info-card edit-card">
                  <h3 className="info-card__title--plain">Update Entry</h3>
                  <form className="form" onSubmit={handleSubmit}>
                    <div className="field">
                      <label htmlFor="name">Name</label>
                      <input id="name" name="name" placeholder="e.g. Aria the Warden" value={form.name} onChange={handleFormChange} />
                    </div>
                    <div className="field">
                      <label htmlFor="description">Description</label>
                      <textarea id="description" name="description" rows="3" placeholder="Brief bio or role" value={form.description} onChange={handleFormChange} />
                    </div>
                    <div className="field">
                      <label htmlFor="image">Image URL</label>
                      <input id="image" name="image" placeholder="https://...jpg" value={form.image} onChange={handleFormChange} />
                    </div>
                    <button type="submit" className="submit-btn" disabled={saving || loading}>
                      {saving ? 'Saving...' : 'Update Character'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="site-footer">
          <p className="footer-quote">"The deeper you descend, the darker the secrets become..."</p>
          <p className="footer-copy">Enter the Dungeon  2026  Archive Version 1.0</p>
        </footer>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="site-header">
        <h1 className="site-title">Enter the Dungeon</h1>
        <p className="site-subtitle">Archive of Heroes, Monsters, and Legends</p>
        <div className="search-wrap">
          <span className="search-icon"><IconSearch /></span>
          <input
            className="search-bar"
            placeholder="Search the dungeon..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setQuery('') }}
          />
          {query && (
            <button className="search-clear" type="button" onClick={() => setQuery('')} aria-label="Clear search">
              ✕
            </button>
          )}
        </div>
        <div className="header-meta">
          <span className={offline ? 'offline-badge' : 'online-badge'}>
            <span className="status-dot" />
            {offline ? 'Offline · cache' : 'Online'}
          </span>
          {error && !offline && <span className="error-badge">{error}</span>}
          <button
            className="refresh-btn"
            type="button"
            onClick={() => fetchCharacters()}
            disabled={loading}
            title="Refresh from API"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </header>

      <main className="list-main">
        <p className="results-count">
          Found {visibleCharacters.length} {visibleCharacters.length === 1 ? 'entry' : 'entries'}
        </p>

        {loading ? (
          <div className="card-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="entry-card skeleton-card" />
            ))}
          </div>
        ) : visibleCharacters.length === 0 ? (
          <p className="empty-msg">No entries found{query ? ` for "${query}"` : ''}.</p>
        ) : (
          <div className="card-grid">
            {visibleCharacters.map((ch) => {
              const category = ch.category ?? 'character'
              return (
                <button key={ch.id} type="button" className="entry-card" onClick={() => handleSelect(ch.id)}>
                  <div className="entry-card__image-wrap">
                    <img src={ch.image} alt={ch.name} className="entry-card__image" loading="lazy" />
                    <div className="entry-card__image-overlay" />
                    {category === 'boss' && <span className="badge badge--boss"><IconCrown /> BOSS</span>}
                    {category === 'enemy' && <span className="badge badge--enemy"><IconTarget /></span>}
                  </div>
                  <div className="entry-card__body">
                    <h3 className="entry-card__name">{ch.name}</h3>
                    {ch.type && <p className="entry-card__type">{ch.type}</p>}
                    <p className="entry-card__desc">{ch.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>

      <footer className="site-footer">
        <p className="footer-quote">"The deeper you descend, the darker the secrets become..."</p>
        <p className="footer-copy">Enter the Dungeon  2026  Archive Version 1.0</p>
      </footer>
    </div>
  )
}

export default App
