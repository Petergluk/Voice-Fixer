import { Plugin, Notice, Editor, MarkdownView } from 'obsidian';
import { VoiceFixerSettings, DEFAULT_SETTINGS, VoiceFixerSettingTab } from './settings';
import { AudioRecorder } from './audioRecorder';
import { RecordingModal } from './recordingModal';

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

        this.addRibbonIcon('microphone', 'Voice Fixer: Start Recording', () => {
            this.startRecordingProcess();
        });

        this.addCommand({
            id: 'start-recording-modal',
            name: 'Start Recording (Open Modal)',
            callback: () => {
                this.startRecordingProcess();
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
                new Notice('Text correction only is coming soon! Use the mic for now.');
            }
        });
    }

    startRecordingProcess() {
        if (!this.settings.apiKeys) {
            new Notice('Please set your Gemini API Keys in the settings first!');
            return;
        }

        if (this.recorder.isRecording()) {
            new Notice('Already recording!');
            return;
        }

        new RecordingModal(this.app, this).open();
    }
    
    insertText(text: string) {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        
        if (activeView) {
            const editor = activeView.editor;
            const cursor = editor.getCursor();
            
            // Получаем текущую строку, чтобы понять, нужно ли добавлять перенос строки перед текстом
            const line = editor.getLine(cursor.line);
            const prefix = (line.length > 0 && cursor.ch > 0) ? "\n\n" : "";
            
            const textToInsert = prefix + text + "\n\n";
            editor.replaceRange(textToInsert, cursor);
            
            // Перемещаем курсор в конец вставленного текста
            const newCursor = editor.offsetToPos(editor.posToOffset(cursor) + textToInsert.length);
            editor.setCursor(newCursor);
        } else {
            new Notice('No active file to insert text. Transcribed text is in your clipboard!');
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
