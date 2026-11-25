import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSampleReports } from '../data/samples';
import type { ReportView } from '../types';
import { deleteReport, getReportPhotos, listReports } from './storage';

export type LoadStatus = 'loading' | 'ready' | 'error';

/** 地圖上的所有回報 = 範例資料 + 使用者存在這台裝置上的回報 */
export function useReports() {
  const samples = useMemo(() => getSampleReports(), []);
  const [own, setOwn] = useState<ReportView[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const urls = useRef<string[]>([]);

  const revokeAll = () => {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
  };

  const load = useCallback(async () => {
    try {
      const reports = await listReports();
      const views = await Promise.all(
        reports.map(async (r): Promise<ReportView> => {
          const photos = await getReportPhotos(r.id);
          return {
            ...r,
            photoUrls: photos.map((p) => URL.createObjectURL(p.data)),
            isSample: false,
          };
        }),
      );
      revokeAll();
      urls.current = views.flatMap((v) => v.photoUrls);
      setOwn(views);
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

  const reports = useMemo(() => [...samples, ...own], [samples, own]);
  return { reports, status, remove };
}
