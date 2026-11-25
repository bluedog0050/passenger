import { useRoute } from './lib/router';
import MapPage from './pages/MapPage';
import ReportPage from './pages/ReportPage';

export default function App() {
  const route = useRoute();
  return route === 'report' ? <ReportPage /> : <MapPage />;
}
