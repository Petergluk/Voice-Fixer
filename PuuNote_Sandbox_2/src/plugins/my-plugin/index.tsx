import React, { useState } from "react";
import type { PluginDefinition, PluginAPI } from "../registry";
import { Sparkles, FileUp, Settings, TerminalSquare, AlertCircle } from "lucide-react";

// Простой React-компонент для настроек плагина
function MyPluginSettings() {
  const [magic, setMagic] = useState(() => pluginApi?.settings?.get('magic_enabled', false));
  const [apiKey, setApiKey] = useState(() => pluginApi?.settings?.get('api_key', ''));

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-app-text-secondary">
        Это демонстрационный компонент настроек плагина. Вы можете использовать любые React хуки (useState, useEffect и т.д.) здесь.
      </p>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-app-text-primary">Включить магические функции</label>
        <label className="flex items-center gap-2 text-sm text-app-text-secondary cursor-pointer">
          <input 
            type="checkbox" 
            checked={magic}
            onChange={(e) => {
              setMagic(e.target.checked);
              pluginApi?.settings?.set('magic_enabled', e.target.checked);
            }}
            className="rounded border-app-border bg-app-input-bg text-app-accent focus:ring-app-accent" 
          />
          Сохраняется в api.settings
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-app-text-primary">API Ключ</label>
        <input 
          type="text"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            pluginApi?.settings?.set('api_key', e.target.value);
          }}
          placeholder="API Ключ или параметр..." 
          className="w-full rounded-md border border-app-border bg-app-input-bg px-3 py-2 text-sm text-app-text-primary focus:border-app-accent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-app-accent transition-shadow"
        />
      </div>
    </div>
  );
}

let pluginApi: PluginAPI | null = null;

const myPlugin: PluginDefinition = {
  id: "my-test-plugin",
  name: "My Full Test Plugin",
  description: "A comprehensive sample plugin to test all UI hooks in the sandbox.",
  
  // 1. Жизненный цикл плагина
  init: (api) => {
    pluginApi = api;
    console.log("🛠️ Plugin Init: Плагин успешно загружен!");
  },
  unload: () => {
    console.log("🧹 Plugin Unload: Плагин выключен.");
  },

  // 2. Кнопки в Header (Шапке)
  headerActions: [
    {
      id: "test-header-action",
      label: "Import Data",
      icon: FileUp,
      dropdownItems: [
        {
          id: "import-pdf",
          label: "Import PDF Document",
          icon: FileUp,
          onClick: () => alert("Имитация: импорт PDF файла...")
        }
      ]
    }
  ],

  // 3. Кнопки на конкретной карточке (Node)
  cardActions: [
    {
      id: "test-card-action",
      label: "Magic Edit",
      icon: Sparkles,
      onClick: (id, node) => {
        alert(`Применение Magic Edit к карточке: ID "${id}" с текстом: "${node.title}"`);
      }
    }
  ],

  // 4. Кнопки в Footer (Подвале)
  footerActions: [
    {
      id: "test-footer-action",
      label: "System Status",
      icon: Settings,
      onClick: () => alert("Статус: Все системы работают нормально.")
    }
  ],

  // 5. Команды для Command Palette (Cmd/Ctrl + K)
  commands: [
    {
      id: "test-command-1",
      label: "Run Global Diagnostics",
      icon: TerminalSquare,
      execute: () => {
        alert("Запущена глобальная диагностика из Command Palette!");
      }
    },
    {
      id: "test-command-add-node",
      label: "Create Child Node via API",
      icon: Sparkles,
      execute: () => {
        if (!pluginApi || !pluginApi.getState) return;
        const state = pluginApi.getState();
        // Используем mock API для добавления дочерней карточки (parentId = "test-node-1")
        state.addChild("test-node-1", "Новая дочерняя карточка, созданная плагином! ✨");
        pluginApi.toast?.("Новая карточка добавлена", "success");
      }
    },
    {
      id: "test-command-uppercase",
      label: "Uppercase Selected Text",
      icon: Sparkles,
      execute: () => {
        if (!pluginApi || !pluginApi.editor) return;
        const selection = pluginApi.editor.getActiveSelection();
        if (selection && selection.text) {
          pluginApi.editor.replaceSelection(selection.text.toUpperCase());
          pluginApi.toast?.("Text updated!", "success");
        } else {
          alert("Пожалуйста, сначала выделите текст в карточке.");
        }
      }
    }
  ],

  // 6. UI настроек в панели плагинов
  settingsComponent: MyPluginSettings,

  // 7. Хуки обработки данных
  hooks: {
    onNodeCreated: (node) => console.log("Событие: Создана новая нода", node),
    onNodeUpdated: (nodeId, node) => console.log("Событие: Нода обновлена", nodeId),
    onNodeDeleted: (nodeId) => console.log("Событие: Нода удалена", nodeId),
  }
};

export default myPlugin;

