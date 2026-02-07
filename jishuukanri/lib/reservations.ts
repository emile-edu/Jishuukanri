// lib/reservations.ts
import { db } from "./firebase";
import {
  doc,
  runTransaction,
  serverTimestamp,
  increment,
} from "firebase/firestore";

/**
 * ルール
 */
const MAX_SEATS_PER_SLOT = 20;   // 1枠あたり最大人数
const DAILY_MAX_SLOTS = 2;       // 1日最大2枠（=2時間）
const MONTHLY_MAX_HOURS = 30;    // 月30時間まで

/**
 * 引数
 */
type CreateReservationArgs = {
  userId: string;
  date: string;        // "2026-02-08"
  starts: string[];    // ["15"] or ["15","16"]（最大2つ）
};

/**
 * 予約作成（複数枠を1トランザクションで確定）
 */
export async function createReservation({
  userId,
  date,
  starts,
}: CreateReservationArgs) {
  if (starts.length === 0 || starts.length > DAILY_MAX_SLOTS) {
    throw new Error("選択できるのは1〜2枠までです");
  }

  await runTransaction(db, async (tx) => {
    // === 月利用時間チェック ===
    const month = date.slice(0, 7); // "2026-02"
    const userMonthRef = doc(db, "userMonths", `${userId}_${month}`);
    const userMonthSnap = await tx.get(userMonthRef);

    const usedHours = userMonthSnap.exists()
      ? userMonthSnap.data().usedHours ?? 0
      : 0;

    if (usedHours + starts.length > MONTHLY_MAX_HOURS) {
      throw new Error("月の利用上限を超えます");
    }

    // === 日別利用チェック ===
    const userDayRef = doc(db, "userDays", `${userId}_${date}`);
    const userDaySnap = await tx.get(userDayRef);

    const alreadyBooked = userDaySnap.exists()
      ? (userDaySnap.data().starts ?? []).length
      : 0;

    if (alreadyBooked + starts.length > DAILY_MAX_SLOTS) {
      throw new Error("1日の利用上限（2枠）を超えます");
    }

    // === 各枠チェック & 予約 ===
    for (const start of starts) {
      const slotId = `${date}_${start}`;
      const slotRef = doc(db, "slots", slotId);
      const slotSnap = await tx.get(slotRef);

      const count = slotSnap.exists() ? slotSnap.data().count ?? 0 : 0;

      if (count >= MAX_SEATS_PER_SLOT) {
        throw new Error(`${start}時の枠は満席です`);
      }

      // 枠人数 +1
      tx.set(
        slotRef,
        { count: increment(1) },
        { merge: true }
      );

      // 予約記録
      const reservationRef = doc(db, "reservations", crypto.randomUUID());
      tx.set(reservationRef, {
        userId,
        date,
        start,
        hours: 1,
        status: "active",
        createdAt: serverTimestamp(),
      });
    }

    // === userDays 更新 ===
    tx.set(
      userDayRef,
      { starts },
      { merge: true }
    );

    // === userMonths 更新 ===
    tx.set(
      userMonthRef,
      { usedHours: increment(starts.length) },
      { merge: true }
    );
  });
}
