const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const Book = require('../models/Book');
const BookCopy = require('../models/BookCopy');
const fs = require('fs');
const csv = require('csv-parser');

const resolveEffectiveAdminId = (req) => {
  const queryAdminId = req.query?.adminId;
  const bodyAdminId = req.body?.adminId;
  const userAdminId = req.user?.adminId;

  return queryAdminId || bodyAdminId || userAdminId || null;
};

const buildTenantScopeFilter = (req) => {
  const adminId = resolveEffectiveAdminId(req);
  return adminId ? { adminId } : {};
};

// Shared helper function to generate copies and update counts
const generateCopiesForBook = async (book, isbn, numberOfCopies, adminId) => {
  if (!numberOfCopies || numberOfCopies <= 0) return [];

  const existingCount = await BookCopy.countDocuments({ bookId: book._id });
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

  const createdCopies = await BookCopy.insertMany(copiesToInsert);

  const totalCopies = await BookCopy.countDocuments({ bookId: book._id });
  const availableCopies = await BookCopy.countDocuments({ bookId: book._id, status: 'available' });

  book.totalCopies = totalCopies;
  book.availableCopies = availableCopies;
  await book.save();

  return createdCopies;
};

// Add Catalog Book Entry (Flow B)
exports.createBook = catchAsync(async (req, res, next) => {
    const { isbn, numberOfCopies } = req.body;
    const adminId = resolveEffectiveAdminId(req);

    if (!adminId) {
      throw new ApiError(400, 'Please select a library scope before creating a book.');
    }
    
    if (isbn) {
      const existingBook = await Book.findOne({ isbn, ...buildTenantScopeFilter(req) });
      if (existingBook) {
        throw new ApiError(400, 'Book with this ISBN already exists.');
      }
    }

    const book = new Book({
      ...req.body,
      adminId
    });
    await book.save();

    let createdCopies = [];
    if (numberOfCopies && numberOfCopies > 0) {
      createdCopies = await generateCopiesForBook(book, isbn, parseInt(numberOfCopies, 10), adminId);
    }

    res.status(201).json({ book, copies: createdCopies });
  });

// Bulk Import Books from CSV (Flow A)
exports.resolveEffectiveAdminId = resolveEffectiveAdminId;

exports.bulkImportBooks = catchAsync(async (req, res, next) => {
  if (!req.file) {
    throw new ApiError(400, 'No CSV file provided.');
  }

  const adminId = resolveEffectiveAdminId(req);
  if (!adminId) {
    throw new ApiError(400, 'Please provide an adminId scope for bulk import.');
  }

  const results = [];
  const errors = [];
  let added = 0;
  let updated = 0;
  let skipped = 0;
  let invalid = 0;

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      let rowNum = 1; // 1 represents headers conceptually, data starts at 2
      for (const row of results) {
        rowNum++;
        const { Title, Author, ISBN, Genre, Language, Publisher, YearPublished, Copies } = row;
        
        if (!Title || !Author || !ISBN || !Genre || !Language || !Publisher || !YearPublished || !Copies) {
          errors.push({ row: rowNum, isbn: ISBN, reason: 'Missing required columns.' });
          skipped++;
          invalid++;
          continue;
        }

        const numCopies = parseInt(Copies, 10);
        if (isNaN(numCopies) || numCopies <= 0) {
          errors.push({ row: rowNum, isbn: ISBN, reason: 'Invalid Copies number.' });
          skipped++;
          invalid++;
          continue;
        }

        const existingBook = await Book.findOne({ isbn: ISBN, adminId });
        if (existingBook) {
          try {
            await generateCopiesForBook(existingBook, ISBN, numCopies, adminId);
            updated++;
          } catch (error) {
            errors.push({ row: rowNum, isbn: ISBN, reason: `Failed to add copies to existing book: ${error.message}` });
            skipped++;
          }
          continue;
        }

        try {
          const book = new Book({
            name: Title,
            author: Author,
            isbn: ISBN,
            genre: Genre,
            language: Language,
            publisher: Publisher,
            yearPublished: parseInt(YearPublished, 10),
            adminId
          });
          await book.save();

          await generateCopiesForBook(book, ISBN, numCopies, adminId);
          added++;
        } catch (error) {
          errors.push({ row: rowNum, isbn: ISBN, reason: error.message });
          skipped++;
        }
      }

      fs.unlink(req.file.path, () => {}); // Cleanup temp file
      res.json({ added, updated, skipped, invalid, totalRows: results.length, errors });
    })
    .on('error', (error) => {
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
  const book = await Book.findOneAndUpdate(filter, req.body, { new: true });
  if (!book) throw new ApiError(404, 'Book not found.');
  res.json(book);
});

// Delete Book (only if no copies are currently borrowed)
exports.deleteBook = catchAsync(async (req, res, next) => {
  const filter = { _id: req.params.id, ...(req.tenantFilter || {}) };
  const book = await Book.findOne(filter);
  if (!book) throw new ApiError(404, 'Book not found.');

  // Optionally check if copies are borrowed before deleting
  const copies = await BookCopy.find({ bookId: book._id, status: 'borrowed' });
  if (copies.length > 0) {
    throw new ApiError(400, 'Cannot delete book with currently borrowed copies.');
  }

  // Delete copies first
  await BookCopy.deleteMany({ bookId: book._id });
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
    const copies = await generateCopiesForBook(book, book.isbn, count, req.body.adminId || req.user.adminId);

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
    const filter = { barcode: req.params.barcode, ...(req.tenantFilter || {}) };
    const copy = await BookCopy.findOne(filter);
    if (!copy) throw new ApiError(404, 'Copy not found');

    const oldStatus = copy.status;

    if (condition) copy.condition = condition;
    if (status) copy.status = status;
    await copy.save();

    // Adjust Book Catalog available count if status changed
    if (status && oldStatus !== status) {
      const book = await Book.findById(copy.bookId);
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
