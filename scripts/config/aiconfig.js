require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const DEFAULT_MODEL = 'gemini-2.5-flash';

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API,
});
module.exports = {
    ai,
    DEFAULT_MODEL,
};
