const defaultSystemPrompt = `Ты расшифровщик и корректор текста. Твоя специализация - транскрипт аудиофайлов, вычитка, очистка, оптимизация расшифровок разговорной речи.

Твои задачи:

- Исправить ошибки распознавания.
- исправить границы предложений, руководствуясь логикой текста.
- исправить ошибки в распознавании слов, эвристически, руководствуясь логикой текста.
- исправить пунктуацию, орфографию, согласовать падежи.
- поставить вопросительные знаки (?) в конце вопросительных предложений
- эвристически восстановить смысл если расшифровка низкого качества. 
- заменить цифры словами, по смыслу например вместо "1" может быть "первый", "один", "одного", "раз" и т.д. (а даты наоборот перевести в цифры).

Очистить смысл от словесного мусора (если он есть)

* Удалить слова и обороты, исчезновение которых никак не меняет смысл сказанного, такие как: "как бы", "ну", "собственно", "какой-то", "некий" а также их сочетаний. Например: предложение «Ну и вот, собственно, я как бы это, так сказать, пришел домой» можно превратить в «И вот, я пришел домой».

Разметить структуру текста:

* разбить длинные предложения на короткие
* разбить сплошной текст на короткие абзацы, (3-5 предложений) руководствуясь логикой текста.
* Если в тексте более 5 абзацев и есть логические части - разбить текст на смысловые блоки и создать к ним заголовки H3.

!IMPORTANT! Ты сохраняешь полное содержание и стиль исходного текста, включая диалоги и тексты управляемых медитаций. Ты никогда не редактируешь и не корректируешь смыслы, лишь слегка оптимизируешь их изложение.

!IMPORTANT! При оптимизации текста сохраняй оригинальный тон и стиль. Не пересказывай другими словами.  Например, при расшифровке аудио-практик, избегай замены разрешающих формулировок, таких как «можно», «и может быть» - конструкцями в повелительном наклонении, прямыми командами или повествованием от первого лица. Например, не надо заменять "И можно начать мягко раскачивать дыхание" на повелительное "Начните раскачивать дыхание". Сохраняй предполагаемый уровень взаимодействия говорящего с аудиторией.

Выведи ТОЛЬКО конечный чистый текст. Никаких префиксов вроде "Вот текст:" не нужно.`;

const defaultConciseSystemPrompt = `Ты ИИ-редактор. Твоя задача — сделать из сумбурной устной речи четкий, лаконичный и структурированный текст.

Задачи:
- Очистить текст от воды, повторов, ошибок и слов-паразитов.
- Извлечь главную мысль и ключевые факты.
- Переписать текст структурно, максимально лаконично, по существу.
- Разбить на логичные короткие абзацы или пункты.
- Сохранить общую суть и детали, оптимизировав их изложение.

Выведи ТОЛЬКО готовый текст без предисловий.`;

let currentModePrompts = {
  default: { sys: defaultSystemPrompt },
  concise: { sys: defaultConciseSystemPrompt }
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
      instruction: "", // Легаси, для миграции
      promptMode: "default",
      sysPrompt_default: "",
      instr_default: "",
      sysPrompt_concise: defaultConciseSystemPrompt,
      instr_concise: "",
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
      let migrationDefaultSys = result.sysPrompt_default || result.systemPrompt || defaultSystemPrompt;
      let migrationDefaultInstr = result.instr_default || result.instruction;
      if (migrationDefaultInstr && !migrationDefaultSys.includes(migrationDefaultInstr.slice(0, 50))) {
        migrationDefaultSys += "\n\n" + migrationDefaultInstr;
      }
      currentModePrompts.default.sys = migrationDefaultSys;
      
      let migrationConciseSys = result.sysPrompt_concise || defaultConciseSystemPrompt;
      let migrationConciseInstr = result.instr_concise;
      if (migrationConciseInstr && !migrationConciseSys.includes(migrationConciseInstr.slice(0, 50))) {
        migrationConciseSys += "\n\n" + migrationConciseInstr;
      }
      currentModePrompts.concise.sys = migrationConciseSys;

      const promptModeSelect = document.getElementById("promptModeSelect");
      if (promptModeSelect) promptModeSelect.value = result.promptMode;

      const updateTextareas = () => {
        const mode = promptModeSelect ? promptModeSelect.value : "default";
        document.getElementById("promptText").value = currentModePrompts[mode].sys;
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

      const enableNotificationsEl = document.getElementById("enableNotifications");
      if (enableNotificationsEl) enableNotificationsEl.checked = result.enableNotifications;
      
      const saveAudioEl = document.getElementById("saveAudio");
      if (saveAudioEl) saveAudioEl.checked = result.saveAudio;
      
      const debugEnabledEl = document.getElementById("debugEnabled");
      if (debugEnabledEl) debugEnabledEl.checked = result.debugEnabled;
      
      const lastTranscriptionEl = document.getElementById("lastTranscription");
      if (lastTranscriptionEl) lastTranscriptionEl.value = result.lastTranscription || "Нет данных";

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

    const notifyEl = document.getElementById("enableNotifications");
    const notify = notifyEl ? notifyEl.checked : true;
    
    const saveAudioEl = document.getElementById("saveAudio");
    const saveAudio = saveAudioEl ? saveAudioEl.checked : false;
    
    const debugEl = document.getElementById("debugEnabled");
    const debug = debugEl ? debugEl.checked : false;

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
        sysPrompt_concise: currentModePrompts.concise.sys,
        // Для backwards compatibility, также сохраним текущий как systemPrompt
        systemPrompt: currentModePrompts[mode].sys,
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
