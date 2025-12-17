import { GoogleGenAI, Type, FunctionDeclaration, Schema, LiveServerMessage, Modality } from "@google/genai";
import { GoldenResult, GroundingSource } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System instruction for the Golden Prompt Generator
const GOLDEN_CONVERTER_INSTRUCTION = `
You are "Suvarna", an elite prompt engineer and linguistic expert specializing in Indian languages (Telugu, Hindi) and English. 
Your goal is to take user input in Telugu, Hindi, or English (including mixed-script "Tanglish"/"Hinglish") and transform it into a "Golden Prompt".

A "Golden Prompt" is a highly detailed, professional, artistic, or technically precise English prompt suitable for high-end AI image generation, creative writing, or business communication.

Steps:
1. Identify the intent and literal meaning of the input (whether Telugu, Hindi, or English).
2. If the user refers to current events, use your grounding tools to verify details.
3. Craft a "Golden Prompt" that expands on the user's core idea with sensory details, professional tone, or artistic styles.
4. Provide the direct English translation as well (if the input was not already English).
`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    originalTranslation: { type: Type.STRING, description: "Direct translation of the user's input to English." },
    goldenPrompt: { type: Type.STRING, description: "The enhanced, high-quality prompt." },
    category: { type: Type.STRING, description: "Category of the request (e.g., Image Generation, Professional Email, Creative Writing)." },
    reasoning: { type: Type.STRING, description: "Brief explanation of how you enhanced the prompt." }
  },
  required: ["originalTranslation", "goldenPrompt", "category", "reasoning"]
};

/**
 * Uses Gemini 3 Pro (Thinking) to convert Tanglish to a Golden Prompt.
 * Incorporates Thinking Budget for complex reasoning.
 */
export const generateGoldenPrompt = async (
  input: string, 
  useGrounding: boolean
): Promise<{ data: GoldenResult | null; sources: GroundingSource[]; error?: string }> => {
  try {
    const tools = useGrounding ? [{ googleSearch: {} }] : [];
    
    // We use gemini-3-pro-preview for deep thinking on prompt crafting
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: input,
      config: {
        systemInstruction: GOLDEN_CONVERTER_INSTRUCTION,
        tools: tools,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        thinkingConfig: {
            thinkingBudget: 32768, // Max thinking for Pro model
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response from Gemini");

    let parsedResult: GoldenResult;
    try {
        parsedResult = JSON.parse(resultText);
    } catch (e) {
        // Fallback if raw JSON isn't perfect (rare with schema)
        console.error("JSON Parse error", e);
        throw new Error("Failed to parse Golden Prompt.");
    }

    // Extract grounding sources if any
    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ uri: chunk.web.uri, title: chunk.web.title });
        }
      });
    }

    return { data: parsedResult, sources };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return { data: null, sources: [], error: error.message || "An unexpected error occurred." };
  }
};

/**
 * Uses Gemini 2.5 Flash Lite for ultra-fast initial understanding/translation preview.
 * This is for low-latency feedback.
 */
export const quickPreview = async (input: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite-latest", // Use the lite alias
            contents: `Translate this text (Telugu, Hindi, or English) to English concisely: "${input}"`,
            config: {
                maxOutputTokens: 50,
                temperature: 0.3
            }
        });
        return response.text || "";
    } catch (e) {
        return ""; // Fail silently for preview
    }
};

/**
 * Connects to Gemini Live API for real-time transcription.
 */
export const connectToLiveSession = async (
    callbacks: {
        onopen?: () => void;
        onmessage?: (message: LiveServerMessage) => void;
        onerror?: (error: any) => void;
        onclose?: () => void;
    }
) => {
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
            responseModalities: [Modality.AUDIO], 
            inputAudioTranscription: {}, // Corrected: Empty object implies default transcription settings
            systemInstruction: "You are a silent transcriber. Do not speak. Only transcribe the user's input.",
        },
        callbacks
    });
};

/**
 * Chat bot functionality using Gemini 3 Pro for general assistance.
 */
export const sendChatMessage = async (
    history: { role: string; parts: { text: string }[] }[],
    message: string
) => {
    try {
        const chat = ai.chats.create({
            model: "gemini-3-pro-preview",
            history: history,
            config: {
                systemInstruction: "You are a helpful AI assistant integrated into the 'Suvarna Prompt' app. You help users understand prompt engineering and translation for Telugu, Hindi, and English."
            }
        });

        const result = await chat.sendMessage({ message });
        return result.text;
    } catch (error: any) {
        throw new Error(error.message);
    }
};