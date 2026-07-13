import { requestUrl } from 'obsidian';
import { VoiceFixerSettings } from './settings';

export async function processAudioWithGemini(settings: VoiceFixerSettings, base64Audio: string): Promise<string> {
    const keys = settings.apiKeys.split(/[\n,]+/).map(k => k.trim()).filter(k => k.length > 0);
    if (keys.length === 0) {
        throw new Error("API key is missing. Please set it in the plugin settings.");
    }

    let models = [settings.model];
    if (settings.autoFallback) {
        const DEFAULT_MODELS = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];
        models = [settings.model, ...DEFAULT_MODELS.filter(m => m !== settings.model)];
    }

    const systemPrompt = settings.promptMode === 'concise' ? settings.sysPrompt_concise : settings.sysPrompt_default;

    let lastError: any = null;

    for (const model of models) {
        for (const apiKey of keys) {
            try {
                if (settings.debugMode) console.log(`[Voice Fixer] Trying model ${model} with key starting with ${apiKey.substring(0, 5)}...`);
                
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const payload = {
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: [{
                        parts: [
                            { inline_data: { mime_type: "audio/webm", data: base64Audio } },
                            { text: "Please transcribe and correct this audio according to the system instructions." }
                        ]
                    }]
                };

                // Create a promise that rejects after the timeout
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => {
                        reject(new Error(`Request timed out after ${settings.maxWaitTime} minutes.`));
                    }, settings.maxWaitTime * 60 * 1000);
                });

                const requestPromise = requestUrl({
                    url,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const response = await Promise.race([requestPromise, timeoutPromise]) as any;

                if (response.status !== 200) {
                    const errText = response.text || JSON.stringify(response.json);
                    if (response.status === 429 && settings.autoFallback) {
                        if (settings.debugMode) console.warn(`[Voice Fixer] Rate limit (429) on ${model}`);
                        lastError = new Error(`Rate limit on ${model}`);
                        continue; // try next key
                    }
                    throw new Error(`API Error ${response.status}: ${errText}`);
                }

                const data = response.json;
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    if (settings.debugMode) console.log(`[Voice Fixer] Success with model ${model}`);
                    return text;
                }
                
                throw new Error("No transcription generated in the response.");
            } catch (err: any) {
                if (settings.debugMode) console.error(`[Voice Fixer] Error with model ${model} / key ${apiKey.substring(0, 5)}:`, err);
                lastError = err;
                
                // If auto fallback is disabled, throw immediately
                if (!settings.autoFallback) {
                    throw err;
                }
            }
        }
    }

    throw new Error(`All attempts failed. Last error: ${lastError?.message || 'Unknown error'}`);
}
