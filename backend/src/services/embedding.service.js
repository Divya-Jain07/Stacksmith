const { GoogleGenAI } = require('@google/genai');
const crypto = require('crypto');

// Only instantiate if API key is present
let ai = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

const MODEL_NAME = 'gemini-embedding-2';

/**
 * Creates a unique hash for a string to detect if it has changed.
 * @param {string} text 
 * @returns {string} SHA-256 hash
 */
function createHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Combines book fields into a single rich text representation for embedding.
 * @param {Object} book Mongoose Book document
 * @returns {string} The text to embed
 */
function generateBookTextForEmbedding(book) {
  // Combine title, author, genre, and description
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
 * Generates an embedding for the given text.
 * @param {string} text 
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text) {
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  
  const response = await ai.models.embedContent({
    model: MODEL_NAME,
    contents: text,
  });
  
  return response.embeddings[0].values;
}

/**
 * Updates a book's embedding if its content has changed (based on hash).
 * @param {Object} book Mongoose Book document
 * @returns {Promise<boolean>} True if updated, false if no update was needed
 */
async function updateBookEmbeddingIfNeeded(book) {
  const textToEmbed = generateBookTextForEmbedding(book);
  const currentHash = createHash(textToEmbed);

  // Skip if already embedded with the same content and model
  if (book.embedding && book.embedding.length > 0 && 
      book.embeddingHash === currentHash && 
      book.embeddingModel === MODEL_NAME) {
    return false;
  }

  try {
    const vector = await generateEmbedding(textToEmbed);
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
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number} Similarity score (-1 to 1)
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = {
  generateBookTextForEmbedding,
  generateEmbedding,
  updateBookEmbeddingIfNeeded,
  cosineSimilarity,
  isConfigured: () => ai !== null
};
