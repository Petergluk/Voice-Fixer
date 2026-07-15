# PuuNote Plugin Sandbox & Ecosystem

This repository contains a standalone sandbox environment designed specifically to help AI coding assistants (like Cursor, Claude, AI Studio, etc.) write and test plugins for PuuNote, as well as standalone extensions (like Chrome extensions or Obsidian plugins).

## Структура проекта (Project Structure)

В этом репозитории собраны несколько взаимосвязанных проектов и утилит для расширения экосистемы PuuNote:

### 1. `src/` (PuuNote Web Plugin Sandbox)
- **Зачем:** Это песочница (React + Vite) для создания веб-плагинов под основное приложение PuuNote.
- **Где:** Исходный код песочницы лежит в `src/`. Внутри `src/plugins/` вы можете создавать новые плагины, тестировать их изолированно через мок `registry.ts` и `App.tsx`.
- **Запуск:** `npm run dev` из корня проекта.

### 2. `VoiseFixer4Obsidian/` (Obsidian Plugin)
- **Зачем:** Версия плагина Voice Fixer для Obsidian. Позволяет диктовать текст, отправлять аудио в Gemini для транскрипции и очистки от словесного мусора, после чего вставлять готовый результат прямо в заметки Obsidian.
- **Где:** Исходный код в `VoiseFixer4Obsidian/src/`. 
- **Запуск:** В папке `VoiseFixer4Obsidian` выполнить `npm run build` (создаст `main.js`).

### 3. `chrome-extension/` (Chrome Extension)
- **Зачем:** Версия плагина Voice Fixer (или других инструментов) в виде браузерного расширения для использования возможностей диктовки с ИИ на любых веб-сайтах.
- **Где:** Исходный код расширения.

### 4. `docs/` & `AGENTS.md` (Документация и инструкции)
- **`AGENTS.md`**: Глобальные инструкции для AI-ассистентов, описывающие, какие модели использовать (fallback chain), устаревшие модели (Gemini 1.5, 2.0 отключены), и правила стилизации UI.
- **`docs/PLUGIN_API.md`**: Документация по Plugin API для песочницы PuuNote.

### 5. `public/`
- **Зачем:** Публичная папка для статики веб-песочницы. Сюда же складываются собранные `.zip` архивы (например, `VoiseFixer4Obsidian.zip`), чтобы их можно было легко скачать через браузер, если приложение запущено в облачной среде (например, AI Studio).

## How to use the Sandbox

1. Give the AI context to this folder.
2. Prompt the AI: *"Create a new PuuNote plugin [name] in the `src/plugins/` directory of this sandbox. Follow the API from `docs/PLUGIN_API.md` and use `utils/aiModels.ts` to access AI if needed."*
3. You can run the sandbox independently using:
   ```bash
   npm install
   npm run dev
   ```
4. Once your plugin behaves as expected, copy the `your-plugin` directory over to `src/plugins/` in the main PuuNote repository.
