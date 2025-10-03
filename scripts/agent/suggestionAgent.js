import fs from "fs";
import suggestionPromptTemplate from "../prompts/suggestionPrompt.js";
import { ai, DEFAULT_MODEL } from "../config/aiconfig.js";

// LLM-powered suggestion agent: returns array of short suggestion strings
export async function suggestionAgent(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return [];
  }

  const prompt = suggestionPromptTemplate(content, filePath);

  let response;
  let retryCount = 0;
  const maxRetries = 3;
  const timeoutMs = 30000; // 30 seconds timeout for suggestions (faster than main generation)
  
  while (retryCount < maxRetries) {
    try {
      const apiCallPromise = ai.models.generateContent({
        model: DEFAULT_MODEL,
        config: { temperature: 0.2 },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API request timed out')), timeoutMs)
      );
      
      // Race between API call and timeout
      response = await Promise.race([apiCallPromise, timeoutPromise]);
      break; // Success, exit retry loop
      
    } catch (err) {
      retryCount++;
      const isTimeout = err?.message?.includes('timeout') || err?.message?.includes('timed out');
      
      if (retryCount >= maxRetries) {
        console.warn(`⚠️ suggestionAgent failed after ${maxRetries} attempts:`, err?.message || err);
        return [];
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.min(500 * Math.pow(2, retryCount - 1), 5000);
      console.log(`⚠️ ${isTimeout ? 'Timeout' : 'Error'} on suggestion attempt ${retryCount}/${maxRetries}. Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  const raw = (response && ((response.message && response.message.content) || response.text)) || "";

  try {
    const parsed = JSON.parse(raw.trim());
    if (Array.isArray(parsed)) {
      return parsed.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim());
    }
  } catch {
    // If the model didn't return strict JSON, try to salvage a JSON array substring
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const arr = JSON.parse(match[0]);
        if (Array.isArray(arr)) {
          return arr.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim());
        }
      } catch {}
    }
  }

  return [];
}


