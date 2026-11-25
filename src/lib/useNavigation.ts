import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_CENTER, isInTaiwan } from './geo';
import type { LatLngTuple } from './routeGeometry';
import { planRoute, type RouteResult } from './routing';

export type NavPhase = 'off' | 'pickStart' | 'pickEnd' | 'routing' | 'done';

export interface NavState {
  phase: NavPhase;
  start: LatLngTuple | null;
  end: LatLngTuple | null;
  result: RouteResult | null;
  error: string | null;
}

const INITIAL: NavState = { phase: 'off', start: null, end: null, result: null, error: null };

/** 導航流程：選起點 → 選目的地 → 規劃路線 → 顯示結果 */
export function useNavigation() {
  const [state, setState] = useState<NavState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const cancelRequest = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  useEffect(() => cancelRequest, []);

  const route = useCallback(async (start: LatLngTuple, end: LatLngTuple) => {
    cancelRequest();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ phase: 'routing', start, end, result: null, error: null });
    try {
      const result = await planRoute(start, end, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setState({ phase: 'done', start, end, result, error: null });
    } catch (err) {
      if (controller.signal.aborted) return;
      setState({
        phase: 'pickEnd',
        start,
        end: null,
        result: null,
        error: err instanceof Error ? err.message : '路線規劃失敗，請再試一次',
      });
    }
  }, []);

  const open = useCallback(() => {
    cancelRequest();
    setState({ ...INITIAL, phase: 'pickStart' });
  }, []);

  const exit = useCallback(() => {
    cancelRequest();
    setState(INITIAL);
  }, []);

  const pickPoint = useCallback(
    (point: LatLngTuple) => {
      if (state.phase !== 'pickStart' && state.phase !== 'pickEnd') return;
      if (!isInTaiwan(point[0], point[1])) {
        setState((s) => ({ ...s, error: '請選擇台灣範圍內的地點' }));
        return;
      }
      if (state.phase === 'pickStart') {
        setState({ ...INITIAL, phase: 'pickEnd', start: point });
      } else if (state.start) {
        void route(state.start, point);
      }
    },
    [state.phase, state.start, route],
  );

  const setDefaultStart = useCallback(() => {
    setState({ ...INITIAL, phase: 'pickEnd', start: [DEFAULT_CENTER[0], DEFAULT_CENTER[1]] });
  }, []);

  return { state, open, exit, pickPoint, setDefaultStart, restart: open };
}
