import { App, Modal, Notice } from 'obsidian';
import VoiceFixerPlugin from './main';

export class RecordingModal extends Modal {
    plugin: VoiceFixerPlugin;
    isRecording: boolean = false;
    timerInterval: NodeJS.Timeout | null = null;
    startTime: number = 0;
    timeDisplay: HTMLElement;
    visualizerBars: HTMLElement[] = [];
    mainContainer: HTMLElement;
    
    constructor(app: App, plugin: VoiceFixerPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        this.modalEl.addClass('vf-recording-modal');
        
        // Clean layout
        this.modalEl.style.padding = '0';
        this.modalEl.style.width = 'fit-content';
        this.modalEl.style.borderRadius = '24px';
        this.modalEl.style.boxShadow = '0 10px 40px rgba(0,0,0,0.15)';
        this.modalEl.style.border = '1px solid var(--background-modifier-border)';
        contentEl.style.padding = '12px 16px';
        contentEl.style.margin = '0';
        
        this.mainContainer = contentEl.createEl('div');
        this.mainContainer.style.display = 'flex';
        this.mainContainer.style.alignItems = 'center';
        this.mainContainer.style.gap = '16px';
        
        // Red dot
        const dot = this.mainContainer.createEl('div');
        dot.style.width = '12px';
        dot.style.height = '12px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = '#ff4d4d';
        dot.style.animation = 'vf-pulse 1.5s infinite';
        
        // Timer
        this.timeDisplay = this.mainContainer.createEl('div', { text: '00:00' });
        this.timeDisplay.style.fontSize = '1.3rem';
        this.timeDisplay.style.fontWeight = '600';
        this.timeDisplay.style.fontFamily = 'monospace';
        
        // Visualizer
        const visualizer = this.mainContainer.createEl('div');
        visualizer.style.display = 'flex';
        visualizer.style.alignItems = 'center';
        visualizer.style.gap = '4px';
        visualizer.style.height = '24px';
        
        for (let i = 0; i < 5; i++) {
            const bar = visualizer.createEl('div');
            bar.style.width = '6px';
            bar.style.height = '4px';
            bar.style.borderRadius = '3px';
            bar.style.backgroundColor = '#ff4d4d';
            bar.style.transition = 'height 0.1s ease';
            this.visualizerBars.push(bar);
        }
        
        // Separator
        const separator = this.mainContainer.createEl('div');
        separator.style.width = '1px';
        separator.style.height = '24px';
        separator.style.backgroundColor = 'var(--background-modifier-border)';
        separator.style.margin = '0 4px';
        
        // "Готово" button
        const stopBtn = this.mainContainer.createEl('button');
        stopBtn.style.display = 'flex';
        stopBtn.style.alignItems = 'center';
        stopBtn.style.gap = '10px';
        stopBtn.style.backgroundColor = 'var(--text-normal)';
        stopBtn.style.color = 'var(--background-primary)';
        stopBtn.style.borderRadius = '16px';
        stopBtn.style.padding = '10px 20px';
        stopBtn.style.border = 'none';
        stopBtn.style.fontSize = '1rem';
        stopBtn.style.fontWeight = '600';
        stopBtn.style.cursor = 'pointer';
        
        const squareIcon = stopBtn.createEl('div');
        squareIcon.style.width = '12px';
        squareIcon.style.height = '12px';
        squareIcon.style.backgroundColor = 'var(--background-primary)';
        squareIcon.style.borderRadius = '2px';
        
        stopBtn.createEl('span', { text: 'Готово' });
        
        // "Cancel" button
        const cancelBtn = this.mainContainer.createEl('button');
        cancelBtn.style.display = 'flex';
        cancelBtn.style.alignItems = 'center';
        cancelBtn.style.justifyContent = 'center';
        cancelBtn.style.width = '42px';
        cancelBtn.style.height = '42px';
        cancelBtn.style.borderRadius = '16px';
        cancelBtn.style.backgroundColor = 'var(--background-secondary-alt)';
        cancelBtn.style.color = 'var(--text-normal)';
        cancelBtn.style.border = 'none';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

        if (!document.getElementById('vf-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'vf-modal-styles';
            style.textContent = `
                @keyframes vf-pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.8); }
                    100% { opacity: 1; transform: scale(1); }
                }
                .vf-recording-modal .modal-close-button {
                    display: none;
                }
                .vf-recording-modal.modal {
                    background-color: var(--background-primary);
                }
            `;
            document.head.appendChild(style);
        }

        stopBtn.addEventListener('click', async () => {
            await this.stopAndTranscribe();
        });

        cancelBtn.addEventListener('click', async () => {
            await this.cancelRecording();
        });

        this.plugin.recorder.setAudioLevelCallback((level) => {
            const maxHeights = [14, 20, 24, 20, 14];
            
            for (let i = 0; i < this.visualizerBars.length; i++) {
                const normalized = Math.min(1, Math.max(0, (level - 20) / 80));
                const randomScale = 0.5 + Math.random() * 0.5;
                const targetHeight = 4 + (maxHeights[i] - 4) * normalized * randomScale;
                this.visualizerBars[i].style.height = `${targetHeight}px`;
            }
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
        this.plugin.recorder.setAudioLevelCallback(null);
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
        this.plugin.recorder.setAudioLevelCallback(null);
        
        try {
            const base64Audio = await this.plugin.recorder.stopRecording();
            this.close(); // Close modal immediately
            
            // Pass to background processing
            this.plugin.processAudioBackground(base64Audio);
        } catch (error: any) {
            new Notice(`Ошибка записи: ${error.message}`);
            console.error(error);
            this.close();
        }
    }

    async cancelRecording() {
        if (!this.isRecording) return;
        this.isRecording = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.plugin.recorder.setAudioLevelCallback(null);
        try {
            await this.plugin.recorder.stopRecording();
        } catch(e) {}
        new Notice('Запись отменена.');
        this.close();
    }
}
