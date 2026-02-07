"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/app/providers";

type Reservation = {
  id: string;
  date: string;      // "YYYY-MM-DD"
  start: string;     // "17" みたいな文字列
  hours: number;     // 1,2
  userId: string;    // 生徒ID（今はこれを表示名として使う）
  status?: string;   // "active" など
};

export default function AdminReservationsByDatePage() {
  const router = useRouter();
  const params = useParams<{ date: string }>();
  const date = params.date;

  const { userEmail, loading } = useAuth();

  // 管理者ログイン必須（未ログインなら /login）
  useEffect(() => {
    if (!loading && !userEmail) router.replace("/login");
  }, [loading, userEmail, router]);

  const [items, setItems] = useState<Reservation[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!date) return;

    (async () => {
      try {
        setFetching(true);
        setError("");

        // その日の予約を取得
        // status を使っているなら active のみに絞る（使ってないなら where を1つ減らす）
        const q = query(
          collection(db, "reservations"),
          where("date", "==", date),
          where("status", "==", "active")
        );

        const snap = await getDocs(q);
        const rows: Reservation[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Reservation, "id">),
        }));

        // start（時間）でソート
        rows.sort((a, b) => Number(a.start) - Number(b.start));
        setItems(rows);
      } catch (e: any) {
        setError(e?.message ?? "読み込みに失敗しました");
      } finally {
        setFetching(false);
      }
    })();
  }, [date]);

  // 時間帯ごとにまとめる
  const grouped = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of items) {
      const key = `${String(r.start).padStart(2, "0")}:00`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([time, list]) => ({ time, list }));
  }, [items]);

  if (loading || fetching) return <div className="p-6">読み込み中...</div>;
  if (!userEmail) return null;

  return (
    <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            予約者一覧（{date}）
          </h1>

          <Link
            href="/calendar"
            className="text-sm underline text-zinc-700 dark:text-zinc-200"
          >
            ← カレンダーへ戻る
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {grouped.length === 0 ? (
          <div className="rounded border bg-white p-4 text-sm dark:bg-black dark:text-zinc-50">
            予約はありません。
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ time, list }) => (
              <div key={time} className="rounded border bg-white p-4 dark:bg-black">
                <div className="mb-2 font-semibold text-black dark:text-zinc-50">
                  {time}
                </div>

                <ul className="space-y-2">
                  {list.map((r) => {
                    // 学習計画ページ（仮のURL設計）
                    // 例：/admin/plans/2026-02-08/17/A
                    const planHref = `/admin/plans/${r.date}/${r.start}/${r.userId}`;

                    return (
                      <li key={r.id} className="text-sm">
                        <Link
                          href={planHref}
                          className="underline text-zinc-800 dark:text-zinc-100"
                        >
                          {r.userId}
                        </Link>
                        <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                          （{r.hours}h）
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
