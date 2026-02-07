"use client";

import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase"; // 既存のFirebase初期化を使う想定（違うなら後で直す）

type CreateStudentResult = { ok: boolean; studentId: string };

export default function AdminStudentsPage() {
  const [studentId, setStudentId] = useState("taro_yamada");
  const [displayName, setDisplayName] = useState("山田 太郎");
  const [pin, setPin] = useState("1234");
  const [active, setActive] = useState(true);
  const [adminKey, setAdminKey] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCreate() {
    setMsg(null);
    setBusy(true);
    try {
      const functions = getFunctions(app, "asia-northeast1");
      const fn = httpsCallable(functions, "createStudent");
      const res = await fn({
        studentId,
        displayName,
        pin,
        active,
        adminKey,
      });
      const data = res.data as CreateStudentResult;
      setMsg(`作成OK: studentId=${data.studentId}`);
    } catch (e: any) {
      setMsg(e?.message ?? "作成に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">生徒アカウント作成（管理者）</h1>

      <div className="space-y-2">
        <label className="block text-sm">生徒ID（英数字推奨）</label>
        <input className="w-full border rounded p-2" value={studentId} onChange={(e) => setStudentId(e.target.value)} />

        <label className="block text-sm">表示名（生徒名）</label>
        <input className="w-full border rounded p-2" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />

        <label className="block text-sm">PIN（生徒に渡す）</label>
        <input className="w-full border rounded p-2" value={pin} onChange={(e) => setPin(e.target.value)} />

        <label className="block text-sm">有効（active）</label>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />

        <label className="block text-sm mt-2">adminKey（管理者だけが知る鍵）</label>
        <input className="w-full border rounded p-2" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} />
      </div>

      <button
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        disabled={busy}
        onClick={onCreate}
      >
        {busy ? "作成中..." : "作成"}
      </button>

      {msg && <div className="text-sm whitespace-pre-wrap">{msg}</div>}
    </div>
  );
}
