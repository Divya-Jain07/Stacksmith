const { GoogleGenAI } = require('@google/genai');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

// Only instantiate if API key is present
let ai = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

const MODEL_NAME = process.env.EMBEDDING_MODEL || 'gemini-embedding-2';
const EMBEDDING_DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION, 10) || 768;

// Daily query budget configuration
const DAILY_BUDGET = parseInt(process.env.DAILY_AI_BUDGET, 10) || 500;
let dailyUsage = { date: new Date().toISOString().slice(0, 10), count: 0 };

// Small in-memory LRU-like cache for repeated queries (key -> vector)
const queryCache = new Map();
const MAX_CACHE_SIZE = 200;

function checkAndIncrementBudget() {
  const today = new Date().toISOString().slice(0, 10);
  if (dailyUsage.date !== today) {
    dailyUsage = { date: today, count: 0 };
  }
  if (dailyUsage.count >= DAILY_BUDGET) {
    throw new ApiError(429, 'Daily smart search budget exceeded. Please use standard keyword search.');
  }
  dailyUsage.count += 1;
}

/**
 * Creates a unique hash for a string incorporating model name and dimension.
 * @param {string} text 
 * @param {string} model 
 * @param {number} dimension 
 * @returns {string} SHA-256 hash
 */
function createHash(text, model = MODEL_NAME, dimension = EMBEDDING_DIMENSION) {
  return crypto.createHash('sha256').update(`${model}:${dimension}:${text}`).digest('hex');
}

/**
 * Normalises vector to unit length
 */
function normalizeVector(vec) {
  if (!vec || vec.length === 0) return vec;
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  return vec.map(v => v / norm);
}

/**
 * Combines book fields into a single rich text representation for embedding.
 * @param {Object} book Mongoose Book document
 * @returns {string} The text to embed
 */
function generateBookTextForEmbedding(book) {
  const parts = [
    `Title: ${book.name}`,
    `Author: ${book.author}`,
    `Genre: ${book.genre}`
  ];
  if (book.description) {
    parts.push(`Description: ${book.description}`);
  }
  return parts.join('\n');
}

/**
 * Generates an embedding for the given text with dimension setting.
 * Uses query cache and daily budget for queries.
 * @param {string} text 
 * @param {boolean} isQuery 
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text, isQuery = false) {
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }

  if (isQuery) {
    const cached = queryCache.get(text);
    if (cached) return cached;
    checkAndIncrementBudget();
  }
  
  const response = await ai.models.embedContent({
    model: MODEL_NAME,
    contents: text,
    config: {
      outputDimensionality: EMBEDDING_DIMENSION
    }
  });
  
  const rawValues = response.embeddings[0].values;
  const normalized = normalizeVector(rawValues);

  if (isQuery) {
    if (queryCache.size >= MAX_CACHE_SIZE) {
      const firstKey = queryCache.keys().next().value;
      queryCache.delete(firstKey);
    }
    queryCache.set(text, normalized);
  }

  return normalized;
}

/**
 * Updates a book's embedding if its content has changed (based on hash).
 * @param {Object} book Mongoose Book document
 * @returns {Promise<boolean>} True if updated, false if no update was needed
 */
async function updateBookEmbeddingIfNeeded(book) {
  const textToEmbed = generateBookTextForEmbedding(book);
  const currentHash = createHash(textToEmbed, MODEL_NAME, EMBEDDING_DIMENSION);

  // Skip if already embedded with the same content, model and dimension
  if (book.embedding && book.embedding.length > 0 && 
      book.embeddingHash === currentHash && 
      book.embeddingModel === MODEL_NAME) {
    return false;
  }

  try {
    const vector = await generateEmbedding(textToEmbed, false);
    book.embedding = vector;
    book.embeddingHash = currentHash;
    book.embeddingModel = MODEL_NAME;
    return true;
  } catch (error) {
    console.error(`Failed to generate embedding for book ${book._id}:`, error.message);
    throw error;
  }
}

/**
 * Calculates cosine similarity between two vectors.
 * Since vectors are normalised, dot product equals cosine similarity.
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number} Similarity score (-1 to 1)
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct;
}

// In-memory per-user rate limiter for search & similar books
const userRateLimits = new Map(); // userId -> [timestamps]

function checkUserRateLimit(userId, maxPerMinute = 15) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const timestamps = (userRateLimits.get(userId) || []).filter(t => now - t < windowMs);
  if (timestamps.length >= maxPerMinute) {
    throw new ApiError(429, 'Rate limit exceeded. Maximum 15 requests per minute.');
  }
  timestamps.push(now);
  userRateLimits.set(userId, timestamps);
}

module.exports = {
  MODEL_NAME,
  EMBEDDING_DIMENSION,
  createHash,
  generateBookTextForEmbedding,
  generateEmbedding,
  updateBookEmbeddingIfNeeded,
  cosineSimilarity,
  checkUserRateLimit,
  isConfigured: () => ai !== null,
  _resetDailyBudgetForTest: (val) => { dailyUsage = { date: new Date().toISOString().slice(0, 10), count: val }; },
  _clearUserRateLimitsForTest: () => { userRateLimits.clear(); }
};
