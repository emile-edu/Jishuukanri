"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, signOut } from "firebase/auth";

import { STORAGE_ALL, DEMO_RES_KEY } from "@/app/lib/storageKeys";

import Link from "next/link";



type Reservation = {
  id: string;
  studentId: string;
  date: string;      // YYYY-MM-DD
  slot: string;      // "15:00" など
  subject: string;   // ← Subject じゃなく string
  purpose: string;   // ← Purpose じゃなく string
  unit: string;
  helpLevel: string; // ← HelpLevel じゃなく string
  createdAt: number;
};


type DemoReservation = {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  time: string;
  subject: string;
  purpose?: string;
  unit?: string;
  help?: string;
  createdAt: number;
};

function loadDemoReservations(): DemoReservation[] {
  try {
    const raw = localStorage.getItem(DEMO_RES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

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

function safeJsonParse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function loadAll(): Reservation[] {
  const x = safeJsonParse<Reservation[]>(
    localStorage.getItem(STORAGE_ALL),
    []
  );
  return Array.isArray(x) ? x : [];
}

export default function AdminCalendarPage() {
  const router = useRouter();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  // localStorage 読みはレンダリングごとに変わるので、軽く再評価できるようにする
  const all = useMemo(() => loadAll(), [cursor]);
  const debugText = `STORAGE_ALL count = ${all.length}\n` + JSON.stringify(all.slice(0, 3), null, 2);
useEffect(() => {
  console.log("STORAGE_ALL", loadAll());
}, [cursor]);

  const monthPrefix = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;

  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of all) {
      if (!r?.date?.startsWith(monthPrefix)) continue;
      map.set(r.date, (map.get(r.date) ?? 0) + 1);
    }
    return map;
  }, [all, monthPrefix]);

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
<pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#f5f5f5", padding: 12, borderRadius: 8 }}>
{[
  `origin: ${typeof window !== "undefined" ? location.origin : ""}`,
  `keys: ${typeof window !== "undefined" ? JSON.stringify(Object.keys(localStorage), null, 2) : ""}`,
  `STORAGE_ALL raw: ${typeof window !== "undefined" ? String(localStorage.getItem(STORAGE_ALL)) : ""}`,
  `DEMO_RES_KEY raw: ${typeof window !== "undefined" ? String(localStorage.getItem("DEMO_RES_KEY")) : ""}`,
].join("\n")}
</pre>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>管理者カレンダー（月表示）</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>
            {cursor.getFullYear()}年{cursor.getMonth() + 1}月
          </div>
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
                  const cnt = countByDate.get(cell.ymd) ?? 0;
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
                        <div style={{ marginTop: 8, fontSize: 12 }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: 999,
                              border: "1px solid #ccc",
                              background: "#f7f7f7",
                            }}
                          >
                            {cnt}件
                          </span>
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

      <p style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
        ※この管理者カレンダーはデモ用に localStorage（{DEMO_RES_KEY}）の予約から日別件数を集計して表示します。
      </p>
    </main>
  );
}
