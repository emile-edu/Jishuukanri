"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getBookingsByStudentAndMonth } from "@/lib/firestore";
import type { Booking } from "@/lib/schema";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function ymKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

function monthLabel(d: Date) {
  return `${d.getFullYear()}年 ${d.getMonth() + 1}月`;
}

function buildMonthGrid(view: Date) {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const startDow = first.getDay(); // 0=Sun
  const start = new Date(first);
  start.setDate(first.getDate() - startDow);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function StudentCalendarMonthPage() {
  const router = useRouter();

  const studentId = "demo-student";
  const [view, setView] = useState<Date>(() => new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [errorText, setErrorText] = useState<string>("");

  async function loadMonth(sid: string, v: Date) {
    const ym = ymKey(ymd(new Date(v)));
    try {
      setErrorText("");
      const list = await getBookingsByStudentAndMonth(sid, ym);
      setBookings(list);
    } catch (e: any) {
      // index required 等を画面にも出す（開発中はこれで十分）
      setBookings([]);
      setErrorText(e?.message ? String(e.message) : String(e));
    }
  }

  // 初回ロード + view変更で月取得
  useEffect(() => {
    void loadMonth(studentId, view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // 予約ページから戻ってきた時（iPadのタブ復帰/フォーカス）に再取得
  useEffect(() => {
    const onFocus = () => {
      void loadMonth(studentId, view);
    };
    const onVis = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [view]);

  const days = useMemo(() => buildMonthGrid(view), [view]);

  const monthCount = useMemo(() => {
    return bookings.length;
  }, [bookings]);

  // 日付→その日の予約（Booking）
  const byDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const arr = map.get(b.date) ?? [];
      arr.push(b);
      map.set(b.date, arr);
    }
    // slot順
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => String(a.slot).localeCompare(String(b.slot)));
      map.set(k, arr);
    }
    return map;
  }, [bookings]);

  const logout = () => {
    router.push("/");
  };

  return (
    <main style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>{monthLabel(view)}</h1>
          <div style={{ marginTop: 6, color: "#555" }}>
            今月の予約合計：{monthCount}/30
          </div>
          {errorText && (
            <div style={{ marginTop: 8, color: "crimson", fontSize: 12, whiteSpace: "pre-wrap" }}>
              {errorText}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setView(new Date())}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", background: "white" }}
          >
            今日
          </button>
          <button
            onClick={() => {
              const d = new Date(view);
              d.setMonth(d.getMonth() - 1);
              setView(d);
            }}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", background: "white" }}
          >
            前月
          </button>
          <button
            onClick={() => {
              const d = new Date(view);
              d.setMonth(d.getMonth() + 1);
              setView(d);
            }}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", background: "white" }}
          >
            次月
          </button>

          <button
            onClick={logout}
            style={{ marginLeft: 6, padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#f7f7f7" }}
          >
            ログアウト
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {["日", "月", "火", "水", "木", "金", "土"].map((w) => (
          <div key={w} style={{ fontWeight: 700, color: "#666", paddingLeft: 6 }}>
            {w}
          </div>
        ))}

        {days.map((d) => {
          const dateStr = ymd(d);
          const inMonth = d.getMonth() === view.getMonth();
          const list = byDate.get(dateStr) ?? [];
          const isToday = dateStr === ymd(new Date());

          // 未来だけ予約ページ、今日だけ記録ページ（要件どおり）
          const todayStr = ymd(new Date());
          const isFuture = dateStr > todayStr;

          return (
            <button
              key={dateStr}
              onClick={() => {
                if (!inMonth) return;
                if (isFuture) {
                  router.push(`/student/calendar/${dateStr}`);
                  return;
                }
                if (isToday) {
                  router.push(`/student/record/${dateStr}`);
                  return;
                }
              }}
              style={{
                textAlign: "left",
                minHeight: 90,
                padding: 10,
                borderRadius: 10,
                border: "1px solid #e5e5e5",
                background: isToday ? "#fff9d6" : "white",
                cursor: "pointer",
                opacity: inMonth ? 1 : 0.35,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{d.getDate()}</div>

              {list.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {list.slice(0, 2).map((b) => (
                    <div
                      // ✅ ここが「Console Error」(key警告) の原因だった場所
                      // Bookingには id じゃなく bookingId がある。これを key にする。
                      key={b.bookingId}
                      style={{
                        fontSize: 12,
                        padding: "4px 6px",
                        borderRadius: 8,
                        background: "#f2f2f2",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={`${b.slot} ${b.subject}`}
                    >
                      {String(b.subject)}
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 14, color: "#666", fontSize: 12 }}>
        日付をタップするとその日の予約ページへ移動します。予約済みの日は科目が表示されます。
      </div>
    </main>
  );
}
