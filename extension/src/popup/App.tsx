import { useState, useEffect } from 'react'
import { verifyToken, fetchProfile, updateJobStatus, type UserProfile } from '../api'

const DASHBOARD = 'https://qa-job-tracker.vercel.app'
const TOKEN_KEY  = 'ext_token'

type AppState = 'loading' | 'not-connected' | 'verifying' | 'connected'
type FillState = 'idle' | 'filling' | 'done' | 'error'

interface FillResult {
  filled:    number
  skipped:   number
  uncertain: string[]
}

export default function App() {
  const [appState,   setAppState]   = useState<AppState>('loading')
  const [tokenInput, setTokenInput] = useState('')
  const [error,      setError]      = useState('')
  const [pageUrl,    setPageUrl]    = useState('')
  const [pageHost,   setPageHost]   = useState('')
  const [tabId,      setTabId]      = useState<number | null>(null)
  const [fillState,  setFillState]  = useState<FillState>('idle')
  const [fillResult, setFillResult] = useState<FillResult | null>(null)
  const [storedToken, setStoredToken] = useState('')

  useEffect(() => {
    chrome.storage.local.get(TOKEN_KEY, async ({ ext_token }) => {
      if (!ext_token) { setAppState('not-connected'); return }
      const ok = await verifyToken(ext_token)
      if (ok) {
        setStoredToken(ext_token)
        setAppState('connected')
        queryActiveTab()
      } else {
        chrome.storage.local.remove(TOKEN_KEY)
        setAppState('not-connected')
      }
    })
  }, [])

  function queryActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id)  setTabId(tab.id)
      if (tab?.url) {
        setPageUrl(tab.url)
        try { setPageHost(new URL(tab.url).hostname) } catch { setPageHost(tab.url) }
      }
    })
  }

  async function handleConnect() {
    const token = tokenInput.trim()
    if (!token) return
    setError('')
    setAppState('verifying')
    const ok = await verifyToken(token)
    if (ok) {
      chrome.storage.local.set({ [TOKEN_KEY]: token }, () => {
        setStoredToken(token)
        setAppState('connected')
        queryActiveTab()
      })
    } else {
      setError('Invalid token. Copy it from Settings → Apply Assistant Extension.')
      setAppState('not-connected')
    }
  }

  function handleDisconnect() {
    chrome.storage.local.remove(TOKEN_KEY, () => {
      setTokenInput('')
      setStoredToken('')
      setPageUrl('')
      setPageHost('')
      setTabId(null)
      setFillState('idle')
      setFillResult(null)
      setAppState('not-connected')
    })
  }

  async function handleAutofill() {
    if (!tabId || !storedToken) return
    setFillState('filling')
    setFillResult(null)

    try {
      // 1. Fetch the user's profile
      const profile: UserProfile = await fetchProfile(storedToken)

      // 2. Inject content script if not already injected
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js'],
      }).catch(() => {
        // May fail if already injected — that's fine
      })

      // 3. Ping to verify content script is ready
      const pingOk = await new Promise<boolean>(resolve => {
        chrome.tabs.sendMessage(tabId, { type: 'PING' }, res => {
          resolve(!!res?.ok)
        })
      })
      if (!pingOk) throw new Error('Could not reach the page. Try refreshing.')

      // 4. Send AUTOFILL message to content script
      const result = await new Promise<FillResult>((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { type: 'AUTOFILL', profile }, res => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
          else resolve(res as FillResult)
        })
      })

      setFillResult(result)
      setFillState('done')

      // 5. Mark the job status as Ready for Review (never Applied)
      //    We do a best-effort status update — we don't know the jobId from here
      //    so we skip that step. Users can update it manually from the queue.
      //    Phase 4 will add job matching to auto-select the right job.

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Autofill failed')
      setFillState('error')
    }
  }

  function openQueue() {
    chrome.tabs.create({ url: `${DASHBOARD}/queue` })
    window.close()
  }

  function openSettings() {
    chrome.tabs.create({ url: `${DASHBOARD}/settings` })
    window.close()
  }

  // Is the current page a dashboard page? (don't offer autofill there)
  const isOwnPage = pageUrl.startsWith(DASHBOARD)

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div className="logo">
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="13" height="13">
            <rect x="2"  y="2"  width="5" height="5" rx="1" fill="white" opacity="0.9"/>
            <rect x="9"  y="2"  width="5" height="5" rx="1" fill="white" opacity="0.7"/>
            <rect x="2"  y="9"  width="5" height="5" rx="1" fill="white" opacity="0.7"/>
            <rect x="9"  y="9"  width="5" height="5" rx="1" fill="white" opacity="0.5"/>
          </svg>
        </div>
        <span className="header-title">Apply Assistant</span>
        <span className="header-version">v0.1</span>
      </div>

      <div className="body">
        {/* ── Loading ──────────────────────────── */}
        {appState === 'loading' && (
          <div className="status-row">
            <span className="status-dot verifying" />
            <span className="status-label verifying">Checking connection…</span>
          </div>
        )}

        {/* ── Not Connected ────────────────────── */}
        {(appState === 'not-connected' || appState === 'verifying') && (
          <>
            <div className="status-row">
              <span className={`status-dot ${appState === 'verifying' ? 'verifying' : 'disconnected'}`} />
              <span className={`status-label ${appState === 'verifying' ? 'verifying' : 'disconnected'}`}>
                {appState === 'verifying' ? 'Verifying…' : 'Not connected'}
              </span>
            </div>

            <div>
              <p className="field-label">Extension Token</p>
              <input
                className="field-input"
                type="password"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConnect()}
                placeholder="Paste your token here"
                autoFocus
                disabled={appState === 'verifying'}
              />
            </div>

            {error && <p className="error-text">{error}</p>}

            <button
              className="btn btn-primary"
              onClick={handleConnect}
              disabled={!tokenInput.trim() || appState === 'verifying'}
            >
              {appState === 'verifying' ? 'Verifying…' : 'Connect'}
            </button>

            <p className="helper">
              Get your token from{' '}
              <a href="#" onClick={e => { e.preventDefault(); openSettings() }}>
                Settings → Apply Assistant
              </a>
            </p>
          </>
        )}

        {/* ── Connected ────────────────────────── */}
        {appState === 'connected' && (
          <>
            <div className="status-row">
              <span className="status-dot connected" />
              <span className="status-label connected">Connected to QA Tracker</span>
            </div>

            {pageHost && (
              <div className="info-box">
                <p className="info-label">Current page</p>
                <p className="info-value">{pageHost}</p>
              </div>
            )}

            {/* Autofill button — only shown on non-dashboard pages */}
            {!isOwnPage && tabId && fillState !== 'done' && (
              <button
                className="btn btn-primary"
                onClick={handleAutofill}
                disabled={fillState === 'filling'}
              >
                {fillState === 'filling' ? 'Filling fields…' : 'Autofill Application'}
              </button>
            )}

            {/* Fill result */}
            {fillState === 'done' && fillResult && (
              <div className="info-box">
                <p className="info-label">Autofill complete</p>
                <p className="info-value">
                  {fillResult.filled} field{fillResult.filled !== 1 ? 's' : ''} filled
                  {fillResult.uncertain.length > 0
                    ? ` · ${fillResult.uncertain.length} uncertain (skipped)`
                    : ''}
                </p>
                {fillResult.uncertain.length > 0 && (
                  <p style={{ fontSize: '10px', color: '#52526b', marginTop: '3px' }}>
                    Review: {fillResult.uncertain.join(', ')}
                  </p>
                )}
                <p style={{ fontSize: '10px', color: '#34d39966', marginTop: '4px' }}>
                  Please review all fields before submitting.
                </p>
              </div>
            )}

            {fillState === 'error' && error && (
              <p className="error-text">{error}</p>
            )}

            <button className="btn btn-secondary" onClick={openQueue}>
              Open Jobs Queue
            </button>

            <button className="btn btn-danger" onClick={handleDisconnect}>
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  )
}
