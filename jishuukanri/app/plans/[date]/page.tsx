"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/app/providers";
import { createReservation } from "@/lib/reservations";

const MAX_SEATS_PER_SLOT = 20;

// 例：生徒が選べる開始時刻（必要ならここを増減）
const START_OPTIONS = ["15", "16", "17", "18", "19", "20"];

type SlotInfo = {
  start: string;
  count: number; // 予約人数
};

export default function PlansByDatePage() {
  const params = useParams<{ date: string }>();
  const date = params.date; // "YYYY-MM-DD"
  const router = useRouter();
  const { userEmail, loading } = useAuth();

  const [slots, setSlots] = useState<Record<string, SlotInfo>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  // ログイン必須（未ログインならloginへ）
  useEffect(() => {
    if (!loading && !userEmail) router.push("/login");
  }, [loading, userEmail, router]);

  // slots を読み込み（count がなければ 0 扱い）
  useEffect(() => {
    let cancelled = false;

    async function loadSlots() {
      setError("");
      const map: Record<string, SlotInfo> = {};

      for (const start of START_OPTIONS) {
        const slotId = `${date}_${start}`;
        const ref = doc(db, "slots", slotId);
        const snap = await getDoc(ref);
        const count = snap.exists() ? (snap.data().count ?? 0) : 0;
        map[start] = { start, count };
      }

      if (!cancelled) setSlots(map);
    }

    if (date) loadSlots();

    return () => {
      cancelled = true;
    };
  }, [date]);

  const selectable = useMemo(() => {
    return START_OPTIONS.map((start) => {
      const count = slots[start]?.count ?? 0;
      const isFull = count >= MAX_SEATS_PER_SLOT;
      return { start, count, isFull };
    });
  }, [slots]);

  function toggleStart(start: string) {
    setError("");

    setSelected((prev) => {
      const exists = prev.includes(start);

      // 外す
      if (exists) return prev.filter((s) => s !== start);

      // 追加（最大2つ）
      if (prev.length >= 2) {
        setError("選べるのは最大2枠までです");
        return prev;
      }
      return [...prev, start].sort((a, b) => Number(a) - Number(b));
    });
  }

  async function onSubmit() {
    if (!userEmail) return;
    setError("");

    if (selected.length === 0) {
      setError("少なくとも1枠選んでください");
      return;
    }

    try {
      setSubmitting(true);

      await createReservation({
        userId: userEmail,
        date,
        starts: selected,
      });

      // 成功したら予約完了画面に飛ばす（なければ plans に戻す等でもOK）
      router.push(`/plans/${date}/done?starts=${selected.join(",")}`);
    } catch (e: any) {
      setError(e?.message ?? "予約に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !userEmail) {
    return (
      <div className="p-6">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <Link className="text-sm text-zinc-600 hover:underline" href="/plans">
            ← 日付選択に戻る
          </Link>
          <div className="text-sm text-zinc-500">{date}</div>
        </div>

        <h1 className="mb-2 text-xl font-semibold">予約枠を選択（最大2枠）</h1>
        <p className="mb-4 text-sm text-zinc-600">
          1枠=1時間です。最大2枠まで選べます（連続でも飛び飛びでもOK）。
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {selectable.map(({ start, count, isFull }) => {
            const isSelected = selected.includes(start);
            const disabled = isFull || submitting;

            return (
              <button
                key={start}
                onClick={() => toggleStart(start)}
                disabled={disabled}
                className={[
                  "rounded-lg border px-4 py-3 text-left transition",
                  disabled ? "cursor-not-allowed opacity-60" : "hover:bg-zinc-50",
                  isSelected ? "border-zinc-900 bg-zinc-100" : "border-zinc-200",
                ].join(" ")}
              >
                <div className="text-base font-medium">{start}:00〜</div>
                <div className="text-xs text-zinc-600">
                  {isFull ? "満席" : `予約数: ${count}/${MAX_SEATS_PER_SLOT}`}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-zinc-700">
            選択中:{" "}
            {selected.length === 0 ? (
              <span className="text-zinc-400">なし</span>
            ) : (
              <span className="font-semibold">
                {selected.map((s) => `${s}:00`).join(", ")}
              </span>
            )}
          </div>

          <button
            onClick={onSubmit}
            disabled={submitting || selected.length === 0}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "確定中..." : "この内容で予約する"}
          </button>
        </div>
      </div>
    </div>
  );
}
