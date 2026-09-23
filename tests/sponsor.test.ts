// tests/sponsor.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPendingSponsorship, findSponsorship, updateSponsorship } from '../src/worker/db';

// Mock D1Database globally
vi.stubGlobal('RESCUE_DB', {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  first: vi.fn(),
  run: vi.fn(),
});

describe('Sponsorship DB helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('findSponsorship returns null when none exists', async () => {
    (global as any).RESCUE_DB.first.mockResolvedValue(null);
    const res = await findSponsorship('0xabc');
    expect(res).toBeNull();
    expect((global as any).RESCUE_DB.prepare).toHaveBeenCalled();
  });

  it('createPendingSponsorship inserts a new row', async () => {
    (global as any).RESCUE_DB.run.mockResolvedValue({ meta: { changed_rows: 1, last_row_id: 42 } });
    const result = await createPendingSponsorship('0xabc');
    expect(result.meta?.changed_rows).toBe(1);
    expect((global as any).RESCUE_DB.prepare).toHaveBeenCalled();
  });

  it('updateSponsorship updates row', async () => {
    (global as any).RESCUE_DB.run.mockResolvedValue({});
    await updateSponsorship(42, 'CONFIRMED', '0xhash');
    expect((global as any).RESCUE_DB.prepare).toHaveBeenCalled();
  });
});
