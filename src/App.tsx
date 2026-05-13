import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Settings, Copy, Check, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const DEFAULT_PROMPT = `Ты расшифровщик и корректор текста. Твоя специализация - транскрипт аудиофайлов, вычитка, очистка, оптимизация разговорной речи, полученных от пользователя. Твои задачи:

## Исправить ошибки распознавания.
- исправить неправильно определенные границы предложений, руководствуясь логикой текста.
- исправить ошибки в распознавании слов, эвристически, руководствуясь логикой текста.
- исправить пунктуацию, орфографию, согласовать падежи.
- поставить вопросительные знаки (?) в конце вопросительных предложений
- эвристически восстановить смысл если расшифровка низкого качества. Если смысл восстановить невозможно, пометить бессмысленные фрагменты как [*неразборчиво*]
- заменить цифры словами, по смыслу например вместо "1" может быть "первый", "один", "одного", "раз" и т.д. (а даты наоборот перевести в цифры).

## Очистить смысл от словесного мусора (если он есть)
- Удалить слова и обороты, исчезновение которых никак не меняет смысл сказанного, такие как: "как бы", "ну", "собственно", "какой-то", "некий" а также их сочетаний.
- Удалить технические вставки.

## Разметить структуру текста:
- разбить длинные предложения на короткие
- разбить сплошной текст на короткие абзацы, (3-5 предложений) руководствуясь логикой текста.
- если логичная длина абзацев получается более 6 предложений, делай разбивку через союз "И" в начале первого предложения следующего абзаца
- разбить текст на смысловые блоки и создать к ним заголовки H3.
- если в тексте есть диалог, обозначай имена, если имена не называются в тексте, подпиши «Участник:».

!IMPORTANT! Ты сохраняешь полное содержание исходного текста, включая диалоги и тексты управляемых медитаций. Ты никогда не редактируешь и не корректируешь смыслы, лишь слегка оптимизируешь их изложение.
!IMPORTANT! При оптимизации текста сохраняй оригинальный тон и стиль. Избегай замены разрешающих формулировок конструкциями в повелительном наклонении.

Ты возвращаешь только расшифрованный текст и больше ничего.`;

const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Рекомендуемая)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite Preview' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash Preview' }
];

export default function App() {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
  const [model, setModel] = useState(AVAILABLE_MODELS[0].id);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (recording) {
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [recording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const clearError = () => setErrorMsg('');

  const startRecording = async () => {
    clearError();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const cleanMimeType = mimeType.split(';')[0]; // Simplify for Gemini
        const blob = new Blob(audioChunksRef.current, { type: cleanMimeType });
        
        // Ensure microphone track is released completely
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        if (blob.size > 0) {
          await processAudio(blob, cleanMimeType);
        } else {
          setErrorMsg('Файл записи оказался пустым.');
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setErrorMsg("Не удалось получить доступ к микрофону. Проверьте разрешения браузера.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const processAudio = async (blob: Blob, mimeType: string) => {
    setProcessing(true);
    setTranscript('');
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const result = reader.result as string;
        // The dataURL looks like "data:audio/webm;base64,......."
        const base64Data = result.split(',')[1];

        try {
          const response = await ai.models.generateContent({
            model: model,
            contents: [
              {
                role: 'user',
                parts: [
                  { text: 'Пожалуйста, транскрибируй эту аудиозапись и примени все инструкции по корректуре, указанные в системном промпте.' },
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: mimeType
                    }
                  }
                ]
              }
            ],
            config: {
              systemInstruction: systemPrompt,
            }
          });

          if (response.text) {
            setTranscript(response.text);
          } else {
            setErrorMsg("Модель не вернула текст.");
          }
        } catch (apiError: any) {
          console.error("API Error:", apiError);
          setErrorMsg(apiError.message || "Произошла ошибка при обращении к API Gemini.");
        } finally {
          setProcessing(false);
        }
      };
    } catch (e: any) {
      console.error("File processing error:", e);
      setErrorMsg("Ошибка при обработке файла локально.");
      setProcessing(false);
    }
  };

  const retryLast = () => {
    // If we wanted to keep the last blob, we could store it. For a simple app, we can just clear UI for now.
    setTranscript('');
    setErrorMsg('');
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center pb-20">
      <div className="w-full max-w-3xl bg-white shadow-xl flex flex-col min-h-screen sm:min-h-0 sm:my-8 sm:rounded-2xl border border-gray-100 overflow-hidden">
        
        {/* Header */}
        <header className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Voice Fixer
            </h1>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">Настройки</span>
            {showSettings ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
          </button>
        </header>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-slate-50 p-6 border-b border-gray-200">
            <div className="space-y-6">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Модель Gemini</label>
                <select 
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full sm:w-1/2 p-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  disabled={recording || processing}
                >
                  {AVAILABLE_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Системный Промпт</label>
                  <button 
                    onClick={() => setSystemPrompt(DEFAULT_PROMPT)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    disabled={recording || processing}
                  >
                    Сбросить по умолчанию
                  </button>
                </div>
                <textarea 
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full h-48 p-3 bg-white border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none resize-y"
                  disabled={recording || processing}
                  placeholder="Введите инструкции для нейросети..."
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          
          {/* Main Recording Action */}
          <div className="flex flex-col items-center justify-center py-10">
            {!recording && !processing && (
              <button
                onClick={startRecording}
                className="group relative flex items-center justify-center w-24 h-24 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                <Mic className="w-10 h-10 group-hover:animate-pulse" />
                <div className="absolute -bottom-8 whitespace-nowrap text-sm font-medium text-gray-600">Начать запись</div>
              </button>
            )}

            {recording && (
              <div className="flex flex-col items-center">
                <div className="relative flex items-center justify-center w-24 h-24 mb-6">
                  {/* Pulse effect */}
                  <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-30"></div>
                  
                  <button
                    onClick={stopRecording}
                    className="relative z-10 flex items-center justify-center w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all"
                  >
                    <Square className="w-8 h-8 fill-current" />
                  </button>
                </div>
                <div className="text-3xl font-mono text-red-500 font-semibold tabular-nums tracking-wider">
                  {formatTime(recordingTime)}
                </div>
                <div className="text-sm font-medium text-gray-500 mt-2">Идет запись... Нажмите квадрат, чтобы остановить</div>
              </div>
            )}

            {processing && (
              <div className="flex flex-col items-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                </div>
                <div className="text-lg font-medium text-gray-900">Анализ аудио...</div>
                <div className="text-sm text-gray-500 mt-2 text-center max-w-sm">
                  Gemini преобразует речь в текст и применяет корректуру. Это может занять некоторое время.
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
              <div className="flex-1 text-sm font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Transcript Output */}
          {transcript && !processing && (
            <div className="mt-6 flex flex-col flex-1 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Готовый Текст</h3>
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? <span className="text-green-600">Скопировано</span> : <span>В буфер</span>}
                </button>
              </div>
              <textarea 
                className="w-full flex-1 min-h-[300px] p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-base leading-relaxed focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none outline-none transition-all"
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
              />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
