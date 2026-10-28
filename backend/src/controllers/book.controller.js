const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const Book = require('../models/Book');
const BookCopy = require('../models/BookCopy');
const fs = require('fs');
const csv = require('csv-parser');
const embeddingService = require('../services/embedding.service');

const buildTenantScopeFilter = (req) => {
  const adminId = req.tenantFilter?.adminId;
  return adminId ? { adminId } : {};
};

// Shared helper function to generate copies and update counts
const generateCopiesForBook = async (book, isbn, numberOfCopies, adminId, session = null) => {
  if (!numberOfCopies || numberOfCopies <= 0) return [];

  const opts = session ? { session } : {};
  const existingCount = await BookCopy.countDocuments({ bookId: book._id, adminId }, opts);
  const barcodeOwnerId = adminId ? adminId.toString().slice(-6) : 'GEN';
  const barcodePrefix = `${isbn}-${barcodeOwnerId}`;
  const copiesToInsert = [];

  for (let i = 1; i <= numberOfCopies; i++) {
    const sequenceNum = String(existingCount + i).padStart(3, '0');
    copiesToInsert.push({
      bookId: book._id,
      bookName: book.name,
      barcode: `${barcodePrefix}-${sequenceNum}`,
      adminId: adminId
    });
  }

  const createdCopies = await BookCopy.insertMany(copiesToInsert, opts);

  const totalCopies = await BookCopy.countDocuments({ bookId: book._id, adminId }, opts);
  const availableCopies = await BookCopy.countDocuments({ bookId: book._id, status: 'available', adminId }, opts);

  book.totalCopies = totalCopies;
  book.availableCopies = availableCopies;
  await book.save(opts);

  return createdCopies;
};

const updateBookEmbedding = async (book) => {
  if (!embeddingService.isConfigured()) return null;

  try {
    const updated = await embeddingService.updateBookEmbeddingIfNeeded(book);
    if (updated) await book.save();
    return null;
  } catch (error) {
    return error;
  }
};

// Add Catalog Book Entry (Flow B)
exports.createBook = catchAsync(async (req, res, next) => {
    const { numberOfCopies } = req.body;
    const adminId = req.tenantFilter?.adminId;

    if (!adminId) {
      throw new ApiError(400, 'Please select a library scope before creating a book.');
    }
    
    // Allowed descriptive fields for book creation (ignore client-supplied counters/embeddings/tenantId)
    const allowedFields = ['name', 'author', 'isbn', 'genre', 'language', 'description', 'publisher', 'yearPublished'];
    const bookData = { adminId };
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        bookData[field] = req.body[field];
      }
    }

    if (bookData.isbn) {
      const existingBook = await Book.findOne({ isbn: bookData.isbn, adminId });
      if (existingBook) {
        throw new ApiError(400, 'Book with this ISBN already exists.');
      }
    }

    const { runInTransaction } = require('../utils/transaction');
    const { book, createdCopies } = await runInTransaction(async (session) => {
      const newBook = new Book(bookData);
      await newBook.save({ session });

      let copies = [];
      const count = parseInt(numberOfCopies, 10);
      if (count && count > 0) {
        copies = await generateCopiesForBook(newBook, newBook.isbn, count, adminId, session);
      }

      return { book: newBook, createdCopies: copies };
    });

    // Embedding generation runs in the background non-blocking
    updateBookEmbedding(book).catch((embeddingError) => {
      console.error(`Failed to generate embedding for book ${book._id}:`, embeddingError?.message);
    });

    res.status(201).json({ book, copies: createdCopies });
  });

// Bulk Import Books from CSV (Flow A)


