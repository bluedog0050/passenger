import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import LocationPicker, { type LatLng } from '../components/LocationPicker';
import { CATEGORIES } from '../data/categories';
import { setCreatedFlash } from '../lib/flash';
import { isInTaiwan } from '../lib/geo';
import { useGeolocation } from '../lib/geolocation';
import { processPhoto, type ProcessedPhoto } from '../lib/image';
import { navigate } from '../lib/router';
import { createReport } from '../lib/storage';
import {
  FIELD_ORDER,
  MAX_AGE_DAYS,
  MAX_DESCRIPTION,
  MAX_PHOTOS,
  validateDraft,
  validatePhotoFile,
  type FieldErrors,
  type FieldName,
} from '../lib/validation';
import type { CategoryId } from '../types';

interface PhotoItem extends ProcessedPhoto {
  key: string;
  url: string;
}

/** 轉成 <input type="datetime-local"> 需要的格式（裝置當地時間） */
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const fieldId = (name: FieldName) => `field-${name}`;
const errorId = (name: FieldName) => `error-${name}`;

function FieldError({ name, errors }: { name: FieldName; errors: FieldErrors }) {
  const msg = errors[name];
  if (!msg) return null;
  return (
    <p id={errorId(name)} className="mt-2 flex items-start gap-1 text-sm text-red-700">
      <span aria-hidden="true">⚠</span>
      {msg}
    </p>
  );
}

function SectionTitle({ step, children }: { step: number; children: ReactNode }) {
  return (
    <span className="mb-3 flex items-center gap-2 text-base font-bold">
      <span
        aria-hidden="true"
        className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs text-white"
      >
        {step}
      </span>
      {children}
    </span>
  );
}

