// lib/schema.ts

export const SUBJECTS = ["国語", "数学", "英語", "理科", "社会", "その他"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const PURPOSES = ["予習", "復習", "宿題", "テスト勉強", "確認テスト", "その他"] as const;
export type Purpose = (typeof PURPOSES)[number];

export const SLOTS = ["15:00", "16:00", "17:00", "18:00", "19:00", "20:00"] as const;
export type Slot = (typeof SLOTS)[number];

export const EXPLANATION_LEVELS = ["weak", "medium", "strong"] as const;
export type ExplanationLevel = (typeof EXPLANATION_LEVELS)[number];

export type SelfMark = "○" | "×";
export type BookingStatus = "active"; // cancelledは使わない（完全削除の方針）
export type RecordStatus = "draft" | "confirmed";

export type Booking = {
  bookingId: string; // docIdにも使う（堅い一意制約）
  recordId: string; // bookingId と同じ
  studentId: string;
  date: string; // YYYY-MM-DD
  slot: Slot;

  subject: Subject;
  purpose: Purpose;

  unit: string;
  memo: string;
  explanationLevel: ExplanationLevel;

  capacity: number; // 20固定でOK

  status: BookingStatus;

  createdAt: number;
  updatedAt: number;
};

export type Record = {
  recordId: string; // bookingId推奨
  bookingId: string;

  studentId: string;
  date: string;
  slot: Slot;

  subject: Subject;
  purpose: Purpose;

  unit: string;
  memo: string;
  explanationLevel: ExplanationLevel;

  // 生徒が当日入力
  goal: string;
  reflection: string;
  selfMark: SelfMark | null;

  // 講師/管理者（任意）
  teacherComment: string;

  status: RecordStatus;

  createdAt: number;
  updatedAt: number;

  confirmedBy?: string;
  confirmedAt?: number;
};
