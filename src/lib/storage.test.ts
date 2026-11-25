// @vitest-environment node
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import {
  createReport,
  deleteReport,
  getReportPhotos,
  listReports,
  ReportValidationError,
  type NewReportInput,
} from './storage';

const now = new Date('2026-11-25T06:00:00Z');
const input: NewReportInput = {
  category: 'construction',
  description: '  圍籬佔用人行道  ',
  lat: 24.12,
  lng: 120.67,
  reportedAt: '2026-11-25T05:00:00Z',
};
const photo = () => ({ blob: new Blob(['x'], { type: 'image/jpeg' }), width: 10, height: 10 });

describe('storage', () => {
  it('新增、讀取、刪除', async () => {
    const r = await createReport(input, [photo(), photo()], now);
    expect(r.description).toBe('圍籬佔用人行道');
    expect(r.createdAt).toBe(now.toISOString());

    const list = await listReports();
    expect(list.map((x) => x.id)).toContain(r.id);

    const photos = await getReportPhotos(r.id);
    expect(photos.map((p) => p.order)).toEqual([0, 1]);

    await deleteReport(r.id);
    expect((await listReports()).map((x) => x.id)).not.toContain(r.id);
    expect(await getReportPhotos(r.id)).toHaveLength(0);
  });

  it('不合規定的資料不會被儲存', async () => {
    const before = (await listReports()).length;
    await expect(createReport({ ...input, lat: 35.6, lng: 139.7 }, [], now)).rejects.toBeInstanceOf(
      ReportValidationError,
    );
    await expect(
      createReport(input, [photo(), photo(), photo(), photo()], now),
    ).rejects.toBeInstanceOf(ReportValidationError);
    await expect(
      createReport(
        input,
        [{ blob: new Blob(['<svg/>'], { type: 'image/svg+xml' }), width: 1, height: 1 }],
        now,
      ),
    ).rejects.toBeInstanceOf(ReportValidationError);
    expect(await listReports()).toHaveLength(before);
  });
});
