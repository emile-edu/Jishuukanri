"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const onLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const allowed = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const email = result.user.email ?? "";

if (!allowed.includes(email)) {
  await auth.signOut();
  setError("このアカウントは管理者として許可されていません");
  setLoading(false);
  return;
}

      // ログインできたらカレンダーへ
      router.push("/calendar");
    } catch (e: any) {
      setError(e?.message ?? "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold">ログイン</h1>

      <button
        onClick={onLogin}
        disabled={loading}
        className="rounded bg-black px-4 py-3 text-white disabled:opacity-60"
      >
        {loading ? "ログイン中..." : "Googleでログイン"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-sm text-gray-500">
        ログイン後、/calendar に移動します。
      </p>
    </div>
  );
}