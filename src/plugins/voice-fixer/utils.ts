import type { PluginAPI } from '../registry';
import { generateContentFallback } from "../../utils/aiModels";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_INSTRUCTION, DEFAULT_CONCISE_SYSTEM_PROMPT, DEFAULT_CONCISE_INSTRUCTION } from './prompts';

export const processAudio = async (
  blob: Blob, 
  mimeType: string, 
  targetNodeId: string | null, 
  pluginApi: PluginAPI
) => {
  if (!targetNodeId) return;

  const base64Audio = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve((reader.result as string).split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });

  const abortController = new AbortController();

  const jobId = pluginApi?.addJob?.("Voice Fixer: Расшифровка", () => {
    abortController.abort();
  }) || "job-vf";

  pluginApi?.updateJobProgress?.(jobId, 25, "Подготовка к отправке...");

  try {
    const mode = localStorage.getItem("VOICE_FIXER_PROMPT_MODE") || "default";
    
    // Legacy migration
    let storedSys = localStorage.getItem("VOICE_FIXER_SYSTEM_PROMPT") ?? DEFAULT_SYSTEM_PROMPT;
    let storedInst = localStorage.getItem("VOICE_FIXER_INSTRUCTION") ?? DEFAULT_INSTRUCTION;

    let sysPrompt = mode === "concise" 
      ? (localStorage.getItem("VOICE_FIXER_CONCISE_SYS") ?? DEFAULT_CONCISE_SYSTEM_PROMPT)
      : storedSys;
      
    let instruction = mode === "concise"
      ? (localStorage.getItem("VOICE_FIXER_CONCISE_INSTR") ?? DEFAULT_CONCISE_INSTRUCTION)
      : storedInst;

    let targetModels = localStorage.getItem("VOICE_FIXER_MODELS")?.trim();
    if (!targetModels) {
      targetModels = localStorage.getItem("GLOBAL_GEMINI_MODELS") || "gemini-3.5-flash,gemini-3-flash-preview,gemini-2.5-flash,gemini-3.1-flash-lite";
    }
    let modelsList = targetModels.split(",").map(s => s.trim()).filter(Boolean);

    const isSmart = localStorage.getItem("VOICE_FIXER_SMART_ROUTING") === "true";
    if (isSmart) {
      const stats = JSON.parse(localStorage.getItem("VOICE_FIXER_MODEL_STATS") || "{}");
      modelsList.sort((a, b) => {
        const scoreA = stats[a] || 999999;
        const scoreB = stats[b] || 999999;
        return scoreA - scoreB;
      });
    }
    
    const finalModelsToUse = modelsList.join(",");

    let tOut = parseInt(localStorage.getItem("VOICE_FIXER_TIMEOUT") || "180", 10);
    if (isNaN(tOut)) tOut = 180;
    
    const combinedText = \`[Системный промпт]:\\n\${sysPrompt}\\n\\n[Инструкция]:\\n\${instruction}\`;
    
    const parts = [
      { text: combinedText },
      { inlineData: { mimeType: mimeType || 'audio/webm', data: base64Audio } }
    ];

    const reqStartTime = Date.now();

    const { text, usedModel } = await generateContentFallback(parts, finalModelsToUse, {
       timeoutMs: tOut * 1000,
       signal: abortController.signal,
       onStatusChange: (msg) => {
         pluginApi?.updateJobProgress?.(jobId, 50, msg);
       }
    });
    
    const reqEndTime = Date.now();
    const durationMs = reqEndTime - reqStartTime;
    
    localStorage.setItem("VOICE_FIXER_LAST_SUCCESS_MODEL", usedModel);
    
    if (base64Audio.length > 0) {
      const kb = base64Audio.length / 1024;
      const msPerKb = durationMs / kb;
      const stats = JSON.parse(localStorage.getItem("VOICE_FIXER_MODEL_STATS") || "{}");
      if (stats[usedModel]) {
        stats[usedModel] = stats[usedModel] * 0.5 + msPerKb * 0.5; // Сглаживаем
      } else {
        stats[usedModel] = msPerKb;
      }
      localStorage.setItem("VOICE_FIXER_MODEL_STATS", JSON.stringify(stats));
    }
    
    pluginApi?.updateJobProgress?.(jobId, 100, \`Успешно (\${usedModel})\`);
    pluginApi?.completeJob?.(jobId, \`Успешно (\${usedModel})\`);
    
    if (pluginApi?.document?.getNode && pluginApi?.document?.updateNodeContent) {
      const target = localStorage.getItem("VOICE_FIXER_SAVE_TARGET") || "current";
      const structureMode = localStorage.getItem("VOICE_FIXER_STRUCTURE_MODE") || "single";
      const node = pluginApi.document.getNode(targetNodeId);
      
      if (node) {
        let chunks = structureMode === "split" ? text.split(/\\n\\s*\\n/).filter(c => c.trim().length > 0) : [text];
        
        if (target === "current" || !pluginApi.document.addNode) {
           const joinedText = chunks.join("\\n\\n");
           const separator = node.content.trim() ? "\\n\\n" : "";
           const newContent = node.content + separator + joinedText;
           pluginApi.document.updateNodeContent(targetNodeId, newContent);
        } else {
           const parentForNewNodes = target === "child" ? targetNodeId : node.parentId;
           for (const chunk of chunks) {
             pluginApi.document.addNode(chunk, parentForNewNodes);
           }
        }
      }
    }
    
  } catch (err: any) {
    console.error("Voice fixer error:", err);
    pluginApi?.failJob?.(jobId, err.message || "Unknown error");
    pluginApi?.toast?.(\`Ошибка Voice Fixer: \${err.message}\`, "error");
  }
};
