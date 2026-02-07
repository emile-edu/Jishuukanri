// lib/ids.ts
export function makeBookingId(date: string, slot: string) {
  // 例: 2026-02-12_1800
  return `${date}_${slot.replace(":", "")}`;
}
