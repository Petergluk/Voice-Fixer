export const DEFAULT_MODELS = "gemini-2.5-pro,gemini-3-flash-preview,gemini-2.5-flash,gemini-3.1-flash-lite";

export async function generateContentFallback(promptText: unknown, customModelOverride?: string): Promise<{text: string, usedModel: string}> {
  const modelsAttr = localStorage.getItem('GLOBAL_GEMINI_MODELS') || DEFAULT_MODELS;
  const modelsList = modelsAttr.split(',').map(s => s.trim()).filter(Boolean);
  const preferredModel = customModelOverride || modelsList[0] || "gemini-simulated-model";

  console.log(`Mock generateContentFallback called with model: ${preferredModel}, prompt:`, promptText);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        text: `[Эмуляция нейросети: ${preferredModel}]\n\nВаш запрос был успешно получен. В тестовой песочнице используется заглушка, чтобы не расходовать реальные токены и ключи API.\nДля проверки реальной связи с LLM, используйте этот плагин в основной сборке приложения.\n\nТекст промпта (обернут в JSON): \n\`\`\`\n${JSON.stringify(promptText, null, 2)}\n\`\`\``,
        usedModel: preferredModel
      });
    }, 1000);
  });
}