exports.bulkImportBooks = catchAsync(async (req, res, next) => {
  if (!req.file) {
    throw new ApiError(400, 'No CSV file provided.');
  }

  const adminId = req.tenantFilter?.adminId;
  if (!adminId) {
    fs.unlink(req.file.path, () => {});
    throw new ApiError(400, 'Please provide an adminId scope for bulk import.');
  }

  const results = [];
  const errors = [];
  let added = 0;
  let updated = 0;
  let skipped = 0;
  let invalid = 0;
  let embeddingFailed = 0;
  const importedBooksToEmbed = [];

  fs.createReadStream(req.file.path)
    .pipe(csv({
      mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, '').toLowerCase()
    }))
    .on('data', (data) => {
      results.push(data);
    })
    .on('end', async () => {
      let rowNum = 1; // 1 represents headers conceptually, data starts at 2
      for (const row of results) {
        rowNum++;
        const { title, author, isbn, genre, language, publisher, yearpublished, copies, description } = row;
        
        if (!title || !author || !isbn || !genre || !language || !publisher || !yearpublished || !copies || !description?.trim()) {
          errors.push({ row: rowNum, isbn, reason: 'Missing required columns.' });
          skipped++;
          invalid++;
          continue;
        }

        const numCopies = parseInt(copies, 10);
        if (isNaN(numCopies) || numCopies <= 0) {
          errors.push({ row: rowNum, isbn, reason: 'Invalid Copies number.' });
          skipped++;
          invalid++;
          continue;
        }

        const existingBook = await Book.findOne({ isbn, adminId });
        if (existingBook) {
          try {
            await generateCopiesForBook(existingBook, isbn, numCopies, adminId);
            const embeddingError = await updateBookEmbedding(existingBook);
            if (embeddingError) {
              embeddingFailed++;
              errors.push({ row: rowNum, isbn, reason: `Copies added, but embedding generation failed: ${embeddingError.message}` });
            }
            updated++;
          } catch (error) {
            errors.push({ row: rowNum, isbn, reason: `Failed to add copies to existing book: ${error.message}` });
            skipped++;
          }
          continue;
        }

        try {
          const book = new Book({
            name: title.trim(),
            author: author.trim(),
            isbn: isbn.trim(),
            genre: genre.trim(),
            language: language.trim(),
            publisher: publisher.trim(),
            yearPublished: parseInt(yearpublished, 10),
            description: description.trim(),
            adminId
          });
          const savedBook = await book.save();

          await generateCopiesForBook(savedBook, isbn, numCopies, adminId);
          importedBooksToEmbed.push(savedBook);
          added++;
        } catch (error) {
          errors.push({ row: rowNum, isbn, reason: error.message });
          skipped++;
        }
      }

      fs.unlink(req.file.path, () => {}); // Cleanup temp file

      // Background embedding queue with limited concurrency
      if (importedBooksToEmbed.length > 0) {
        setImmediate(async () => {
          for (const b of importedBooksToEmbed) {
            try {
              await updateBookEmbedding(b);
              await new Promise(r => setTimeout(r, 100)); // 100ms throttle between calls
            } catch (e) {
              console.error(`Background CSV embedding failed for ${b._id}:`, e.message);
            }
          }
        });
      }

      res.json({ added, updated, skipped, invalid, embeddingQueued: importedBooksToEmbed.length, totalRows: results.length, errors });
    })
    .on('error', (error) => {
      fs.unlink(req.file.path, () => {});
      res.status(500).json({ error: 'Failed to process CSV file.' });
    });
});

// Get Books Catalog
exports.getBooks = catchAsync(async (req, res, next) => {
  const filter = req.tenantFilter || {};

  // Fetch all books + aggregate copy counts in parallel — only 2 DB round-trips total
  // instead of the old N+1 pattern (1 + 2*N queries for N books).
  const [books, copyAgg] = await Promise.all([
    Book.find(filter).sort({ createdAt: -1 }).lean(),
    BookCopy.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$bookId',
          totalCopies: { $sum: 1 },
          availableCopies: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
          }
        }
      }
    ])
  ]);

  // Build a fast lookup map: bookId (string) → { totalCopies, availableCopies }
  const countMap = {};
  for (const row of copyAgg) {
    countMap[String(row._id)] = { totalCopies: row.totalCopies, availableCopies: row.availableCopies };
  }

  // Merge counts into book objects (fall back to 0 for books with no copies yet)
  const booksWithCounts = books.map((book) => {
    const counts = countMap[String(book._id)] || { totalCopies: 0, availableCopies: 0 };
    return { ...book, ...counts };
  });

  res.json(booksWithCounts);
});

// Get Single Book Metadata
exports.getBookById = catchAsync(async (req, res, next) => {
    const filter = { _id: req.params.id, ...(req.tenantFilter || {}) };
    const book = await Book.findOne(filter);
    if (!book) throw new ApiError(404, 'Book not found.');
    res.json(book);
  });

// Update Book Metadata
exports.updateBook = catchAsync(async (req, res, next) => {
  const filter = { _id: req.params.id, ...(req.tenantFilter || {}) };
  const allowedFields = ['name', 'author', 'isbn', 'genre', 'language', 'description', 'publisher', 'yearPublished'];
  const updateData = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  const book = await Book.findOneAndUpdate(filter, updateData, { new: true, runValidators: true });
  if (!book) throw new ApiError(404, 'Book not found in your library scope.');
  const embeddingError = await updateBookEmbedding(book);
  if (embeddingError) {
    console.error(`Failed to regenerate embedding for book ${book._id}:`, embeddingError.message);
  }
  res.json(book);
});

