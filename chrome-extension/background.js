let activeTasks = {};

async function logDebug(msg) {
  const data = await chrome.storage.local.get({
    debugEnabled: false,
    debugLog: [],
  });
  if (!data.debugEnabled) return;
  const log = data.debugLog;
  log.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
  if (log.length > 500) log.shift();
  await chrome.storage.local.set({ debugLog: log });
  console.log(`[DEBUG] ${msg}`);
}

async function logErrorOut(errMessage) {
  const data = await chrome.storage.local.get({ errorLog: [] });
  const log = data.errorLog;
  log.unshift({ time: new Date().toISOString(), message: errMessage });
  if (log.length > 50) log.pop();
  await chrome.storage.local.set({ errorLog: log });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "PROCESS_AUDIO") {
    logDebug(`message PROCESS_AUDIO received`);
    processAudioInBackground(
      request.audioBase64,
      request.tabId,
      request.duration,
    );
    sendResponse({ status: "started" });
  } else if (request.action === "PROCESS_AUDIO_FALLBACK") {
    logDebug(`message PROCESS_AUDIO_FALLBACK received`);
    const tId = sender.tab ? sender.tab.id : request.tabId;
    processAudioInBackground(
      request.audioBase64,
      tId,
      request.duration || 10,
      true,
    );
    sendResponse({ status: "started" });
  } else if (request.action === "CANCEL_TASK") {
    const tId = sender.tab ? sender.tab.id : request.tabId;
    logDebug(`message CANCEL_TASK for tabId=${tId}`);
    if (tId && activeTasks[tId]) {
      activeTasks[tId].action = "CANCEL";
      if (activeTasks[tId].controller) activeTasks[tId].controller.abort();
    } else if (tId) {
      chrome.scripting
        .executeScript({
          target: { tabId: tId },
          func: showToast,
          args: [`Расшифровка отменена (или сброшена).`, false, false, false],
        })
        .catch((e) => console.error(e));
    }
  } else if (request.action === "SKIP_MODEL_TASK") {
    const tId = sender.tab ? sender.tab.id : request.tabId;
    logDebug(`message SKIP_MODEL_TASK for tabId=${tId}`);
    if (tId && activeTasks[tId]) {
      activeTasks[tId].action = "SKIP_MODEL";
      if (activeTasks[tId].controller) activeTasks[tId].controller.abort();
    } else if (tId) {
      // SW перезапустился или таск потерян
      logDebug(`SKIP_MODEL_TASK: task lost for tabId=${tId}`);
      chrome.scripting
        .executeScript({
          target: { tabId: tId },
          func: showToast,
          args: [
            `❌ Задача потеряна (перезапуск расширения). Попробуйте снова.`,
            true,
          ],
        })
        .catch((e) => console.error(e));
    }
  } else if (request.action === "SKIP_KEY_TASK") {
    const tId = sender.tab ? sender.tab.id : request.tabId;
    logDebug(`message SKIP_KEY_TASK for tabId=${tId}`);
    if (tId && activeTasks[tId]) {
      activeTasks[tId].action = "SKIP_KEY";
      if (activeTasks[tId].controller) activeTasks[tId].controller.abort();
    } else if (tId) {
      logDebug(`SKIP_KEY_TASK: task lost for tabId=${tId}`);
      chrome.scripting
        .executeScript({
          target: { tabId: tId },
          func: showToast,
          args: [
            `❌ Задача потеряна (перезапуск расширения). Попробуйте снова.`,
            true,
          ],
        })
        .catch((e) => console.error(e));
    }
  } else if (request.action === "HEARTBEAT") {
    // Keeps SW alive
    sendResponse({ status: "alive" });
  }
});

