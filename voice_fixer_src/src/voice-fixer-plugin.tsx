import React, { useState, useRef, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Mic, Square, Activity } from 'lucide-react';

// PuuNote Plugin API Types (Заглушки типов для сборки)
type PluginAPI = any;
type PluginDefinition = any;

let pluginApi: PluginAPI | null = null;
let modalRoot: Root | null = null;
let modalContainer: HTMLDivElement | null = null;

const DEFAULT_PROMPT = `Ты расшифровщик и корректор текста. Твоя специализация - транскрипт аудиофайлов, вычитка, очистка, оптимизация разговорной речи, полученных от пользователя. Твои задачи:

## Исправить ошибки распознавания.
- исправить границы предложений, руководствуясь логикой текста.
- исправить ошибки в распознавании слов, эвристически, руководствуясь логикой текста.
- исправить пунктуацию, орфографию, согласовать падежи.
- поставить вопросительные знаки (?) в конце вопросительных предложений
- эвристически восстановить смысл если расшифровка низкого качества. Если смысл восстановить невозможно, пометить бессмысленные фрагменты как [*неразборчиво*]
- заменить цифры словами, по смыслу например вместо "1" может быть "первый", "один", "одного", "раз" и т.д. (а даты наоборот перевести в цифры).

## Очистить смысл от словесного мусора (если он есть)
- Удалить слова и обороты, исчезновение которых никак не меняет смысл сказанного, такие как: "как бы", "ну", "собственно", "какой-то", "некий" а также их сочетаний. Например: предложение «Ну и вот, собственно, я как бы это пришел домой» можно превратить в  «И вот, я пришел домой». 

## Разметить структуру текста:
- разбить длинные предложения на короткие
- разбить сплошной текст на короткие абзацы, (3-5 предложений) руководствуясь логикой текста.
- если логичная длина абзацев получается более 6 предложений, делай разбивку через союз "И" в начале первого предложения следующего абзаца
- Если в тексте более 5 абзацев и есть логические части - разбить текст на смысловые блоки и создать к ним заголовки H3.

!IMPORTANT! Ты сохраняешь полное содержание исходного текста, включая диалоги и тексты управляемых медитаций. Ты никогда не редактируешь и не корректируешь смыслы, лишь слегка оптимизируешь их изложение.

!IMPORTANT! При оптимизации текста сохраняй оригинальный тон и стиль.  Например, при расшифровке аудио-практик, избегай замены  разрешающих формулировок, таких как «можно», «и может быть» - конструкцями в повелительном наклонении, прямыми командами или повествованием от первого лица. Например, не надо заменять "И можно начать мягко раскачивать дыхание" на повелительное "Начните раскачивать дыхание". Сохраняй предполагаемый уровень взаимодействия говорящего с аудиторией.

Ты возвращаешь только расшифрованный текст и больше ничего.`;