// Delete Book (only if no copies are currently borrowed)
exports.deleteBook = catchAsync(async (req, res, next) => {
  const adminId = req.tenantFilter?.adminId;
  const filter = { _id: req.params.id, ...(req.tenantFilter || {}) };
  const book = await Book.findOne(filter);
  if (!book) throw new ApiError(404, 'Book not found.');

  // Check if copies are borrowed before deleting (scoped by adminId)
  const copies = await BookCopy.find({ bookId: book._id, status: 'borrowed', adminId });
  if (copies.length > 0) {
    throw new ApiError(400, 'Cannot delete book with currently borrowed copies.');
  }

  // Delete copies first (scoped by adminId)
  await BookCopy.deleteMany({ bookId: book._id, adminId });
  await Book.findOneAndDelete(filter);
  res.json({ message: 'Book and its copies deleted successfully.' });
});

// Add Copies to an existing Book (uses shared helper)
exports.addCopy = catchAsync(async (req, res, next) => {
    const { condition, numberOfCopies } = req.body;
    const filter = { _id: req.params.id, ...(req.tenantFilter || {}) };
    const book = await Book.findOne(filter);
    if (!book) throw new ApiError(404, 'Book not found.');

    if (!book.isbn) {
      throw new ApiError(400, 'Book does not have an ISBN.');
    }

    const count = parseInt(numberOfCopies, 10) || 1;
    // Always take adminId from the verified token, never from req.body.
    const adminId = req.tenantFilter?.adminId || req.user.adminId;
    const copies = await generateCopiesForBook(book, book.isbn, count, adminId);

    // Apply condition if provided
    if (condition && condition !== 'perfect') {
      for (const copy of copies) {
        copy.condition = condition;
        await copy.save();
      }
    }

    res.status(201).json({ message: `${count} copy/copies added successfully.`, copies });
  });

// List Book Copies for a book
exports.getCopiesByBookId = catchAsync(async (req, res, next) => {
    const filter = { bookId: req.params.id, ...(req.tenantFilter || {}) };
    const copies = await BookCopy.find(filter);
    res.json(copies);
  });

// Update Copy Condition or Status manually
exports.updateCopy = catchAsync(async (req, res, next) => {
    const { condition, status } = req.body;
    const adminId = req.tenantFilter?.adminId;
    const filter = { barcode: req.params.barcode, ...(req.tenantFilter || {}) };
    const copy = await BookCopy.findOne(filter);
    if (!copy) throw new ApiError(404, 'Copy not found');

    const oldStatus = copy.status;

    if (condition) copy.condition = condition;
    if (status) copy.status = status;
    await copy.save();

    // Adjust Book Catalog available count if status changed
    if (status && oldStatus !== status) {
      const book = await Book.findOne({ _id: copy.bookId, adminId });
      if (book) {
        // Decrement from available if it was available and now isn't
        if (oldStatus === 'available' && status !== 'available') {
          book.availableCopies = Math.max(0, book.availableCopies - 1);
        }
        // Increment to available if it wasn't and now is
        else if (oldStatus !== 'available' && status === 'available') {
          book.availableCopies += 1;
        }

        // Adjust total copies count if lost
        if (status === 'lost' && oldStatus !== 'lost') {
          book.totalCopies = Math.max(0, book.totalCopies - 1);
        } else if (oldStatus === 'lost' && status !== 'lost') {
          book.totalCopies += 1;
        }

        await book.save();
      }
    }

    res.json({ message: 'Book copy updated successfully.', copy });
  });

