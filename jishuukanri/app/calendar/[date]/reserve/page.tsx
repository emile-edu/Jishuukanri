"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/app/providers";

type Reservation = {
  id: string;
  date: string;   // "YYYY-MM-DD"
  start: string;  // "HH:mm"
  title?: string;
};

export default function ReservePage({
  params,
}: {
  params: { date: string };
}) {
  const router = useRouter();
  const { userEmail, loading } = useAuth();

  const date = params.date; // "YYYY-MM-DD" を想定

  const [items, setItems] = useState<Reservation[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  // ログイン必須
  useEffect(() => {
    if (!loading && !userEmail) router.replace("/login");
  }, [loading, userEmail, router]);

  // その日の「予約枠」(例: plans) を読み込み
  // ※あなたの実データ構造が違う場合：
  //   - ここを「枠コレクション」に合わせて変更してください。
  useEffect(() => {
    if (!date) return;

    (async () => {
      // 例：plans コレクションに date が入っている想定
      const q = query(
        collection(db, "plans"),
        where("date", "==", date),
        orderBy("start", "asc")
      );
      const snap = await getDocs(q);

      const list: Reservation[] = [];
      snap.forEach((doc) => {
        const d = doc.data() as any;
        list.push({
          id: doc.id,
          date: d.date,
          start: d.start,
          title: d.title ?? "",
        });
      });

      setItems(list);
    })();
  }, [date]);

  const title = useMemo(() => `予約（${date}）`, [date]);

  async function reserve(plan: Reservation) {
    if (!userEmail) return;

    setSaving(plan.id);
    try {
      // reservations に「1予約 = 1ドキュメント」で保存（同一人物が複数予約OK）
      await addDoc(collection(db, "reservations"), {
        date: plan.date,
        start: plan.start,
        title: plan.title ?? "",
        userEmail,
        createdAt: serverTimestamp(),
      });

      alert("予約しました");
      // 必要ならここで一覧を再取得して反映もOK
    } finally {
      setSaving(null);
    }
  }

  if (loading || !userEmail) return null;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{title}</h1>
        <button
          onClick={() => router.push("/calendar")}
          className="rounded border px-3 py-1 text-sm"
        >
          カレンダーへ戻る
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-zinc-600">この日の予約枠がありません。</div>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <div key={p.id} className="rounded border p-4">
              <div className="font-medium">{p.start}</div>
              {p.title ? (
                <div className="text-sm text-zinc-600">{p.title}</div>
              ) : null}

              <button
                className="mt-3 rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
                onClick={() => reserve(p)}
                disabled={saving === p.id}
              >
                {saving === p.id ? "予約中..." : "この枠を予約"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
