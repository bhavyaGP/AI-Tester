const { GoogleGenerativeAI } = require('@google/generative-ai');

// Ensure environment variables are loaded
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
const LLMQuery = require('../models/LLMQuery.model');
const Level = require('../models/Level.model');

// Rate limiting helper
let requestCount = 0;
let lastRequestTime = Date.now();

async function makeRateLimitedRequest(prompt) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  // Reset counter if more than 1 minute has passed
  if (timeSinceLastRequest > 60000) {
    requestCount = 0;
  }
  
  // If we're approaching the limit, wait
  if (requestCount >= 12) {
    const waitTime = 60000 - timeSinceLastRequest + 1000; // Wait a bit extra
    console.log(`Rate limit approaching, waiting ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    requestCount = 0;
  }
  
  requestCount++;
  lastRequestTime = Date.now();
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    if (error.status === 429) {
      console.log('Rate limit hit, using fallback response');
      throw new Error('RATE_LIMIT');
    }
    throw error;
  }
}


const axios = require("axios");

exports.giveHint = async (req, res) => {
  try {
    const { taskId, playerInput } = req.body;

    console.log(`AI Hint requested for: ${playerInput}`);

    const prompt = `
You are Raju Mechanic, a friendly but smart workshop assistant helping an 8th grade student fix physics-related problems.
The student says: "${playerInput}"
Give a clear, helpful hint using simple language that an 8th grader can understand.

Respond in plain text with just the hint, no JSON formatting.
    `;

    const text = await makeRateLimitedRequest(prompt);
    res.json({ status: 'success', hint: text });
  } catch (err) {
    console.error('AI hint error:', err.message);
    // Provide fallback response
    res.json({ 
      status: 'success', 
      hint: 'Check the connections in your circuit. Make sure the positive and negative terminals are connected correctly.' 
    });
  }
};


exports.getHint = async (req, res) => {
  const { task } = req.body;
  const prompt = `Give a small helpful hint to solve this 8th-grade physics task: ${task}`;

  try {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      { params: { key: process.env.GEMINI_API_KEY } }
    );

    const hint = response.data.candidates[0].content.parts[0].text;
    res.json({ hint });
  } catch (error) {
    res.status(500).json({ error: "LLM hint failed" });
  }
};


exports.solveTask = async (req, res) => {
  try {
    const { taskId, problem, playerInput } = req.body;

    console.log(`AI Solve requested for problem: ${problem}`);

    const prompt = `
You are a physics assistant helping an 8th grade student. The student is solving this problem:
"${problem}"

The student says: "${playerInput}"

Suggest what the student should check or try next using simple 8th grade physics concepts.
Give a clear, practical suggestion in plain text.
    `;

    const text = await makeRateLimitedRequest(prompt);
    res.json({ status: 'success', suggestion: text });
  } catch (err) {
    console.error('AI solve task error:', err.message);
    // Provide fallback response
    res.json({ 
      status: 'success', 
      suggestion: 'Try checking your circuit connections and make sure all components are properly connected.' 
    });
  }
};

exports.askLLM = async (req, res) => {
  try {
    const { query } = req.body;
    const user = req.user;
    
    console.log(`LLM Ask query: ${query}`);
    
    const prompt = `You are Raju, a helpful learning assistant for 8th grade physics students. Answer this question in simple terms: ${query}`;
    
    const text = await makeRateLimitedRequest(prompt);
    
    await LLMQuery.create({ 
      userId: user._id, 
      type: 'ask', 
      query, 
      response: text 
    });
    
    res.json({ response: text });
  } catch (err) {
    console.error('LLM ask error:', err.message);
    // Provide fallback response
    const fallbackResponse = 'Electric circuits work by allowing electric current to flow through a closed loop. The current is pushed by a power source like a battery and flows through wires to power devices like light bulbs.';
    
    try {
      await LLMQuery.create({ 
        userId: req.user._id, 
        type: 'ask', 
        query: req.body.query, 
        response: fallbackResponse 
      });
    } catch (dbErr) {
      console.error('Database error:', dbErr);
    }
    
    res.json({ response: fallbackResponse });
  }
};

exports.giveHintForLevel = async (req, res) => {
  try {
    const { levelId } = req.params;
    const { playerInput } = req.body;
    const user = req.user;

    // Fetch level data
    const level = await Level.findOne({ levelId: Number(levelId) });
    if (!level) {
      console.log(`Level ${levelId} not found`);
      return res.status(404).json({ error: 'Level not found' });
    }

    const prompt = `
You are Raju Mechanic, a friendly but smart workshop assistant helping an 8th grade student fix physics-related problems.
The student is working on this problem: "${level.question}"
The student says: "${playerInput}"
Give a clear, helpful hint using simple language that an 8th grader can understand, relevant to this problem.

Respond in plain text with just the hint, no JSON formatting.
    `;

    const text = await makeRateLimitedRequest(prompt);

    await LLMQuery.create({
      userId: user._id,
      levelId: Number(levelId),
      type: 'giveHintForLevel',
      query: playerInput,
      response: text
    });

    res.json({ status: 'success', hint: text });
  } catch (err) {
    console.error('AI contextual hint error:', err.message);

    // Provide fallback hints based on level
    const fallbackHints = {
      1: 'Check what provides energy for electricity to flow in the circuit.',
      2: 'Think about how light bounces off a mirror.',
      3: 'Consider what force pulls objects toward the ground.'
    };

    const fallbackHint = fallbackHints[req.params.levelId] || 'Try to recall the basic physics concepts related to your question.';

    try {
      const level = await Level.findOne({ levelId: Number(req.params.levelId) });
      if (level) {
        await LLMQuery.create({
          userId: req.user._id,
          levelId: Number(req.params.levelId),
          type: 'giveHintForLevel',
          query: req.body.playerInput,
          response: fallbackHint
        });
      }
    } catch (dbErr) {
      console.error('Database error:', dbErr);
    }

    res.json({ status: 'success', hint: fallbackHint });
  }
};
exports.getExplanationForLevel = async (req, res) => {
  try {
    const { levelId } = req.params;
    const user = req.user;
    
    console.log(`Getting explanation for level ${levelId}`);
    
    const level = await Level.findOne({ levelId: Number(levelId) });
    if (!level) {
      console.log(`Level ${levelId} not found for explanation`);
      return res.status(404).json({ error: 'Level not found' });
    }
    
    const prompt = `Explain the solution to this 8th grade physics problem in simple terms: ${level.question}. The answer is: ${level.correctAnswer}. Explain why this is correct.`;
    
    const text = await makeRateLimitedRequest(prompt);
    
    await LLMQuery.create({ 
      userId: user._id, 
      levelId: Number(levelId), 
      type: 'explanation', 
      query: level.question, 
      response: text 
    });
    
    res.json({ explanation: text });
  } catch (err) {
    console.error('LLM explanation error:', err.message);
    
    // Provide fallback explanations
    const fallbackExplanations = {
      1: 'A battery provides the electrical energy needed to power a circuit. Without a battery or power source, electricity cannot flow through the wires.',
      2: 'When light hits a mirror, it reflects back at the same angle it came in. This is called the law of reflection.',
      3: 'Gravity is the force that attracts objects toward the center of the Earth. It keeps us on the ground and makes objects fall down.'
    };
    
    const fallbackExplanation = fallbackExplanations[req.params.levelId] || 'This is a basic physics concept that you can learn more about in your textbook.';
    
    try {
      const level = await Level.findOne({ levelId: Number(req.params.levelId) });
      if (level) {
        await LLMQuery.create({ 
          userId: req.user._id, 
          levelId: Number(req.params.levelId), 
          type: 'explanation', 
          query: level.question, 
          response: fallbackExplanation 
        });
      }
    } catch (dbErr) {
      console.error('Database error:', dbErr);
    }
    
    res.json({ explanation: fallbackExplanation });
  }
};