export default function ReportPage() {
  const { state: geo, locate } = useGeolocation();
  const [initialTime] = useState(() => toLocalInputValue(new Date()));

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [processing, setProcessing] = useState(0);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [locationByUser, setLocationByUser] = useState(false);
  const [reportedAt, setReportedAt] = useState(initialTime);
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [description, setDescription] = useState('');

  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const photosRef = useRef<PhotoItem[]>([]);
  photosRef.current = photos;

  // 離開頁面時釋放照片預覽佔用的記憶體
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const now = () => new Date();
  const draft = {
    category,
    description,
    location,
    reportedAt,
    photoCount: photos.length,
  };

  // 第一次按送出後，修改欄位時即時更新錯誤訊息
  useEffect(() => {
    if (attempted) setErrors(validateDraft(draft, now()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempted, category, description, location, reportedAt, photos.length]);

  const onLocationChange = useCallback((pos: LatLng, byUser: boolean) => {
    setLocation(pos);
    if (byUser) setLocationByUser(true);
  }, []);

  const onPickFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // 讓同一張照片可以再選一次
    if (files.length === 0) return;

    const notices: string[] = [];
    const room = MAX_PHOTOS - photos.length;
    if (files.length > room) notices.push(`最多只能上傳 ${MAX_PHOTOS} 張，已略過多選的照片`);

    const accepted = files.slice(0, Math.max(0, room)).filter((f) => {
      const err = validatePhotoFile(f);
      if (err) notices.push(err);
      return !err;
    });

    setProcessing((n) => n + accepted.length);
    for (const file of accepted) {
      try {
        const result = await processPhoto(file);
        const item: PhotoItem = {
          ...result,
          key: crypto.randomUUID(),
          url: URL.createObjectURL(result.blob),
        };
        setPhotos((prev) => (prev.length < MAX_PHOTOS ? [...prev, item] : prev));
      } catch (err) {
        notices.push(err instanceof Error ? err.message : '照片處理失敗，請再試一次');
      } finally {
        setProcessing((n) => n - 1);
      }
    }
    setPhotoNotice(notices.length > 0 ? notices.join('\n') : null);
  };

  const removePhoto = (key: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.key !== key);
    });
  };

  const isDirty =
    photos.length > 0 ||
    category !== null ||
    description.trim() !== '' ||
    locationByUser ||
    reportedAt !== initialTime;

  const goBack = () => {
    if (isDirty && !window.confirm('確定要放棄這次回報？已填寫的內容不會保存。')) return;
    navigate('map');
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || processing > 0) return;
    setAttempted(true);
    setSaveError(null);

    const found = validateDraft(draft, now());
    setErrors(found);
    const first = FIELD_ORDER.find((f) => found[f]);
    if (first) {
      const el = document.getElementById(fieldId(first));
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus({ preventScroll: true });
      return;
    }
    if (!category || !location) return; // 型別保護；上面的驗證已處理

    setSubmitting(true);
    try {
      const report = await createReport(
        {
          category,
          description,
          lat: location.lat,
          lng: location.lng,
          reportedAt: new Date(reportedAt).toISOString(),
        },
        photos,
      );
      setCreatedFlash(report.id);
      navigate('map');
    } catch {
      setSaveError('儲存失敗，請稍後再試。你填寫的內容都還在。');
      setSubmitting(false);
    }
  };

  const minTime = toLocalInputValue(new Date(Date.now() - MAX_AGE_DAYS * 24 * 3_600_000));
  const maxTime = toLocalInputValue(new Date());
  const descLength = description.trim().length;

  let locationHint: string;
  if (geo.status === 'locating' && !locationByUser) locationHint = '正在取得你的位置…';
  else if (location && !isInTaiwan(location.lat, location.lng))
    locationHint = '大頭針不在台灣範圍內，請移動地圖';
  else if (locationByUser) locationHint = '已選擇地點，可以繼續拖曳地圖微調';
  else if (geo.status === 'found') locationHint = '已使用你目前的位置，可拖曳地圖微調';
  else locationHint = '無法取得你的位置，請拖曳地圖，把大頭針對準問題地點';

  const ariaFor = (name: FieldName) => ({
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? errorId(name) : undefined,
  });

  return (
    <main className="flex min-h-full flex-col bg-surface">
      <header className="sticky top-0 z-[1100] flex items-center gap-2 bg-white px-2 pt-[env(safe-area-inset-top)] shadow-sm">
        <button
          type="button"
          onClick={goBack}
          aria-label="返回地圖"
          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl active:bg-gray-100"
        >
          ←
        </button>
        <h1 className="text-lg font-bold">回報路況</h1>
      </header>

      <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col">
        <div className="flex-1 space-y-3 p-3">
          {/* 1. 照片 */}
          <section className="rounded-2xl bg-white p-4">
            <SectionTitle step={1}>
              新增照片
              <span className="font-normal text-gray-500">（選填，最多 {MAX_PHOTOS} 張）</span>
            </SectionTitle>
            <div id={fieldId('photos')} tabIndex={-1} className="grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <div key={p.key} className="relative aspect-square">
                  <img
                    src={p.url}
                    alt={`已選照片 ${i + 1}`}
                    className="h-full w-full rounded-xl border border-gray-200 bg-surface object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(p.key)}
                    aria-label={`移除照片 ${i + 1}`}
                    className="absolute -right-1 -top-1 flex h-11 w-11 items-center justify-center"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900/80 text-sm text-white">
                      ✕
                    </span>
                  </button>
                </div>
              ))}
              {Array.from({ length: processing }).map((_, i) => (
                <div
                  key={`processing-${i}`}
                  role="status"
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl bg-surface text-xs text-gray-500"
                >
                  <span
                    aria-hidden="true"
                    className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent"
                  />
                  照片處理中…
                </div>
              ))}
              {photos.length + processing < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 active:bg-gray-50"
                >
                  <span aria-hidden="true" className="text-3xl leading-none">
                    ＋
                  </span>
                  <span className="text-sm">新增照片</span>
                </button>
              )}
            </div>
            <input
              ref={fileInput}
              // 用 image/*：iPhone 會自動把 HEIC 轉成 JPEG；實際格式再由 validatePhotoFile 檢查
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onPickFiles}
            />
            <p className="mt-2 text-xs text-gray-500">
              照片會自動壓縮，並移除照片中的拍攝位置等資訊，保護你的隱私。
            </p>
            {photoNotice && (
              <p role="alert" className="mt-2 whitespace-pre-line text-sm text-red-700">
                {photoNotice}
              </p>
            )}
            <FieldError name="photos" errors={errors} />
          </section>

          {/* 2. 地點 */}
          <section className="rounded-2xl bg-white p-4">
            <SectionTitle step={2}>
              選擇地點<span className="font-normal text-red-700">*</span>
            </SectionTitle>
            <div id={fieldId('location')} tabIndex={-1}>
              <LocationPicker
                geo={geo}
                onChange={onLocationChange}
                invalid={Boolean(errors.location)}
                describedBy={errors.location ? errorId('location') : undefined}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-sm text-gray-600" aria-live="polite">
                {locationHint}
              </p>
              <button
                type="button"
                onClick={locate}
                disabled={geo.status === 'locating'}
                className="h-11 flex-none rounded-full px-3 text-sm font-medium text-blue-700 active:bg-blue-50 disabled:opacity-50"
              >
                重新定位
              </button>
            </div>
            <FieldError name="location" errors={errors} />
          </section>

          {/* 3. 時間 */}
          <section className="rounded-2xl bg-white p-4">
            <label htmlFor={fieldId('reportedAt')}>
              <SectionTitle step={3}>
                發生時間<span className="font-normal text-red-700">*</span>
              </SectionTitle>
            </label>
            <input
              id={fieldId('reportedAt')}
              type="datetime-local"
              value={reportedAt}
              min={minTime}
              max={maxTime}
              onChange={(e) => setReportedAt(e.target.value)}
              className={`h-12 w-full rounded-xl border bg-white px-3 text-base ${errors.reportedAt ? 'border-red-600' : 'border-gray-300'}`}
              {...ariaFor('reportedAt')}
            />
            <FieldError name="reportedAt" errors={errors} />
          </section>

          {/* 4. 路況問題 */}
          <fieldset
            id={fieldId('category')}
            tabIndex={-1}
            className="rounded-2xl bg-white p-4"
            {...ariaFor('category')}
          >
            <legend className="float-left w-full">
              <SectionTitle step={4}>
                路況問題<span className="font-normal text-red-700">*</span>
              </SectionTitle>
            </legend>
            <div className="clear-both grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => {
                const checked = category === c.id;
                return (
                  <label
                    key={c.id}
                    className={`flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-[15px] ${
                      checked ? 'border-brand bg-orange-50 font-bold' : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={c.id}
                      checked={checked}
                      onChange={() => setCategory(c.id)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 flex-none items-center justify-center rounded-full"
                      style={{ backgroundColor: c.color }}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm">
                        {c.emoji}
                      </span>
                    </span>
                    {c.label}
                  </label>
                );
              })}
            </div>
            <FieldError name="category" errors={errors} />
          </fieldset>

          {/* 5. 詳細說明 */}
          <section className="rounded-2xl bg-white p-4">
            <label htmlFor={fieldId('description')}>
              <SectionTitle step={5}>
                詳細說明
                {category === 'other' ? (
                  <span className="font-normal text-red-700">*（選「其他」時必填）</span>
                ) : (
                  <span className="font-normal text-gray-500">（選填）</span>
                )}
              </SectionTitle>
            </label>
            <textarea
              id={fieldId('description')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={MAX_DESCRIPTION + 50}
              placeholder="例如：變電箱擋住大半個人行道，推嬰兒車過不去"
              className={`w-full resize-none rounded-xl border p-3 text-base ${errors.description ? 'border-red-600' : 'border-gray-300'}`}
              {...ariaFor('description')}
            />
            <p
              className={`text-right text-xs ${descLength > MAX_DESCRIPTION ? 'text-red-700' : 'text-gray-500'}`}
            >
              {descLength}/{MAX_DESCRIPTION}
            </p>
            <FieldError name="description" errors={errors} />
          </section>
        </div>

        {/* 送出 */}
        <div className="sticky bottom-0 z-[1100] space-y-2 bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
          {saveError && (
            <p role="alert" className="text-center text-sm text-red-700">
              {saveError}
            </p>
          )}
          {attempted && Object.keys(errors).length > 0 && (
            <p role="alert" className="text-center text-sm text-red-700">
              還有 {Object.keys(errors).length} 個欄位需要修正
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || processing > 0}
            className="h-14 w-full rounded-full bg-brand text-lg font-bold text-white shadow-md active:bg-brand-dark disabled:bg-gray-400"
          >
            {submitting ? '送出中…' : processing > 0 ? '照片處理中…' : '送出回報'}
          </button>
        </div>
      </form>
    </main>
  );
}
