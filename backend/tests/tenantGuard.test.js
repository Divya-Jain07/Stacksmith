const mongoose = require('mongoose');
const models = require('../src/models');
const { createBranch } = require('./factory');

describe('Tenant Guard Plugin', () => {
  let branch;

  beforeAll(async () => {
    branch = await createBranch();
  });

  const guardedModels = [
    'Book', 'BookCopy', 'Member', 'LibrarianStaff',
    'BorrowingHistory', 'BookReservation', 'Fine', 'Conversation'
  ];

  it('Every guarded model is flagged as guarded', () => {
    guardedModels.forEach(modelName => {
      const Model = models[modelName];
      expect(Model._isTenantGuarded).toBe(true);
    });
  });

  describe.each(guardedModels)('Model: %s', (modelName) => {
    let Model;

    beforeAll(() => {
      Model = models[modelName];
    });

    it('Rejects an unscoped find', async () => {
      await expect(Model.find({})).rejects.toThrow(/\[tenantGuard\] UNSCOPED QUERY/);
    });

    it('Rejects an unscoped find by ID', async () => {
      const id = new mongoose.Types.ObjectId();
      await expect(Model.findById(id)).rejects.toThrow(/\[tenantGuard\] UNSCOPED QUERY/);
    });

    it('Rejects a null adminId', async () => {
      await expect(Model.find({ adminId: null })).rejects.toThrow(/\[tenantGuard\] UNSCOPED QUERY/);
    });

    it('Rejects an unscoped bulk delete', async () => {
      await expect(Model.deleteMany({ status: 'old' })).rejects.toThrow(/\[tenantGuard\] UNSCOPED QUERY/);
    });

    it('Allows a scoped query', async () => {
      const res = await Model.find({ adminId: branch.adminId });
      expect(Array.isArray(res)).toBe(true);
    });

    it('Allows an opt-out with a reason', async () => {
      const res = await Model.find({}).crossTenant('test reason');
      expect(Array.isArray(res)).toBe(true);
    });

    it('Rejects an opt-out with no reason or empty reason', async () => {
      // falsy reason is a no-op, so the query itself should fail
      await expect(Model.find({}).crossTenant()).rejects.toThrow(/\[tenantGuard\] UNSCOPED QUERY/);
      // empty/whitespace reason throws immediately
      expect(() => Model.find({}).crossTenant('   ')).toThrow(/requires a non-empty string reason/);
    });

    it('Rejects an aggregation without a tenant first stage', async () => {
      await expect(Model.aggregate([{ $match: { name: 'test' } }])).rejects.toThrow(/\[tenantGuard\] UNSCOPED QUERY/);
    });

    it('Allows an aggregation with a tenant first stage', async () => {
      const res = await Model.aggregate([{ $match: { adminId: branch.adminId } }]);
      expect(Array.isArray(res)).toBe(true);
    });

    it('Allows an unscoped aggregation with opt-out', async () => {
      const res = await Model.aggregate([{ $match: { name: 'test' } }]).crossTenant('test aggregation opt-out');
      expect(Array.isArray(res)).toBe(true);
    });
  });
});
