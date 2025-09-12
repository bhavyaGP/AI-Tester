import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const DEFAULT_MODEL = 'gemini-2.5-flash';

export const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API,
});

export { DEFAULT_MODEL };
