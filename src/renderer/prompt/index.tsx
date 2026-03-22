/** @jsxImportSource preact */
import { render } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { api } from "../shared/ipc-api";
import { formatTime } from "../shared/formatters";
import { FOCUS_LEVELS } from "../../shared/types";
import type { Category } from "../../shared/types";

function PromptWindow() {
  const [text, setText] = useState("");
  const [intervalStart, setIntervalStart] = useState(0);
  const [intervalEnd, setIntervalEnd] = useState(0);
  const [category, setCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isOverwrite, setIsOverwrite] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const cleanup = api.onNewPrompt(async (start, end) => {
      setIntervalStart(start);
      setIntervalEnd(end);
      setText("");
      setCategory(null);
      setIsOverwrite(await api.hasEntryForInterval(start, end));
      textareaRef.current?.focus();
    });
    textareaRef.current?.focus();
    return cleanup;
  }, []);

  async function handleSubmit() {
    const content = text.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    try {
      await api.submitEntry(content, intervalStart, intervalEnd, category);
      setText("");
      setCategory(null);
      api.closePrompt();
    } finally {
      setSubmitting(false);
    }
  }

  function handleSkip() {
    api.closePrompt();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit();
    if (e.key === "Escape") handleSkip();
  }

  return (
    <>
      <div class="flex items-center justify-between mb-2.5">
        <span class="text-[13px] font-semibold tracking-wide">
          What did you do?
        </span>
        <div class="flex items-center gap-2">
          {isOverwrite && (
            <span class="text-[11px] font-semibold text-red-500 uppercase tracking-wide">Overwrite</span>
          )}
          {intervalStart > 0 && (
            <span class="text-xs text-text-muted tabular-nums font-semibold">
              {formatTime(intervalStart)} – {formatTime(intervalEnd)}
            </span>
          )}
        </div>
      </div>

      <textarea
        ref={textareaRef}
        class="no-drag flex-1 bg-surface-raised border border-border rounded-lg text-text-primary text-sm px-3 py-2.5 resize-none outline-none leading-relaxed focus:border-accent transition-colors placeholder:text-text-ghost"
        placeholder="e.g. Doom scrolled"
        value={text}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
        onKeyDown={handleKeyDown}
      />

      <div class="no-drag flex items-center gap-2 mt-2.5">
        <span class="text-[11px] text-text-faint font-medium">Focus level</span>
        <div class="flex rounded-md border border-border overflow-hidden">
          {FOCUS_LEVELS.map((level) => (
            <button
              key={level.value}
              class={`w-8 py-1 text-[12px] font-medium cursor-pointer transition-colors border-r border-border last:border-r-0 ${
                category === level.value
                  ? "bg-accent text-white"
                  : "bg-surface-raised text-text-faint hover:text-text-muted"
              }`}
              onClick={() => setCategory(category === level.value ? null : level.value)}
            >
              {level.label}
            </button>
          ))}
        </div>
        <button
          class={`px-3 py-1 rounded-md text-[12px] font-medium cursor-pointer transition-colors border ${
            category === "maintenance"
              ? "bg-accent text-white border-accent"
              : "bg-surface-raised text-text-faint border-border hover:text-text-muted"
          }`}
          onClick={() => setCategory(category === "maintenance" ? null : "maintenance")}
        >
          Maintenance
        </button>
      </div>

      <div class="no-drag flex gap-2 mt-2">
        <button
          class="flex-1 bg-surface-raised text-text-muted border border-border rounded-[7px] text-[13px] font-medium py-1.5 cursor-pointer active:opacity-70 transition-opacity"
          onClick={handleSkip}
        >
          Skip
        </button>
        <button
          class="flex-1 bg-accent text-white rounded-[7px] text-[13px] font-medium py-1.5 cursor-pointer active:opacity-70 transition-opacity disabled:bg-accent-muted disabled:text-text-ghost disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={!text.trim() || submitting}
        >
          {submitting ? "Saving…" : "Log (⌘↵)"}
        </button>
      </div>
    </>
  );
}

render(<PromptWindow />, document.getElementById("app")!);
