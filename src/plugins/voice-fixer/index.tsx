import React, { useState, useEffect } from "react";
import type { PluginDefinition, PluginAPI } from "../registry";
import { Mic, Square, X, Loader2 } from "lucide-react";
import { generateContentFallback } from "../../utils/aiModels";

let pluginApi: PluginAPI | null = null;
let activeRecordingNodeId: string | null = null;
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingStartTime: number | null = null;
let overlayRoot: any = null;
let overlayContainer: HTMLDivElement | null = null;

function notifyUpdate() {
  window.dispatchEvent(new CustomEvent('plugin-actions-updated'));
  renderOverlay();
}

function RecordingOverlayComponent({ 
  onStop, 
  onCancel,
  startTime
}: { 
  onStop: () => void, 
  onCancel: () => void,
  startTime: number
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const secs = (elapsed % 60).toString().padStart(2, '0');

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-app-card border border-app-border rounded-2xl shadow-2xl p-4 flex items-center gap-6 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        <span className="font-mono text-lg font-medium text-app-text-primary">
          {mins}:{secs}
        </span>
      </div>
      
      <div className="w-px h-8 bg-app-border" />
      
      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          className="p-2 rounded-xl hover:bg-app-card-hover text-app-text-secondary transition-colors"
          title="Отмена"
        >
          <X size={20} />
        </button>
        <button
          onClick={onStop}
          className="px-4 py-2 bg-app-accent hover:bg-app-accent/90 text-white rounded-xl font-medium flex items-center gap-2 shadow-sm transition-all active:scale-95"
        >
          <Square size={16} className="fill-white" />
          <span>Готово</span>
        </button>
      </div>
    </div>
  );
}

function renderOverlay() {
  if (activeRecordingNodeId && recordingStartTime) {
    const OverlayWrapper = () => (
      <RecordingOverlayComponent 
        startTime={recordingStartTime!} 
        onStop={stopRecording} 
        onCancel={cancelRecording} 
      />
    );
    pluginApi?.ui?.renderOverlay("vf-recording", OverlayWrapper, undefined);
  } else {
    unmountOverlay();
  }
}

function unmountOverlay() {
  pluginApi?.ui?.closeOverlay("vf-recording");
}

async function startRecording(nodeId: string) {
  if (activeRecordingNodeId) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    let defaultPrompt = `Ты транскрибатор. Твоя задача — дословно перевести аудио в текст. 
ПРАВИЛА:
1. Расставь знаки препинания и заглавные буквы.
2. Исправь слова, если они явно неправильно распознаны.
3. Удали только звуки хезитации (э-э, а-а, м-м) и слова-паразиты (ну, как бы, типа, собственно), если они не несут смысла.
4. СТРОГО ЗАПРЕЩЕНО: перефразировать, изменять порядок слов, сокращать или менять структуру предложений. Сохраняй оригинальную речь, тон и стиль автора.
Выведи ТОЛЬКО готовый текст без предисловий и форматирования.`;
    
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    audioChunks = [];
    recordingStartTime = Date.now();
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      stream.getTracks().forEach(track => track.stop());
      
      if (audioChunks.length === 0) {
         unmountOverlay();
         return; // User cancelled
      }

      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(audioBlob);
      });

      const currentTargetNode = activeRecordingNodeId;
      activeRecordingNodeId = null;
      recordingStartTime = null;
      notifyUpdate();

      if (!currentTargetNode) return;

      const abortController = new AbortController();

      const jobId = pluginApi?.addJob?.("Voice Fixer: Расшифровка", () => {
        abortController.abort();
      }) || "job-vf";

      pluginApi?.updateJobProgress?.(jobId, 25, "Подготовка к отправке...");

      try {
        const sysPrompt = localStorage.getItem("VOICE_FIXER_PROMPT") || defaultPrompt;
        const customModels = localStorage.getItem("VOICE_FIXER_MODELS") || undefined;
        let tOut = parseInt(localStorage.getItem("VOICE_FIXER_TIMEOUT") || "180", 10);
        if (isNaN(tOut)) tOut = 180;
        
        const parts = [
          { text: sysPrompt },
          { inlineData: { mimeType: 'audio/webm', data: base64Audio } }
        ];

        const { text, usedModel } = await generateContentFallback(parts, customModels, {
           timeoutMs: tOut * 1000,
           signal: abortController.signal,
           onStatusChange: (msg) => {
             pluginApi?.updateJobProgress?.(jobId, 50, msg);
           }
        });
        
        pluginApi?.updateJobProgress?.(jobId, 100, `Успешно (${usedModel})`);
        pluginApi?.completeJob?.(jobId, `Успешно (${usedModel})`);
        
        if (pluginApi?.document?.getNode) {
          const node = pluginApi.document.getNode(currentTargetNode);
          if (node) {
            const separator = node.content.trim() ? "\n\n" : "";
            const newContent = node.content + separator + text;
            pluginApi.document.updateNodeContent(currentTargetNode, newContent);
          }
        }
        
      } catch (err: any) {
        console.error("Voice fixer error:", err);
        pluginApi?.failJob?.(jobId, err.message || "Unknown error");
        pluginApi?.toast?.(`Ошибка Voice Fixer: ${err.message}`, "error");
      }
    };

    activeRecordingNodeId = nodeId;
    notifyUpdate();
    mediaRecorder.start();
    
  } catch (err: any) {
    console.error("Mic access error", err);
    pluginApi?.toast?.(`Ошибка микрофона: ${err.message}`, "error");
  }
}

