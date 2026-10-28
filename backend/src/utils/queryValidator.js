const mongoose = require('mongoose');
const ApiError = require('./ApiError');

/**
 * Validates req.query parameters against an allow-list schema to prevent NoSQL object injection
 * (e.g. ?status[$ne]=pending or ?search[$gt]=)
 * 
 * @param {Object} query - req.query
 * @param {Object} schema - definition of allowed keys and their type/rules
 *   Supported rules:
 *     - type: 'string' | 'int' | 'objectId' | 'date'
 *     - enum: Array of allowed strings
 *     - min: Number (for int)
 *     - max: Number (for int)
 *     - maxLength: Number (for string)
 *     - default: Any
 */
function validateQueryParams(query, schema) {
  const sanitized = {};

  for (const [key, rules] of Object.entries(schema)) {
    const rawVal = query[key];

    // If key not present in query, apply default if provided
    if (rawVal === undefined || rawVal === null || rawVal === '') {
      if (rules.default !== undefined) {
        sanitized[key] = rules.default;
      }
      continue;
    }

    // Reject non-string / object / array query parameters
    if (typeof rawVal !== 'string') {
      throw new ApiError(400, `Query parameter '${key}' must be a string value, received ${typeof rawVal}`);
    }

    const trimmed = rawVal.trim();

    if (rules.type === 'int') {
      const parsed = parseInt(trimmed, 10);
      if (isNaN(parsed) || String(parsed) !== trimmed) {
        throw new ApiError(400, `Query parameter '${key}' must be a valid integer`);
      }
      if (rules.min !== undefined && parsed < rules.min) {
        throw new ApiError(400, `Query parameter '${key}' must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && parsed > rules.max) {
        throw new ApiError(400, `Query parameter '${key}' must be at most ${rules.max}`);
      }
      sanitized[key] = parsed;
    } else if (rules.type === 'objectId') {
      if (!mongoose.Types.ObjectId.isValid(trimmed)) {
        throw new ApiError(400, `Query parameter '${key}' must be a valid ObjectId`);
      }
      sanitized[key] = trimmed;
    } else if (rules.type === 'date') {
      const d = new Date(trimmed);
      if (isNaN(d.getTime())) {
        throw new ApiError(400, `Query parameter '${key}' must be a valid date`);
      }
      sanitized[key] = d;
    } else {
      // String
      if (rules.maxLength && trimmed.length > rules.maxLength) {
        throw new ApiError(400, `Query parameter '${key}' exceeds maximum length of ${rules.maxLength}`);
      }
      if (rules.enum && !rules.enum.includes(trimmed)) {
        throw new ApiError(400, `Query parameter '${key}' must be one of: ${rules.enum.join(', ')}`);
      }
      sanitized[key] = trimmed;
    }
  }

  // Reject unexpected keys with MongoDB operator characters (like [$ne])
  for (const key of Object.keys(query)) {
    if (key.includes('[') || key.includes('$')) {
      throw new ApiError(400, `Malformed query parameter syntax: ${key}`);
    }
  }

  return sanitized;
}

module.exports = { validateQueryParams };
