import type { CategoryId, ReportView } from '../types';
import construction from '../assets/samples/construction.svg';
import damaged from '../assets/samples/damaged.svg';
import discontinuous from '../assets/samples/discontinuous.svg';
import obstacle from '../assets/samples/obstacle.svg';
import occupied from '../assets/samples/occupied.svg';
import other from '../assets/samples/other.svg';

const PHOTO: Record<CategoryId, string> = {
  discontinuous,
  obstacle,
  damaged,
  occupied,
  construction,
  other,
};

interface SampleSeed {
  category: CategoryId;
  lat: number;
  lng: number;
  /** 幾小時前發生 */
  hoursAgo: number;
  description: string;
  /** 是否附示意照片 */
  photo: boolean;
}

/** 15 筆範例回報，全部位於台中市南區（座標為示意，並非真實事件） */
const SEEDS: SampleSeed[] = [
  {
    category: 'discontinuous',
    lat: 24.121,
    lng: 120.6745,
    hoursAgo: 2,
    photo: true,
    description: '人行道走到一半突然沒了，只能走到車道上，車速很快很危險。',
  },
  {
    category: 'occupied',
    lat: 24.1225,
    lng: 120.677,
    hoursAgo: 5,
    photo: true,
    description: '機車整排停在人行道上，完全沒有空間可以走。',
  },
  {
    category: 'obstacle',
    lat: 24.13,
    lng: 120.681,
    hoursAgo: 9,
    photo: true,
    description: '變電箱擋住大半個人行道，推嬰兒車過不去。',
  },
  {
    category: 'construction',
    lat: 24.1305,
    lng: 120.676,
    hoursAgo: 20,
    photo: true,
    description: '管線施工圍起整段人行道，沒有設置臨時行人通道。',
  },
  {
    category: 'damaged',
    lat: 24.126,
    lng: 120.662,
    hoursAgo: 26,
    photo: true,
    description: '地磚破裂翹起，晚上看不清楚很容易絆倒。',
  },
  {
    category: 'occupied',
    lat: 24.1235,
    lng: 120.658,
    hoursAgo: 30,
    photo: false,
    description: '店家把桌椅和招牌擺到人行道上。',
  },
  {
    category: 'discontinuous',
    lat: 24.118,
    lng: 120.669,
    hoursAgo: 40,
    photo: false,
    description: '路口前人行道中斷，沒有斜坡也沒有標線。',
  },
  {
    category: 'obstacle',
    lat: 24.1135,
    lng: 120.6705,
    hoursAgo: 48,
    photo: true,
    description: '路樹樹根把人行道撐起，加上樹幹佔掉一半寬度。',
  },
  {
    category: 'damaged',
    lat: 24.115,
    lng: 120.665,
    hoursAgo: 55,
    photo: false,
    description: '人孔蓋周圍凹陷，下雨天積水。',
  },
  {
    category: 'construction',
    lat: 24.131,
    lng: 120.661,
    hoursAgo: 72,
    photo: false,
    description: '建案工地圍籬佔用人行道，已經好幾個月。',
  },
  {
    category: 'obstacle',
    lat: 24.1275,
    lng: 120.6695,
    hoursAgo: 80,
    photo: false,
    description: '電線桿和號誌桿立在人行道正中間。',
  },
  {
    category: 'discontinuous',
    lat: 24.119,
    lng: 120.6505,
    hoursAgo: 96,
    photo: true,
    description: '騎樓高低不平又被擋住，只能走在路邊。',
  },
  {
    category: 'occupied',
    lat: 24.133,
    lng: 120.6705,
    hoursAgo: 110,
    photo: false,
    description: '汽車直接停在人行道上。',
  },
  {
    category: 'other',
    lat: 24.1285,
    lng: 120.679,
    hoursAgo: 130,
    photo: true,
    description: '排水不良，下雨後人行道整片積水。',
  },
  {
    category: 'damaged',
    lat: 24.1165,
    lng: 120.6595,
    hoursAgo: 150,
    photo: false,
    description: '無障礙斜坡破損，輪椅無法通過。',
  },
];

/** 依「現在」產生範例資料，讓時間看起來永遠是最近的 */
export function getSampleReports(now: Date = new Date()): ReportView[] {
  return SEEDS.map((s, i) => {
    const time = new Date(now.getTime() - s.hoursAgo * 3_600_000).toISOString();
    return {
      id: `sample-${i + 1}`,
      category: s.category,
      description: s.description,
      lat: s.lat,
      lng: s.lng,
      reportedAt: time,
      createdAt: time,
      schemaVersion: 1,
      photoUrls: s.photo ? [PHOTO[s.category]] : [],
      isSample: true,
    };
  });
}