async function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  } else {
    cancelRecording();
  }
}

function cancelRecording() {
  audioChunks = []; // Clear to signify cancellation
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  activeRecordingNodeId = null;
  recordingStartTime = null;
  notifyUpdate();
}


function VoiceFixerSettings() {
  const [prompt, setPrompt] = useState("");
  const [models, setModels] = useState("");
  const [timeoutSec, setTimeoutSec] = useState("");

  useEffect(() => {
    setPrompt(localStorage.getItem("VOICE_FIXER_PROMPT") || "");
    setModels(localStorage.getItem("VOICE_FIXER_MODELS") || "");
    setTimeoutSec(localStorage.getItem("VOICE_FIXER_TIMEOUT") || "180");
  }, []);

  const handleSave = () => {
    localStorage.setItem("VOICE_FIXER_PROMPT", prompt);
    localStorage.setItem("VOICE_FIXER_MODELS", models);
    localStorage.setItem("VOICE_FIXER_TIMEOUT", timeoutSec);
    pluginApi?.toast?.("Настройки Voice Fixer сохранены", "success");
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-app-text-secondary">
        Плагин для диктовки аудио прямо в карточки с автоматическим исправлением текста нейросетью. Поддерживает отмену и тайм-аут.
      </p>
      
      <label className="flex flex-col gap-1 text-sm text-app-text-primary">
        <span>Переопределение моделей (через запятую)</span>
        <input 
          type="text" 
          value={models}
          onChange={(e) => setModels(e.target.value)}
          placeholder="Например: gemini-3.1-flash-lite, gemini-2.5-flash" 
          className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-app-text-primary focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none text-sm"
        />
        <span className="text-xs text-app-text-secondary opacity-70">
          Если пусто, используется глобальный список моделей.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm text-app-text-primary">
        <span>Тайм-аут запроса (сек)</span>
        <input 
          type="number" 
          value={timeoutSec}
          onChange={(e) => setTimeoutSec(e.target.value)}
          placeholder="180" 
          className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-app-text-primary focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-app-text-primary">
        <span>Системный промпт</span>
        <textarea 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Системный промпт транскрибации..." 
          className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-app-text-primary h-32 resize-y focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none text-sm"
        />
        <span className="text-xs text-app-text-secondary opacity-70">
          Оставьте пустым для использования встроенного системного промпта по умолчанию.
        </span>
      </label>

      <button
        onClick={handleSave}
        className="px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent/90 self-start text-sm"
      >
        Сохранить настройки
      </button>
    </div>
  );
}

const voiceFixerPlugin: PluginDefinition = {
  id: "voice-fixer",
  name: "Voice Fixer",
  description: "Диктуйте текст прямо в карточки (Voice-to-Text) с умным исправлением ошибок через Gemini.",
  
  settingsComponent: VoiceFixerSettings,

  init: (api) => {
    pluginApi = api;
    console.log("🎙️ Voice Fixer Plugin Initialized");
  },

  unload: () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    unmountOverlay();
  },

  cardActions: [
    {
      id: "vf-start",
      icon: Mic,
      label: "Диктовать (Voice Fixer)",
      isVisible: (node) => !activeRecordingNodeId,
      onClick: async (nodeId) => {
        await startRecording(nodeId);
      }
    }
  ]
};

export default voiceFixerPlugin;
