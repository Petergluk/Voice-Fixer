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

function AudioVisualizer({ stream }: { stream: MediaStream | null }) {
  const [volumes, setVolumes] = useState<number[]>([0,0,0,0,0]);

  useEffect(() => {
    if (!stream) return;
    const audioContext = new window.AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    analyser.fftSize = 256;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    let animationFrame: number;
    let lastUpdate = 0;

    const update = (time: number) => {
      if (time - lastUpdate > 50) {
        analyser.getByteFrequencyData(dataArray);
        
        // Human voice energy is concentrated in lower frequencies.
        // With fftSize=256 and ~48kHz sample rate, each bin is ~180Hz.
        // Bins 1-20 cover roughly 180Hz - 3600Hz, which is perfect for speech.
        const startBin = 1;
        const usefulBins = 20;
        const bands = 5;
        const binSize = Math.floor(usefulBins / bands);
        const newVols = [];
        
        for (let i = 0; i < bands; i++) {
          let sum = 0;
          for (let j = 0; j < binSize; j++) {
            sum += dataArray[startBin + (i * binSize) + j];
          }
          let avg = sum / binSize;
          
          // Boost higher bands to compensate for natural energy drop-off in speech
          avg = avg * (1 + (i * 0.3)); 
          // Add general gain so it's more reactive
          newVols.push(Math.min(255, avg * 1.5));
        }
        setVolumes(newVols);
        lastUpdate = time;
      }
      animationFrame = requestAnimationFrame(update);
    };
    animationFrame = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrame);
      audioContext.close();
    };
  }, [stream]);

  return (
    <div className="flex items-center gap-1 h-6 px-2">
      {volumes.map((vol, i) => {
        const height = Math.max(4, (vol / 255) * 20); // max 20px
        return (
          <div 
            key={i} 
            className="w-1.5 bg-red-500 rounded-full transition-all duration-75"
            style={{ height: `${height}px` }} 
          />
        );
      })}
    </div>
  );
}