// Hybrid search (Keyword + Semantic with RRF)
exports.searchBooks = catchAsync(async (req, res, next) => {
  const query = req.query.q;
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.json([]);
  }

  const trimmedQuery = query.trim().slice(0, 100);
  const filter = req.tenantFilter || {};
  
  // 1. Keyword Search (Safe Regex based with special chars escaped)
  const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedQuery, 'i');
  const keywordResults = await Book.find({
    ...filter,
    $or: [
      { name: regex },
      { author: regex },
      { genre: regex }
    ]
  }).select('-embedding').lean();

  // Apply per-user rate limit if user is authenticated
  if (req.user?.id) {
    embeddingService.checkUserRateLimit(req.user.id, 15);
  }

  let finalResults = [];
  let degraded = false;

  // 2. Semantic Search (if embedding service is configured)
  if (embeddingService.isConfigured()) {
    try {
      const queryEmbedding = await embeddingService.generateEmbedding(trimmedQuery, true);
      
      const allBooks = await Book.find({ ...filter, embedding: { $exists: true, $ne: [] } })
        .select('+embedding')
        .lean();
      
      const semanticResults = allBooks.map(book => {
        const similarity = embeddingService.cosineSimilarity(queryEmbedding, book.embedding);
        return { ...book, similarity };
      })
      .filter(b => b.similarity > 0.4)
      .sort((a, b) => b.similarity - a.similarity);

      // 3. Reciprocal Rank Fusion (RRF)
      const rrfScores = new Map();
      const RRF_K = 60;

      keywordResults.forEach((book, index) => {
        const score = 1 / (RRF_K + index + 1);
        rrfScores.set(book._id.toString(), { book, score });
      });

      semanticResults.forEach((book, index) => {
        const score = 1 / (RRF_K + index + 1);
        const existing = rrfScores.get(book._id.toString());
        if (existing) {
          existing.score += score;
        } else {
          rrfScores.set(book._id.toString(), { book, score });
        }
      });

      finalResults = Array.from(rrfScores.values())
        .sort((a, b) => b.score - a.score)
        .map(item => item.book);
    } catch (err) {
      if (err.statusCode === 429) throw err; // Re-throw budget/rate limit errors
      console.error('Semantic search failed, degrading to keyword search:', err.message);
      degraded = true;
      finalResults = keywordResults;
    }
  } else {
    finalResults = keywordResults;
  }

  const bookIds = finalResults.map(b => b._id);
  const copyAgg = await BookCopy.aggregate([
    { $match: { ...filter, bookId: { $in: bookIds } } },
    {
      $group: {
        _id: '$bookId',
        totalCopies: { $sum: 1 },
        availableCopies: {
          $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
        }
      }
    }
  ]);

  const countMap = {};
  for (const row of copyAgg) {
    countMap[String(row._id)] = { totalCopies: row.totalCopies, availableCopies: row.availableCopies };
  }

  const booksWithCounts = finalResults.map((book) => {
    delete book.embedding;
    delete book.embeddingHash;
    delete book.embeddingModel;
    const counts = countMap[String(book._id)] || { totalCopies: 0, availableCopies: 0 };
    return { ...book, ...counts };
  });

  const sliced = booksWithCounts.slice(0, 20);
  if (degraded) {
    res.set('X-Degraded-Search', 'true');
    // If request asks for JSON, also attach degraded flag if array response can be wrapped or return list
    // Return books list directly to preserve contract, with header
  }
  res.json(sliced);
});

// Get similar books (Semantic)
exports.getSimilarBooks = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const filter = req.tenantFilter || {};

  if (req.user?.id) {
    embeddingService.checkUserRateLimit(req.user.id, 15);
  }

  const targetBook = await Book.findOne({ _id: id, ...filter }).select('+embedding').lean();
  if (!targetBook) {
    throw new ApiError(404, 'Book not found');
  }

  if (!embeddingService.isConfigured() || !targetBook.embedding || targetBook.embedding.length === 0) {
    return res.json([]);
  }

  const allBooks = await Book.find({ 
    _id: { $ne: id }, 
    ...filter, 
    embedding: { $exists: true, $ne: [] } 
  }).select('+embedding').lean();

  const similar = allBooks.map(book => {
    const similarity = embeddingService.cosineSimilarity(targetBook.embedding, book.embedding);
    return { ...book, similarity };
  })
  .filter(b => b.similarity > 0.6)
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, 10);

  const bookIds = similar.map(b => b._id);
  const copyAgg = await BookCopy.aggregate([
    { $match: { ...filter, bookId: { $in: bookIds } } },
    {
      $group: {
        _id: '$bookId',
        totalCopies: { $sum: 1 },
        availableCopies: {
          $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
        }
      }
    }
  ]);

  const countMap = {};
  for (const row of copyAgg) {
    countMap[String(row._id)] = { totalCopies: row.totalCopies, availableCopies: row.availableCopies };
  }

  const result = similar.map((book) => {
    delete book.embedding;
    delete book.embeddingHash;
    delete book.embeddingModel;
    const counts = countMap[String(book._id)] || { totalCopies: 0, availableCopies: 0 };
    return { ...book, ...counts };
  });

  res.json(result);
});
