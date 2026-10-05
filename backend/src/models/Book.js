const mongoose = require('mongoose');
const { tenantGuardPlugin, patchAggregateForModel } = require('../plugins/tenantGuard');

const BookSchema = new mongoose.Schema({
  name: { type: String, required: true },
  author: { type: String, required: true },
  isbn: { type: String, required: true },
  genre: { type: String, required: true },
  totalCopies: { type: Number, default: 0 },
  availableCopies: { type: Number, default: 0 },
  language: { type: String, required: true },
  description: { type: String },
  publisher: { type: String, required: true },
  yearPublished: { type: Number, required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

BookSchema.index({ adminId: 1, createdAt: -1 });
BookSchema.index({ adminId: 1, isbn: 1 });

BookSchema.plugin(tenantGuardPlugin);

const Book = mongoose.model('Book', BookSchema);
patchAggregateForModel(Book);
module.exports = Book;