const RecordingModal = ({ targetNodeId, onClose }: { targetNodeId: string | null, onClose: () => void }) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const [deviceName, setDeviceName] = useState('');
  const timerRef = useRef<number | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [errorMsg, setErrorMsg] = useState('');

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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        setDeviceName(audioTrack.label || 'Неизвестный микрофон');
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
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
          canvasCtx.fillStyle = \`rgb(59, 130, 246)\`; 
          canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      };

      drawVisualizer();
      
      const mediaRecorder = new MediaRecorder(stream);
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
        
        if (blob.size > 0) {
          await processAudio(blob, cleanMimeType);
        } else {
          pluginApi?.toast("Аудиозапись пустая", "error");
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
  };

  const cleanupAudio = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupAudio();
      onClose();
    }
  };

  const processAudio = async (blob: Blob, mimeType: string) => {
    const jobId = pluginApi?.addJob("Расшифровка аудио...");
    pluginApi?.updateJobProgress(jobId, 10, "Подготовка файла...");

    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        pluginApi?.updateJobProgress(jobId, 30, "Отправка в Gemini...");
        
        // Получаем ключ API 
        let apiKey = localStorage.getItem('GEMINI_PLUGIN_API_KEY');
        if (!apiKey) {
          apiKey = window.prompt("Введите ваш ключ API для Gemini (он сохранится в браузере):");
          if (apiKey) localStorage.setItem('GEMINI_PLUGIN_API_KEY', apiKey);
        }

        if (!apiKey) {
          pluginApi?.failJob(jobId, "API ключ не предоставлен");
          return;
        }

        const response = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=\${apiKey}\`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [
                { text: "Пожалуйста, транскрибируй эту аудиозапись и примени все инструкции по корректуре, указанные в системном промпте." },
                { inlineData: { data: base64Data, mimeType: mimeType } }
              ]
            }],
            systemInstruction: {
              parts: [{ text: DEFAULT_PROMPT }]
            }
          })
        });

        if (!response.ok) {
          throw new Error(\`Ошибка HTTP: \${response.status}\`);
        }
        
        pluginApi?.updateJobProgress(jobId, 80, "Обработка отклика...");
        const data = await response.json();
        const transcript = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (transcript) {
          const store = pluginApi?.getState();
          // Добавляем новую карточку через Zustand
          store.setNodes((prevNodes: any[]) => {
            const newNode = {
              id: crypto.randomUUID(),
              parentId: targetNodeId, 
              content: transcript,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            return [...prevNodes, newNode];
          });

          pluginApi?.updateJobProgress(jobId, 100, "Готово");
          pluginApi?.completeJob(jobId, "Новая карточка создана", () => {
             pluginApi?.toast("Новая карточка с текстом добавлена!", "success");
          });
        } else {
          pluginApi?.failJob(jobId, "Модель не вернула текст");
        }
      } catch (err: any) {
        pluginApi?.failJob(jobId, err.message || "Неизвестная ошибка");
      }
    };
  };

  useEffect(() => {
    startRecording();
    return cleanupAudio;
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return \`\${m}:\${s}\`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 shadow-2xl backdrop-blur-sm animate-in fade-in duration-200" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm flex flex-col items-center shadow-2xl relative border border-gray-100">
        
        <button 
          onClick={() => stopRecording()} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
           ✕
        </button>

        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-6 flex items-center gap-2">
          <Mic className="w-6 h-6 text-blue-600" />
          Voice Fixer
        </h3>

        {errorMsg ? (
          <div className="text-red-500 text-center mb-6">{errorMsg}</div>
        ) : (
          <>
            <div className="relative flex items-center justify-center w-24 h-24 mb-8">
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-30"></div>
              <button
                onClick={stopRecording}
                className="relative z-10 flex items-center justify-center w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Square className="w-8 h-8 fill-current" />
              </button>
            </div>
            
            <div className="flex flex-col items-center bg-gray-50 px-6 py-4 rounded-2xl border border-gray-200 shadow-inner w-full mb-6">
              <div className="flex items-center gap-2 mb-3 text-gray-600">
                <Activity className="w-4 h-4 stroke-[2.5]" />
                <span className="text-xs font-semibold truncate max-w-[200px]" title={deviceName}>
                  {deviceName || 'Определение микрофона...'}
                </span>
              </div>
              <canvas 
                ref={canvasRef} 
                width="280" 
                height="60" 
                className="w-full h-[60px] opacity-80"
              />
            </div>

            <div className="text-4xl font-mono text-gray-900 font-semibold tabular-nums tracking-wider text-center">
              {formatTime(recordingTime)}
            </div>
            <div className="text-sm font-medium text-gray-500 mt-3 text-center">
              Нажмите квадрат или клавишу <b><kbd>Пробел</kbd></b>, чтобы остановить запись
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const openRecordingModal = (targetNodeId: string | null) => {
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    document.body.appendChild(modalContainer);
  }
  if (!modalRoot) {
    modalRoot = createRoot(modalContainer);
  }

  const handleClose = () => {
    if (modalRoot) {
      modalRoot.unmount();
      modalRoot = null;
    }
    if (modalContainer && modalContainer.parentNode) {
      modalContainer.parentNode.removeChild(modalContainer);
      modalContainer = null;
    }
  };

  modalRoot.render(<RecordingModal targetNodeId={targetNodeId} onClose={handleClose} />);
};

export const voiceFixerPlugin: PluginDefinition = {
  id: "voice-fixer-plugin",
  name: "Voice Fixer Transcription",
  version: "1.2.0",

  async init(api: PluginAPI) {
    pluginApi = api;
    console.log("Voice Fixer plugin initialized!");
  },

  async unload() {
    if (modalRoot) {
      modalRoot.unmount();
      modalRoot = null;
    }
    if (modalContainer && modalContainer.parentNode) {
      modalContainer.parentNode.removeChild(modalContainer);
      modalContainer = null;
    }
  },

  commands: [
    {
      id: "voice-fixer-record",
      label: "Start Voice Recording (Root Node)",
      icon: Mic,
      run: async () => {
        openRecordingModal(null);
      }
    }
  ],

  cardActions: [
    {
      id: "voice-fixer-card-record",
      label: "Записать аудио в карточку (Voice Fixer)",
      icon: Mic,
      isVisible: (nodeId: string) => true,
      onClick: (nodeId: string) => {
         openRecordingModal(nodeId);
      }
    }
  ]
};
