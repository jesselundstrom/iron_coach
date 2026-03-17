// Nutrition Coach — Claude-powered food analysis and coaching
// API key is stored only on the user's device (never synced to cloud).
(function () {
  'use strict';

  let _history = [];
  let _loading = false;
  let _pendingImage = null; // base64 data URL of selected photo

  // ─── Storage keys ────────────────────────────────────────────────────────────

  function _historyKey() {
    return currentUser ? 'ic_nutrition_history::' + currentUser.id : 'ic_nutrition_history';
  }

  function _apiKeyStorageKey() {
    return 'ic_nutrition_key';
  }

  // ─── API key management ───────────────────────────────────────────────────────

  function getNutritionApiKey() {
    return localStorage.getItem(_apiKeyStorageKey()) || '';
  }

  function saveNutritionApiKey() {
    const inp = document.getElementById('nutrition-api-key-input');
    const val = inp ? inp.value.trim() : '';
    if (val) {
      localStorage.setItem(_apiKeyStorageKey(), val);
      showToast(tr('settings.claude_api_key.saved', 'API key saved'), 'var(--green)');
    } else {
      localStorage.removeItem(_apiKeyStorageKey());
      showToast(tr('settings.claude_api_key.cleared', 'API key removed'), 'var(--muted)');
    }
  }

  // ─── History management ───────────────────────────────────────────────────────

  function _loadHistory() {
    try {
      const raw = localStorage.getItem(_historyKey());
      _history = raw ? JSON.parse(raw) : [];
    } catch (_) {
      _history = [];
    }
  }

  function _saveHistory() {
    // Keep last 60 messages to avoid localStorage overflow
    if (_history.length > 60) {
      _history = _history.slice(-60);
    }
    try {
      localStorage.setItem(_historyKey(), JSON.stringify(_history));
    } catch (_) {}
  }

  function _clearHistory() {
    _history = [];
    try {
      localStorage.removeItem(_historyKey());
    } catch (_) {}
  }

  // ─── Image compression ────────────────────────────────────────────────────────

  function _compressImage(dataUrl, maxPx, quality) {
    maxPx = maxPx || 1024;
    quality = quality || 0.82;
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height;
        if (w > maxPx || h > maxPx) {
          if (w > h) {
            h = Math.round((h * maxPx) / w);
            w = maxPx;
          } else {
            w = Math.round((w * maxPx) / h);
            h = maxPx;
          }
        }
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = function () {
        resolve(dataUrl); // fall back to original
      };
      img.src = dataUrl;
    });
  }

  // ─── Claude API call ──────────────────────────────────────────────────────────

  async function _callClaude(apiMessages) {
    const apiKey = getNutritionApiKey();
    if (!apiKey) {
      const err = new Error('no_key');
      throw err;
    }

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-request-source': 'browser-client',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        system:
          'You are a knowledgeable nutrition coach for a strength athlete who trains with weights. ' +
          'When the user shares food photos or asks questions, analyze the food, estimate macros ' +
          '(protein, carbs, fat, calories) when possible, and give practical coaching advice. ' +
          'Keep responses concise and actionable. Use metric units. Be supportive and direct.',
        messages: apiMessages,
      }),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(function () {
        return {};
      });
      throw new Error(
        (errData.error && errData.error.message) || 'API error ' + resp.status
      );
    }

    const data = await resp.json();
    return data.content[0].text;
  }

  // ─── Build API messages from history ─────────────────────────────────────────
  // We include the last 10 history entries as context, but strip image data from
  // old entries to keep the request small. Only the current message carries an image.

  function _buildApiMessages(newImageDataUrl, newText) {
    const contextEntries = _history.slice(-10);
    const apiMessages = contextEntries.map(function (msg) {
      if (msg.role === 'user') {
        // Include image only if it's the most recent user message with an image
        // (for history context we send text only)
        const text =
          msg.text || (msg.imageDataUrl ? '[food photo]' : '');
        return { role: 'user', content: text };
      }
      return { role: 'assistant', content: msg.text || '' };
    });

    // Build the new user message with optional image
    const content = [];
    if (newImageDataUrl) {
      const parts = newImageDataUrl.split(',');
      const base64 = parts[1] || '';
      const mediaMatch = parts[0] && parts[0].match(/data:([^;]+)/);
      const mediaType = (mediaMatch && mediaMatch[1]) || 'image/jpeg';
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      });
    }
    if (newText) {
      content.push({ type: 'text', text: newText });
    }
    if (!content.length) {
      content.push({
        type: 'text',
        text: tr('nutrition.default_prompt', 'What can you tell me about this food?'),
      });
    }

    apiMessages.push({ role: 'user', content: content });
    return apiMessages;
  }

  // ─── Send a message ───────────────────────────────────────────────────────────

  async function sendNutritionMessage(text, imageDataUrl) {
    if (_loading) return;

    const userEntry = {
      id: Date.now() + '-u',
      role: 'user',
      text: text || '',
      imageDataUrl: imageDataUrl || null,
      timestamp: Date.now(),
    };
    _history.push(userEntry);
    _saveHistory();
    _renderMessages();
    _scrollToBottom();
    _setLoading(true);

    const apiMessages = _buildApiMessages(imageDataUrl, text);

    try {
      const responseText = await _callClaude(apiMessages);
      _history.push({
        id: Date.now() + '-a',
        role: 'assistant',
        text: responseText,
        timestamp: Date.now(),
      });
      _saveHistory();
    } catch (e) {
      const isNoKey = e.message === 'no_key';
      _history.push({
        id: Date.now() + '-a',
        role: 'assistant',
        text: isNoKey
          ? tr(
              'nutrition.error.no_key',
              'Please add your Claude API key in Settings \u2192 Account to use the Nutrition Coach.'
            )
          : tr('nutrition.error.api', 'Something went wrong. Check your API key and try again.') +
            (e.message && !isNoKey ? ' (' + e.message + ')' : ''),
        timestamp: Date.now(),
        isError: true,
      });
      _saveHistory();
    }

    _setLoading(false);
    _renderMessages();
    _scrollToBottom();
  }

  // ─── UI helpers ───────────────────────────────────────────────────────────────

  function _setLoading(loading) {
    _loading = loading;
    const el = document.getElementById('nutrition-loading');
    if (el) el.style.display = loading ? 'flex' : 'none';
    const btn = document.getElementById('nutrition-send-btn');
    if (btn) btn.disabled = loading;
  }

  function _scrollToBottom() {
    const content = document.querySelector('.content');
    if (content) content.scrollTo({ top: content.scrollHeight, behavior: 'smooth' });
  }

  // Minimal markdown: bold + line breaks. Escaping happens first.
  function _formatText(text) {
    return escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function _renderMessages() {
    const container = document.getElementById('nutrition-messages');
    if (!container) return;

    if (!_history.length) {
      container.innerHTML =
        '<div class="nutrition-empty">' +
        '<div class="nutrition-empty-icon">&#x1F957;</div>' +
        '<div class="nutrition-empty-title" data-i18n="nutrition.empty.title">Your nutrition coach is ready</div>' +
        '<div class="nutrition-empty-body" data-i18n="nutrition.empty.body">Take a photo of your food and get a nutritional analysis and coaching advice.</div>' +
        '</div>';
      if (window.I18N && I18N.applyTranslations) I18N.applyTranslations(container);
      return;
    }

    container.innerHTML = _history
      .map(function (msg) {
        if (msg.role === 'user') {
          return (
            '<div class="nutrition-msg nutrition-msg-user">' +
            (msg.imageDataUrl
              ? '<img class="nutrition-msg-img" src="' +
                escapeHtml(msg.imageDataUrl) +
                '" alt="">'
              : '') +
            (msg.text
              ? '<div class="nutrition-msg-text">' +
                escapeHtml(msg.text) +
                '</div>'
              : '') +
            '</div>'
          );
        }
        return (
          '<div class="nutrition-msg nutrition-msg-coach' +
          (msg.isError ? ' nutrition-msg-error' : '') +
          '">' +
          '<div class="nutrition-msg-text">' +
          _formatText(msg.text || '') +
          '</div>' +
          '</div>'
        );
      })
      .join('');
  }

  // ─── Photo handling ───────────────────────────────────────────────────────────

  function handleNutritionPhoto(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      _compressImage(e.target.result).then(function (compressed) {
        _pendingImage = compressed;
        const preview = document.getElementById('nutrition-photo-preview');
        const img = document.getElementById('nutrition-preview-img');
        if (preview && img) {
          img.src = compressed;
          preview.style.display = 'flex';
        }
      });
    };
    reader.readAsDataURL(file);
    event.target.value = ''; // allow re-selecting same file
  }

  function clearNutritionPhoto() {
    _pendingImage = null;
    const preview = document.getElementById('nutrition-photo-preview');
    const img = document.getElementById('nutrition-preview-img');
    if (preview) preview.style.display = 'none';
    if (img) img.src = '';
  }

  // ─── Submit ───────────────────────────────────────────────────────────────────

  function submitNutritionMessage() {
    const input = document.getElementById('nutrition-input');
    const text = input ? input.value.trim() : '';
    const image = _pendingImage;

    if (!text && !image) return;

    if (input) input.value = '';
    clearNutritionPhoto();

    sendNutritionMessage(text, image);
  }

  // ─── Clear history ────────────────────────────────────────────────────────────

  function clearNutritionHistory() {
    showConfirm(
      tr('nutrition.clear.title', 'Clear conversation'),
      tr('nutrition.clear.body', 'This will delete your entire nutrition conversation history.'),
      function () {
        _clearHistory();
        _renderMessages();
      }
    );
  }

  // ─── Page init ────────────────────────────────────────────────────────────────

  function initNutritionPage() {
    _loadHistory();
    _renderMessages();

    // Attach enter-key handler each time (safe to re-attach)
    const input = document.getElementById('nutrition-input');
    if (input) {
      input.onkeydown = function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submitNutritionMessage();
        }
      };
    }

    _scrollToBottom();
  }

  // ─── Expose globals ───────────────────────────────────────────────────────────

  window.initNutritionPage = initNutritionPage;
  window.handleNutritionPhoto = handleNutritionPhoto;
  window.clearNutritionPhoto = clearNutritionPhoto;
  window.submitNutritionMessage = submitNutritionMessage;
  window.clearNutritionHistory = clearNutritionHistory;
  window.getNutritionApiKey = getNutritionApiKey;
  window.saveNutritionApiKey = saveNutritionApiKey;
})();
