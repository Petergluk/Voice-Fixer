let mediaRecorder;
let audioChunks = [];
let recording = false;
let startTime;
let timerInterval;

let audioCtx;
let analyser;
let drawVisual;

const recordBtn = document.getElementById("recordBtn");
const stopBtn = document.getElementById("stopBtn");
const statusDiv = document.getElementById("status");
const timerDiv = document.getElementById("timer");
const visualizer = document.getElementById("visualizer");
const controlsStart = document.getElementById("controls-start");
const controlsRecording = document.getElementById("controls-recording");

let isCancelled = false;
const cancelBtn = document.getElementById("cancelBtn");

// Сохраняем обработчик для отмены
cancelBtn.addEventListener("click", () => {
  isCancelled = true;
  stopRecording();
});

// Сохраняем обработчик для остановки
stopBtn.addEventListener("click", () => {
  stopRecording();
});

// Клик по кнопке записи
recordBtn.addEventListener("click", async () => {
  if (recording) {
    stopRecording();
  } else {
    startRecording();
  }
});

// Автозапуск записи при открытии окна расширения
document.addEventListener("DOMContentLoaded", () => {
  const settingsLink = document.getElementById("settingsLink");
  if (settingsLink) {
    settingsLink.addEventListener("click", () => {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL("options.html"));
      }
    });
  }

  const quickMode = document.getElementById("quickPromptMode");
  if (quickMode) {
    chrome.storage.local.get(
      ["promptMode", "sysPrompt_default", "sysPrompt_concise"],
      (res) => {
        quickMode.value = res.promptMode || "default";

        quickMode.addEventListener("change", () => {
          const mode = quickMode.value;
          const d_sys = `Ты расшифровщик и корректор текста. Твоя специализация - транскрипт аудиофайлов, вычитка, очистка, оптимизация расшифровок разговорной речи.

Задачи:
- исправить ошибки распознавания по смыслу.
- расставить знаки препинания, орфографию.
- убрать слова-паразиты (как бы, ну, эээ, собственно).
- разбить длинные предложения и абзацы для читабельности.

!IMPORTANT! Ты сохраняешь полное содержание и структуру исходного текста. Ты никогда не редактируешь и не корректируешь смыслы, лишь слегка оптимизируешь их изложение.

!IMPORTANT! При оптимизации текста сохраняй оригинальный тон и стиль. Например, при расшифровке аудио-практик, избегай замены разрешающих формулировок, таких как «можно», «и может быть» - конструкциями в повелительном наклонении.

Выведи ТОЛЬКО конечный чистый текст. Никаких префиксов вроде "Вот текст:" не нужно.`;

          const c_sys = `Ты ИИ-редактор. Твоя задача — сделать из сумбурной устной речи четкий, лаконичный и структурированный текст.

Задачи:
- Очистить текст от воды, бессмысленных повторов и слов-паразитов.
- Извлечь главную мысль и ключевые факты.
- Переписать текст структурно, максимально лаконично, по существу.
- Разбить на логичные короткие абзацы или пункты.
- Сохранить общую суть, но сократить объем без потери важных деталей.

Выведи ТОЛЬКО готовый текст без предисловий.`;

          let newSys =
            mode === "default"
              ? res.sysPrompt_default || d_sys
              : res.sysPrompt_concise || c_sys;

          chrome.storage.local.set({
            promptMode: mode,
            systemPrompt: newSys,
          });
        });
      },
    );
  }

  startRecording();
});

let audioPort = null;
let currentTabId = null;

