import { Pane, Polygon } from 'react-leaflet';
import { CHINA_MASK } from '../lib/geo';

// Leaflet 的多重多邊形格式：每個多邊形外面再包一層（第一層是外圈）
const positions = CHINA_MASK.map((ring) => [ring]);

/** 用灰色遮住中國大陸陸地，地圖只呈現台灣（含澎湖、金門、馬祖） */
export default function ChinaMask() {
  return (
    <Pane name="mask" style={{ zIndex: 350 }}>
      <Polygon
        positions={positions}
        interactive={false}
        pathOptions={{ stroke: false, fillColor: '#E0E0E0', fillOpacity: 1 }}
      />
    </Pane>
  );
}
