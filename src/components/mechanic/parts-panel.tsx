"use client";

import { useState, useTransition } from "react";
import { recordPartReceiptAction, removePartAction, sendPartsQuoteAction, type FormState } from "@/app/(mechanic)/mechanic/actions";
import { Button } from "@/components/ui/button";
import { Badge, Notice } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";

export type PartRow = {
  id: string;
  name: string;
  part_number: string | null;
  quantity: number;
  quoted_unit_cents: number;
  status: "quoted" | "approved" | "declined" | "purchased" | "removed";
  receipt_cents: number | null;
};

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const STATUS: Record<PartRow["status"], { label: string; tone: "warn" | "ok" | "danger" | "info" | "neutral" }> = {
  quoted: { label: "Waiting for customer", tone: "warn" },
  approved: { label: "Approved — buy it", tone: "info" },
  purchased: { label: "Bought", tone: "ok" },
  declined: { label: "Declined", tone: "danger" },
  removed: { label: "Removed", tone: "neutral" },
};

type Draft = { name: string; part_number: string; quantity: string; unit_price: string };
const emptyDraft = (): Draft => ({ name: "", part_number: "", quantity: "1", unit_price: "" });

export function PartsPanel({
  bookingId,
  mechanicId,
  parts,
  handlingBps,
  hint,
}: {
  bookingId: string;
  mechanicId: string;
  parts: PartRow[];
  handlingBps: number;
  hint: { cents: number; basis: string } | null;
}) {
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();
  const live = parts.filter((p) => p.status !== "removed" && p.status !== "declined");
  const [editing, setEditing] = useState(live.length === 0);
  const [drafts, setDrafts] = useState<Draft[]>(
    live.filter((p) => p.status === "quoted").length
      ? live.filter((p) => p.status === "quoted").map((p) => ({ name: p.name, part_number: p.part_number ?? "", quantity: String(p.quantity), unit_price: (p.quoted_unit_cents / 100).toFixed(2) }))
      : [emptyDraft()],
  );
  const draftTotal = drafts.reduce((s, d) => s + Math.round(Number(d.unit_price || 0) * 100) * Number(d.quantity || 0), 0);
  const handling = Math.round((draftTotal * handlingBps) / 10000);

  function send() {
    setState({});
    start(async () => {
      const res = await sendPartsQuoteAction(
        bookingId,
        drafts.filter((d) => d.name.trim()).map((d) => ({ name: d.name, part_number: d.part_number, quantity: Number(d.quantity), unit_price: Number(d.unit_price) })),
      );
      setState(res);
      if (res.ok) setEditing(false);
    });
  }

  return (
    <div className="rounded-[var(--radius-control)] border border-line bg-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-display text-lg font-bold text-cream uppercase">Parts</h4>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-ore hover:underline">
            {live.length ? "Send an updated quote" : "Add parts quote"}
          </button>
        )}
      </div>
      {hint && hint.cents > 0 && (
        <p className="mt-1 text-xs text-muted">
          Parts estimate the customer saw at booking: about {usd(hint.cents)}.
        </p>
      )}
      {state.error && (
        <div className="mt-3">
          <Notice tone="danger">{state.error}</Notice>
        </div>
      )}
      {state.message && (
        <div className="mt-3">
          <Notice tone="ok">{state.message}</Notice>
        </div>
      )}

      {live.length > 0 && !editing && (
        <ul className="mt-3 space-y-3">
          {live.map((p) => (
            <li key={p.id} className="rounded-[var(--radius-control)] border border-line bg-surface p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-cream">
                  {p.quantity} × {p.name}
                  {p.part_number && <span className="text-muted"> · #{p.part_number}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-ink">
                    {p.status === "purchased" ? `${usd(p.receipt_cents ?? 0)} (receipt)` : `${usd(p.quantity * p.quoted_unit_cents)} quoted`}
                  </span>
                  <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                </span>
              </div>
              {p.status === "approved" && <ReceiptUpload bookingId={bookingId} mechanicId={mechanicId} part={p} onDone={setState} />}
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-xs text-muted">
            List each part at what you expect to pay. The customer approves the list in the app before you buy anything, and is charged your receipt amount
            (never more than they approved) plus {handlingBps / 100}% handling, which goes to you.
          </p>
          {drafts.map((d, i) => (
            <div key={i} className="grid grid-cols-6 gap-2">
              <Input aria-label="Part name" placeholder="Front brake pads" value={d.name} onChange={(e) => setDrafts(upd(drafts, i, { name: e.target.value }))} className="col-span-6 sm:col-span-2" />
              <Input aria-label="Part number" placeholder="Part # (optional)" value={d.part_number} onChange={(e) => setDrafts(upd(drafts, i, { part_number: e.target.value }))} className="col-span-3 sm:col-span-2" />
              <Input aria-label="Quantity" type="number" min={1} max={50} value={d.quantity} onChange={(e) => setDrafts(upd(drafts, i, { quantity: e.target.value }))} className="col-span-1" />
              <Input aria-label="Unit price in dollars" type="number" min={0} step="0.01" placeholder="$" value={d.unit_price} onChange={(e) => setDrafts(upd(drafts, i, { unit_price: e.target.value }))} className="col-span-2 sm:col-span-1" />
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button type="button" onClick={() => setDrafts([...drafts, emptyDraft()])} className="font-semibold text-ore hover:underline">
              + Add part
            </button>
            {drafts.length > 1 && (
              <button type="button" onClick={() => setDrafts(drafts.slice(0, -1))} className="text-muted hover:text-cream">
                Remove last
              </button>
            )}
            <span className="ml-auto text-cream">
              Parts {usd(draftTotal)} + handling {usd(handling)} = {usd(draftTotal + handling)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={send} disabled={pending || draftTotal <= 0}>
              {pending ? "Sending…" : "Send quote to customer"}
            </Button>
            {live.length > 0 && (
              <Button size="sm" variant="subtle" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function upd(list: Draft[], i: number, patch: Partial<Draft>) {
  return list.map((d, j) => (j === i ? { ...d, ...patch } : d));
}

function ReceiptUpload({ bookingId, mechanicId, part, onDone }: { bookingId: string; mechanicId: string; part: PartRow; onDone: (s: FormState) => void }) {
  const [amount, setAmount] = useState((part.quantity * part.quoted_unit_cents / 100).toFixed(2));
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!file) return onDone({ error: "Add a photo or PDF of the receipt." });
    if (file.size > 10 * 1024 * 1024) return onDone({ error: "Receipt must be under 10 MB." });
    setBusy(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${mechanicId}/${bookingId}/${part.id}-${Date.now()}.${ext}`;
    const { error } = await createClient().storage.from("part-receipts").upload(path, file, { contentType: file.type || undefined });
    if (error) {
      setBusy(false);
      return onDone({ error: "Upload failed. Please try again." });
    }
    onDone(await recordPartReceiptAction(bookingId, part.id, Number(amount), path));
    setBusy(false);
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="text-xs text-muted">
        Receipt amount ($)
        <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-28 py-2" />
      </label>
      <label className="text-xs text-muted">
        Receipt photo
        <Input type="file" accept="image/*,application/pdf" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 py-1.5" />
      </label>
      <Button size="sm" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save receipt"}
      </Button>
      <button type="button" onClick={async () => onDone(await removePartAction(bookingId, part.id))} className="text-xs text-muted hover:text-danger">
        Didn&apos;t need it
      </button>
    </div>
  );
}
