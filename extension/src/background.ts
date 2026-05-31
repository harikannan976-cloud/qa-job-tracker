// Background service worker — message relay for popup and content scripts

const TOKEN_KEY = 'ext_token'

type Msg =
  | { type: 'GET_TOKEN' }
  | { type: 'SET_TOKEN'; token: string }
  | { type: 'CLEAR_TOKEN' }
  | { type: 'GET_PROFILE' }
  | { type: 'AUTOFILL_RESULT'; status: 'Autofilled' | 'Ready for Review'; jobId: string }

chrome.runtime.onMessage.addListener((msg: Msg, _sender, reply) => {
  if (msg.type === 'GET_TOKEN') {
    chrome.storage.local.get(TOKEN_KEY, data => reply({ token: data[TOKEN_KEY] ?? null }))
    return true
  }

  if (msg.type === 'SET_TOKEN') {
    chrome.storage.local.set({ [TOKEN_KEY]: msg.token }, () => reply({ ok: true }))
    return true
  }

  if (msg.type === 'CLEAR_TOKEN') {
    chrome.storage.local.remove(TOKEN_KEY, () => reply({ ok: true }))
    return true
  }
})