async function processAudioInBackground(
  base64Audio,
  tabId,
  duration,
  forceFallback = false,
) {
  try {
    logDebug(
      `processAudioInBackground: start tabId=${tabId}, duration=${duration}, forceFallback=${forceFallback}`,
    );
    const result = await chrome.storage.local.get({
      geminiApiKey: "",
      geminiModel: "gemini-3.5-flash",
      autoFallback: true,
      geminiTimeout: 3,
      enableNotifications: true,
      saveAudio: false,
      systemPrompt: `Ты расшифровщик и корректор текста. Твоя специализация - транскрипт аудиофайлов, вычитка, очистка, оптимизация расшифровок разговорной речи.`,
      instruction: `Задачи:
- исправить ошибки распознавания по смыслу.
- расставить знаки препинания, орфографию.
- убрать слова-паразиты (как бы, ну, эээ, собственно).
- разбить длинные предложения и абзацы для читабельности.

!IMPORTANT! Ты сохраняешь полное содержание и структуру исходного текста. Ты никогда не редактируешь и не корректируешь смыслы, лишь слегка оптимизируешь их изложение.

!IMPORTANT! При оптимизации текста сохраняй оригинальный тон и стиль. Например, при расшифровке аудио-практик, избегай замены разрешающих формулировок, таких как «можно», «и может быть» - конструкциями в повелительном наклонении.

Выведи ТОЛЬКО конечный чистый текст. Никаких префиксов вроде "Вот текст:" не нужно.`,
    });

    if (result.saveAudio) {
      try {
        const d = new Date();
        const tname = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}_${d.getHours().toString().padStart(2, "0")}${d.getMinutes().toString().padStart(2, "0")}`;
        chrome.downloads.download({
          url: "data:audio/webm;base64," + base64Audio,
          filename: `VoiceFixer_${tname}.webm`,
          saveAs: false,
        });
      } catch (e) {
        console.error("Download error:", e);
      }
    }

    // Сбрасываем таск для данной вкладки
    activeTasks[tabId] = { action: null };

    // Уведомляем пользователя на странице, что процесс пошел в фоне (Persistent)
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: showToast,
      args: [
        `🎙️ Voice Fixer (${result.geminiModel}): Обрабатываем аудио...`,
        false,
        true,
        true,
      ],
    });

    if (!result.geminiApiKey) {
      throw new Error("API ключ не задан. Зайдите в настройки расширения.");
    }

    const timeoutMs = (result.geminiTimeout || 3) * 60000;
    const text = await sendWithFallback(
      base64Audio,
      result.geminiApiKey,
      result.geminiModel,
      result.systemPrompt,
      tabId,
      duration,
      timeoutMs,
      forceFallback,
    );

    if (activeTasks[tabId] && activeTasks[tabId].action === "CANCEL") {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: showToast,
        args: [`Расшифровка отменена.`, false, false, false],
      });
      return;
    }

    // Вставляем результат
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: insertTextIntoActiveElement,
      args: [text],
    });

    if (result.enableNotifications) {
      chrome.notifications.create({
        type: "basic",
        iconUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", // transparent fallback
        title: "Voice Fixer: Готово",
        message: "Расшифровка успешно вставлена (или скопирована)!",
      });
    }
  } catch (err) {
    console.error("Voice Fixer Background Error:", err);
    logErrorOut(err.message);
    logDebug(`processAudioInBackground catch: ${err.message}`);

    // Если мы отменили руками, не показывать как ошибку API красным
    if (err.message.includes("Отменено пользователем")) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: showToast,
        args: [`Расшифровка отменена.`, false, false, false],
      });
      return;
    }

    if (result.autoFallback === false) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: showErrorWithActions,
        args: [err.message, base64Audio],
      });
    } else {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: showToast,
        args: [`❌ Ошибка Voice Fixer: ${err.message}`, true],
      });
    }

    // Получаем настройку уведомлений для ошибки (можно было бы передать result, но берем напрямую)
    chrome.storage.local.get({ enableNotifications: true }, (res) => {
      if (res.enableNotifications) {
        chrome.notifications.create({
          type: "basic",
          iconUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
          title: "Voice Fixer: Ошибка",
          message: err.message,
        });
      }
    });
  }
}

// Отправка с fallback перебором
async function sendWithFallback(
  base64Audio,
  apiKeyString,
  initialModel,
  prompt,
  tabId,
  duration,
  timeoutMs,
  forceFallback,
) {
  const ObjectState = await chrome.storage.local.get({
    invalidKeys: [],
    autoFallback: true,
    smartRouting: false,
    modelStats: {},
    lastSuccessModel: null
  });
  const state = ObjectState;
  const invalidKeys = new Set(state.invalidKeys || []);
  const autoFallback = forceFallback ? true : state.autoFallback;

  const keysRaw = apiKeyString
    .split(/[\n,]+/)
    .map((k) => k.trim())
    .filter((k) => k);
  const keys = keysRaw.filter((k) => !invalidKeys.has(k));

  if (keysRaw.length > 0 && keys.length === 0) {
    throw new Error(
      `Все указанные ключи (${keysRaw.length} шт.) были помечены системой как недействительные (ошибка ключа). Проверьте раздел настроек, исправьте ключи или обновите их.`,
    );
  }

  if (keys.length === 0)
    throw new Error("API ключ не задан. Зайдите в настройки.");

  const fallbackModels = [
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
    "gemini-3.1-flash-lite",
  ];
  
  let baseModels = Array.from(new Set([initialModel, ...fallbackModels]));

  if (state.smartRouting) {
    baseModels.sort((a, b) => {
      const scoreA = state.modelStats[a] || 999999;
      const scoreB = state.modelStats[b] || 999999;
      return scoreA - scoreB;
    });
  }

  // Формируем очередь, ставя первую выбранную (умную или выбранную руками), затем остальные
  const queue = autoFallback ? baseModels : [baseModels[0]];
  const iterKeys = autoFallback ? keys : [keys[0]];

  let lastError;
  let isFirstIteration = true;

  for (let i = 0; i < queue.length; i++) {
    const currentModel = queue[i];
    
    for (let k = 0; k < iterKeys.length; k++) {
      const key = iterKeys[k];
      try {
        logDebug(
          `sendWithFallback: Отправка через ${currentModel} (ключ ...${key.slice(-4)} №${k + 1})`,
        );
        console.log(
          `Попытка обработки через ${currentModel} (ключ ...${key.slice(-4)} №${k + 1})...`,
        );

        if (!isFirstIteration) {
          logDebug(
            `sendWithFallback: Ожидание перед следующей попыткой (3с)...`,
          );
          let toastMsg = `Смена: ${currentModel} (Ключ ${k + 1}/${iterKeys.length})`;
          if (lastError && lastError.message) {
            toastMsg = `⚠️ ${lastError.message}. ` + toastMsg;
          }
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: showToast,
            args: [toastMsg, false, true, true],
          });

          await new Promise((resolve, reject) => {
            const controller = new AbortController();
            if (activeTasks[tabId]) {
              if (
                activeTasks[tabId].action === "CANCEL" ||
                activeTasks[tabId].action === "SKIP_MODEL"
              ) {
                const err = new Error("Пропуск модели/отмена");
                err.name = "AbortError";
                return reject(err);
              }
              activeTasks[tabId].controller = controller;
              activeTasks[tabId].action = null;
            }

            const timeoutId = setTimeout(() => {
              resolve();
            }, 3000);

            controller.signal.addEventListener("abort", () => {
              clearTimeout(timeoutId);
              const err = new Error("Aborted");
              err.name = "AbortError";
              reject(err);
            });
          });
        }
        isFirstIteration = false;

        // Обновляем тост с названием текущей модели
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: showToast,
          args: [
            `🎙️ Обрабатываем... ${currentModel} (Ключ ${k + 1}/${iterKeys.length})`,
            false,
            true,
            true,
          ],
        });

        const reqStartTime = Date.now();
        const text = await sendToGemini(
          base64Audio,
          key,
          currentModel,
          prompt,
          timeoutMs,
          tabId,
        );
        const reqEndTime = Date.now();
        const durationReqMs = reqEndTime - reqStartTime;

        await chrome.storage.local.set({ lastSuccessModel: currentModel });

        if (base64Audio.length > 0) {
          const kb = base64Audio.length / 1024;
          const msPerKb = durationReqMs / kb;
          const stats = state.modelStats || {};
          if (stats[currentModel]) {
            stats[currentModel] = stats[currentModel] * 0.5 + msPerKb * 0.5; // Сглаживаем
          } else {
            stats[currentModel] = msPerKb;
          }
          await chrome.storage.local.set({ modelStats: stats });
        }

        // Сохраняем на всякий случай в память, чтобы не потерялось
        chrome.storage.local.set({ lastTranscription: text });
        return text;
      } catch (err) {
        console.warn(`Ошибка при использовании ${currentModel}:`, err);
        logDebug(
          `sendWithFallback: Ошибка (${currentModel}, ключ ${k + 1}): ${err.message || "Unknown err"}`,
        );
        lastError = err;

        // Пессимизируем статистику (штраф за сбой), чтобы дать шанс другим
        if (state.smartRouting) {
          const stats = state.modelStats || {};
          stats[currentModel] = (stats[currentModel] || 999999) * 1.5 + 5000;
          await chrome.storage.local.set({ modelStats: stats });
        }

        if (err.name === "AbortError") {
          const action = activeTasks[tabId]?.action;
          if (action === "CANCEL") throw new Error("Отменено пользователем");
          if (action === "SKIP_MODEL") {
            if (activeTasks[tabId]) activeTasks[tabId].action = null;
            break; // прерываем цикл по ключам, идем к след. модели
          }
          if (action === "SKIP_KEY") {
            if (activeTasks[tabId]) activeTasks[tabId].action = null;
            continue; // переходим к след. ключу
          }
          // Если это AbortError от таймаута сети и action = null
          break; // сетевой таймаут - вероятно проблема с моделью/сетью. Идем к след. модели.
        }

        const errMsg = err.message.toLowerCase();

        // 400 Bad Request обычно используется для невалидных ключей
        if (err.status === 400 && errMsg.includes("key")) {
          invalidKeys.add(key);
          await chrome.storage.local.set({
            invalidKeys: Array.from(invalidKeys),
          });
          logDebug(
            `sendWithFallback: API Key marked invalid: ...${key.slice(-4)}`,
          );

          try {
            const notifyState = await chrome.storage.local.get({
              enableNotifications: true,
            });
            if (notifyState.enableNotifications) {
              chrome.notifications.create({
                type: "basic",
                iconUrl:
                  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
                title: "Voice Fixer: Ошибка ключа API",
                message: `Внимание: ключ, оканчивающийся на ...${key.slice(-4)} (Ключ №${k + 1}), недействителен (API-key error). Он добавлен в игнор-лист.`,
              });
            }
          } catch (e) {
            console.warn(e);
          }

          continue; // пробуем следующий ключ
        }

        if (
          errMsg.includes("504") ||
          errMsg.includes("503") ||
          errMsg.includes("timeout") ||
          errMsg.includes("тайм-аут") ||
          errMsg.includes("пользователем")
        ) {
          break; // Проблема на бэке Google или прервано - другой ключ не поможет, нужна другая модель
        }
        
        if (
          errMsg.includes("key") ||
          errMsg.includes("quota") ||
          errMsg.includes("429")
        ) {
          continue; // Проблема с лимитом ключа, пробуем следующий ключ
        }

        // Для остальных непонятных ошибок - переходим к следующей модели на всякий случай
        break;
      }
    }
  }
  if (lastError && lastError.name === "AbortError") {
    throw new Error("Модели не ответили (перебор завершен). Попробуйте позже.");
  }
  throw lastError; // Если все упали
}

// Запрос в Gemini
async function sendToGemini(
  base64Audio,
  apiKey,
  modelName,
  prompt,
  timeoutMs,
  tabId,
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "audio/webm", data: base64Audio } },
        ],
      },
    ],
    generationConfig: { temperature: 0.2 },
  };

  const userController = new AbortController();
  if (activeTasks[tabId]) {
    if (
      activeTasks[tabId].action === "CANCEL" ||
      activeTasks[tabId].action === "SKIP_MODEL"
    ) {
      const err = new Error("Пропуск модели/отмена");
      err.name = "AbortError";
      throw err;
    }
    activeTasks[tabId].controller = userController;
    activeTasks[tabId].action = null; // сбросим текущее действие
  }

  // Надежный таймаут (не засыпает при SleepMode)
  let combinedSignal = userController.signal;
  let timeoutController = null;
  let timeoutId = null;

  if (
    typeof AbortSignal.timeout === "function" &&
    typeof AbortSignal.any === "function"
  ) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    combinedSignal = AbortSignal.any([userController.signal, timeoutSignal]);
  } else {
    // Фолбэк для старых версий Chrome
    timeoutController = new AbortController();
    timeoutId = setTimeout(
      () => timeoutController.abort(new Error("TimeoutError")),
      timeoutMs,
    );
    combinedSignal =
      typeof AbortSignal.any === "function"
        ? AbortSignal.any([userController.signal, timeoutController.signal])
        : userController.signal; // Если совсем старый хром, просто верим в лучшее
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: combinedSignal,
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      let msg = err?.error?.message || `Ошибка API: ${response.status}`;
      if (response.status === 429)
        msg = "Лимит запросов исчерпан (Quota exceeded 429)";
      else if (response.status === 504)
        msg =
          "Тайм-аут на сервере Google (504 Deadline Exceeded). Файл слишком большой или сервер не успел ответить.";
      else if (response.status === 503)
        msg = "Серверы Google перегружены (503 Service Unavailable)";
      else if (response.status >= 500)
        msg = `Ошибка на серверах Google (${response.status})`;
      const errorObj = new Error(msg);
      errorObj.status = response.status;
      throw errorObj;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);

    const action = activeTasks[tabId]?.action;

    // Проверка нативный TimeoutError или наш кастомный
    const isTimeout =
      err.name === "TimeoutError" ||
      (timeoutController && timeoutController.signal.aborted);
    const isUserAbort = err.name === "AbortError" && !isTimeout;

    if (isTimeout && !action) {
      const maxMins = +(timeoutMs / 60000).toFixed(1);
      throw new Error(
        `Превышено максимальное время ожидания (${maxMins} мин) или обрыв сети. [timeout]`,
      );
    }

    if (isUserAbort || action) {
      logDebug(
        `sendToGemini: Abort/Action received. action=${action}, err=${err.name}`,
      );
      if (action) {
        throw Object.assign(new Error(err.message), { name: "AbortError" });
      }
      throw err;
    }

    logDebug(`sendToGemini: Error received. ${err.message}`);
    throw err;
  }
}

// --- Функции, выполняемые на удаленной странице ---
function showToast(message, isError, isSticky = false, isProcessing = false) {
  let div = document.getElementById("voice-fixer-toast");
  if (!div) {
    div = document.createElement("div");
    div.id = "voice-fixer-toast";
    div.style.position = "fixed";
    div.style.bottom = "20px";
    div.style.right = "20px";
    div.style.padding = "12px 20px";
    div.style.borderRadius = "8px";
    div.style.zIndex = "9999999";
    div.style.fontFamily =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    div.style.fontSize = "14px";
    div.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    div.style.transition = "opacity 0.3s";
    div.style.maxWidth = "350px";
    div.style.wordWrap = "break-word";
    document.body.appendChild(div);
  }
  div.style.background = isError
    ? "#dc2626"
    : isProcessing
      ? "#1d4ed8"
      : "#16a34a";
  div.style.color = "white";
  div.style.opacity = "1";

  clearTimeout(window.vfToastTimeout);
  if (window.vfToastInterval) clearInterval(window.vfToastInterval);

  if (isProcessing) {
    div.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
        <span id="vf-toast-msg">${message}</span>
        <span id="vf-toast-timer" style="font-family: monospace; font-size: 13px; opacity: 0.8;">00:00</span>
        <div style="display: flex; gap: 4px;">
          <button id="vf-toast-skip-btn" title="Попробовать другую модель/ключ" style="background: transparent; color: white; border: 1px solid rgba(255,255,255,0.5); border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 14px; position: relative;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='transparent'">⏭️</button>
          <button id="vf-toast-cancel-btn" title="Отменить" style="background: transparent; color: white; border: 1px solid rgba(255,255,255,0.5); border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 14px;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='transparent'">✖</button>
        </div>
      </div>
    `;

    const startT = Date.now();
    window.vfToastInterval = setInterval(() => {
      const el = document.getElementById("vf-toast-timer");
      if (!el) {
        clearInterval(window.vfToastInterval);
        return;
      }
      const s = Math.floor((Date.now() - startT) / 1000);
      const m = Math.floor(s / 60);
      const sec = s % 60;
      el.textContent = `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
      
      // Ping background to keep Service Worker alive during long requests
      if (s % 15 === 0) {
        try {
          if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: "HEARTBEAT" }).catch(() => {});
          }
        } catch (e) {}
      }
    }, 1000);

    setTimeout(() => {
      document
        .getElementById("vf-toast-skip-btn")
        ?.addEventListener("click", () => {
          chrome.runtime
            .sendMessage({ action: "SKIP_MODEL_TASK" })
            .catch(() => {});
          const btn = document.getElementById("vf-toast-skip-btn");
          if (btn) btn.style.opacity = "0.5";
          const msgEl = document.getElementById("vf-toast-msg");
          if (msgEl) {
            msgEl.textContent = "Переключение...";
            // Failsafe if background worker is stuck
            setTimeout(() => {
              if (
                document.getElementById("vf-toast-msg")?.textContent ===
                "Переключение..."
              ) {
                showToast("❌ Ошибка: Нет ответа (сбой расширения).", true);
              }
            }, 8000);
          }
        });
      document
        .getElementById("vf-toast-cancel-btn")
        ?.addEventListener("click", () => {
          chrome.runtime.sendMessage({ action: "CANCEL_TASK" }).catch(() => {});
          const msgEl = document.getElementById("vf-toast-msg");
          if (msgEl) msgEl.textContent = "Отмена...";
          div.style.opacity = "0";
          setTimeout(() => div.remove(), 300);
        });
    }, 10);
  } else {
    div.textContent = message;
    if (!isSticky) {
      window.vfToastTimeout = setTimeout(
        () => {
          div.style.opacity = "0";
          setTimeout(() => div.remove(), 300);
        },
        isError ? 6000 : 3000,
      );
    }
  }
}

function insertTextIntoActiveElement(text) {
  // Локальная функция для обновления тоста после вставки
  const toastDone = (msg, isSticky = false) => {
    let div = document.getElementById("voice-fixer-toast");
    if (!div) return;
    div.style.background = "#16a34a";
    div.style.color = "white";
    div.style.opacity = "1";

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
      document
        .getElementById("vf-toast-copy-btn")
        .addEventListener("click", () => {
          const copyFallback = () => {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            try {
              document.execCommand("copy");
            } catch (e) {}
            textarea.remove();
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(copyFallback);
          } else {
            copyFallback();
          }
          const btn = document.getElementById("vf-toast-copy-btn");
          btn.textContent = "Успешно!";
          setTimeout(() => {
            div.style.opacity = "0";
            setTimeout(() => div.remove(), 300);
          }, 800);
        });
      document
        .getElementById("vf-toast-close-btn")
        .addEventListener("click", () => {
          div.style.opacity = "0";
          setTimeout(() => div.remove(), 300);
        });
    } else {
      div.textContent = msg;
      window.vfToastTimeout = setTimeout(() => {
        div.style.opacity = "0";
        setTimeout(() => div.remove(), 300);
      }, 3000);
    }
  };

  const el = document.activeElement;
  if (!el || el === document.body) {
    const copyFallback = () => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        toastDone(
          "Текст уже скопирован в буфер (фокус потерян), но можно скопировать ещё раз:",
          true,
        );
      } catch (e) {
        toastDone("Не удалось скопировать текст в буфер.", true);
      }
      textarea.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          toastDone(
            "Текст уже скопирован в буфер (фокус потерян), но можно скопировать ещё раз:",
            true,
          );
        })
        .catch(copyFallback);
    } else {
      copyFallback();
    }
    return;
  }

  // Если это стандартный инпут или текстарея
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const value = el.value;
    const textToInsert =
      start > 0 && value[start - 1] !== " " ? " " + text : text;

    el.value = value.slice(0, start) + textToInsert + value.slice(end);
    el.selectionStart = el.selectionEnd = start + textToInsert.length;

    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    toastDone("✅ Текст вставлен!");
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
    el.dispatchEvent(new Event("input", { bubbles: true }));
    toastDone("✅ Текст вставлен в редактор!");
  } else {
    const copyFallback = () => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        toastDone(
          "Текст уже скопирован в буфер, можно скопировать повторно:",
          true,
        );
      } catch (e) {
        toastDone("Не удалось скопировать текст в буфер.", true);
      }
      textarea.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          toastDone(
            "Текст уже скопирован в буфер, можно скопировать повторно:",
            true,
          );
        })
        .catch(copyFallback);
    } else {
      copyFallback();
    }
  }
}

function showErrorWithActions(message, base64Audio) {
  let div = document.getElementById("voice-fixer-toast");
  if (!div) {
    div = document.createElement("div");
    div.id = "voice-fixer-toast";
    div.style.position = "fixed";
    div.style.bottom = "20px";
    div.style.right = "20px";
    div.style.padding = "12px 20px";
    div.style.borderRadius = "8px";
    div.style.zIndex = "9999999";
    div.style.fontFamily =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    div.style.fontSize = "14px";
    div.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    div.style.transition = "opacity 0.3s";
    div.style.maxWidth = "350px";
    div.style.wordWrap = "break-word";
    document.body.appendChild(div);
  }
  div.style.background = "#dc2626"; // Error red
  div.style.color = "white";
  div.style.opacity = "1";

  clearTimeout(window.vfToastTimeout);
  if (window.vfToastInterval) clearInterval(window.vfToastInterval);

  div.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <span style="font-weight: 500;">❌ Ошибка Voice Fixer</span>
      <span style="font-size: 13px; opacity: 0.9;">${message}</span>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 5px;">
        <button id="vf-err-save" style="background: white; color: #dc2626; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px; font-weight: 500;">Скачать аудио</button>
        <button id="vf-err-retry" style="background: white; color: #dc2626; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px; font-weight: 500;">Использовать резервную</button>
        <button id="vf-err-close" style="background: transparent; color: white; border: 1px solid rgba(255,255,255,0.5); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px;">✕ Закрыть</button>
      </div>
    </div>
  `;

  document.getElementById("vf-err-save").addEventListener("click", () => {
    // Converts base64 back to Blob and triggers download
    const byteCharacters = atob(base64Audio);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "audio/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download =
      "voice-fixer-" + new Date().toISOString().replace(/[:.]/g, "-") + ".webm";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
    div.style.opacity = "0";
    setTimeout(() => div.remove(), 300);
  });

  document.getElementById("vf-err-retry").addEventListener("click", () => {
    chrome.runtime.sendMessage({
      action: "PROCESS_AUDIO_FALLBACK",
      audioBase64: base64Audio,
    });
    div.style.opacity = "0";
    setTimeout(() => div.remove(), 300);
  });

  document.getElementById("vf-err-close").addEventListener("click", () => {
    div.style.opacity = "0";
    setTimeout(() => div.remove(), 300);
  });
}
