import { requestUrl } from 'obsidian';

export async function processAudioWithGemini(apiKey: string, systemPrompt: string, modelName: string, base64Audio: string): Promise<string> {
    if (!apiKey) {
        throw new Error("API key is missing");
    }

    const model = modelName || "gemini-2.5-flash";
    const url = \`https://generativelanguage.googleapis.com/v1beta/models/\${model}:generateContent?key=\${apiKey}\`;

    const payload = {
        system_instruction: {
            parts: [{ text: systemPrompt }]
        },
        contents: [
            {
                parts: [
                    {
                        inline_data: {
                            mime_type: "audio/webm",
                            data: base64Audio
                        }
                    },
                    {
                        text: "Please transcribe and correct this audio according to the system instructions."
                    }
                ]
            }
        ]
    };

    try {
        const response = await requestUrl({
            url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (response.status !== 200) {
            throw new Error(\`API Error: \${response.text}\`);
        }

        const data = response.json;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        return text || "No transcription generated.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}
