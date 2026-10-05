/** @jsxImportSource preact */
import { useEffect, useRef, useState } from "preact/hooks";
import type { Category, Entry } from "../../shared/types";
import { api } from "../shared/ipc-api";

function dateTimeValue(ms: number): string {
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function EditEntry({ entry, onClose, onSaved }: {
  entry: Entry; onClose: () => void; onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [content, setContent] = useState(entry.content);
  const [category, setCategory] = useState<Category | "">(entry.category ?? "");
  const [start, setStart] = useState(dateTimeValue(entry.interval_start));
  const [end, setEnd] = useState(dateTimeValue(entry.interval_end));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (saving) return;
    const interval_start = start === dateTimeValue(entry.interval_start) ? entry.interval_start : new Date(start).getTime();
    const interval_end = end === dateTimeValue(entry.interval_end) ? entry.interval_end : new Date(end).getTime();
    if (!content.trim() || !Number.isFinite(interval_start) || !Number.isFinite(interval_end) || interval_end <= interval_start) {
      setError("Enter a task and an end time after the start time.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.updateEntry(entry.id, { content, category: category || null, interval_start, interval_end });
      onSaved();
    } catch {
      setError("Could not save this log. Your changes are still here; please try again.");
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialog} class="entry-dialog" aria-labelledby="edit-title"
      onCancel={(event) => { if (saving) event.preventDefault(); else onClose(); }}>
      <form onSubmit={save} class="flex flex-col gap-4">
        <h2 id="edit-title" class="text-[15px] font-semibold">Edit task log</h2>
        <label class="edit-label">Task
          <textarea autoFocus required rows={3} value={content} disabled={saving}
            onInput={(event) => setContent(event.currentTarget.value)} />
        </label>
        <label class="edit-label">Category
          <select value={category} disabled={saving}
            onChange={(event) => setCategory(event.currentTarget.value as Category | "")}>
            <option value="">Uncategorized</option>
            <option value="focus_3">Productivity 3</option>
            <option value="focus_2">Productivity 2</option>
            <option value="focus_1">Productivity 1</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </label>
        <label class="edit-label">Start
          <input type="datetime-local" step="1" required value={start} disabled={saving}
            onInput={(event) => setStart(event.currentTarget.value)} />
        </label>
        <label class="edit-label">End
          <input type="datetime-local" step="1" required value={end} disabled={saving}
            onInput={(event) => setEnd(event.currentTarget.value)} />
        </label>
        {error && <p role="alert" class="text-xs text-red-400">{error}</p>}
        <div class="flex gap-2 justify-end">
          <button type="button" class="edit-cancel" disabled={saving} onClick={onClose}>Cancel</button>
          <button type="submit" class="edit-save" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </dialog>
  );
}
