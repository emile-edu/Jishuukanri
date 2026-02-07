"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import type { Booking, ExplanationLevel, Purpose, Slot, Subject } from "@/lib/schema";
import { SUBJECTS, PURPOSES, SLOTS, EXPLANATION_LEVELS } from "@/lib/schema";
import {
  saveBookingWithRules,
  getBookingsByStudentAndDate,
  deleteBooking,
  makeBookingId,
  ymdLocal,
} from "@/lib/firestore";

const pageWrap: React.CSSProperties = { padding: 20, maxWidth: 820, margin: "0 auto" };
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
};

const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "center" };

const label: React.CSSProperties = { fontWeight: 800, color: "#111827" };

const selectStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  padding: "0 12px",
  background: "white",
  fontSize: 16,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  padding: "0 12px",
  background: "white",
  fontSize: 16,
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 110,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  padding: 12,
  background: "white",
  fontSize: 16,
  resize: "vertical",
};

const helpText: React.CSSProperties = { fontSize: 12, color: "#6b7280", marginTop: 6 };

const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
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

const listWrap: React.CSSProperties = { marginTop: 16 };
const listTitle: React.CSSProperties = { fontSize: 14, fontWeight: 900, margin: "0 0 8px 0" };

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  background: "white",
  marginBottom: 8,
};

const pill: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 999,
  background: "#f3f4f6",
  fontSize: 12,
  fontWeight: 800,
};

const dangerBtnStyle = (disabled: boolean): React.CSSProperties => ({
  height: 36,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: disabled ? "#f3f4f6" : "white",
  padding: "0 12px",
  fontWeight: 900,
  cursor: disabled ? "not-allowed" : "pointer",
  color: disabled ? "#9ca3af" : "#b91c1c",
});

