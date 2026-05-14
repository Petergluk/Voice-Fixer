document.addEventListener('DOMContentLoaded', () => {
  // Загружаем сохраненный ключ при открытии
  chrome.storage.local.get(['geminiApiKey'], (result) => {
    if (result.geminiApiKey) {
      document.getElementById('apiKey').value = result.geminiApiKey;
    }
  });

  // Сохранение
  document.getElementById('save').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
      const status = document.getElementById('status');
      status.textContent = '✅ Настройки успешно сохранены!';
      setTimeout(() => {
        status.textContent = '';
      }, 3000);
    });
  });
});
