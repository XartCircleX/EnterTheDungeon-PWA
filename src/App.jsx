import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const API_URL = (import.meta.env.VITE_CHAR_API ?? '/api/characters').replace(/\/$/, '')
const CLOUDINARY_UPLOAD_URL = import.meta.env.VITE_CLOUDINARY_UPLOAD_URL
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const emptyForm = { name: '', description: '', image: '' }
const sampleCharacters = [
  {
    id: 'ca30855e-d144-4650-b3d2-f04ed367a05a',
    name: 'Sir Aldric the Brave',
    description: 'Paladin sworn to guard the dungeon gate.',
    image: 'https://res.cloudinary.com/dwdnlzpjy/image/upload/v1771371809/wikidun/xkbtqrqvt44vkma5hpaz.jpg',
  },
  {
    id: '7d96970d-1975-4eda-9bb0-8c2cc9737998',
    name: 'Morgath the Ancient',
    description: 'Archmage who bends reality to his will.',
    image: 'https://res.cloudinary.com/dwdnlzpjy/image/upload/v1771371382/wikidun/rqgumgvb2qvm1wp2qeqf.jpg',
  },
]

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

  const selectedCharacter = useMemo(
    () => characters.find((item) => item.id === selectedId) ?? characters[0] ?? null,
    [characters, selectedId],
  )

  const visibleCharacters = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return characters
    return characters.filter((c) => c.name?.toLowerCase().includes(term))
  }, [characters, query])

  const fetchCharacters = useCallback(
    async (customQuery) => {
      setLoading(true)
      setError('')
      const finalQuery = typeof customQuery === 'string' ? customQuery : query
      const url = finalQuery?.trim()
        ? `${API_URL}?name=${encodeURIComponent(finalQuery.trim())}`
        : API_URL

      try {
        const response = await fetch(url, {
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) throw new Error(`API unavailable (${response.status})`)
        const data = await response.json()
        if (!Array.isArray(data)) throw new Error('Invalid payload')
        setCharacters(data)
        localStorage.setItem('characters-cache', JSON.stringify(data))
        setSelectedId((current) => {
          if (data.length === 0) return null
          if (data.some((item) => item.id === current)) return current ?? data[0].id
          return data[0].id
        })
      } catch (err) {
        console.error('Character GET failed', err)
        setError('Unable to load from the API. Showing the base set so you can see the view.')
        setCharacters(sampleCharacters)
        localStorage.setItem('characters-cache', JSON.stringify(sampleCharacters))
        setSelectedId((current) => {
          if (sampleCharacters.length === 0) return null
          if (sampleCharacters.some((item) => item.id === current)) return current ?? sampleCharacters[0].id
          return sampleCharacters[0].id
        })
      } finally {
        setLoading(false)
      }
    },
    [query],
  )

  useEffect(() => {
    const cached = localStorage.getItem('characters-cache')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        setCharacters(parsed)
        if (parsed.length) {
          setSelectedId((current) => current ?? parsed[0].id)
        }
      } catch (err) {
        console.warn('Could not read local cache', err)
      }
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
    const formData = new FormData()
    formData.append('file', currentUrl)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

    try {
      const response = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: formData })
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
    if (!targetId) {
      setError('Select a character to update it.')
      return
    }

    setSaving(true)
    setMessage('')
    setError('')

    try {
      // If Cloudinary is configured and the URL is not from Cloudinary, upload it first to get secure_url
      const finalImage = await ensureCloudinaryUrlIfConfigured()
      if (!finalImage) {
        throw new Error('Could not prepare the image for PATCH.')
      }

      const payloadToSend = { ...payload, image: finalImage }

      const response = await fetch(API_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...payloadToSend, id: targetId }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Error ${response.status}`)
      }

      await fetchCharacters()
      setMessage('Character updated and cached.')
    } catch (err) {
      console.error('PATCH failed', err)
      setError('Could not save changes. Verify the endpoint allows PATCH or try again later.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__inner">
          <p className="eyebrow">Archive of Heroes, Monsters, and Legends</p>
          <h1>Enter the Dungeon</h1>
          <p className="lede">Find, filter, and edit the entries of your dark world in one place.</p>
          <div className="search-row">
            <input
              className="search-input wide"
              placeholder="Search by name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchCharacters(query)
              }}
            />
            <button className="cta primary" type="button" onClick={() => fetchCharacters(query)} disabled={loading}>
              {loading ? 'Fetching...' : 'Search'}
            </button>
            <button
              className="cta ghost"
              type="button"
              onClick={() => {
                setQuery('')
                fetchCharacters('')
              }}
              disabled={loading}
            >
              Clear
            </button>
          </div>
          <div className="hero__meta">
            <span className="pill ghost">{visibleCharacters.length} results</span>
            {offline && <span className="pill warning">Offline · using cache</span>}
            {!offline && <span className="pill success">Online</span>}
          </div>
        </div>
      </header>

      <main className="content" id="characters">
        <section className="panel list-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Bestiary and dossiers</p>
              <h2>Characters</h2>
            </div>
            <div className="pill-stack">
              {message && <span className="pill success">{message}</span>}
              {error && <span className="pill danger">{error}</span>}
            </div>
          </div>

          {loading ? (
            <div className="skeleton-grid">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="skeleton-card" />
              ))}
            </div>
          ) : visibleCharacters.length === 0 ? (
            <p className="muted">No results for "{query}".</p>
          ) : (
            <div className="card-grid">
              {visibleCharacters.map((character) => (
                <button
                  key={character.id}
                  type="button"
                  className={`card ${character.id === selectedId ? 'active' : ''}`}
                  onClick={() => handleSelect(character.id)}
                >
                  <img src={character.image} alt={character.name} className="thumb" loading="lazy" />
                  <div className="card-text">
                    <h3>{character.name}</h3>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="panel detail-panel">
          {selectedCharacter ? (
            <div className="detail">
              <img src={selectedCharacter.image} alt={selectedCharacter.name} className="hero-image" loading="lazy" />
              <div className="detail-text">
                <h3>{selectedCharacter.name}</h3>
                <p>{selectedCharacter.description}</p>
              </div>
            </div>
          ) : (
            <p className="muted">Select a card to see details.</p>
          )}
        </section>

        <section className="panel form-panel" id="editor">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Edit {selectedCharacter?.name ?? 'character'}</p>
              <h2>Update the selected entry</h2>
            </div>
            <span className="pill info">PATCH</span>
          </div>
          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                placeholder="e.g. Aria the warden"
                value={form.name}
                onChange={handleFormChange}
              />
            </div>
            <div className="field">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                rows="3"
                placeholder="Brief bio, motivation, or role in the world"
                value={form.description}
                onChange={handleFormChange}
              />
            </div>
            <div className="field">
              <label htmlFor="image">Image (URL)</label>
              <input
                id="image"
                name="image"
                placeholder="https://...jpg"
                value={form.image}
                onChange={handleFormChange}
              />
            </div>
            <div className="form-footer">
              <p className="muted">Send the changes to the selected character.</p>
              <button type="submit" className="cta primary" disabled={saving || loading}>
                {saving ? 'Saving...' : 'Update character'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}

export default App
