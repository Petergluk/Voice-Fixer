import { App, PluginSettingTab, Setting } from 'obsidian';
import VoiceFixerPlugin from './main';

export interface VoiceFixerSettings {
    apiKey: string;
    model: string;
    systemPrompt: string;
}

export const DEFAULT_SETTINGS: VoiceFixerSettings = {
    apiKey: '',
    model: 'gemini-2.5-flash',
    systemPrompt: `Ты расшифровщик и корректор текста. Твоя специализация - транскрипт аудиофайлов, вычитка, очистка, оптимизация расшифровок разговорной речи.

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

Выведи ТОЛЬКО конечный чистый текст. Никаких префиксов вроде "Вот текст:" не нужно.`
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
            .setName('Gemini API Key')
            .setDesc('Your Google Gemini API Key')
            .addText(text => text
                .setPlaceholder('Enter your API key')
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                }));
                
        new Setting(containerEl)
            .setName('Model')
            .setDesc('Gemini model to use (e.g. gemini-2.5-flash, gemini-3.1-flash-lite)')
            .addText(text => text
                .setPlaceholder('gemini-2.5-flash')
                .setValue(this.plugin.settings.model)
                .onChange(async (value) => {
                    this.plugin.settings.model = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('System Prompt')
            .setDesc('Instructions for the AI')
            .addTextArea(text => {
                text
                    .setPlaceholder('Enter system prompt')
                    .setValue(this.plugin.settings.systemPrompt)
                    .onChange(async (value) => {
                        this.plugin.settings.systemPrompt = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.rows = 15;
                text.inputEl.cols = 50;
            });
    }
}
