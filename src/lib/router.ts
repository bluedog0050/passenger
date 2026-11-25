import { useEffect, useState } from 'react';

/**
 * 極簡 hash 路由。GitHub Pages 只能放固定檔案，
 * 用 #/report 這種網址，重新整理時才不會 404。
 */
export type Route = 'map' | 'report';

export function parseRoute(hash: string): Route {
  return hash.replace(/^#/, '') === '/report' ? 'report' : 'map';
}

export function navigate(route: Route): void {
  window.location.hash = route === 'report' ? '/report' : '/';
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
