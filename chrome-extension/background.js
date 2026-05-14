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
      systemPrompt: `Ты транскрибатор. Твоя задача — дословно перевести аудио в текст. 
ПРАВИЛА:
1. Расставь знаки препинания и заглавные буквы.
2. Исправь слова, если они явно неправильно распознаны.
3. Удали только звуки хезитации (э-э, а-а, м-м) и слова-паразиты (ну, как бы, типа, собственно), если они не несут смысла.
4. СТРОГО ЗАПРЕЩЕНО: перефразировать, изменять порядок слов, сокращать или менять структуру предложений. Сохраняй оригинальную речь, тон и стиль автора.
Выведи ТОЛЬКО готовый текст без предисловий и форматирования.`
    });

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

  } catch (err) {
    console.error("Voice Fixer Background Error:", err);
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: showToast,
      args: [`❌ Ошибка Voice Fixer: ${err.message}`, true]
    });
  }
}

// Отправка с fallback перебором
async function sendWithFallback(base64Audio, apiKey, initialModel, prompt, tabId) {
  const fallbackModels = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];
  // Формируем очередь, ставя первую выбранную, затем остальные
  const queue = [initialModel, ...fallbackModels.filter(m => m !== initialModel)];

  let lastError;
  for (let i = 0; i < queue.length; i++) {
    const currentModel = queue[i];
    try {
      console.log(`Попытка обработки через ${currentModel}...`);
      
      // Обновляем тост с названием текущей модели
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: showToast,
        args: [`🎙️ Voice Fixer (${currentModel}): Обрабатываем аудио...`, false, true]
      });

      const text = await sendToGemini(base64Audio, apiKey, currentModel, prompt);
      return text;
    } catch (err) {
      console.warn(`Ошибка при использовании ${currentModel}:`, err);
      lastError = err;
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

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Ошибка API');
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
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
  const toastDone = (msg) => {
    let div = document.getElementById('voice-fixer-toast');
    if (div) {
      div.style.background = '#16a34a'; div.style.color = 'white'; div.textContent = msg; div.style.opacity = '1';
      clearTimeout(window.vfToastTimeout);
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
        toastDone('Текст скопирован в буфер (т.к. вы не выделили поле ввода).');
      } catch (e) {
        toastDone('Не удалось скопировать текст в буфер.');
      }
      textarea.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        toastDone('Текст скопирован в буфер (т.к. вы не выделили поле ввода).');
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
        toastDone('Текст скопирован в буфер обмена!');
      } catch (e) {
        toastDone('Не удалось скопировать текст в буфер.');
      }
      textarea.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        toastDone('Текст скопирован в буфер обмена!');
      }).catch(copyFallback);
    } else {
      copyFallback();
    }
  }
}
