export const DEFAULT_MODELS = "gemini-2.5-pro,gemini-3-flash-preview,gemini-2.5-flash,gemini-3.1-flash-lite";

export async function generateContentFallback(promptText: unknown, customModelOverride?: string, options?: any): Promise<{ text: string, usedModel: string }> {
  const modelsAttr = localStorage.getItem('GLOBAL_GEMINI_MODELS') || DEFAULT_MODELS;
  const modelsList = modelsAttr.split(',').map(s => s.trim()).filter(Boolean);
  const preferredModel = customModelOverride || modelsList[0] || "gemini-simulated-model";

  console.log(`Mock generateContentFallback called with model: ${preferredModel}, prompt:`, promptText);

  return new Promise((resolve, reject) => {
    let timeoutId: any;
    
    // Check if immediately aborted
    if (options?.signal?.aborted) {
       return reject(new DOMException("Aborted", "AbortError"));
    }

    // Listen for abort
    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    };

    if (options?.signal) {
      options.signal.addEventListener('abort', onAbort);
    }

    if (options?.onStatusChange) {
       options.onStatusChange(`Отправка в ${preferredModel}...`);
    }

    timeoutId = setTimeout(() => {
      if (options?.signal) {
        options.signal.removeEventListener('abort', onAbort);
      }
      const safePromptData = JSON.stringify(promptText, (key, value) => {
        if (key === 'data' && typeof value === 'string' && value.length > 100) {
          return value.substring(0, 50) + '... [TRUNCATED ' + value.length + ' bytes]';
        }
        return value;
      }, 2);

      resolve({
        text: `[Эмуляция нейросети: ${preferredModel}]\n\nВаш запрос успешно получен. В тестовой песочнице используется заглушка, чтобы не расходовать реальные токены и ключи API.\nДля проверки реальной связи с LLM, используйте этот плагин в основной сборке приложения.\n\nТекст промпта (обернут в JSON): \n\`\`\`\n${safePromptData}\n\`\`\``,
        usedModel: preferredModel
      });
    }, 1000);
  });
}

export async function generateTextStreamFallback(promptText: unknown, customModelOverride?: string, options?: any, onChunk?: (chunk: string) => void): Promise<{ text: string, usedModel: string }> {
  const modelsAttr = localStorage.getItem('GLOBAL_GEMINI_MODELS') || DEFAULT_MODELS;
  const modelsList = modelsAttr.split(',').map(s => s.trim()).filter(Boolean);
  const preferredModel = customModelOverride || modelsList[0] || "gemini-simulated-model";

  console.log(`Mock generateTextStreamFallback called with model: ${preferredModel}`);

  return new Promise((resolve, reject) => {
    let timeoutId: any;
    let intervalId: any;
    
    if (options?.signal?.aborted) {
       return reject(new DOMException("Aborted", "AbortError"));
    }

    const safePromptData = JSON.stringify(promptText, (key, value) => {
      if (key === 'data' && typeof value === 'string' && value.length > 100) {
        return value.substring(0, 50) + '... [TRUNCATED ' + value.length + ' bytes]';
      }
      return value;
    }, 2);
    
    const fullText = `[Стриминг: ${preferredModel}]\n\nВаш запрос успешно получен. В тестовой песочнице используется заглушка, чтобы не расходовать токены.\n\nПромпт: \n\`\`\`\n${safePromptData}\n\`\`\``;
    const words = fullText.split(' ');
    let currentWordIndex = 0;
    let accumulatedText = "";

    const onAbort = () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      reject(new DOMException("Aborted", "AbortError"));
    };

    if (options?.signal) {
      options.signal.addEventListener('abort', onAbort);
    }

    if (options?.onStatusChange) {
       options.onStatusChange(`Отправка в ${preferredModel}...`);
    }

    // Имитация задержки перед первым токеном (TTFB)
    timeoutId = setTimeout(() => {
      if (options?.onStatusChange) {
        options.onStatusChange(`Генерация текста...`);
       }

      intervalId = setInterval(() => {
        if (currentWordIndex < words.length) {
          const chunk = words[currentWordIndex] + " ";
          accumulatedText += chunk;
          if (onChunk) onChunk(accumulatedText);
          currentWordIndex++;
        } else {
          clearInterval(intervalId);
          if (options?.signal) {
            options.signal.removeEventListener('abort', onAbort);
          }
          resolve({ text: accumulatedText.trim(), usedModel: preferredModel });
        }
      }, 50); // Скорость стриминга: 1 слово в 50мс

    }, 600);
  });
}
