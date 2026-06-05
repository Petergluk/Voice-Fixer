const defaultPrompt = `Ты транскрибатор. Твоя задача — дословно перевести аудио в текст. 
ПРАВИЛА:
1. Расставь знаки препинания и заглавные буквы.
2. Исправь слова, если они явно неправильно распознаны.
3. Удали только звуки хезитации (э-э, а-а, м-м) и слова-паразиты (ну, как бы, типа, собственно), если они не несут смысла.
4. СТРОГО ЗАПРЕЩЕНО: перефразировать, изменять порядок слов, сокращать или менять структуру предложений. Сохраняй оригинальную речь, тон и стиль автора.
Выведи ТОЛЬКО готовый текст без предисловий и форматирования.`;

document.addEventListener("DOMContentLoaded", () => {
  // Загружаем сохраненные настройки
  chrome.storage.local.get(
    {
      geminiApiKey: "",
      geminiModel: "gemini-3.5-flash",
      autoFallback: true,
      smartRouting: false,
      audioBitrate: 32000,
      geminiTimeout: 3,
      systemPrompt: defaultPrompt,
      enableNotifications: true,
      saveAudio: false,
      debugEnabled: false,
      lastTranscription: "",
      errorLog: [],
    },
    (result) => {
      document.getElementById("apiKey").value = result.geminiApiKey;
      document.getElementById("modelSelect").value = result.geminiModel;
      document.getElementById("autoFallback").checked = result.autoFallback;
      const smartRoutingEl = document.getElementById("smartRouting");
      if (smartRoutingEl) smartRoutingEl.checked = result.smartRouting;
      const bitrateSelect = document.getElementById("bitrateSelect");
      if(bitrateSelect) bitrateSelect.value = result.audioBitrate;
      document.getElementById("geminiTimeout").value = result.geminiTimeout;
      document.getElementById("promptText").value = result.systemPrompt;
      document.getElementById("enableNotifications").checked =
        result.enableNotifications;
      document.getElementById("saveAudio").checked = result.saveAudio;
      document.getElementById("debugEnabled").checked = result.debugEnabled;
      document.getElementById("lastTranscription").value =
        result.lastTranscription || "Нет данных";

      const errTextarea = document.getElementById("errorLog");
      if (result.errorLog.length === 0) {
        errTextarea.value = "Ошибок пока нет";
      } else {
        errTextarea.value = result.errorLog
          .map((e) => `[${new Date(e.time).toLocaleString()}] ${e.message}`)
          .join("\n\n");
      }
    },
  );

  // Сохранение
  document.getElementById("save").addEventListener("click", () => {
    const apiKey = document.getElementById("apiKey").value.trim();
    const model = document.getElementById("modelSelect").value;
    const autoFallback = document.getElementById("autoFallback").checked;
    const smartRoutingEl = document.getElementById("smartRouting");
    const smartRouting = smartRoutingEl ? smartRoutingEl.checked : false;
    const bitrateSelect = document.getElementById("bitrateSelect");
    const bitrate = bitrateSelect ? parseInt(bitrateSelect.value, 10) || 32000 : 32000;
    const timeout =
      parseInt(document.getElementById("geminiTimeout").value, 10) || 3;
    const prompt = document.getElementById("promptText").value.trim();
    const notify = document.getElementById("enableNotifications").checked;
    const saveAudio = document.getElementById("saveAudio").checked;
    const debug = document.getElementById("debugEnabled").checked;

    chrome.storage.local.set(
      {
        geminiApiKey: apiKey,
        geminiModel: model,
        autoFallback: autoFallback,
        smartRouting: smartRouting,
        audioBitrate: bitrate,
        geminiTimeout: timeout,
        systemPrompt: prompt || defaultPrompt,
        enableNotifications: notify,
        saveAudio: saveAudio,
        debugEnabled: debug,
        invalidKeys: [],
      },
      () => {
        const status = document.getElementById("status");
        status.textContent = "✅ Настройки успешно сохранены!";
        setTimeout(() => {
          status.textContent = "";
        }, 3000);
      },
    );
  });

  document.getElementById("downloadDebug").addEventListener("click", () => {
    chrome.storage.local.get({ debugLog: [] }, (data) => {
      const text = data.debugLog.join("\n") || "Логи пусты.";
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `voice_fixer_debug_${Date.now()}.txt`;
      a.click();
    });
  });

  document.getElementById("clearDebug").addEventListener("click", () => {
    chrome.storage.local.set({ debugLog: [] }, () => {
      alert("Логи очищены");
    });
  });

  document.getElementById("copyLast").addEventListener("click", () => {
    const text = document.getElementById("lastTranscription").value;
    if (text && text !== "Нет данных") {
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById("copyLast");
        btn.textContent = "Скопировано!";
        setTimeout(() => (btn.textContent = "Скопировать"), 2000);
      });
    }
  });

  document.getElementById("clearErrors").addEventListener("click", () => {
    chrome.storage.local.set({ errorLog: [] }, () => {
      document.getElementById("errorLog").value = "Ошибок пока нет";
    });
  });

  // Запрос микрофона
  document.getElementById("micBtn").addEventListener("click", async () => {
    const micStatus = document.getElementById("micStatus");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStatus.innerHTML =
        '<span style="color:#16a34a">✅ Доступ к микрофону предоставлен! Теперь плагин будет работать на любой странице.</span>';
      // Сразу останавливаем стрим, нам нужно было только разрешение
      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      micStatus.innerHTML = `<span style="color:#dc2626">❌ Ошибка: ${err.message}. Проверьте разрешения в браузере (иконка замочка в адресной строке).</span>`;
    }
  });

  // Проверка текущего статуса микрофона (если поддерживается браузером в данном контексте)
  navigator.permissions
    .query({ name: "microphone" })
    .then((result) => {
      const micStatus = document.getElementById("micStatus");
      if (result.state == "granted") {
        micStatus.innerHTML =
          '<span style="color:#16a34a">✅ Доступ к микрофону уже предоставлен.</span>';
      } else if (result.state == "prompt") {
        micStatus.innerHTML =
          '<span style="color:#fbbf24">⏳ Доступ пока не предоставлен. Нажмите кнопку выше.</span>';
      } else {
        micStatus.innerHTML =
          '<span style="color:#dc2626">❌ Доступ запрещен. Разрешите в настройках сайта.</span>';
      }
    })
    .catch(() => {
      // Игнорируем ошибку (некоторые браузеры могут не поддерживать query для микрофона)
    });
});
