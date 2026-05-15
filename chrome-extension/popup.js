let mediaRecorder;
let audioChunks = [];
let recording = false;
let startTime;
let timerInterval;

let audioCtx;
let analyser;
let drawVisual;

const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDiv = document.getElementById('status');
const timerDiv = document.getElementById('timer');
const visualizer = document.getElementById('visualizer');
const controlsStart = document.getElementById('controls-start');
const controlsRecording = document.getElementById('controls-recording');

let isCancelled = false;
const cancelBtn = document.getElementById('cancelBtn');

// Сохраняем обработчик для отмены
cancelBtn.addEventListener('click', () => {
  isCancelled = true;
  stopRecording();
});

// Сохраняем обработчик для остановки
stopBtn.addEventListener('click', () => {
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
    isCancelled = false;
    
    // Запуск визуализатора
    visualize(stream);

    // Обновляем UI
    controlsStart.style.display = 'none';
    controlsRecording.style.display = 'flex';
    statusDiv.textContent = 'Идет запись... Говорите. (Не закрывайте это окно до остановки записи!)';
    
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
    
    // Остановка визуализатора
    if (drawVisual) cancelAnimationFrame(drawVisual);
    if (audioCtx) {
       audioCtx.close().catch(e => console.error(e));
       audioCtx = null;
    }
    visualizer.style.display = 'none';

    recording = false;
    controlsStart.style.display = 'block';
    controlsRecording.style.display = 'none';
    clearInterval(timerInterval);
    timerDiv.style.display = 'none';
    statusDiv.textContent = 'Отправлено... Можно закрыть окно, мы пришлем уведомление!';
  }
}

function visualize(stream) {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  const source = audioCtx.createMediaStreamSource(stream);
  source.connect(analyser);
  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  visualizer.style.display = 'block';
  const canvasCtx = visualizer.getContext('2d');
  visualizer.width = visualizer.offsetWidth * window.devicePixelRatio;
  visualizer.height = visualizer.offsetHeight * window.devicePixelRatio;
  canvasCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

  function draw() {
    drawVisual = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, visualizer.offsetWidth, visualizer.offsetHeight);

    const barWidth = (visualizer.offsetWidth / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for(let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * visualizer.offsetHeight;
      canvasCtx.fillStyle = '#f97316'; // orange bars
      canvasCtx.fillRect(x, visualizer.offsetHeight - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }
  draw();
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

  statusDiv.textContent = 'Аудио передано в фон для обработки... Можно закрывать окно.';
  recordBtn.disabled = true;

  const durationSec = startTime ? Math.max(1, Math.round((Date.now() - startTime) / 1000)) : 10;
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  const base64Data = await blobToBase64(audioBlob);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.runtime.sendMessage({
        action: 'PROCESS_AUDIO',
        audioBase64: base64Data,
        duration: durationSec,
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
