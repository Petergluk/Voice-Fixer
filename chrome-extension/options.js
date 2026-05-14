const defaultPrompt = `Ты транскрибатор. Твоя задача — дословно перевести аудио в текст. 
ПРАВИЛА:
1. Расставь знаки препинания и заглавные буквы.
2. Исправь слова, если они явно неправильно распознаны.
3. Удали только звуки хезитации (э-э, а-а, м-м) и слова-паразиты (ну, как бы, типа, собственно), если они не несут смысла.
4. СТРОГО ЗАПРЕЩЕНО: перефразировать, изменять порядок слов, сокращать или менять структуру предложений. Сохраняй оригинальную речь, тон и стиль автора.
Выведи ТОЛЬКО готовый текст без предисловий и форматирования.`;

document.addEventListener('DOMContentLoaded', () => {
  // Загружаем сохраненные настройки
  chrome.storage.local.get({
    geminiApiKey: '',
    geminiModel: 'gemini-3-flash-preview',
    systemPrompt: defaultPrompt,
    enableNotifications: true
  }, (result) => {
    document.getElementById('apiKey').value = result.geminiApiKey;
    document.getElementById('modelSelect').value = result.geminiModel;
    document.getElementById('promptText').value = result.systemPrompt;
    document.getElementById('enableNotifications').checked = result.enableNotifications;
  });

  // Сохранение
  document.getElementById('save').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('modelSelect').value;
    const prompt = document.getElementById('promptText').value.trim();
    const notify = document.getElementById('enableNotifications').checked;

    chrome.storage.local.set({ 
      geminiApiKey: apiKey,
      geminiModel: model,
      systemPrompt: prompt || defaultPrompt,
      enableNotifications: notify
    }, () => {
      const status = document.getElementById('status');
      status.textContent = '✅ Настройки успешно сохранены!';
      setTimeout(() => {
        status.textContent = '';
      }, 3000);
    });
  });

  // Запрос микрофона
  document.getElementById('micBtn').addEventListener('click', async () => {
    const micStatus = document.getElementById('micStatus');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStatus.innerHTML = '<span style="color:#16a34a">✅ Доступ к микрофону предоставлен! Теперь плагин будет работать на любой странице.</span>';
      // Сразу останавливаем стрим, нам нужно было только разрешение
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      micStatus.innerHTML = `<span style="color:#dc2626">❌ Ошибка: ${err.message}. Проверьте разрешения в браузере (иконка замочка в адресной строке).</span>`;
    }
  });

  // Проверка текущего статуса микрофона (если поддерживается браузером в данном контексте)
  navigator.permissions.query({name: 'microphone'}).then((result) => {
    const micStatus = document.getElementById('micStatus');
    if (result.state == 'granted') {
        micStatus.innerHTML = '<span style="color:#16a34a">✅ Доступ к микрофону уже предоставлен.</span>';
    } else if (result.state == 'prompt') {
        micStatus.innerHTML = '<span style="color:#fbbf24">⏳ Доступ пока не предоставлен. Нажмите кнопку выше.</span>';
    } else {
        micStatus.innerHTML = '<span style="color:#dc2626">❌ Доступ запрещен. Разрешите в настройках сайта.</span>';
    }
  }).catch(() => {
    // Игнорируем ошибку (некоторые браузеры могут не поддерживать query для микрофона)
  });
});
