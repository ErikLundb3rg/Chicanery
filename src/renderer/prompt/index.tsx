/** @jsxImportSource preact */
import { render } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { api } from "../shared/ipc-api";

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

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
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleSubmit();
    }
    if (e.key === "Escape") {
      handleSkip();
    }
  }

  return (
    <>
      <div class="header">
        <span class="title">What did you work on?</span>
        {intervalStart > 0 && (
          <span class="time-range">
            {formatTime(intervalStart)} – {formatTime(intervalEnd)}
          </span>
        )}
      </div>
      <textarea
        ref={textareaRef}
        placeholder="e.g. Reviewed PRs, fixed login bug, team standup…"
        value={text}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
        onKeyDown={handleKeyDown}
        rows={3}
      />
      <div class="actions">
        <button class="btn-skip" onClick={handleSkip}>Skip</button>
        <button
          class="btn-submit"
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