function RecordingOverlayComponent({ 
  onStop, 
  onCancel,
  startTime,
  stream
}: { 
  onStop: () => void, 
  onCancel: () => void,
  startTime: number,
  stream: MediaStream | null
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-app-card border border-app-border rounded-2xl shadow-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom-5 pointer-events-auto">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        <span className="font-mono text-lg font-medium text-app-text-primary">
          {mins}:{secs}
        </span>
      </div>
      
      <AudioVisualizer stream={stream} />
      
      <div className="w-px h-8 bg-app-border mx-2" />
      
      <div className="flex items-center gap-2">
        <button
          onClick={onStop}
          className="px-4 py-2 bg-app-accent hover:bg-app-accent/90 text-white rounded-xl font-medium flex items-center gap-2 shadow-sm transition-all active:scale-95"
        >
          <Square size={16} className="fill-white" />
          <span>Готово</span>
        </button>
        <button
          onClick={onCancel}
          className="p-2 rounded-xl bg-app-card-hover text-app-text-secondary hover:bg-red-500 hover:text-black dark:hover:text-black transition-colors"
          title="Сброс"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}

function OverlayWrapper() {
  if (!activeRecordingNodeId || !recordingStartTime) return null;
  return (
    <RecordingOverlayComponent 
      startTime={recordingStartTime} 
      onStop={stopRecording} 
      onCancel={cancelRecording}
      stream={mediaRecorder?.stream || null}
    />
  );
}

function renderOverlay() {
  if (activeRecordingNodeId && recordingStartTime) {
    pluginApi?.ui?.renderOverlay("vf-recording", OverlayWrapper, undefined);
  } else {
    unmountOverlay();
  }
}

const DEFAULT_SYSTEM_PROMPT = `Ты расшифровщик и корректор текста. Твоя специализация - транскрипт аудиофайлов, вычитка, очистка, оптимизация расшифровок разговорной речи.`;

const DEFAULT_INSTRUCTION = `Задачи:
- исправить ошибки распознавания по смыслу.
- расставить знаки препинания, орфографию.
- убрать слова-паразиты (как бы, ну, эээ, собственно).
- разбить длинные предложения и абзацы для читабельности.

!IMPORTANT! Ты сохраняешь полное содержание и структуру исходного текста. Ты никогда не редактируешь и не корректируешь смыслы, лишь слегка оптимизируешь их изложение.

!IMPORTANT! При оптимизации текста сохраняй оригинальный тон и стиль.  Например, при расшифровке аудио-практик, избегай замены  разрешающих формулировок, таких как «можно», «и может быть» - конструкциями в повелительном наклонении. Например, не надо заменять "И можно начать мягко раскачивать дыхание" на повелительное "Начните раскачивать дыхание". Сохраняй предполагаемый уровень взаимодействия говорящего с аудиторией. Не надо смягчать, меняя «бабы»  на «женщины», не надо ужесточать меняя «нахер» на «нахуй», твоя задача очистить мусор, не меняя стиль и тон.

Выведи ТОЛЬКО конечный чистый текст. Никаких префиксов вроде "Вот текст:" не нужно.`;

function unmountOverlay() {
  pluginApi?.ui?.closeOverlay("vf-recording");
}

async function startRecording(nodeId: string) {
  if (activeRecordingNodeId) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    let bitrate = parseInt(localStorage.getItem("VOICE_FIXER_BITRATE") || "32000", 10);
    if (isNaN(bitrate)) bitrate = 32000;
    
    const options = { mimeType: "audio/webm", audioBitsPerSecond: bitrate };
    mediaRecorder = new MediaRecorder(stream, options);
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
        const sysPrompt = localStorage.getItem("VOICE_FIXER_SYSTEM_PROMPT") ?? DEFAULT_SYSTEM_PROMPT;
        const instruction = localStorage.getItem("VOICE_FIXER_INSTRUCTION") ?? DEFAULT_INSTRUCTION;
        let targetModels = localStorage.getItem("VOICE_FIXER_MODELS")?.trim();
        if (!targetModels) {
          targetModels = localStorage.getItem("GLOBAL_GEMINI_MODELS") || "gemini-2.5-pro,gemini-3-flash-preview,gemini-2.5-flash,gemini-3.1-flash-lite";
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
        } else {
          const lastSuccess = localStorage.getItem("VOICE_FIXER_LAST_SUCCESS_MODEL");
          if (lastSuccess && modelsList.includes(lastSuccess)) {
            modelsList = [lastSuccess, ...modelsList.filter(m => m !== lastSuccess)];
          }
        }
        
        const finalModelsToUse = modelsList.join(",");

        let tOut = parseInt(localStorage.getItem("VOICE_FIXER_TIMEOUT") || "180", 10);
        if (isNaN(tOut)) tOut = 180;
        
        const combinedText = `[Системный промпт]:\n${sysPrompt}\n\n[Инструкция]:\n${instruction}`;
        
        const parts = [
          { text: combinedText },
          { inlineData: { mimeType: 'audio/webm', data: base64Audio } }
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
        
        pluginApi?.updateJobProgress?.(jobId, 100, `Успешно (${usedModel})`);
        pluginApi?.completeJob?.(jobId, `Успешно (${usedModel})`);
        
        if (pluginApi?.document?.getNode && pluginApi?.document?.updateNodeContent) {
          const target = localStorage.getItem("VOICE_FIXER_SAVE_TARGET") || "current";
          const mode = localStorage.getItem("VOICE_FIXER_STRUCTURE_MODE") || "single";
          const node = pluginApi.document.getNode(currentTargetNode);
          
          if (node) {
            let chunks = mode === "split" ? text.split(/\n\s*\n/).filter(c => c.trim().length > 0) : [text];
            
            if (target === "current" || !pluginApi.document.addNode) {
               const joinedText = chunks.join("\n\n");
               const separator = node.content.trim() ? "\n\n" : "";
               const newContent = node.content + separator + joinedText;
               pluginApi.document.updateNodeContent(currentTargetNode, newContent);
            } else {
               const parentForNewNodes = target === "child" ? currentTargetNode : node.parentId;
               for (const chunk of chunks) {
                 pluginApi.document.addNode(chunk, parentForNewNodes);
               }
            }
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
  const [sysPrompt, setSysPrompt] = useState("");
  const [instruction, setInstruction] = useState("");
  const [models, setModels] = useState("");
  const [smartRouting, setSmartRouting] = useState(false);
  const [timeoutSec, setTimeoutSec] = useState("");
  const [bitrate, setBitrate] = useState("32000");
  const [saveTarget, setSaveTarget] = useState("current");
  const [structureMode, setStructureMode] = useState("single");

  useEffect(() => {
    // If empty or never set, show the defaults so the user sees them.
    // If the user actually cleared it, it might restore the default, which is usually safer anyway.
    setSysPrompt(localStorage.getItem("VOICE_FIXER_SYSTEM_PROMPT") ?? DEFAULT_SYSTEM_PROMPT);
    setInstruction(localStorage.getItem("VOICE_FIXER_INSTRUCTION") ?? DEFAULT_INSTRUCTION);
    setModels(localStorage.getItem("VOICE_FIXER_MODELS") || "");
    setSmartRouting(localStorage.getItem("VOICE_FIXER_SMART_ROUTING") === "true");
    setTimeoutSec(localStorage.getItem("VOICE_FIXER_TIMEOUT") || "180");
    setBitrate(localStorage.getItem("VOICE_FIXER_BITRATE") || "32000");
    setSaveTarget(localStorage.getItem("VOICE_FIXER_SAVE_TARGET") || "current");
    setStructureMode(localStorage.getItem("VOICE_FIXER_STRUCTURE_MODE") || "single");
  }, []);

  const handleSave = () => {
    localStorage.setItem("VOICE_FIXER_SYSTEM_PROMPT", sysPrompt);
    localStorage.setItem("VOICE_FIXER_INSTRUCTION", instruction);
    localStorage.setItem("VOICE_FIXER_MODELS", models);
    localStorage.setItem("VOICE_FIXER_SMART_ROUTING", smartRouting.toString());
    localStorage.setItem("VOICE_FIXER_TIMEOUT", timeoutSec);
    localStorage.setItem("VOICE_FIXER_BITRATE", bitrate);
    localStorage.setItem("VOICE_FIXER_SAVE_TARGET", saveTarget);
    localStorage.setItem("VOICE_FIXER_STRUCTURE_MODE", structureMode);
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

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-sm text-app-text-primary">
          <input 
            type="checkbox"
            checked={smartRouting}
            onChange={(e) => setSmartRouting(e.target.checked)}
            className="rounded border border-app-border text-app-accent focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none"
          />
          <span>Умный выбор модели (Auto-Routing)</span>
        </label>
        <span className="text-xs text-app-text-secondary opacity-70">
          Если включено, плагин будет замерять скорость ответа (мс на килобайт) и собирать статистику для динамического выбора самой быстрой доступной модели. Если выключено — просто запомнит и будет использовать последнюю работоспособную.
        </span>
      </div>

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
        <span>Битрейт аудио сжатия (kbps)</span>
        <select 
          value={bitrate}
          onChange={(e) => setBitrate(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-app-text-primary focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none text-sm"
        >
          <option value="32000">32 kbps (Меньше размер)</option>
          <option value="64000">64 kbps</option>
          <option value="96000">96 kbps</option>
          <option value="128000">128 kbps (Лучше качество)</option>
        </select>
        <span className="text-xs text-app-text-secondary opacity-70">
          Чем длиннее планируются записи, тем ниже следует ставить битрейт для избежания лимитов API.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm text-app-text-primary">
        <span>Целевое расположение</span>
        <select 
          value={saveTarget}
          onChange={(e) => setSaveTarget(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-app-text-primary focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none text-sm"
        >
          <option value="current">В текущую карточку</option>
          <option value="child">В дочерние карточки</option>
          <option value="sibling">В соседние карточки (сиблинги)</option>
        </select>
      </label>

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-sm text-app-text-primary">
          <input 
            type="checkbox"
            checked={structureMode === "split"}
            onChange={(e) => setStructureMode(e.target.checked ? "split" : "single")}
            className="rounded border border-app-border text-app-accent focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none"
          />
          <span>Разбивать текст на карточки (по абзацам)</span>
        </label>
        <span className="text-xs text-app-text-secondary opacity-70">
          При выборе «В текущую карточку» эта опция игнорируется.
        </span>
      </div>

      <label className="flex flex-col gap-1 text-sm text-app-text-primary">
        <span>Системный промпт (роль и контекст)</span>
        <textarea 
          value={sysPrompt}
          onChange={(e) => setSysPrompt(e.target.value)}
          placeholder="Системный промпт..." 
          className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-app-text-primary h-16 resize-y focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-app-text-primary">
        <span>Инструкции / Правила расшифровки</span>
        <textarea 
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Подробные инструкции..." 
          className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-app-text-primary h-64 resize-y focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none text-sm text-[13px] leading-relaxed"
        />
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
    
    // Глобально слушаем Cmd/Ctrl+Shift+X
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "KeyX") {
        e.preventDefault();
        if (activeRecordingNodeId) {
          stopRecording();
        } else {
          const actNodeId = pluginApi?.document?.getActiveNodeId?.();
          if (actNodeId) {
            startRecording(actNodeId);
          } else {
            pluginApi?.toast?.("Сначала выберите карточку для записи", "error");
          }
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    (window as any).__vf_keydown = handleKeyDown;
  },

  unload: () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    unmountOverlay();
    if ((window as any).__vf_keydown) {
      window.removeEventListener("keydown", (window as any).__vf_keydown);
    }
  },

  commands: [
    {
      id: "vf-start-command",
      label: "Начать/остановить диктовку (Voice Fixer)",
      hotkey: "Cmd+Shift+X",
      execute: () => {
        if (activeRecordingNodeId) {
          stopRecording();
        } else {
          const actNodeId = pluginApi?.document?.getActiveNodeId?.();
          if (actNodeId) {
            startRecording(actNodeId);
          } else {
            pluginApi?.toast?.("Сначала выберите карточку для записи", "error");
          }
        }
      }
    }
  ],

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
