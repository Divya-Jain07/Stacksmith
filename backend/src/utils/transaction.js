const mongoose = require('mongoose');
const ApiError = require('./ApiError');

/**
 * Runs a callback inside a MongoDB transaction, automatically retrying on
 * TransientTransactionError or commit conflicts. If retries are exhausted,
 * throws a clean 409 ApiError.
 */
const runInTransaction = async (callback) => {
  const session = await mongoose.startSession();
  const maxRetries = 5;

  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        session.startTransaction();
        const result = await callback(session);

        // Commit transaction
        try {
          await session.commitTransaction();
          return result;
        } catch (commitErr) {
          // If commit failed due to UnknownTransactionCommitResult, we can retry commit or whole tx
          const isUnknownCommit = commitErr.hasErrorLabel && commitErr.hasErrorLabel('UnknownTransactionCommitResult');
          const isTransient = commitErr.hasErrorLabel && commitErr.hasErrorLabel('TransientTransactionError');
          if ((isUnknownCommit || isTransient || commitErr.code === 112) && attempt < maxRetries) {
            try { await session.abortTransaction(); } catch (_) {}
            continue;
          }
          throw commitErr;
        }
      } catch (err) {
        try {
          if (session.transaction && session.transaction.state !== 'TRANSACTION_ABORTED') {
            await session.abortTransaction();
          }
        } catch (_) {
          // Do not mask original error if abort fails
        }

        const isTransient = err.hasErrorLabel && err.hasErrorLabel('TransientTransactionError');
        const isWriteConflict = err.code === 112 || err.codeName === 'WriteConflict';

        if ((isTransient || isWriteConflict) && attempt < maxRetries) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, attempt * 25));
          continue;
        }

        if (isTransient || isWriteConflict) {
          throw new ApiError(409, 'This copy was just issued. Please refresh.');
        }

        throw err;
      }
    }
  } finally {
    session.endSession();
  }
};

module.exports = { runInTransaction };
