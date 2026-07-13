import { Plugin, Notice, Editor, MarkdownView } from 'obsidian';
import { VoiceFixerSettings, DEFAULT_SETTINGS, VoiceFixerSettingTab } from './settings';
import { AudioRecorder } from './audioRecorder';
import { processAudioWithGemini } from './geminiApi';

export default class VoiceFixerPlugin extends Plugin {
    settings: VoiceFixerSettings;
    recorder: AudioRecorder;
    statusBarItemEl: HTMLElement;

    async onload() {
        await this.loadSettings();
        this.recorder = new AudioRecorder();

        this.addSettingTab(new VoiceFixerSettingTab(this.app, this));

        this.statusBarItemEl = this.addStatusBarItem();
        this.statusBarItemEl.setText('🎤 Voice Fixer: Ready');

        this.addRibbonIcon('microphone', 'Toggle Voice Fixer Recording', () => {
            this.toggleRecording();
        });

        this.addCommand({
            id: 'toggle-recording',
            name: 'Toggle Audio Recording',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.toggleRecording(editor);
            }
        });
        
        // Команда для исправления выделенного текста
        this.addCommand({
            id: 'fix-selected-text',
            name: 'Fix Selected Text',
            editorCallback: async (editor: Editor) => {
                const selection = editor.getSelection();
                if (!selection) {
                    new Notice('No text selected');
                    return;
                }
                new Notice('Fixing text via Gemini...');
                
                // Для текста используем тот же метод, но без аудио (geminiApi нужно будет дописать, но для старта пока используем только аудио)
                // TODO: Реализовать fixTextWithGemini 
                new Notice('Text correction only is coming soon! Use the mic for now.');
            }
        });
    }

    async toggleRecording(editor?: Editor) {
        if (!this.settings.apiKeys) {
            new Notice('Please set your Gemini API Keys in the settings first!');
            return;
        }

        if (this.recorder.isRecording()) {
            this.statusBarItemEl.setText('⏳ Voice Fixer: Processing...');
            new Notice('Recording stopped. Processing with Gemini...');
            
            try {
                const base64Audio = await this.recorder.stopRecording();
                const result = await processAudioWithGemini(
                    this.settings,
                    base64Audio
                );
                
                this.insertText(result, editor);
                new Notice('Transcription completed!');
            } catch (error: any) {
                new Notice(`Error: ${error.message}`);
                console.error(error);
            } finally {
                this.statusBarItemEl.setText('🎤 Voice Fixer: Ready');
            }
        } else {
            try {
                await this.recorder.startRecording(this.settings.audioBitrate);
                this.statusBarItemEl.setText('🔴 Voice Fixer: Recording...');
                new Notice('Recording started...');
            } catch (error) {
                new Notice('Could not start recording. Check microphone permissions.');
                console.error(error);
            }
        }
    }
    
    insertText(text: string, editor?: Editor) {
        const activeEditor = editor || this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        
        if (activeEditor) {
            const cursor = activeEditor.getCursor();
            activeEditor.replaceRange(text + "\n", cursor);
        } else {
            new Notice('No active file to insert text. Transcribed text copied to clipboard.');
            navigator.clipboard.writeText(text);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
