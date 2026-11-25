import { navigate } from '../lib/router';

export default function ReportPage() {
  return (
    <main className="flex min-h-full flex-col bg-surface">
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-white px-2 pt-[env(safe-area-inset-top)] shadow-sm">
        <button
          type="button"
          onClick={() => navigate('map')}
          aria-label="返回地圖"
          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl active:bg-gray-100"
        >
          ←
        </button>
        <h1 className="text-lg font-bold">回報路況</h1>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-gray-500">
        <p className="text-4xl" aria-hidden="true">
          🚧
        </p>
        <p>回報表單將在階段 3-2 製作</p>
      </section>
    </main>
  );
}
