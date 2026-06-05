const defaultSystemPrompt = `Ты расшифровщик и корректор текста. Твоя специализация - транскрипт аудиофайлов, вычитка, очистка, оптимизация расшифровок разговорной речи.`;
const defaultInstruction = `Задачи:
- исправить ошибки распознавания по смыслу.
- расставить знаки препинания, орфографию.
- убрать слова-паразиты (как бы, ну, эээ, собственно).
- разбить длинные предложения и абзацы для читабельности.

!IMPORTANT! Ты сохраняешь полное содержание и структуру исходного текста. Ты никогда не редактируешь и не корректируешь смыслы, лишь слегка оптимизируешь их изложение.

!IMPORTANT! При оптимизации текста сохраняй оригинальный тон и стиль. Например, при расшифровке аудио-практик, избегай замены разрешающих формулировок, таких как «можно», «и может быть» - конструкциями в повелительном наклонении.

Выведи ТОЛЬКО конечный чистый текст. Никаких префиксов вроде "Вот текст:" не нужно.`;

const defaultConciseSystemPrompt = `Ты ИИ-редактор. Твоя задача — сделать из сумбурной устной речи четкий, лаконичный и структурированный текст.`;
const defaultConciseInstruction = `Задачи:
- Очистить текст от воды, бессмысленных повторов и слов-паразитов.
- Извлечь главную мысль и ключевые факты.
- Переписать текст структурно, максимально лаконично, по существу.
- Разбить на логичные короткие абзацы или пункты.
- Сохранить общую суть, но сократить объем без потери важных деталей.

Выведи ТОЛЬКО готовый текст без предисловий.`;

let currentModePrompts = {
  default: { sys: defaultSystemPrompt, instr: defaultInstruction },
  concise: { sys: defaultConciseSystemPrompt, instr: defaultConciseInstruction }
};

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
      systemPrompt: defaultSystemPrompt, // Легаси, для миграции
      instruction: defaultInstruction, // Легаси, для миграции
      promptMode: "default",
      sysPrompt_default: "",
      instr_default: "",
      sysPrompt_concise: defaultConciseSystemPrompt,
      instr_concise: defaultConciseInstruction,
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
      
      // Миграция из легаси полей, если пользователь уже редактировал их
      currentModePrompts.default.sys = result.sysPrompt_default || result.systemPrompt || defaultSystemPrompt;
      currentModePrompts.default.instr = result.instr_default || result.instruction || defaultInstruction;
      currentModePrompts.concise.sys = result.sysPrompt_concise;
      currentModePrompts.concise.instr = result.instr_concise;

      const promptModeSelect = document.getElementById("promptModeSelect");
      if (promptModeSelect) promptModeSelect.value = result.promptMode;

      const updateTextareas = () => {
        const mode = promptModeSelect ? promptModeSelect.value : "default";
        document.getElementById("promptText").value = currentModePrompts[mode].sys;
        document.getElementById("instructionText").value = currentModePrompts[mode].instr;
      };

      updateTextareas();

      if (promptModeSelect) {
        promptModeSelect.addEventListener("change", () => {
          updateTextareas();
        });
      }

      // Сохраняем текст в объект при вводе
      document.getElementById("promptText").addEventListener("input", (e) => {
        const mode = promptModeSelect ? promptModeSelect.value : "default";
        currentModePrompts[mode].sys = e.target.value;
      });
      document.getElementById("instructionText").addEventListener("input", (e) => {
        const mode = promptModeSelect ? promptModeSelect.value : "default";
        currentModePrompts[mode].instr = e.target.value;
      });

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
    const promptModeSelect = document.getElementById("promptModeSelect");
    const mode = promptModeSelect ? promptModeSelect.value : "default";

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
        promptMode: mode,
        sysPrompt_default: currentModePrompts.default.sys,
        instr_default: currentModePrompts.default.instr,
        sysPrompt_concise: currentModePrompts.concise.sys,
        instr_concise: currentModePrompts.concise.instr,
        // Для backwards compatibility, также сохраним текущий как systemPrompt и instruction
        systemPrompt: currentModePrompts[mode].sys,
        instruction: currentModePrompts[mode].instr,
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
