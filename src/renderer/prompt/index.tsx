/** @jsxImportSource preact */
import { render } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { api } from "../shared/ipc-api";
import { formatTime } from "../shared/formatters";

function PromptWindow() {
  const [text, setText] = useState("");
  const [intervalStart, setIntervalStart] = useState(0);
  const [intervalEnd, setIntervalEnd] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const cleanup = api.onNewPrompt((start, end) => {
      setIntervalStart(start);
      setIntervalEnd(end);
      setText("");
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
      await api.submitEntry(content, intervalStart, intervalEnd);
      setText("");
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
        <span class="text-[13px] font-semibold  tracking-wide">
          What did you do?
        </span>
        {intervalStart > 0 && (
          <span class="text-xs text-text-muted tabular-nums font-semibold">
            {formatTime(intervalStart)} – {formatTime(intervalEnd)}
          </span>
        )}
      </div>

      <textarea
        ref={textareaRef}
        class="no-drag flex-1 bg-surface-raised border border-border rounded-lg text-text-primary text-sm px-3 py-2.5 resize-none outline-none leading-relaxed focus:border-accent transition-colors placeholder:text-text-ghost"
        placeholder="e.g. Doom scrolled"
        value={text}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
        onKeyDown={handleKeyDown}
      />

      <div class="no-drag flex gap-2 mt-3">
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
