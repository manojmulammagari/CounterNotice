"use client";

import type { DeadlineResult } from "@/lib/deadline/compute";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatLongDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function downloadIcs(ics: string, filename: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Days-remaining pill ──────────────────────────────────────────────────────

function DaysPill({ daysRemaining }: { daysRemaining: number }) {
  if (daysRemaining < 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-900">
        This date may have passed
      </span>
    );
  }
  if (daysRemaining === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-900">
        Today is the last day
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-900">
      {daysRemaining} day{daysRemaining === 1 ? "" : "s"} left
    </span>
  );
}

// ── Null state ───────────────────────────────────────────────────────────────

function DeadlineNull() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-extrabold text-slate-900">⏰ Your deadline</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">
        We could not read the deadline from this paper. Find the date on your notice
        and count the days by hand. If you are not sure, ask for help today — do not
        wait.
      </p>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function DeadlineShield({ deadline }: { deadline: DeadlineResult | null }) {
  if (!deadline) return <DeadlineNull />;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Heading + pill */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-extrabold text-slate-900">⏰ Your deadline</h2>
        <DaysPill daysRemaining={deadline.daysRemaining} />
      </div>

      {/* Two stat boxes */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:gap-4">
        <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Your {deadline.noticePeriodDays}-day notice ends
          </p>
          <p className="mt-1 text-base font-bold text-slate-900">
            {formatLongDate(deadline.responseDeadline)}
          </p>
        </div>
        <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Landlord can file a court case as early as
          </p>
          <p className="mt-1 text-base font-bold text-slate-900">
            {formatLongDate(deadline.earliestFilingDate)}
          </p>
        </div>
      </div>

      {/* Caution */}
      {deadline.caution && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm leading-relaxed text-amber-900">{deadline.caution}</p>
        </div>
      )}

      {/* Calendar download button */}
      <button
        type="button"
        onClick={() => downloadIcs(deadline.icsEvent, "counternotice-deadline.ics")}
        className="mt-4 min-h-[44px] w-full rounded-xl bg-slate-900 px-4 py-3 text-base font-bold text-white transition hover:bg-slate-700 active:scale-95"
      >
        📅 Put this deadline in my calendar
      </button>
      <p className="mt-2 text-center text-xs text-slate-500">
        Works with Google Calendar, Apple Calendar, and Outlook.
      </p>
    </div>
  );
}