async function startRecording() {
  try {
    // Всплывающее окно запрашивает доступ к микрофону
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        currentTabId = tabs[0].id;
        audioPort = chrome.runtime.connect({ name: "audio-stream" });
        audioPort.postMessage({ action: "START_STREAM", tabId: currentTabId });

        chrome.storage.local.get({ audioBitrate: 32000 }, (result) => {
          const options = {
            mimeType: "audio/webm",
            audioBitsPerSecond: result.audioBitrate,
          };
          mediaRecorder = new MediaRecorder(stream, options);
          audioChunks = [];

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0 && !isCancelled) {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64Chunk = reader.result.split(",")[1];
                if (audioPort) {
                  audioPort.postMessage({
                    action: "AUDIO_CHUNK",
                    data: base64Chunk,
                  });
                }
              };
              reader.readAsDataURL(e.data);
            }
          };

          mediaRecorder.onstop = handleAudioStop;

          // Используем timeslice 500ms, чтобы порции данных шли в background
          // Если popup закроется, у фона уже будут собраны почти все данные
          mediaRecorder.start(500);
          recording = true;
          isCancelled = false;

          // Запуск визуализатора
          visualize(stream);

          // Обновляем UI
          controlsStart.style.display = "none";
          controlsRecording.style.display = "flex";
          statusDiv.textContent =
            "Идет запись... Говорите. (Не закрывайте это окно до остановки записи!)";

          startTime = Date.now();
          timerDiv.style.display = "block";
          updateTimer(); // Первый апдейт
          timerInterval = setInterval(updateTimer, 1000);
        });
      }
    });
  } catch (err) {
    console.error("Mic Access Error:", err);
    if (err.name === "NotAllowedError" || err.name === "NotFoundError") {
      statusDiv.innerHTML =
        '<span style="color:red">Нет доступа к микрофону. Кликните "Настройки API ключа" ниже и разрешите его там.</span>';
    } else {
      statusDiv.textContent = "Ошибка доступа к микрофону: " + err.message;
    }
  }
}

function updateTimer() {
  const ms = Date.now() - startTime;
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / 1000 / 60) % 60);
  timerDiv.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function stopRecording() {
  if (mediaRecorder && recording) {
    if (isCancelled && audioPort) {
      audioPort.postMessage({ action: "CANCEL_STREAM" });
    }
    mediaRecorder.stop();
    // Останавливаем стрим микрофона, чтобы пропал красный значок
    mediaRecorder.stream.getTracks().forEach((track) => track.stop());

    // Остановка визуализатора
    if (drawVisual) cancelAnimationFrame(drawVisual);
    if (audioCtx) {
      audioCtx.close().catch((e) => console.error(e));
      audioCtx = null;
    }
    visualizer.style.display = "none";

    recording = false;
    controlsStart.style.display = "block";
    controlsRecording.style.display = "none";
    clearInterval(timerInterval);
    timerDiv.style.display = "none";
    statusDiv.textContent =
      "Отправлено... Можно закрыть окно, мы пришлем уведомление!";
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

  visualizer.style.display = "block";
  const canvasCtx = visualizer.getContext("2d");
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

    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * visualizer.offsetHeight;
      canvasCtx.fillStyle = "#f97316"; // orange bars
      canvasCtx.fillRect(
        x,
        visualizer.offsetHeight - barHeight,
        barWidth,
        barHeight,
      );
      x += barWidth + 1;
    }
  }
  draw();
}

// Остановка по пробелу и отмена по Esc
document.addEventListener("keydown", (e) => {
  if (!recording) return;
  if (e.code === "Space") {
    e.preventDefault();
    stopRecording();
  } else if (e.code === "Escape") {
    e.preventDefault();
    isCancelled = true;
    stopRecording();
  }
});

async function handleAudioStop() {
  if (isCancelled) {
    statusDiv.textContent = "Запись отменена.";
    isCancelled = false;
    if (audioPort) {
      audioPort.disconnect();
      audioPort = null;
    }
    return;
  }

  statusDiv.textContent =
    "Аудио передано в фон для обработки... Можно закрывать окно.";
  recordBtn.disabled = true;

  const durationSec = startTime
    ? Math.max(1, Math.round((Date.now() - startTime) / 1000))
    : 10;

  if (audioPort) {
    audioPort.postMessage({ action: "STOP_STREAM", duration: durationSec });
  }

  setTimeout(() => {
    if (audioPort) {
      audioPort.disconnect();
      audioPort = null;
    }
    window.close();
  }, 1000); // Дадим время последнему чанку уйти
}

// Удалены старые функции работы с Gemini из popup - теперь это делается в background.js
