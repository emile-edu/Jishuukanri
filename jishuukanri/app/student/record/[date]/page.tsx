"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import type { Record, SelfMark, Booking } from "@/lib/schema";
import {
  getBookingsByStudentAndDate,
  ensureRecordFromBooking,
  updateRecord,
  ymdLocal,
} from "@/lib/firestore";

const pageWrap: React.CSSProperties = { padding: 20, maxWidth: 900, margin: "0 auto" };
const headerRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 };

const backBtn: React.CSSProperties = {
  height: 36,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "white",
  padding: "0 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const title: React.CSSProperties = { fontSize: 22, fontWeight: 900, margin: 0 };

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
  background: "white",
  marginTop: 12,
};

const rowTop: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 };
const pill: React.CSSProperties = { display: "inline-block", padding: "2px 8px", borderRadius: 999, background: "#f3f4f6", fontSize: 12, fontWeight: 900 };

const label: React.CSSProperties = { fontWeight: 900, marginTop: 12 };
const inputStyle: React.CSSProperties = { width: "100%", height: 44, borderRadius: 12, border: "1px solid #d1d5db", padding: "0 12px", fontSize: 16 };
const textareaStyle: React.CSSProperties = { width: "100%", minHeight: 110, borderRadius: 12, border: "1px solid #d1d5db", padding: 12, fontSize: 16, resize: "vertical" };

const markRow: React.CSSProperties = { display: "flex", gap: 10, marginTop: 8 };
const markBtnStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  height: 44,
  borderRadius: 12,
  border: active ? "1px solid #111827" : "1px solid #d1d5db",
  background: active ? "#111827" : "white",
  color: active ? "white" : "#111827",
  fontWeight: 900,
  cursor: "pointer",
});

const saveBtnStyle = (disabled: boolean): React.CSSProperties => ({
  width: "100%",
  height: 52,
  borderRadius: 14,
  border: "1px solid transparent",
  background: disabled ? "#9ca3af" : "#111827",
  color: "white",
  fontSize: 16,
  fontWeight: 900,
  cursor: disabled ? "not-allowed" : "pointer",
  marginTop: 14,
});

const errBox: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#991b1b",
  fontWeight: 800,
};

export default function RecordDayPage() {
  const router = useRouter();
  const params = useParams();

  const date =
    typeof params?.date === "string"
      ? params.date
      : Array.isArray(params?.date)
      ? params.date[0]
      : "";

  // PIN運用前提：後でPIN→studentId解決に置き換える
  const studentId = "demo-student";

  const todayStr = useMemo(() => ymdLocal(new Date()), []);
  const isToday = date === todayStr;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // 入力状態は recordId をキーに持つ（Record はジェネリックじゃないので Record<...> は使わない）
  const [goalById, setGoalById] = useState<{ [recordId: string]: string }>({});
  const [reflectionById, setReflectionById] = useState<{ [recordId: string]: string }>({});
  const [selfMarkById, setSelfMarkById] = useState<{ [recordId: string]: SelfMark | null }>({});
  const [savingById, setSavingById] = useState<{ [recordId: string]: boolean }>({});

  const load = async () => {
    setErr(null);
    if (!date) return;

    // 今日だけ運用したい前提（保険）
    if (!isToday) {
      setErr("学習記録は「今日」だけ入力できます（今は）。");
      setBookings([]);
      setRecords([]);
      return;
    }

    const b = await getBookingsByStudentAndDate(studentId, date);
    b.sort((a, b) => (a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : 0));
    setBookings(b);

    const rs: Record[] = [];
    for (const booking of b) {
      const r = await ensureRecordFromBooking(booking);
      rs.push(r);
    }
    setRecords(rs);

    // 既存値で初期化
    const g: { [k: string]: string } = {};
    const ref: { [k: string]: string } = {};
    const sm: { [k: string]: SelfMark | null } = {};
    for (const r of rs) {
      g[r.recordId] = r.goal ?? "";
      ref[r.recordId] = r.reflection ?? "";
      sm[r.recordId] = r.selfMark ?? null;
    }
    setGoalById(g);
    setReflectionById(ref);
    setSelfMarkById(sm);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const saveOne = async (r: Record) => {
    setErr(null);
    const id = r.recordId;

    try {
      setSavingById((p) => ({ ...p, [id]: true }));

      await updateRecord(id, {
        goal: goalById[id] ?? "",
        reflection: reflectionById[id] ?? "",
        selfMark: selfMarkById[id] ?? null,
      });

    } catch (e: any) {
      setErr(e?.message ?? "保存に失敗しました");
    } finally {
      setSavingById((p) => ({ ...p, [id]: false }));
    }
  };

  return (
    <div style={pageWrap}>
      <div style={headerRow}>
        <button style={backBtn} onClick={() => router.push("/student/calendar")}>
          ← 月ページへ戻る
        </button>
        <h1 style={title}>学習記録</h1>
      </div>

      <div style={{ color: "#6b7280", fontWeight: 800 }}>日付: {date} / studentId: {studentId}</div>

      {err && <div style={errBox}>{err}</div>}

      {!err && bookings.length === 0 && (
        <div style={{ marginTop: 14, color: "#6b7280", fontWeight: 800 }}>
          今日の予約がありません。まず前日までに予約してください。
        </div>
      )}

      {records.map((r) => {
        const saving = !!savingById[r.recordId];
        const explanationLabel = r.explanationLevel === "weak" ? "弱" : r.explanationLevel === "medium" ? "中" : "強";

        return (
          <div key={r.recordId} style={card}>
            <div style={rowTop}>
              <div style={{ fontWeight: 900 }}>
                {r.slot} <span style={pill}>{r.subject}</span> <span style={pill}>{r.purpose}</span> <span style={pill}>解説:{explanationLabel}</span>
              </div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>recordId: {r.recordId}</div>
            </div>

            <div style={label}>予約内容（事前入力）</div>
            <div style={{ color: "#374151", fontWeight: 700, marginTop: 6 }}>
              単元: {r.unit || "—"} / メモ: {r.memo || "—"}
            </div>

            <div style={label}>今日の目標（生徒）</div>
            <input
              style={inputStyle}
              value={goalById[r.recordId] ?? ""}
              onChange={(e) => setGoalById((p) => ({ ...p, [r.recordId]: e.target.value }))}
              placeholder="例：一次関数の文章題を3問解けるようにする"
              disabled={saving}
            />

            <div style={label}>振り返り（生徒）</div>
            <textarea
              style={textareaStyle}
              value={reflectionById[r.recordId] ?? ""}
              onChange={(e) => setReflectionById((p) => ({ ...p, [r.recordId]: e.target.value }))}
              placeholder="例：できた/できなかった理由、次回やること"
              disabled={saving}
            />

            <div style={label}>自己評価（○=問題なし / ×=要復習）</div>
            <div style={markRow}>
              <button
                style={markBtnStyle(selfMarkById[r.recordId] === "○")}
                onClick={() => setSelfMarkById((p) => ({ ...p, [r.recordId]: "○" }))}
                disabled={saving}
              >
                ○
              </button>
              <button
                style={markBtnStyle(selfMarkById[r.recordId] === "×")}
                onClick={() => setSelfMarkById((p) => ({ ...p, [r.recordId]: "×" }))}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <button style={saveBtnStyle(saving)} disabled={saving} onClick={() => saveOne(r)}>
              {saving ? "保存中…" : "この記録を保存"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
