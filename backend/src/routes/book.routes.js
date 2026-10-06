const express = require('express');
const router = express.Router();
const bookController = require('../controllers/book.controller');
const { authorize } = require('../middlewares/auth.middleware');

const os = require('os');
const multer = require('multer');
const upload = multer({ 
  dest: os.tmpdir(),
  limits: { fileSize: 1024 * 1024, files: 1 }, // 1 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are allowed'));
    }
  }
});

// POST   /api/books/bulk-import - Bulk import from CSV
router.post('/bulk-import', authorize('SuperAdmin', 'Admin', 'Librarian'), upload.single('file'), bookController.bulkImportBooks);

// POST   /api/books          - Add a new book to catalog
// GET    /api/books          - List all books
router.route('/')
  .post(authorize('SuperAdmin', 'Admin', 'Librarian'), bookController.createBook)
  .get(bookController.getBooks);

// GET    /api/books/search   - Hybrid semantic search
router.get('/search', bookController.searchBooks);

// GET    /api/books/:id      - Get single book metadata
// PUT    /api/books/:id      - Update book metadata
// DELETE /api/books/:id      - Delete book
router.route('/:id')
  .get(bookController.getBookById)
  .put(authorize('SuperAdmin', 'Admin', 'Librarian'), bookController.updateBook)
  .delete(authorize('SuperAdmin', 'Admin', 'Librarian'), bookController.deleteBook);

// GET    /api/books/:id/similar - Get similar books
router.get('/:id/similar', bookController.getSimilarBooks);

// POST   /api/books/:id/copies - Add a physical copy
// GET    /api/books/:id/copies - List all copies of a book
router.route('/:id/copies')
  .post(authorize('SuperAdmin', 'Admin', 'Librarian'), bookController.addCopy)
  .get(bookController.getCopiesByBookId);

module.exports = router;
