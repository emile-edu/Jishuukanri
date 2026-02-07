import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-10">
      <h1 className="text-2xl font-bold">自習管理（デモ）</h1>
      <p className="text-sm opacity-70">
        ログイン種別を選んでください
      </p>

      <div className="flex w-full flex-col gap-3">
        <Link
          href="/student/login"
          className="rounded bg-black px-4 py-3 text-center text-white"
        >
          生徒ログイン
        </Link>

        <Link
          href="/login"
          className="rounded border px-4 py-3 text-center"
        >
          管理者ログイン
        </Link>
      </div>
    </main>
  );
}
