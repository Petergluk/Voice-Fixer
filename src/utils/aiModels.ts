export const DEFAULT_MODELS = "gemini-2.5-pro,gemini-3-flash-preview,gemini-2.5-flash,gemini-3.1-flash-lite";

export interface GenerationOptions {
  timeoutMs?: number;
  onStatusChange?: (msg: string) => void;
  signal?: AbortSignal;
}

export async function generateContentFallback(
  promptText: unknown, 
  customModelOverride?: string,
  options?: GenerationOptions
): Promise<{text: string, usedModel: string}> {
  const modelsAttr = localStorage.getItem('GLOBAL_GEMINI_MODELS') || DEFAULT_MODELS;
  const modelsList = modelsAttr.split(',').map(s => s.trim()).filter(Boolean);
  const preferredModel = customModelOverride || modelsList[0] || "gemini-simulated-model";

  console.log(`Mock generateContentFallback called with model: ${preferredModel}, prompt:`, promptText);
  options?.onStatusChange?.(`Используется локальная заглушка (${preferredModel})...`);
  
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (options?.signal?.aborted) {
        reject(new Error("Отменено пользователем"));
        return;
      }
      resolve({
        text: `[Эмуляция нейросети: ${preferredModel}]\n\nТранскрибация завершена (Mock).\n\nЗапрос: \n\`\`\`\n${JSON.stringify(promptText, null, 2)}\n\`\`\``,
        usedModel: preferredModel
      });
    }, 2500);

    if (options?.signal) {
      options.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error("Отменено пользователем"));
      });
    }
  });
}
