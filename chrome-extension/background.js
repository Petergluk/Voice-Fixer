async function logErrorOut(errMessage) {
  const data = await chrome.storage.local.get({ errorLog: [] });
  const log = data.errorLog;
  log.unshift({ time: new Date().toISOString(), message: errMessage });
  if (log.length > 50) log.pop();
  await chrome.storage.local.set({ errorLog: log });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PROCESS_AUDIO') {
    processAudioInBackground(request.audioBase64, request.tabId);
    sendResponse({ status: "started" });
  }
});

async function processAudioInBackground(base64Audio, tabId) {
  try {
    const result = await chrome.storage.local.get({
      geminiApiKey: '',
      geminiModel: 'gemini-3-flash-preview',
      enableNotifications: true,
      saveAudio: false,
      systemPrompt: `Ты транскрибатор. Твоя задача — дословно перевести аудио в текст. 
ПРАВИЛА:
1. Расставь знаки препинания и заглавные буквы.
2. Исправь слова, если они явно неправильно распознаны.
3. Удали только звуки хезитации (э-э, а-а, м-м) и слова-паразиты (ну, как бы, типа, собственно), если они не несут смысла.
4. СТРОГО ЗАПРЕЩЕНО: перефразировать, изменять порядок слов, сокращать или менять структуру предложений. Сохраняй оригинальную речь, тон и стиль автора.
Выведи ТОЛЬКО готовый текст без предисловий и форматирования.`
    });

    if (result.saveAudio) {
      try {
        const d = new Date();
        const tname = `${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}_${d.getHours().toString().padStart(2,'0')}${d.getMinutes().toString().padStart(2,'0')}`;
        chrome.downloads.download({
          url: 'data:audio/webm;base64,' + base64Audio,
          filename: `VoiceFixer_${tname}.webm`,
          saveAs: false
        });
      } catch (e) {
        console.error("Download error:", e);
      }
    }

    // Уведомляем пользователя на странице, что процесс пошел в фоне (Persistent)
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: showToast,
      args: [`🎙️ Voice Fixer (${result.geminiModel}): Обрабатываем аудио...`, false, true]
    });

    if (!result.geminiApiKey) {
      throw new Error('API ключ не задан. Зайдите в настройки расширения.');
    }

    // Вызываем модель (вместе с резервными)
    const text = await sendWithFallback(base64Audio, result.geminiApiKey, result.geminiModel, result.systemPrompt, tabId);

    // Вставляем результат
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: insertTextIntoActiveElement,
      args: [text]
    });
    
    if (result.enableNotifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // transparent fallback
        title: 'Voice Fixer: Готово',
        message: 'Расшифровка успешно вставлена (или скопирована)!'
      });
    }

  } catch (err) {
    console.error("Voice Fixer Background Error:", err);
    logErrorOut(err.message);
    
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: showToast,
      args: [`❌ Ошибка Voice Fixer: ${err.message}`, true]
    });
    
    // Получаем настройку уведомлений для ошибки (можно было бы передать result, но берем напрямую)
    chrome.storage.local.get({ enableNotifications: true }, (res) => {
      if (res.enableNotifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          title: 'Voice Fixer: Ошибка',
          message: err.message
        });
      }
    });
  }
}

// Отправка с fallback перебором
async function sendWithFallback(base64Audio, apiKeyString, initialModel, prompt, tabId) {
  const keys = apiKeyString.split(/[\n,]+/).map(k => k.trim()).filter(k => k);
  if (keys.length === 0) throw new Error('API ключ не задан. Зайдите в настройки.');

  const fallbackModels = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];
  // Формируем очередь, ставя первую выбранную, затем остальные
  const queue = [initialModel, ...fallbackModels.filter(m => m !== initialModel)];

  let lastError;
  for (const key of keys) {
    for (let i = 0; i < queue.length; i++) {
      const currentModel = queue[i];
      try {
        console.log(`Попытка обработки через ${currentModel} (ключ ${key.substring(0, 5)}...)...`);
        
        // Обновляем тост с названием текущей модели
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: showToast,
          args: [`🎙️ Voice Fixer (${currentModel}): Обрабатываем аудио...`, false, true]
        });

        const text = await sendToGemini(base64Audio, key, currentModel, prompt);
        // Сохраняем на всякий случай в память, чтобы не потерялось
        chrome.storage.local.set({ lastTranscription: text });
        return text;
      } catch (err) {
        console.warn(`Ошибка при использовании ${currentModel}:`, err);
        lastError = err;
        
        // Если проблема с ключом или лимитами - пробуем следующий ключ
        const errMsg = err.message.toLowerCase();
        if (errMsg.includes('key') || errMsg.includes('quota') || errMsg.includes('429')) {
             break; // переходим к следующему ключу
        }
      }
    }
  }
  throw lastError; // Если все упали
}

