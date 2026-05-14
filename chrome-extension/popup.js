let mediaRecorder;
let audioChunks = [];
let recording = false;
let startTime;
let timerInterval;

const recordBtn = document.getElementById('recordBtn');
const statusDiv = document.getElementById('status');
const settingsLink = document.getElementById('settingsLink');
const timerDiv = document.getElementById('timer');
const loader = document.getElementById('loader');

// Открытие страницы настроек
settingsLink.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Клик по кнопке записи
recordBtn.addEventListener('click', async () => {
  if (recording) {
    stopRecording();
  } else {
    startRecording();
  }
});

async function startRecording() {
  try {
    // Всплывающее окно запрашивает доступ к микрофону
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = handleAudioStop;

    mediaRecorder.start();
    recording = true;
    
    // Обновляем UI
    recordBtn.textContent = 'Остановить (Пробел)';
    recordBtn.classList.add('recording');
    statusDiv.textContent = 'Идет запись... Говорите. Не закрывайте это окно.';
    
    startTime = Date.now();
    timerDiv.style.display = 'block';
    updateTimer(); // Первый апдейт
    timerInterval = setInterval(updateTimer, 1000);

  } catch (err) {
    console.error('Mic Access Error:', err);
    if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
       statusDiv.innerHTML = '<span style="color:red">Нет доступа к микрофону. Кликните "Настройки API ключа" ниже и разрешите его там.</span>';
    } else {
       statusDiv.textContent = 'Ошибка доступа к микрофону: ' + err.message;
    }
  }
}

function updateTimer() {
  const ms = Date.now() - startTime;
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / 1000 / 60) % 60);
  timerDiv.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function stopRecording() {
  if (mediaRecorder && recording) {
    mediaRecorder.stop();
    // Останавливаем стрим микрофона, чтобы пропал красный значок
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    
    recording = false;
    recordBtn.textContent = 'Начать запись';
    recordBtn.classList.remove('recording');
    clearInterval(timerInterval);
    timerDiv.style.display = 'none';
  }
}

// Остановка по пробелу (работает пока попап в фокусе)
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && recording) {
    e.preventDefault();
    stopRecording();
  }
});

async function handleAudioStop() {
  statusDiv.textContent = 'Обработка аудио нейросетью...';
  recordBtn.disabled = true;
  loader.style.display = 'block';

  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  const base64Data = await blobToBase64(audioBlob);

  chrome.storage.local.get({
    geminiApiKey: '',
    geminiModel: 'gemini-3-flash-preview',
    systemPrompt: `Ты расшифровщик и корректор текста. Твоя специализация - транскрипт аудиофайлов, вычитка, очистка, оптимизация расшифровок разговорной речи. 
Задачи:
- исправить ошибки распознавания по смыслу.
- расставить знаки препинания, орфографию.
- убрать слова-паразиты (как бы, ну, эээ, собственно).
- разбить длинные предложения и абзацы для читабельности.
Выведи ТОЛЬКО конечный чистый текст. Никаких префиксов вроде "Вот текст:" не нужно.`
  }, async (result) => {
    const apiKey = result.geminiApiKey;
    const model = result.geminiModel;
    const prompt = result.systemPrompt;

    if (!apiKey) {
      statusDiv.innerHTML = '<span style="color:red">Ошибка: API ключ не задан. Нажмите на "Настройки API ключа".</span>';
      recordBtn.disabled = false;
      loader.style.display = 'none';
      return;
    }

    try {
      const text = await sendWithFallback(base64Data, apiKey, model, prompt);
      statusDiv.textContent = 'Успешно! Вставляем текст...';
      
      // Вставка в активную вкладку (Content Script контекст)
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: insertTextIntoActiveElement,
            args: [text]
          }, () => {
             statusDiv.textContent = 'Текст успешно вставлен в активное поле!';
             recordBtn.disabled = false;
             loader.style.display = 'none';
             setTimeout(() => window.close(), 2000); // Закрыть попап
          });
        }
      });
    } catch (err) {
      console.error(err);
      statusDiv.innerHTML = `<span style="color:red">Ошибка: ${err.message}</span>`;
      recordBtn.disabled = false;
      loader.style.display = 'none';
    }
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function sendWithFallback(base64Audio, apiKey, initialModel, prompt) {
  const fallbackModels = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];
  // Создаем очередь так, чтобы выбранная модель была первой, а остальные шли за ней
  const queue = [initialModel, ...fallbackModels.filter(m => m !== initialModel)];

  let lastError;
  for (let i = 0; i < queue.length; i++) {
    const currentModel = queue[i];
    try {
      console.log(`Попытка обработки через ${currentModel}...`);
      statusDiv.textContent = `Обработка (${currentModel})...`;
      const text = await sendToGemini(base64Audio, apiKey, currentModel, prompt);
      return text;
    } catch (err) {
      console.warn(`Ошибка при использовании ${currentModel}:`, err);
      lastError = err;
      if (i < queue.length - 1) {
        statusDiv.textContent = `Ошибка ${currentModel}. Пробуем следующую...`;
      }
    }
  }
  throw lastError; // Если все упали, кидаем последнюю ошибку
}

async function sendToGemini(base64Audio, apiKey, modelName, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'audio/webm', data: base64Audio } }
        ]
      }
    ],
    generationConfig: {
       temperature: 0.2
    }
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
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text.trim();
}

// --- Функции, выполняемые на удаленной странице ---
function insertTextIntoActiveElement(text) {
  const el = document.activeElement;
  if (!el || el === document.body) {
    // Вставка никуда, кидаем в буфер
    navigator.clipboard.writeText(text).then(() => {
      alert('Voice Fixer: Текст скопирован в буфер обмена (т.к. вы не выделили поле ввода).');
    });
    return;
  }

  // Если это стандартный инпут или текстарея
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const value = el.value;
    
    // Вставляем с пробелом если надо
    const textToInsert = (start > 0 && value[start - 1] !== ' ') ? ' ' + text : text;
    
    el.value = value.slice(0, start) + textToInsert + value.slice(end);
    el.selectionStart = el.selectionEnd = start + textToInsert.length;
    
    // Эмуляция событий для React/Vue
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } 
  // Если это ContentEditable область (Notion, Gmail, WhatsApp Web, Google Docs)
  else if (el.isContentEditable) {
    el.focus();
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      selection.deleteFromDocument();
      const textToInsert = text;
      // Вставка текста как DocumentFragment для корректной обработки
      const textNode = document.createTextNode(textToInsert);
      selection.getRangeAt(0).insertNode(textNode);
      // Смещение каретки в конец вставленного
      selection.getRangeAt(0).setStartAfter(textNode);
      selection.getRangeAt(0).setEndAfter(textNode);
      selection.collapseToEnd();
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    // Резервный вариант, если фокус на чем-то непонятном
    navigator.clipboard.writeText(text).then(() => {
      alert('Voice Fixer: Текст скопирован в буфер обмена!');
    });
  }
}
