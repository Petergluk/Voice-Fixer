import { App, Modal, Notice } from 'obsidian';
import VoiceFixerPlugin from './main';
import { processAudioWithGemini } from './geminiApi';

export class RecordingModal extends Modal {
    plugin: VoiceFixerPlugin;
    isRecording: boolean = false;
    timerInterval: NodeJS.Timeout | null = null;
    startTime: number = 0;
    timeDisplay: HTMLElement;
    statusDisplay: HTMLElement;
    
    constructor(app: App, plugin: VoiceFixerPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        contentEl.createEl('h2', { text: 'Voice Fixer: Диктовка', cls: 'vf-modal-title' });
        
        this.statusDisplay = contentEl.createEl('p', { text: 'Идет запись... Говорите четко.', cls: 'vf-status-text' });
        this.statusDisplay.style.color = 'var(--text-muted)';
        
        this.timeDisplay = contentEl.createEl('div', { text: '00:00', cls: 'vf-timer' });
        this.timeDisplay.style.fontSize = '2.5em';
        this.timeDisplay.style.fontWeight = 'bold';
        this.timeDisplay.style.textAlign = 'center';
        this.timeDisplay.style.margin = '20px 0';
        this.timeDisplay.style.color = 'var(--text-accent)';

        const buttonContainer = contentEl.createEl('div', { cls: 'vf-button-container' });
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.gap = '15px';
        buttonContainer.style.marginTop = '20px';

        const stopBtn = buttonContainer.createEl('button', { text: '⏹ Остановить и Расшифровать', cls: 'mod-cta' });
        const cancelBtn = buttonContainer.createEl('button', { text: '❌ Отмена' });

        stopBtn.addEventListener('click', async () => {
            await this.stopAndTranscribe();
        });

        cancelBtn.addEventListener('click', async () => {
            await this.cancelRecording();
        });

        this.startRecording();
    }

    onClose() {
        if (this.isRecording) {
            this.cancelRecording();
        }
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        const { contentEl } = this;
        contentEl.empty();
    }

    async startRecording() {
        try {
            await this.plugin.recorder.startRecording(this.plugin.settings.audioBitrate);
            this.isRecording = true;
            this.startTime = Date.now();
            this.timerInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
                const secs = (elapsed % 60).toString().padStart(2, '0');
                this.timeDisplay.setText(`${mins}:${secs}`);
            }, 1000);
        } catch (err) {
            new Notice('Не удалось начать запись. Проверьте разрешения микрофона.');
            this.close();
        }
    }

    async stopAndTranscribe() {
        if (!this.isRecording) return;
        
        this.isRecording = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        this.timeDisplay.style.display = 'none';
        this.statusDisplay.setText('⏳ Идет обработка в Gemini... Пожалуйста, подождите.');
        this.statusDisplay.style.color = 'var(--text-accent)';
        this.statusDisplay.style.textAlign = 'center';
        this.statusDisplay.style.fontWeight = 'bold';
        this.statusDisplay.style.fontSize = '1.2em';
        
        const buttons = this.contentEl.querySelectorAll('button');
        buttons.forEach(b => b.style.display = 'none');

        try {
            const base64Audio = await this.plugin.recorder.stopRecording();
            const result = await processAudioWithGemini(this.plugin.settings, base64Audio);
            
            // Backup to clipboard
            try {
                await navigator.clipboard.writeText(result);
                new Notice('Текст скопирован в буфер обмена (резервная копия).');
            } catch (e) {
                console.warn("Could not write to clipboard", e);
            }
            
            this.plugin.insertText(result);
            new Notice('Расшифровка успешно завершена и вставлена!');
        } catch (error: any) {
            new Notice(`Ошибка: ${error.message}`);
            console.error(error);
        } finally {
            this.close();
        }
    }

    async cancelRecording() {
        if (!this.isRecording) return;
        this.isRecording = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        try {
            await this.plugin.recorder.stopRecording();
        } catch(e) {}
        new Notice('Запись отменена.');
        this.close();
    }
}