// Запрос в Gemini
async function sendToGemini(base64Audio, apiKey, modelName, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [
      { parts: [{ text: prompt }, { inlineData: { mimeType: 'audio/webm', data: base64Audio } }] }
    ],
    generationConfig: { temperature: 0.2 }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // Тайм-аут 2 минуты

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      let msg = err?.error?.message || `Ошибка API: ${response.status}`;
      if (response.status === 429) msg = 'Quota exceeded (429)';
      throw new Error(msg);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('Превышено время ожидания ответа от ИИ (Тайм-аут 2 мин)');
    throw err;
  }
}

// --- Функции, выполняемые на удаленной странице ---
function showToast(message, isError, isSticky = false) {
  let div = document.getElementById('voice-fixer-toast');
  if (!div) {
    div = document.createElement('div');
    div.id = 'voice-fixer-toast';
    div.style.position = 'fixed';
    div.style.bottom = '20px';
    div.style.right = '20px';
    div.style.padding = '12px 20px';
    div.style.borderRadius = '8px';
    div.style.zIndex = '9999999';
    div.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    div.style.fontSize = '14px';
    div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    div.style.transition = 'opacity 0.3s';
    div.style.maxWidth = '350px';
    div.style.wordWrap = 'break-word';
    document.body.appendChild(div);
  }
  div.style.background = isError ? '#dc2626' : '#16a34a';
  div.style.color = 'white';
  div.textContent = message;
  div.style.opacity = '1';

  clearTimeout(window.vfToastTimeout);
  if (!isSticky) {
    window.vfToastTimeout = setTimeout(() => {
      div.style.opacity = '0';
      setTimeout(() => div.remove(), 300);
    }, isError ? 6000 : 3000);
  }
}

function insertTextIntoActiveElement(text) {
  // Локальная функция для обновления тоста после вставки
  const toastDone = (msg, isSticky = false) => {
    let div = document.getElementById('voice-fixer-toast');
    if (!div) return;
    div.style.background = '#16a34a'; 
    div.style.color = 'white'; 
    div.style.opacity = '1';
    
    clearTimeout(window.vfToastTimeout);
    
    if (isSticky) {
      div.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <span>${msg}</span>
          <div style="display: flex; gap: 8px;">
            <button id="vf-toast-copy-btn" style="background: white; color: #16a34a; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">Скопировать</button>
            <button id="vf-toast-close-btn" style="background: transparent; color: white; border: none; font-size: 16px; cursor: pointer; padding: 0; line-height: 1;">✕</button>
          </div>
        </div>
      `;
      document.getElementById('vf-toast-copy-btn').addEventListener('click', () => {
        const copyFallback = () => {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          document.body.appendChild(textarea);
          textarea.select();
          try { document.execCommand('copy'); } catch (e) {}
          textarea.remove();
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(copyFallback);
        } else {
          copyFallback();
        }
        const btn = document.getElementById('vf-toast-copy-btn');
        btn.textContent = 'Успешно!';
        setTimeout(() => { if (btn) btn.textContent = 'Скопировать'; }, 2000);
      });
      document.getElementById('vf-toast-close-btn').addEventListener('click', () => {
        div.style.opacity = '0';
        setTimeout(() => div.remove(), 300);
      });
    } else {
      div.textContent = msg;
      window.vfToastTimeout = setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 300); }, 3000);
    }
  };

  const el = document.activeElement;
  if (!el || el === document.body) {
    const copyFallback = () => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        toastDone('Текст в буфере (фокус потерян).', true);
      } catch (e) {
        toastDone('Не удалось скопировать текст в буфер.', true);
      }
      textarea.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        toastDone('Текст в буфере (фокус потерян).', true);
      }).catch(copyFallback);
    } else {
      copyFallback();
    }
    return;
  }

  // Если это стандартный инпут или текстарея
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const value = el.value;
    const textToInsert = (start > 0 && value[start - 1] !== ' ') ? ' ' + text : text;
    
    el.value = value.slice(0, start) + textToInsert + value.slice(end);
    el.selectionStart = el.selectionEnd = start + textToInsert.length;
    
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    toastDone('✅ Текст вставлен!');
  } 
  // Если это ContentEditable область
  else if (el.isContentEditable) {
    el.focus();
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      selection.deleteFromDocument();
      const textNode = document.createTextNode(text);
      selection.getRangeAt(0).insertNode(textNode);
      selection.getRangeAt(0).setStartAfter(textNode);
      selection.getRangeAt(0).setEndAfter(textNode);
      selection.collapseToEnd();
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    toastDone('✅ Текст вставлен в редактор!');
  } else {
    const copyFallback = () => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        toastDone('Текст скопирован в буфер обмена!', true);
      } catch (e) {
        toastDone('Не удалось скопировать текст в буфер.', true);
      }
      textarea.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        toastDone('Текст скопирован в буфер обмена!', true);
      }).catch(copyFallback);
    } else {
      copyFallback();
    }
  }
}
