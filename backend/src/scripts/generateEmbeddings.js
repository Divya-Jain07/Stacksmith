require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('../models/Book');
const { updateBookEmbeddingIfNeeded, isConfigured } = require('../services/embedding.service');

async function run() {
  if (!isConfigured()) {
    console.error('ERROR: GEMINI_API_KEY is not set in environment variables.');
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGO_URI is not set in environment variables.');
    process.exit(1);
  }

  // Fix Windows DNS SRV lookup issues for MongoDB Atlas
  const dns = require('dns');
  try {
    dns.setServers(['1.1.1.1', '8.8.8.8']);
  } catch (dnsError) {
    console.warn('Warning: Failed to set custom DNS servers:', dnsError.message);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected.');

  console.log('Fetching books...');
  const books = await Book.find({}).crossTenant('backfill');
  console.log(`Found ${books.length} books.`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    try {
      const didUpdate = await updateBookEmbeddingIfNeeded(book);
      if (didUpdate) {
        await book.save();
        updated++;
        console.log(`[${i + 1}/${books.length}] Updated embedding for: ${book.name}`);
      } else {
        skipped++;
        console.log(`[${i + 1}/${books.length}] Skipped (already up to date): ${book.name}`);
      }
    } catch (err) {
      errors++;
      console.error(`[${i + 1}/${books.length}] Error on ${book.name}:`, err.message);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Total Books: ${books.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);

  await mongoose.disconnect();
  process.exit(0);
}

run();
