"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordJobPhotoAction, removeJobPhotoAction } from "@/app/(mechanic)/mechanic/actions";
import { Notice } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/client";

const uniqueId = () => crypto.randomUUID();

export type JobPhoto = { id: string; kind: "before" | "after"; url: string };

const KINDS = [
  { kind: "before", title: "Before", hint: "The car and the problem area when you arrive." },
  { kind: "after", title: "After", hint: "The finished work and anything you replaced." },
] as const;

/** Read-only gallery (customer booking page). */
export function PhotoGallery({ photos }: { photos: JobPhoto[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {KINDS.map(({ kind, title }) => {
        const list = photos.filter((p) => p.kind === kind);
        return (
          <div key={kind}>
            <h3 className="text-sm font-semibold tracking-wider text-muted uppercase">{title}</h3>
            {list.length ? (
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {list.map((p) => (
                  <li key={p.id}>
                    <a href={p.url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-[var(--radius-control)] border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived storage URLs */}
                      <img src={p.url} alt={`${title} photo`} className="h-full w-full object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No {kind} photos.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Mechanic uploader for an active job. */
export function JobPhotosPanel({ bookingId, mechanicId, photos, max }: { bookingId: string; mechanicId: string; photos: JobPhoto[]; max: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(kind: "before" | "after", files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(kind);
    const room = max - photos.filter((p) => p.kind === kind).length;
    for (const file of Array.from(files).slice(0, Math.max(room, 0))) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Each photo must be under 10 MB.");
        continue;
      }
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${mechanicId}/${bookingId}/${kind}-${uniqueId()}.${ext}`;
      const { error: upErr } = await createClient().storage.from("job-photos").upload(path, file, { contentType: file.type || undefined });
      if (upErr) {
        setError("Upload failed. Please try again.");
        continue;
      }
      const res = await recordJobPhotoAction(bookingId, kind, path);
      if (res.error) setError(res.error);
    }
    if (files.length > room) setError(`Up to ${max} ${kind} photos per job.`);
    setBusy(null);
    router.refresh();
  }

  async function remove(id: string) {
    setError(null);
    const res = await removeJobPhotoAction(bookingId, id);
    if (res.error) setError(res.error);
    router.refresh();
  }

  return (
    <div className="rounded-[var(--radius-control)] border border-line bg-raised p-4">
      <h4 className="font-display text-lg font-bold text-cream uppercase">Photos</h4>
      <p className="mt-1 text-xs text-muted">The customer sees these on their booking. They protect you both if there&apos;s ever a question about the work.</p>
      {error && (
        <div className="mt-3">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {KINDS.map(({ kind, title, hint }) => {
          const list = photos.filter((p) => p.kind === kind);
          return (
            <div key={kind}>
              <p className="text-sm font-semibold text-cream">
                {title} <span className="font-normal text-muted">({list.length}/{max})</span>
              </p>
              <p className="text-xs text-muted">{hint}</p>
              {list.length > 0 && (
                <ul className="mt-2 grid grid-cols-3 gap-2">
                  {list.map((p) => (
                    <li key={p.id} className="relative aspect-square overflow-hidden rounded-[var(--radius-control)] border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived storage URLs */}
                      <img src={p.url} alt={`${title} photo`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => remove(p.id)}
                        className="absolute top-1 right-1 grid size-8 place-items-center rounded-full bg-bg/80 text-sm text-cream hover:text-danger"
                        aria-label={`Remove ${kind} photo`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {list.length < max && (
                <label className="mt-2 inline-flex cursor-pointer items-center rounded-[var(--radius-control)] border border-line-strong px-3 py-2 text-sm font-semibold text-ore hover:border-ore">
                  {busy === kind ? "Uploading…" : `+ Add ${kind} photos`}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    capture="environment"
                    className="sr-only"
                    disabled={busy !== null}
                    aria-label={`Add ${kind} photos`}
                    onChange={(e) => {
                      void upload(kind, e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
