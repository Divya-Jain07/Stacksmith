const express = require('express');
const router = express.Router();
const bookController = require('../controllers/book.controller');
const { authorize } = require('../middlewares/auth.middleware');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Files temporarily saved to uploads/

// POST   /api/books/bulk-import - Bulk import from CSV
router.post('/bulk-import', authorize('SuperAdmin', 'Admin', 'Librarian'), upload.single('file'), bookController.bulkImportBooks);

// POST   /api/books          - Add a new book to catalog
// GET    /api/books          - List all books
router.route('/')
  .post(authorize('SuperAdmin', 'Admin', 'Librarian'), bookController.createBook)
  .get(bookController.getBooks);

// GET    /api/books/:id      - Get single book metadata
// PUT    /api/books/:id      - Update book metadata
// DELETE /api/books/:id      - Delete book
router.route('/:id')
  .get(bookController.getBookById)
  .put(authorize('SuperAdmin', 'Admin', 'Librarian'), bookController.updateBook)
  .delete(authorize('SuperAdmin', 'Admin', 'Librarian'), bookController.deleteBook);

// POST   /api/books/:id/copies - Add a physical copy
// GET    /api/books/:id/copies - List all copies of a book
router.route('/:id/copies')
  .post(authorize('SuperAdmin', 'Admin', 'Librarian'), bookController.addCopy)
  .get(bookController.getCopiesByBookId);

module.exports = router;