export default function CalendarDatePage() {
  const router = useRouter();
  const params = useParams();

  const date =
    typeof params?.date === "string"
      ? params.date
      : Array.isArray(params?.date)
      ? params.date[0]
      : "";

  // PIN運用前提：ここは後で localStorage/PIN解決に置き換える
  const studentId = "demo-student";

  // 初期値は配列先頭に寄せて「定義変更に強く」する
  const [slot, setSlot] = useState<Slot>(SLOTS[0]);
  const [subject, setSubject] = useState<Subject>(SUBJECTS[0]);
  const [purpose, setPurpose] = useState<Purpose>(PURPOSES[0]);
  const [explanationLevel, setExplanationLevel] = useState<ExplanationLevel>("medium");
  const [unit, setUnit] = useState("");
  const [memo, setMemo] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const todayStr = useMemo(() => ymdLocal(new Date()), []);
  const isToday = date === todayStr;

  // 予約ページに入れた＝未来日（カレンダー側で制御してる想定）だが、保険で表示
  const isFuture = date > todayStr;

  const load = async () => {
    if (!date) return;
    const list = await getBookingsByStudentAndDate(studentId, date);
    // slot順で見やすく
    list.sort((a, b) => (a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : 0));
    setMyBookings(list);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const canSubmit = !!date && isFuture && !saving;

  const resetForm = () => {
    setSlot(SLOTS[0]);
    setSubject(SUBJECTS[0]);
    setPurpose(PURPOSES[0]);
    setExplanationLevel("medium");
    setUnit("");
    setMemo("");
  };

  const onSave = async () => {
    setErr(null);
    if (!date) return;

    // 未来日のみ予約可（保険）
    if (!isFuture) {
      setErr("予約は前日までです（当日は予約できません）");
      return;
    }

    try {
      setSaving(true);

      const bookingId = makeBookingId(studentId, date, slot);
      const recordId = bookingId;

      await saveBookingWithRules({
        bookingId,
        recordId,
        studentId,
        date,
        slot,
        subject,
        purpose,
        unit,
        memo,
        explanationLevel,
        capacity: 20,
      });

      await load();
      resetForm();
    } catch (e: any) {
      setErr(e?.message ?? "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const canDelete = (targetDate: string) => {
    // 完全削除。ただし当日は削除不可（最終防衛はFirestoreルールでやる）
    return targetDate > todayStr;
  };

  const onDelete = async (bookingId: string, targetDate: string) => {
    setErr(null);
    if (!canDelete(targetDate)) {
      setErr("当日の取消しはできません");
      return;
    }
    if (!confirm("この予約を取り消しますか？（完全削除）")) return;

    try {
      await deleteBooking(bookingId);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "取消しに失敗しました");
    }
  };

  return (
    <div style={pageWrap}>
      <div style={headerRow}>
        <button style={backBtn} onClick={() => router.push("/student/calendar")}>
          ← 月ページへ戻る
        </button>
        <h1 style={title}>予約ページ</h1>
      </div>

      <div style={{ color: "#6b7280", fontWeight: 800, marginBottom: 12 }}>日付: {date}</div>

      <div style={card}>
        {!isFuture && (
          <div style={errBox}>
            この日付は予約できません（予約は前日まで）。{isToday ? "今日は学習記録ページを使ってください。" : ""}
          </div>
        )}

        <div style={grid}>
          <div style={label}>時間帯</div>
          <select style={selectStyle} value={slot} onChange={(e) => setSlot(e.target.value as Slot)} disabled={!isFuture || saving}>
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <div style={label}>科目</div>
          <select style={selectStyle} value={subject} onChange={(e) => setSubject(e.target.value as Subject)} disabled={!isFuture || saving}>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <div style={label}>目的</div>
          <select style={selectStyle} value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose)} disabled={!isFuture || saving}>
            {PURPOSES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <div style={label}>解説必要度</div>
          <select
            style={selectStyle}
            value={explanationLevel}
            onChange={(e) => setExplanationLevel(e.target.value as ExplanationLevel)}
            disabled={!isFuture || saving}
          >
            {EXPLANATION_LEVELS.map((lv) => (
              <option key={lv} value={lv}>
                {lv === "weak" ? "弱" : lv === "medium" ? "中" : "強"}
              </option>
            ))}
          </select>

          <div style={label}>単元</div>
          <div>
            <input
              style={inputStyle}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="例：一次関数"
              disabled={!isFuture || saving}
            />
            <div style={helpText}>学習した範囲（ページや章など）を書いておくと記録が後で見やすいです。</div>
          </div>

          <div style={label}>メモ</div>
          <div>
            <textarea
              style={textareaStyle}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="例：プリント3枚、間違い直し、先生に質問したい点など"
              disabled={!isFuture || saving}
            />
            <div style={helpText}>「どこで詰まったか」「次やること」を短く残すのがおすすめ。</div>
          </div>
        </div>

        <button style={primaryBtnStyle(!canSubmit)} disabled={!canSubmit} onClick={onSave}>
          {saving ? "保存中…" : "この内容で予約を追加"}
        </button>

        {err && <div style={errBox}>{err}</div>}
      </div>

      <div style={listWrap}>
        <div style={listTitle}>この日の予約（本人）</div>
        {myBookings.length === 0 ? (
          <div style={{ color: "#6b7280", fontWeight: 700 }}>まだ予約はありません。</div>
        ) : (
          myBookings.map((b) => (
            <div key={b.bookingId} style={row}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontWeight: 900 }}>
                  {b.slot} <span style={pill}>{b.subject}</span> <span style={pill}>{b.purpose}</span>{" "}
                  <span style={pill}>{b.explanationLevel === "weak" ? "弱" : b.explanationLevel === "medium" ? "中" : "強"}</span>
                </div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>
                  unit: {b.unit || "—"} / memo: {b.memo ? (b.memo.length > 30 ? b.memo.slice(0, 30) + "…" : b.memo) : "—"}
                </div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>bookingId: {b.bookingId}</div>
              </div>

              <button style={dangerBtnStyle(!canDelete(b.date))} disabled={!canDelete(b.date)} onClick={() => onDelete(b.bookingId, b.date)}>
                取消し
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
