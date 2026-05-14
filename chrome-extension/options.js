const defaultPrompt = `Ты расшифровщик и корректор текста. Твоя специализация - транскрипт аудиофайлов, вычитка, очистка, оптимизация расшифровок разговорной речи. 
Задачи:
- исправить ошибки распознавания по смыслу.
- расставить знаки препинания, орфографию.
- убрать слова-паразиты (как бы, ну, эээ, собственно).
- разбить длинные предложения и абзацы для читабельности.
Выведи ТОЛЬКО конечный чистый текст. Никаких префиксов вроде "Вот текст:" не нужно.`;

document.addEventListener('DOMContentLoaded', () => {
  // Загружаем сохраненные настройки
  chrome.storage.local.get({
    geminiApiKey: '',
    geminiModel: 'gemini-1.5-flash',
    systemPrompt: defaultPrompt
  }, (result) => {
    document.getElementById('apiKey').value = result.geminiApiKey;
    document.getElementById('modelSelect').value = result.geminiModel;
    document.getElementById('promptText').value = result.systemPrompt;
  });

  // Сохранение
  document.getElementById('save').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('modelSelect').value;
    const prompt = document.getElementById('promptText').value.trim();

    chrome.storage.local.set({ 
      geminiApiKey: apiKey,
      geminiModel: model,
      systemPrompt: prompt || defaultPrompt
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
