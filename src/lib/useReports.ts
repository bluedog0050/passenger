import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReportView } from '../types';
import { deleteReport, getReportPhotos, listReports } from './storage';

export type LoadStatus = 'loading' | 'ready' | 'error';

/** 地圖上的回報 = 使用者存在這台裝置上的回報 */
export function useReports() {
  const [reports, setReports] = useState<ReportView[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const urls = useRef<string[]>([]);

  const revokeAll = () => {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
  };

  const load = useCallback(async () => {
    try {
      const stored = await listReports();
      const views = await Promise.all(
        stored.map(async (r): Promise<ReportView> => {
          const photos = await getReportPhotos(r.id);
          return {
            ...r,
            photoUrls: photos.map((p) => URL.createObjectURL(p.data)),
          };
        }),
      );
      revokeAll();
      urls.current = views.flatMap((v) => v.photoUrls);
      setReports(views);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
    return revokeAll;
  }, [load]);

  const remove = useCallback(
    async (id: string) => {
      await deleteReport(id);
      await load();
    },
    [load],
  );

  return { reports, status, remove };
}
