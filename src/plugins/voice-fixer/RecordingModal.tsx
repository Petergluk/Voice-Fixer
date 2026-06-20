import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Activity, X } from 'lucide-react';
import type { PluginAPI } from '../registry';
import { processAudio } from './utils';

export const RecordingModal = ({ targetNodeId, onClose, pluginApi }: { targetNodeId: string | null, onClose: () => void, pluginApi: PluginAPI }) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const [deviceName, setDeviceName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const timerRef = useRef<number | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const cleanupAudio = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  }, []);

  const stopRecording = useCallback(() => {
    isStoppingRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupAudio();
      onClose();
    }
  }, [cleanupAudio, onClose]);

  const cancelRecording = useCallback(() => {
    isCancelledRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupAudio();
      onClose();
    }
  }, [cleanupAudio, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем пробел в текстовых полях, если вдруг фокус остался там
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        stopRecording();
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        cancelRecording();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stopRecording, cancelRecording]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        setDeviceName(audioTrack.label || 'Неизвестный микрофон');
      }

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawVisualizer = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;

        animationFrameRef.current = requestAnimationFrame(drawVisualizer);
        analyserRef.current.getByteFrequencyData(dataArray);
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

        const barWidth = (WIDTH / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 2;
          canvasCtx.fillStyle = `rgb(59, 130, 246)`; 
          canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      };

      drawVisualizer();
      
      let bitrate = parseInt(localStorage.getItem("VOICE_FIXER_BITRATE") || "32000", 10);
      if (isNaN(bitrate)) bitrate = 32000;
      
      const options = { mimeType: "audio/webm", audioBitsPerSecond: bitrate };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        cleanupAudio();
        
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const cleanMimeType = mimeType.split(';')[0];
        const blob = new Blob(audioChunksRef.current, { type: cleanMimeType });
        
        onClose(); // Закрываем модалку, так как запись завершена
        
        if (isCancelledRef.current) {
          pluginApi.toast("Запись отменена", "info");
          return;
        }

        if (blob.size > 0) {
          await processAudio(blob, cleanMimeType, targetNodeId, pluginApi);
        } else {
          pluginApi.toast("Аудиозапись пустая", "error");
        }
      };

      mediaRecorder.start();
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error(err);
      setErrorMsg("Не удалось получить доступ к микрофону");
    }
  }, [cleanupAudio, onClose, pluginApi, targetNodeId]);

  useEffect(() => {
    let mounted = true;
    if (mounted) {
      startRecording();
    }
    return () => {
      mounted = false;
      // Если компонент размонтируется не из-за stopRecording или cancelRecording 
      // (например, клик вне окна), то по умолчанию мы сохраняем запись.
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
         mediaRecorderRef.current.stop();
      }
      cleanupAudio();
    };
  }, [cleanupAudio, startRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto">
      <div className="bg-white rounded-3xl p-4 w-full max-w-md flex flex-row items-center gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 animate-in slide-in-from-bottom-5 duration-200">
        
        <div className="flex flex-col flex-1 gap-2 border-r border-gray-100 dark:border-zinc-800 pr-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-xl font-mono text-gray-900 dark:text-gray-100 font-semibold tabular-nums tracking-wider leading-none">
              {formatTime(recordingTime)}
            </span>
          </div>
          {errorMsg ? (
             <div className="text-xs text-red-500">{errorMsg}</div>
          ) : (
            <div className="flex items-center justify-between gap-2 h-[30px]">
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 absolute opacity-0 pointer-events-none">
                 <Mic className="w-3.5 h-3.5" />
                 <span className="text-[10px] font-semibold truncate max-w-[80px]" title={deviceName}>
                   {deviceName || 'Микрофон'}
                 </span>
              </div>
              <canvas 
                ref={canvasRef} 
                width="120" 
                height="30" 
                className="w-full h-full opacity-80"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
           <button
             onClick={stopRecording}
             title="Завершить и расшифровать"
             className="flex items-center justify-center w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
           >
             <Square className="w-5 h-5 fill-current" />
           </button>
           <button 
             onClick={cancelRecording} 
             title="Отменить"
             className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-gray-400 transition-colors"
           >
              <X className="w-5 h-5" />
           </button>
        </div>
        
      </div>
    </div>
  );
};
