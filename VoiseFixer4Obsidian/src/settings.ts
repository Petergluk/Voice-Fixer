import { App, PluginSettingTab, Setting } from 'obsidian';
import VoiceFixerPlugin from './main';

export interface VoiceFixerSettings {
    apiKeys: string;
    model: string;
    audioBitrate: number;
    autoFallback: boolean;
    smartRouting: boolean;
    maxWaitTime: number;
    debugMode: boolean;
    promptMode: string;
    sysPrompt_default: string;
    sysPrompt_concise: string;
}

export const DEFAULT_SETTINGS: VoiceFixerSettings = {
    apiKeys: '',
    model: 'gemini-2.5-flash',
    audioBitrate: 32000,
    autoFallback: true,
    smartRouting: true,
    maxWaitTime: 3,
    debugMode: false,
    promptMode: 'default',
    sysPrompt_default: `Ты расшифровщик и корректор текста. Твоя специализация - транскрипт аудиофайлов, вычитка, очистка, оптимизация расшифровок разговорной речи.

Твои задачи:
- Исправить ошибки распознавания.
- исправить границы предложений, руководствуясь логикой текста.
- исправить ошибки в распознавании слов, эвристически, руководствуясь логикой текста.
- исправить пунктуацию, орфографию, согласовать падежи.
- поставить вопросительные знаки (?) в конце вопросительных предложений
- эвристически восстановить смысл если расшифровка низкого качества. 
- заменить цифры словами, по смыслу например вместо "1" может быть "первый", "один", "одного", "раз" и т.д. (а даты наоборот перевести в цифры).

Очистить смысл от словесного мусора (если он есть)
* Удалить слова и обороты, исчезновение которых никак не меняет смысл сказанного, такие как: "как бы", "ну", "собственно", "какой-то", "некий" а также их сочетаний.

Разметить структуру текста:
* разбить длинные предложения на короткие
* разбить сплошной текст на короткие абзацы, (3-5 предложений) руководствуясь логикой текста.
* Если в тексте более 5 абзацев и есть логические части - разбить текст на смысловые блоки и создать к ним заголовки H3.

!IMPORTANT! Ты сохраняешь полное содержание исходного текста, включая диалоги и тексты управляемых медитаций. Ты никогда не редактируешь и не корректируешь смыслы, лишь слегка оптимизируешь их изложение.
!IMPORTANT! При оптимизации текста сохраняй оригинальный тон и стиль.

Выведи ТОЛЬКО конечный чистый текст. Никаких префиксов вроде "Вот текст:" не нужно.`,
    sysPrompt_concise: `Ты ИИ-редактор. Твоя задача — сделать из сумбурной устной речи четкий, лаконичный и структурированный текст.

Задачи:
- Очистить текст от воды, бессмысленных повторов и слов-паразитов.
- Извлечь главную мысль и ключевые факты.
- Переписать текст структурно, максимально лаконично, по существу.
- Разбить на логичные короткие абзацы или пункты.
- Сохранить общую суть, но сократить объем без потери важных деталей.

Выведи ТОЛЬКО готовый текст без предисловий.`
}

export class VoiceFixerSettingTab extends PluginSettingTab {
    plugin: VoiceFixerPlugin;

    constructor(app: App, plugin: VoiceFixerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();
        containerEl.createEl('h2', {text: 'Settings for Voice Fixer'});

        new Setting(containerEl)
            .setName('Gemini API Keys')
            .setDesc('Your Google Gemini API Keys (comma or line separated). Providing multiple keys helps avoid rate limits.')
            .addTextArea(text => {
                text
                    .setPlaceholder('Enter your API keys')
                    .setValue(this.plugin.settings.apiKeys)
                    .onChange(async (value) => {
                        this.plugin.settings.apiKeys = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.rows = 4;
                text.inputEl.cols = 50;
            });
                
        new Setting(containerEl)
            .setName('Model')
            .setDesc('Gemini model to use first')
            .addDropdown(dropdown => dropdown
                .addOption('gemini-3.5-flash', 'Gemini 3.5 Flash')
                .addOption('gemini-3-flash-preview', 'Gemini 3 Flash Preview')
                .addOption('gemini-2.5-flash', 'Gemini 2.5 Flash')
                .addOption('gemini-3.1-flash-lite', 'Gemini 3.1 Flash Lite')
                .setValue(this.plugin.settings.model)
                .onChange(async (value) => {
                    this.plugin.settings.model = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Audio Bitrate (kbps)')
            .setDesc('Audio compression quality. Lower is smaller (fits more in 20MB limit).')
            .addDropdown(dropdown => dropdown
                .addOption('16000', '16 kbps')
                .addOption('32000', '32 kbps')
                .addOption('64000', '64 kbps')
                .addOption('128000', '128 kbps')
                .setValue(this.plugin.settings.audioBitrate.toString())
                .onChange(async (value) => {
                    this.plugin.settings.audioBitrate = parseInt(value, 10);
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto Fallback')
            .setDesc('Automatically try other models/keys if the first one fails due to rate limits.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoFallback)
                .onChange(async (value) => {
                    this.plugin.settings.autoFallback = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Smart Model Routing')
            .setDesc('Dynamically measure response times and use the fastest available model.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.smartRouting)
                .onChange(async (value) => {
                    this.plugin.settings.smartRouting = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Max Wait Time (minutes)')
            .setDesc('Maximum time to wait for AI response before aborting or trying next model.')
            .addText(text => text
                .setPlaceholder('3')
                .setValue(this.plugin.settings.maxWaitTime.toString())
                .onChange(async (value) => {
                    this.plugin.settings.maxWaitTime = parseInt(value, 10) || 3;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Debug Logging')
            .setDesc('Enable debug logs (for troubleshooting)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Prompt Mode')
            .setDesc('Select the transcription style')
            .addDropdown(dropdown => dropdown
                .addOption('default', 'Exact Transcription (Точная расшифровка)')
                .addOption('concise', 'Concise Summary (Краткая выжимка)')
                .setValue(this.plugin.settings.promptMode)
                .onChange(async (value) => {
                    this.plugin.settings.promptMode = value;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to update the text area
                }));

        const isConcise = this.plugin.settings.promptMode === 'concise';
        new Setting(containerEl)
            .setName('System Prompt')
            .setDesc(`Instructions for the AI (${isConcise ? 'Concise Summary' : 'Exact Transcription'})`)
            .addTextArea(text => {
                text
                    .setPlaceholder('Enter system prompt')
                    .setValue(isConcise ? this.plugin.settings.sysPrompt_concise : this.plugin.settings.sysPrompt_default)
                    .onChange(async (value) => {
                        if (isConcise) {
                            this.plugin.settings.sysPrompt_concise = value;
                        } else {
                            this.plugin.settings.sysPrompt_default = value;
                        }
                        await this.plugin.saveSettings();
                    });
                text.inputEl.rows = 15;
                text.inputEl.cols = 50;
            });
    }
}
