/** 換頁時傳遞一次性的訊息（例如「剛新增的回報 id」），只存在記憶體中 */
let pendingCreatedId: string | null = null;

export function setCreatedFlash(id: string): void {
  pendingCreatedId = id;
}

export function peekCreatedFlash(): string | null {
  return pendingCreatedId;
}

export function clearCreatedFlash(): void {
  pendingCreatedId = null;
}
