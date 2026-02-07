"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { STORAGE_ALL } from "@/app/lib/storageKeys";

type Reservation = {
  id: string;
  studentId: string;
  date: string;   // "2026-02-06"
  slot: string;   // "18:00〜" など
  subject: string;
  purpose: string;
  unit: string;
  helpLevel: string;
  createdAt: number;
};

export default function AdminDayPage() {
  const params = useParams<{ date: string }>();
  const date = params?.date;

  const all: Reservation[] = useMemo(() => {
    try {
      const raw = typeof window === "undefined" ? null : localStorage.getItem(STORAGE_ALL);
      return raw ? (JSON.parse(raw) as Reservation[]) : [];
    } catch {
      return [];
    }
  }, []);

  const list = useMemo(
    () => all.filter((r) => r.date === date),
    [all, date]
  );

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>予約一覧（{date}）</h1>
        <Link href="/calendar">カレンダーへ戻る</Link>
      </div>

      {list.length === 0 ? (
        <p>この日の予約はありません。</p>
      ) : (
        <ul style={{ marginTop: 16, lineHeight: 1.8 }}>
          {list.map((r) => (
            <li key={r.id}>
              {r.slot} / {r.subject} / {r.studentId}（{r.purpose}）
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
