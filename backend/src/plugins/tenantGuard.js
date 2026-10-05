/**
 * Mongoose Plugin: tenantGuard
 *
 * Ensures every query on a tenant-owned collection includes a non-null `adminId`
 * or is explicitly marked cross-tenant with a mandatory reason string.
 *
 * Modes (TENANT_GUARD env var):
 *   off     – disabled entirely
 *   warn    – logs a warning with stack trace but lets the query proceed (default)
 *   enforce – throws an error naming the model and operation
 *
 * Usage:
 *   schema.plugin(tenantGuardPlugin);
 *
 * Opt-out (per query):
 *   Model.find({}).crossTenant('reason: member login before tenant is known')
 *   A missing or empty reason is rejected. A falsy value is a harmless no-op.
 */

'use strict';

const GUARDED_OPS = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'updateOne',
  'updateMany',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'countDocuments',
  'distinct',
];

/**
 * Returns true if the filter contains a non-null adminId at the top level
 * or inside a top-level $and clause. Conditions only inside $or do not count.
 */
function isScoped(filter) {
  if (!filter || typeof filter !== 'object') return false;

  // Top-level adminId that is neither null nor undefined
  if (Object.prototype.hasOwnProperty.call(filter, 'adminId')) {
    const v = filter.adminId;
    if (v !== null && v !== undefined) return true;
  }

  // adminId inside a top-level $and
  if (Array.isArray(filter.$and)) {
    for (const clause of filter.$and) {
      if (
        clause &&
        typeof clause === 'object' &&
        Object.prototype.hasOwnProperty.call(clause, 'adminId')
      ) {
        const v = clause.adminId;
        if (v !== null && v !== undefined) return true;
      }
    }
  }

  return false;
}

/**
 * Emits a warning or throws, depending on the mode.
 */
function handleViolation(mode, modelName, op) {
  const msg = `[tenantGuard] UNSCOPED QUERY — model: ${modelName}, op: ${op}. Add adminId to the filter or call .crossTenant('reason').`;
  if (mode === 'enforce') {
    const err = new Error(msg);
    err.isTenantGuardViolation = true;
    throw err;
  } else {
    // warn mode — log with a stack trace so the source is findable
    const stack = new Error(msg).stack;
    console.warn(stack);
  }
}

function tenantGuardPlugin(schema) {
  // Read mode once at plugin-application time so tests can set the env before models load.
  const mode = (process.env.TENANT_GUARD || 'warn').toLowerCase();

  if (mode === 'off') return;

  const modelName = () => schema.get('collection') || '(unknown)';

  // ── Query middleware ─────────────────────────────────────────────────────────
  function queryMiddleware(next) {
    // Allow opt-out: the query has had .crossTenant('reason') called on it.
    if (this._crossTenantReason) return next();

    const filter = this.getFilter ? this.getFilter() : (this._conditions || {});
    if (!isScoped(filter)) {
      try {
        handleViolation(mode, this.model ? this.model.modelName : modelName(), this.op);
      } catch (err) {
        return next(err);
      }
    }
    next();
  }

  for (const op of GUARDED_OPS) {
    schema.pre(op, queryMiddleware);
  }

  // ── Aggregation middleware ───────────────────────────────────────────────────
  schema.pre('aggregate', function (next) {
    if (this._crossTenantReason) return next();

    const pipeline = this.pipeline();
    if (!Array.isArray(pipeline) || pipeline.length === 0) {
      try {
        handleViolation(mode, this.model ? this.model.modelName : modelName(), 'aggregate');
      } catch (err) {
        return next(err);
      }
      return next();
    }

    const firstStage = pipeline[0];
    const isVectorSearch =
      firstStage.$vectorSearch && isScoped(firstStage.$vectorSearch.filter || {});
    const isMatchWithTenant = firstStage.$match && isScoped(firstStage.$match);

    if (!isVectorSearch && !isMatchWithTenant) {
      try {
        handleViolation(mode, this.model ? this.model.modelName : modelName(), 'aggregate');
      } catch (err) {
        return next(err);
      }
    }
    next();
  });

  // ── Chainable .crossTenant(reason) on Query ──────────────────────────────────
  // Mongoose Query prototype is extended here. The method is safe to call
  // with a falsy value (harmless no-op per spec).
  schema.query.crossTenant = function (reason) {
    if (!reason) return this; // falsy → no-op
    if (typeof reason !== 'string' || reason.trim() === '') {
      throw new Error('[tenantGuard] crossTenant() requires a non-empty string reason.');
    }
    this._crossTenantReason = reason;
    return this;
  };

  // ── Chainable .crossTenant(reason) on Aggregate ──────────────────────────────
  // We patch the Aggregate prototype lazily via the pre-aggregate hook above,
  // but we need to attach the method to aggregation instances. We do it via
  // a post-init hook that is called whenever schema.aggregate() produces an
  // Aggregate instance, which is not a standard Mongoose hook. Instead we
  // override the model's .aggregate() method after the model is registered.
  // That is done in models/index.js after requiring this plugin's helper below.

  // ── Static marker for tests ──────────────────────────────────────────────────
  // Set after the model is compiled. Done in models/index.js.
}

/**
 * Patches the Aggregate instances produced by model.aggregate() to support
 * the .crossTenant(reason) opt-out.  Call once per model after compiling.
 *
 * @param {mongoose.Model} Model
 */
function patchAggregateForModel(Model) {
  const original = Model.aggregate.bind(Model);
  Model.aggregate = function (...args) {
    const agg = original(...args);
    agg.crossTenant = function (reason) {
      if (!reason) return this;
      if (typeof reason !== 'string' || reason.trim() === '') {
        throw new Error('[tenantGuard] crossTenant() requires a non-empty string reason.');
      }
      this._crossTenantReason = reason;
      return this;
    };
    return agg;
  };
  // Static flag so tests can verify every guarded model has the plugin
  Model._isTenantGuarded = true;
}

module.exports = { tenantGuardPlugin, patchAggregateForModel };
