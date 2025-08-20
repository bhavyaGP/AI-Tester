jest.mock('dotenv');
jest.mock('@google/generative-ai');
jest.mock('../models/LLMQuery.model');
jest.mock('../models/Level.model');
jest.mock('axios');

const {giveHint, getHint, solveTask, askLLM, giveHintForLevel, getExplanationForLevel} = require('./ai');

const {GoogleGenerativeAI} = require('@google/generative-ai');
const LLMQuery = require('../models/LLMQuery.model');
const Level = require('../models/Level.model');
const axios = require('axios');


describe('giveHint', () => {
  it('should return a hint from the AI', async () => {
    const req = {body: {taskId: 1, playerInput: 'test input'}};
    const res = {json: jest.fn()};
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: () => ({generateContent: () => ({response: Promise.resolve({text: 'test hint'})})})
    }));
    await giveHint(req, res);
    expect(res.json).toHaveBeenCalledWith({status: 'success', hint: 'test hint'});
  });
  it('should return a fallback hint if there is an error', async () => {
    const req = {body: {taskId: 1, playerInput: 'test input'}};
    const res = {json: jest.fn()};
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: () => ({generateContent: () => Promise.reject(new Error('RATE_LIMIT'))})
    }));
    await giveHint(req, res);
    expect(res.json).toHaveBeenCalledWith({status: 'success', hint: 'Check the connections in your circuit. Make sure the positive and negative terminals are connected correctly.'});
  });
});

describe('getHint', () => {
  it('should return a hint from the Gemini API', async () => {
    const req = {body: {task: 'test task'}};
    const res = {json: jest.fn()};
    axios.post.mockResolvedValue({data: {candidates: [{content: {parts: [{text: 'test hint'}]}}]}});
    await getHint(req, res);
    expect(res.json).toHaveBeenCalledWith({hint: 'test hint'});
  });
  it('should return an error if the Gemini API call fails', async () => {
    const req = {body: {task: 'test task'}};
    const res = {status: jest.fn(), json: jest.fn()};
    axios.post.mockRejectedValue(new Error('API error'));
    await getHint(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({error: 'LLM hint failed'});
  });
});

describe('solveTask', () => {
  it('should return a suggestion from the AI', async () => {
    const req = {body: {taskId: 1, problem: 'test problem', playerInput: 'test input'}};
    const res = {json: jest.fn()};
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: () => ({generateContent: () => ({response: Promise.resolve({text: 'test suggestion'})})})
    }));
    await solveTask(req, res);
    expect(res.json).toHaveBeenCalledWith({status: 'success', suggestion: 'test suggestion'});
  });
  it('should return a fallback suggestion if there is an error', async () => {
    const req = {body: {taskId: 1, problem: 'test problem', playerInput: 'test input'}};
    const res = {json: jest.fn()};
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: () => ({generateContent: () => Promise.reject(new Error('RATE_LIMIT'))})
    }));
    await solveTask(req, res);
    expect(res.json).toHaveBeenCalledWith({status: 'success', suggestion: 'Try checking your circuit connections and make sure all components are properly connected.'});
  });
});

describe('askLLM', () => {
  it('should return a response from the AI and save it to the database', async () => {
    const req = {body: {query: 'test query'}, user: {_id: 1}};
    const res = {json: jest.fn()};
    LLMQuery.create.mockResolvedValue({});
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: () => ({generateContent: () => ({response: Promise.resolve({text: 'test response'})})})
    }));
    await askLLM(req, res);
    expect(res.json).toHaveBeenCalledWith({response: 'test response'});
    expect(LLMQuery.create).toHaveBeenCalledWith({userId: 1, type: 'ask', query: 'test query', response: 'test response'});
  });
  it('should return a fallback response if there is an error', async () => {
    const req = {body: {query: 'test query'}, user: {_id: 1}};
    const res = {json: jest.fn()};
    LLMQuery.create.mockRejectedValue(new Error('DB error'));
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: () => ({generateContent: () => Promise.reject(new Error('RATE_LIMIT'))})
    }));
    await askLLM(req, res);
    expect(res.json).toHaveBeenCalledWith({response: 'Electric circuits work by allowing electric current to flow through a closed loop. The current is pushed by a power source like a battery and flows through wires to power devices like light bulbs.'});
  });
});

describe('giveHintForLevel', () => {
  it('should return a hint for a specific level', async () => {
    const req = {params: {levelId: 1}, body: {playerInput: 'test input'}, user: {_id: 1}};
    const res = {json: jest.fn()};
    Level.findOne.mockResolvedValue({levelId: 1, question: 'test question'});
    LLMQuery.create.mockResolvedValue({});
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: () => ({generateContent: () => ({response: Promise.resolve({text: 'test hint'})})})
    }));
    await giveHintForLevel(req, res);
    expect(res.json).toHaveBeenCalledWith({status: 'success', hint: 'test hint'});
  });
  it('should return a fallback hint if the level is not found', async () => {
    const req = {params: {levelId: 1}, body: {playerInput: 'test input'}, user: {_id: 1}};
    const res = {json: jest.fn(), status: jest.fn()};
    Level.findOne.mockResolvedValue(null);
    await giveHintForLevel(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({error: 'Level not found'});
  });
  it('should return a fallback hint if there is an error', async () => {
    const req = {params: {levelId: 1}, body: {playerInput: 'test input'}, user: {_id: 1}};
    const res = {json: jest.fn()};
    Level.findOne.mockResolvedValue({levelId: 1, question: 'test question'});
    LLMQuery.create.mockRejectedValue(new Error('DB error'));
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: () => ({generateContent: () => Promise.reject(new Error('RATE_LIMIT'))})
    }));
    await giveHintForLevel(req, res);
    expect(res.json).toHaveBeenCalledWith({status: 'success', hint: 'Check what provides energy for electricity to flow in the circuit.'});
  });
});

describe('getExplanationForLevel', () => {
  it('should return an explanation for a specific level', async () => {
    const req = {params: {levelId: 1}, user: {_id: 1}};
    const res = {json: jest.fn()};
    Level.findOne.mockResolvedValue({levelId: 1, question: 'test question', correctAnswer: 'test answer'});
    LLMQuery.create.mockResolvedValue({});
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: () => ({generateContent: () => ({response: Promise.resolve({text: 'test explanation'})})})
    }));
    await getExplanationForLevel(req, res);
    expect(res.json).toHaveBeenCalledWith({explanation: 'test explanation'});
  });
  it('should return a fallback explanation if the level is not found', async () => {
    const req = {params: {levelId: 1}, user: {_id: 1}};
    const res = {json: jest.fn(), status: jest.fn()};
    Level.findOne.mockResolvedValue(null);
    await getExplanationForLevel(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({error: 'Level not found'});
  });
  it('should return a fallback explanation if there is an error', async () => {
    const req = {params: {levelId: 1}, user: {_id: 1}};
    const res = {json: jest.fn()};
    Level.findOne.mockResolvedValue({levelId: 1, question: 'test question', correctAnswer: 'test answer'});
    LLMQuery.create.mockRejectedValue(new Error('DB error'));
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: () => ({generateContent: () => Promise.reject(new Error('RATE_LIMIT'))})
    }));
    await getExplanationForLevel(req, res);
    expect(res.json).toHaveBeenCalledWith({explanation: 'A battery provides the electrical energy needed to power a circuit. Without a battery or power source, electricity cannot flow through the wires.'});
  });
});

