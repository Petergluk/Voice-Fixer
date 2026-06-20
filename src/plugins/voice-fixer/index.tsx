import React, { useState, useEffect } from "react";
import type { PluginDefinition, PluginAPI } from "../registry";
import { Mic } from "lucide-react";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_INSTRUCTION, DEFAULT_CONCISE_SYSTEM_PROMPT, DEFAULT_CONCISE_INSTRUCTION } from './prompts';
import { RecordingModal } from "./RecordingModal";

let pluginApi: PluginAPI | null = null;
let activeRecordingNodeId: string | null = null;

function notifyUpdate() {
  window.dispatchEvent(new CustomEvent('plugin-actions-updated'));
}

function startRecording(nodeId: string) {
  if (activeRecordingNodeId) return;
  activeRecordingNodeId = nodeId;
  notifyUpdate();
  
  pluginApi?.ui?.renderOverlay("vf-recording-modal", () => (
    <RecordingModal 
      targetNodeId={nodeId} 
      pluginApi={pluginApi!} 
      onClose={() => {
        activeRecordingNodeId = null;
        pluginApi?.ui?.closeOverlay("vf-recording-modal");
        notifyUpdate();
      }} 
    />
  ), undefined);
}

function VoiceFixerSettings() {
  const [promptMode, setPromptMode] = useState("default");
  const [sysPrompt, setSysPrompt] = useState("");
  const [instruction, setInstruction] = useState("");
  const [conciseSysPrompt, setConciseSysPrompt] = useState("");
  const [conciseInstruction, setConciseInstruction] = useState("");
  const [models, setModels] = useState("");
  const [smartRouting, setSmartRouting] = useState(false);
  const [timeoutSec, setTimeoutSec] = useState("");
  const [bitrate, setBitrate] = useState("32000");
  const [saveTarget, setSaveTarget] = useState("current");
  const [structureMode, setStructureMode] = useState("single");

  useEffect(() => {
    setPromptMode(localStorage.getItem("VOICE_FIXER_PROMPT_MODE") || "default");
    setSysPrompt(localStorage.getItem("VOICE_FIXER_SYSTEM_PROMPT") ?? DEFAULT_SYSTEM_PROMPT);
    setInstruction(localStorage.getItem("VOICE_FIXER_INSTRUCTION") ?? DEFAULT_INSTRUCTION);
    setConciseSysPrompt(localStorage.getItem("VOICE_FIXER_CONCISE_SYS") ?? DEFAULT_CONCISE_SYSTEM_PROMPT);
    setConciseInstruction(localStorage.getItem("VOICE_FIXER_CONCISE_INSTR") ?? DEFAULT_CONCISE_INSTRUCTION);
    setModels(localStorage.getItem("VOICE_FIXER_MODELS") || "");
    setSmartRouting(localStorage.getItem("VOICE_FIXER_SMART_ROUTING") === "true");
    setTimeoutSec(localStorage.getItem("VOICE_FIXER_TIMEOUT") || "180");
    setBitrate(localStorage.getItem("VOICE_FIXER_BITRATE") || "32000");
    setSaveTarget(localStorage.getItem("VOICE_FIXER_SAVE_TARGET") || "current");
    setStructureMode(localStorage.getItem("VOICE_FIXER_STRUCTURE_MODE") || "single");
  }, []);

  const handleSave = () => {
    localStorage.setItem("VOICE_FIXER_PROMPT_MODE", promptMode);
    localStorage.setItem("VOICE_FIXER_SYSTEM_PROMPT", sysPrompt);
    localStorage.setItem("VOICE_FIXER_INSTRUCTION", instruction);
    localStorage.setItem("VOICE_FIXER_CONCISE_SYS", conciseSysPrompt);
    localStorage.setItem("VOICE_FIXER_CONCISE_INSTR", conciseInstruction);
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
        <span>Режим (Шаблон промпта)</span>
        <select 
          value={promptMode}
          onChange={(e) => setPromptMode(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-app-text-primary focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none text-sm"
        >
          <option value="default">Точная расшифровка (по умолчанию)</option>
          <option value="concise">Лаконичная выжимка (сжатие смысла)</option>
        </select>
        <span className="text-xs text-app-text-secondary opacity-70">
          Выберите формат обработки аудио для новых записей.
        </span>
      </label>

      {promptMode === 'default' && (
        <>
          <label className="flex flex-col gap-1 text-sm text-app-text-primary">
            <span>Системный промпт (Точная расшифровка)</span>
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
        </>
      )}

      {promptMode === 'concise' && (
        <>
          <label className="flex flex-col gap-1 text-sm text-app-text-primary">
            <span>Системный промпт (Лаконичная выжимка)</span>
            <textarea 
              value={conciseSysPrompt}
              onChange={(e) => setConciseSysPrompt(e.target.value)}
              placeholder="Системный промпт..." 
              className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-app-text-primary h-16 resize-y focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-app-text-primary">
            <span>Инструкции / Правила (Лаконичная выжимка)</span>
            <textarea 
              value={conciseInstruction}
              onChange={(e) => setConciseInstruction(e.target.value)}
              placeholder="Подробные инструкции..." 
              className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-app-text-primary h-64 resize-y focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none text-sm text-[13px] leading-relaxed"
            />
          </label>
        </>
      )}

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
          // If modal is open, we do nothing here, the modal handles its own events
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
    pluginApi?.ui?.closeOverlay("vf-recording-modal");
    if ((window as any).__vf_keydown) {
      window.removeEventListener("keydown", (window as any).__vf_keydown);
    }
  },

  commands: [
    {
      id: "vf-start-command",
      label: "Начать диктовку (Voice Fixer)",
      hotkey: "Cmd+Shift+X",
      execute: () => {
        if (!activeRecordingNodeId) {
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
      icon: <Mic size={16} />,
      label: "Диктовать (Voice Fixer)",
      isVisible: (node) => !activeRecordingNodeId,
      onClick: async (nodeId) => {
        startRecording(nodeId);
      }
    }
  ]
};

export default voiceFixerPlugin;
