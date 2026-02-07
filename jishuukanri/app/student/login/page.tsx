"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase"; // 既存のFirebase初期化を使う

type StudentLoginResult = {
  ok: boolean;
  studentId: string;
  displayName?: string;
};

export default function StudentLoginPage() {
  const router = useRouter();

  const [studentId, setStudentId] = useState("taro_yamada");
  const [pin, setPin] = useState("1234");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onLogin = async () => {
    setLoading(true);
    setMsg(null);

try {
    const functions = getFunctions(app, "asia-northeast1");
    const fn = httpsCallable(functions, "studentLogin");

    const res = await fn({
      studentId: studentId.trim(),
      pin: pin.trim(),
    });

    setMsg("OK");
  // OKになった（成功）直後
localStorage.setItem("studentId", studentId.trim());
// displayName がまだ無いなら一旦空でOK
localStorage.setItem("displayName", "");
// 4桁PINは保存しない（保存すると危ない）
    router.push("/student/calendar");
  } catch (e: any) {
    setMsg(e?.message ?? "ログインに失敗しました");
  } finally {
    setLoading(false); // ← ★これが重要
  }
};

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">生徒ログイン</h1>

      <label className="flex flex-col gap-2">
        <span className="text-sm">生徒ID</span>
        <input
          className="rounded border px-3 py-2"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="taro_yamada"
          autoCapitalize="none"
          autoCorrect="off"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm">PIN</span>
        <input
          className="rounded border px-3 py-2"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="1234"
          inputMode="numeric"
        />
      </label>

      <button
        className="rounded bg-black px-4 py-3 text-white disabled:opacity-50"
        onClick={onLogin}
        disabled={loading}
      >
        {loading ? "ログイン中..." : "ログイン"}
      </button>

      {msg && <p className="text-sm">{msg}</p>}

      <p className="text-xs opacity-70">
        ※ 正しい studentId / PIN なら OK が出て /calendar に移動します
      </p>
    </main>
  );
}

