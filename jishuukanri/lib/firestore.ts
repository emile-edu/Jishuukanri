"use client";

// lib/firestore.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  limit,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import type { Booking, Record, Slot } from "./schema";

/** YYYY-MM-DD をローカル基準で作る（カレンダー側の ymd と同じ思想） */
export function ymdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 予約ID（docId）: studentId_date_slot で “同生徒・同日・同時刻” を強制一意にする */
export function makeBookingId(studentId: string, date: string, slot: Slot) {
  return `${studentId}_${date}_${slot}`;
}

/** 予約を date+studentId で取得（activeのみ） */
export async function getBookingsByStudentAndDate(studentId: string, date: string): Promise<Booking[]> {
  const q = query(
    collection(db, "bookings"),
    where("studentId", "==", studentId),
    where("date", "==", date),
    where("status", "==", "active")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Booking);
}

/** 予約を1件取得（docId） */
export async function getBooking(bookingId: string): Promise<Booking | null> {
  const ref = doc(db, "bookings", bookingId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as Booking;
}

/**
 * 予約保存（制約込み）
 * - 同日同時刻重複不可: docIdで強制（上書き禁止）
 * - 同日上限3コマ: 事前に件数チェック
 */
export async function saveBookingWithRules(input: Omit<Booking, "createdAt" | "updatedAt" | "status">) {
  const now = Date.now();
  const booking: Booking = {
    ...input,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  // 同日上限 3
  const sameDay = await getBookingsByStudentAndDate(booking.studentId, booking.date);
  if (sameDay.length >= 3) {
    throw new Error("1日の予約は最大3コマまでです");
  }

  // docIdで重複禁止（既に存在したらエラー）
  const ref = doc(db, "bookings", booking.bookingId);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error("同じ時間帯の予約は既にあります");
  }

  await setDoc(ref, booking);
  return booking;
}

/**
 * 予約削除（完全削除）
 * - 当日削除不可：ここではUI側で防ぐ（最終防衛はFirestoreルールでやる想定）
 */
export async function deleteBooking(bookingId: string) {
  const ref = doc(db, "bookings", bookingId);
  await deleteDoc(ref);
}

/**
 * Record（学習記録）を予約から作る
 * - 既にあればそのまま（上書きしない）
 */
export async function ensureRecordFromBooking(booking: Booking) {
  const ref = doc(db, "records", booking.recordId);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as Record;

  const now = Date.now();
  const record: Record = {
    recordId: booking.recordId,
    bookingId: booking.bookingId,
    studentId: booking.studentId,
    date: booking.date,
    slot: booking.slot,
    subject: booking.subject,
    purpose: booking.purpose,
    unit: booking.unit,
    memo: booking.memo,
    explanationLevel: booking.explanationLevel,

    goal: "",
    reflection: "",
    selfMark: null,

    teacherComment: "",
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(ref, record);
  return record;
}

/** record を更新（生徒入力） */
export async function updateRecord(recordId: string, data: Partial<Record>) {
  const ref = doc(db, "records", recordId);
  await updateDoc(ref, { ...data, updatedAt: Date.now() });
}

/** record を取得 */
export async function getRecord(recordId: string): Promise<Record | null> {
  const ref = doc(db, "records", recordId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as Record;
}

/** 管理者/講師が確定（ここは auth 必須のままでOK） */
export async function confirmRecord(recordId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("not logged in");

  const ref = doc(db, "records", recordId);
  await updateDoc(ref, {
    status: "confirmed",
    confirmedBy: user.uid,
    confirmedAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export { saveBookingWithRules as saveBooking };

/** 指定月の予約を取得（生徒本人・activeのみ） */
export async function getBookingsByStudentAndMonth(
  studentId: string,
  ym: string // "YYYY-MM"
): Promise<Booking[]> {
  const q = query(
    collection(db, "bookings"),
    where("studentId", "==", studentId),
    where("date", ">=", `${ym}-01`),
    where("date", "<=", `${ym}-31`),
    where("status", "==", "active")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Booking);
}
