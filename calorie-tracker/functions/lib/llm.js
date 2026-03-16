/**
 * Generic LLM layer: one entry point to get a text/JSON response.
 * Swap provider via env LLM_PROVIDER (default: 'gemini') or options.provider.
 */

const functions = require('firebase-functions');

const DEFAULT_PROVIDER = process.env.LLM_PROVIDER || 'gemini';

/**
 * Call the configured LLM with a prompt; returns raw response text.
 * @param {string} prompt - Full prompt (system + user content).
 * @param {object} options - { provider?, jsonMode?, apiKey?, model? }
 * @returns {Promise<string>}
 */
async function getLLMResponse(prompt, options = {}) {
  const provider = (options.provider || process.env.LLM_PROVIDER || DEFAULT_PROVIDER).toLowerCase();
  const jsonMode = options.jsonMode !== false;

  if (provider === 'gemini') {
    return callGemini(prompt, { jsonMode, apiKey: options.apiKey, model: options.model, image: options.image });
  }
  // Add more providers later, e.g.:
  // if (provider === 'ollama') return callOllama(prompt, options);
  throw new Error(`Unsupported LLM provider: ${provider}`);
}

async function callGemini(prompt, options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY || functions.config().gemini?.key;
  if (!apiKey) {
    throw new Error('Gemini API key missing. Set GEMINI_API_KEY or firebase functions:config:set gemini.key');
  }
  // Model: options > env GEMINI_MODEL > Firebase config gemini.model > fallback
  const model = options.model || process.env.GEMINI_MODEL || functions.config().gemini?.model || 'gemini-2.5-flash';

  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const genConfig = options.jsonMode ? { responseMimeType: 'application/json' } : {};
  const genModel = genAI.getGenerativeModel({ model, generationConfig: genConfig });

  let result;
  if (options.image && options.image.data) {
    const parts = [
      { inlineData: { mimeType: options.image.mimeType || 'image/jpeg', data: options.image.data } },
      { text: prompt }
    ];
    result = await genModel.generateContent(parts);
  } else {
    result = await genModel.generateContent(prompt);
  }
  const text = result.response?.text?.();
  if (text == null) {
    throw new Error('Empty or invalid response from Gemini');
  }
  return text;
}

module.exports = { getLLMResponse };
