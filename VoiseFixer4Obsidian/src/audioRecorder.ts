export class AudioRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private dataArray: Uint8Array | null = null;
    private onAudioLevelUpdate: ((level: number) => void) | null = null;
    private animationFrameId: number | null = null;

    setAudioLevelCallback(callback: ((level: number) => void) | null) {
        this.onAudioLevelUpdate = callback;
    }

    async startRecording(bitrate: number = 32000): Promise<void> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Setup Audio Context for visualization
            this.audioContext = new AudioContext();
            const source = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            let options: MediaRecorderOptions = { mimeType: 'audio/webm' };
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                options = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: bitrate };
            } else {
                options = { mimeType: 'audio/webm', audioBitsPerSecond: bitrate };
            }
            
            this.mediaRecorder = new MediaRecorder(stream, options);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.start();

            const updateLevel = () => {
                if (this.analyser && this.dataArray && this.onAudioLevelUpdate) {
                    this.analyser.getByteFrequencyData(this.dataArray);
                    let sum = 0;
                    for (let i = 0; i < this.dataArray.length; i++) {
                        sum += this.dataArray[i];
                    }
                    const average = sum / this.dataArray.length;
                    this.onAudioLevelUpdate(average);
                }
                if (this.mediaRecorder?.state === 'recording') {
                    this.animationFrameId = requestAnimationFrame(updateLevel);
                }
            };
            updateLevel();

        } catch (error) {
            console.error("Error accessing microphone:", error);
            throw error;
        }
    }

    stopRecording(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                return reject(new Error("No recording in progress"));
            }

            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                const base64 = await this.blobToBase64(audioBlob);
                
                // Stop all tracks
                this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
                this.mediaRecorder = null;
                
                if (this.audioContext) {
                    await this.audioContext.close();
                    this.audioContext = null;
                    this.analyser = null;
                    this.dataArray = null;
                }
                
                resolve(base64);
            };

            this.mediaRecorder.stop();
        });
    }

    private blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                const base64 = dataUrl.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    
    isRecording(): boolean {
        return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
    }
}
