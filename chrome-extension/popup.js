let mediaRecorder;
let audioChunks = [];
let recording = false;
let startTime;
let timerInterval;

const recordBtn = document.getElementById('recordBtn');
const statusDiv = document.getElementById('status');
const settingsLink = document.getElementById('settingsLink');
const timerDiv = document.getElementById('timer');
let isCancelled = false;
const cancelBtn = document.getElementById('cancelBtn');

// Открытие страницы настроек
settingsLink.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

  // Сохраняем обработчик для отмены
  cancelBtn.addEventListener('click', () => {
    isCancelled = true;
    stopRecording();
  });

// Клик по кнопке записи
recordBtn.addEventListener('click', async () => {
  if (recording) {
    stopRecording();
  } else {
    startRecording();
  }
});

// Автозапуск записи при открытии окна расширения
document.addEventListener('DOMContentLoaded', () => {
  startRecording();
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
    cancelBtn.style.display = 'block';
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
    cancelBtn.style.display = 'none';
    clearInterval(timerInterval);
    timerDiv.style.display = 'none';
  }
}

// Остановка по пробелу и отмена по Esc
document.addEventListener('keydown', (e) => {
  if (!recording) return;
  if (e.code === 'Space') {
    e.preventDefault();
    stopRecording();
  } else if (e.code === 'Escape') {
    e.preventDefault();
    isCancelled = true;
    stopRecording();
  }
});

async function handleAudioStop() {
  if (isCancelled) {
    statusDiv.textContent = 'Запись отменена.';
    isCancelled = false;
    return;
  }

  statusDiv.textContent = 'Аудио передано в фон для расшифровки... Можно закрывать окно.';
  recordBtn.disabled = true;
  loader.style.display = 'block';

  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  const base64Data = await blobToBase64(audioBlob);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.runtime.sendMessage({
        action: 'PROCESS_AUDIO',
        audioBase64: base64Data,
        tabId: tabs[0].id
      });
      setTimeout(() => window.close(), 1500); // Закрываем попап
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

// Удалены старые функции работы с Gemini из popup - теперь это делается в background.js
