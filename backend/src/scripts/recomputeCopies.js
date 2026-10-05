require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('../models/Book');
const BookCopy = require('../models/BookCopy');
const connectDB = require('../config/db');

const recomputeCopies = async () => {
  try {
    await connectDB();
    console.log('Connected to DB. Starting recomputation of copies...');

    const books = await Book.find({});
    console.log(`Found ${books.length} books to process.`);

    let updated = 0;

    for (const book of books) {
      const totalCopies = await BookCopy.countDocuments({ bookId: book._id });
      const availableCopies = await BookCopy.countDocuments({ bookId: book._id, status: 'available' });

      if (book.totalCopies !== totalCopies || book.availableCopies !== availableCopies) {
        book.totalCopies = totalCopies;
        book.availableCopies = availableCopies;
        await book.save();
        updated++;
        console.log(`Updated book ${book._id}: total=${totalCopies}, available=${availableCopies}`);
      }
    }

    console.log(`Finished. Updated counts for ${updated} books.`);
    process.exit(0);
  } catch (error) {
    console.error('Error recomputing copies:', error);
    process.exit(1);
  }
};

recomputeCopies();
