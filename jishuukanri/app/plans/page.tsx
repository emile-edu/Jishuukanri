"use client";

import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import jaLocale from "@fullcalendar/core/locales/ja";

function toYmd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function StudentPlansCalendarPage() {
  const router = useRouter();

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        予約（生徒）
      </h1>

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={jaLocale}
        height="auto"
        dateClick={(arg) => {
          const dateStr = toYmd(arg.date);
          router.push(`/plans/${dateStr}`);
        }}
      />

      <p style={{ marginTop: 12, color: "#666", fontSize: 12 }}>
        日付をクリックすると、その日の予約枠一覧が開きます。
      </p>
    </div>
  );
}
