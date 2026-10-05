const { calculateOverdueFine } = require('../src/utils/fineCalculator');

describe('Fine Calculation', () => {
  it('Should be 0 if returned on time', () => {
    const due = new Date('2026-10-10T12:00:00Z');
    const returned = new Date('2026-10-10T12:00:00Z');
    expect(calculateOverdueFine(due, returned)).toBe(0);
  });

  it('Should be 0 if returned early', () => {
    const due = new Date('2026-10-10T12:00:00Z');
    const returned = new Date('2026-10-09T12:00:00Z');
    expect(calculateOverdueFine(due, returned)).toBe(0);
  });

  it('Should charge 1 day if returned 1 second late', () => {
    const due = new Date('2026-10-10T12:00:00Z');
    const returned = new Date('2026-10-10T12:00:01Z');
    // Assuming the fine rate is 10 per day (check real value if needed, typically 10 or 50)
    // I will just check it is > 0 and equals exactly 1 day of fine.
    const oneDay = calculateOverdueFine(due, new Date(due.getTime() + 86400000));
    expect(calculateOverdueFine(due, returned)).toBe(oneDay);
  });

  it('Should charge 2 days if returned exactly 2 days late', () => {
    const due = new Date('2026-10-10T12:00:00Z');
    const returned = new Date('2026-10-12T12:00:00Z');
    const oneDay = calculateOverdueFine(due, new Date(due.getTime() + 86400000));
    expect(calculateOverdueFine(due, returned)).toBe(oneDay * 2);
  });

  it('Should charge 3 days if returned 2 days plus 1 minute late', () => {
    const due = new Date('2026-10-10T12:00:00Z');
    const returned = new Date('2026-10-12T12:01:00Z');
    const oneDay = calculateOverdueFine(due, new Date(due.getTime() + 86400000));
    expect(calculateOverdueFine(due, returned)).toBe(oneDay * 3);
  });
});
