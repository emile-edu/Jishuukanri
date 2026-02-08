"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, signOut } from "firebase/auth";

import { getBookingsByMonth } from "@/lib/firestore";
import type { Booking } from "@/lib/schema";

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

export default function AdminCalendarPage() {
  const router = useRouter();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [errorText, setErrorText] = useState<string>("");

  const ymKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;

  const loadMonth = async (ym: string) => {
    try {
      setErrorText("");
      const list = await getBookingsByMonth(ym);
      setBookings(list);
    } catch (e: any) {
      setBookings([]);
      setErrorText(e?.message ? String(e.message) : String(e));
    }
  };

  useEffect(() => {
    void loadMonth(ymKey);
  }, [ymKey]);

  useEffect(() => {
    const onFocus = () => {
      void loadMonth(ymKey);
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
  }, [ymKey]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const booking of bookings) {
      const list = map.get(booking.date) ?? [];
      list.push(booking);
      map.set(booking.date, list);
    }
    for (const [key, list] of map.entries()) {
      list.sort((a, b) => String(a.slot).localeCompare(String(b.slot)));
      map.set(key, list);
    }
    return map;
  }, [bookings]);

  const weeks = useMemo(() => {
    // 月カレンダー(6週)生成
    const first = startOfMonth(cursor);
    const firstWeekday = first.getDay(); // 0=Sun
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - firstWeekday);

    const cells: { date: Date; inMonth: boolean; ymd: string }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const inMonth = d.getMonth() === cursor.getMonth();
      cells.push({ date: d, inMonth, ymd: ymd(d) });
    }

    const w: typeof cells[] = [];
    for (let i = 0; i < 6; i++) w.push(cells.slice(i * 7, i * 7 + 7));
    return w;
  }, [cursor]);

  const onLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
    } catch {
      // 失敗してもトップへ戻す
    } finally {
      router.push("/"); // ← ログイン方法選択へ
    }
  };

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>管理者カレンダー（月表示）</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>
            {cursor.getFullYear()}年{cursor.getMonth() + 1}月
          </div>
          <div style={{ marginTop: 6, color: "#555" }}>今月の予約合計：{bookings.length}件</div>
          {errorText && (
            <div style={{ marginTop: 8, color: "crimson", fontSize: 12, whiteSpace: "pre-wrap" }}>
              {errorText}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setCursor(startOfMonth(new Date()))}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc" }}
          >
            今日
          </button>
          <button
            onClick={() => setCursor(addMonths(cursor, -1))}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc" }}
          >
            ←
          </button>
          <button
            onClick={() => setCursor(addMonths(cursor, 1))}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc" }}
          >
            →
          </button>
          <button
            onClick={onLogout}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc" }}
          >
            ログアウト
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 820 }}>
          <thead>
            <tr>
              {["日", "月", "火", "水", "木", "金", "土"].map((w) => (
                <th key={w} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((row, idx) => (
              <tr key={idx}>
                {row.map((cell) => {
                  const list = bookingsByDate.get(cell.ymd) ?? [];
                  const cnt = list.length;
                  return (
                    <td
                      key={cell.ymd}
                      style={{
                        verticalAlign: "top",
                        height: 84,
                        padding: 10,
                        borderBottom: "1px solid #eee",
                        opacity: cell.inMonth ? 1 : 0.35,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{cell.date.getDate()}日</div>
                      {cnt > 0 && (
                        <div style={{ marginTop: 8, fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: 999,
                              border: "1px solid #ccc",
                              background: "#f7f7f7",
                              width: "fit-content",
                            }}
                          >
                            {cnt}件
                          </span>
                          {list.slice(0, 2).map((booking) => (
                            <div
                              key={booking.bookingId}
                              style={{
                                fontSize: 11,
                                padding: "4px 6px",
                                borderRadius: 8,
                                background: "#f2f2f2",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={`${booking.slot} ${booking.subject}`}
                            >
                              {booking.slot} {booking.subject}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </main>
  );
}
