/**
 * Chat building blocks shared by the teacher's and the parent's assistants:
 * the assistant row, tappable chips, the typing dots, and the input box with
 * simulated voice.
 */
import * as React from 'react';
import { Button } from '@bloomneo/uikit';
import { ArrowUp, Check, Loader2, Mic, SquarePen, X } from 'lucide-react';
import { LogoMark } from '@/shared/Logo';

export type ChipOf<A> = { label: string; act: A; icon?: React.ComponentType<{ className?: string }> };

export function AiRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <LogoMark className="mt-0.5 size-7 shrink-0" />
      <div className="min-w-0 flex-1 space-y-3">{children}</div>
    </div>
  );
}

export function Chips<A>({ chips, onAct, disabled }: { chips: ChipOf<A>[]; onAct: (a: A, label: string) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(({ label, act, icon: Icon }) => (
        <button
          key={label}
          disabled={disabled}
          onClick={() => onAct(act, label)}
          className="mm-glass inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition hover:-translate-y-px hover:text-primary active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          {Icon && <Icon className="size-4" />}
          {label}
        </button>
      ))}
    </div>
  );
}

export function Typing() {
  return (
    <AiRow>
      <div className="flex h-7 items-center gap-1" aria-label="Assistant is typing">
        {[0, 150, 300].map((d) => (
          <span key={d} className="size-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </AiRow>
  );
}

/* ── voice input (simulated) ───────────────────────────────────────────────
 * What the real app does: record → POST the audio to our API → OpenAI
 * gpt-4o-mini-transcribe → text back into the box to check.
 * The prototype has no server, so it plays a sample request as if spoken. */

let voiceTurn = 0;

function VoiceBar({ samples, onDone, onCancel }: { samples: string[]; onDone: (text: string) => void; onCancel: () => void }) {
  const [phrase] = React.useState(() => samples[voiceTurn++ % samples.length]);
  const words = React.useMemo(() => phrase.split(' '), [phrase]);
  const [heard, setHeard] = React.useState(0);
  const [secs, setSecs] = React.useState(0);
  const [stage, setStage] = React.useState<'listening' | 'transcribing'>('listening');
  const [bars, setBars] = React.useState<number[]>(() => Array.from({ length: 28 }, () => 0.2));

  // Waveform + "speech" while listening.
  React.useEffect(() => {
    if (stage !== 'listening') return;
    const wave = window.setInterval(() => setBars((b) => b.map(() => 0.15 + Math.random() * 0.85)), 110);
    const talk = window.setInterval(() => setHeard((n) => n + 1), 330);
    const clock = window.setInterval(() => setSecs((x) => x + 1), 1000);
    return () => { window.clearInterval(wave); window.clearInterval(talk); window.clearInterval(clock); };
  }, [stage]);

  const finish = React.useCallback(() => {
    setStage('transcribing');
    window.setTimeout(() => onDone(phrase), 900);
  }, [onDone, phrase]);

  // Stops by itself a beat after the last word, like silence detection.
  React.useEffect(() => {
    if (stage === 'listening' && heard >= words.length + 2) finish();
  }, [heard, words.length, stage, finish]);

  return (
    <div className="mm-glass mm-glow rounded-[1.75rem] p-3 ring-2 ring-primary/30">
      <p className="min-h-6 px-1 text-base">
        {words.slice(0, heard).join(' ')}
        {stage === 'listening' && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" />}
        {heard === 0 && <span className="text-muted-foreground">Speak now — English, हिंदी or తెలుగు</span>}
      </p>
      <div className="mt-2 flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" className="size-10 shrink-0 rounded-full" aria-label="Cancel recording" onClick={onCancel}>
          <X className="size-5" />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {stage === 'listening' ? (
            <>
              <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-destructive" />
              <span className="w-9 shrink-0 text-sm tabular-nums text-muted-foreground">0:{String(secs).padStart(2, '0')}</span>
              <div className="flex h-8 flex-1 items-center gap-[3px] overflow-hidden" aria-hidden>
                {bars.map((h, i) => (
                  <span key={i} className="mm-gradient w-[3px] shrink-0 rounded-full transition-[height] duration-100" style={{ height: `${Math.round(h * 100)}%` }} />
                ))}
              </div>
            </>
          ) : (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" /> Transcribing…
            </span>
          )}
        </div>
        <Button type="button" size="icon" className="mm-gradient size-10 shrink-0 rounded-full shadow-md" aria-label="Stop and transcribe" onClick={finish} disabled={stage !== 'listening' || heard === 0}>
          <Check className="size-5" />
        </Button>
      </div>
    </div>
  );
}

/**
 * The message box: type, or tap the mic to speak. New chat sits at the left
 * once there's a conversation. `hint` shows under the box unless a voice
 * transcript is waiting to be checked.
 */
export function ChatInput({ text, setText, onSend, empty, onNewChat, samples, placeholder, label, hint }: {
  text: string;
  setText: (t: string) => void;
  onSend: (t: string) => void;
  empty: boolean;
  onNewChat: () => void;
  samples: string[];
  placeholder: string;
  label: string;
  hint?: React.ReactNode;
}) {
  const [recording, setRecording] = React.useState(false);
  const [fromVoice, setFromVoice] = React.useState(false);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // While recording, the phone tab bar steps aside (see .qc-tabbar in brand.css).
  React.useEffect(() => {
    const root = document.documentElement;
    if (recording) root.dataset.qcRecording = '';
    else delete root.dataset.qcRecording;
    return () => { delete root.dataset.qcRecording; };
  }, [recording]);

  // Fit the box to its text — also when voice fills it, not only on typing.
  React.useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text, recording]);

  const box = recording ? (
    <VoiceBar
      samples={samples}
      onCancel={() => setRecording(false)}
      onDone={(t) => {
        setRecording(false);
        setText(t);
        setFromVoice(true);
        window.setTimeout(() => inputRef.current?.focus(), 50);
      }}
    />
  ) : (
    <form
      onSubmit={(e) => { e.preventDefault(); onSend(text); }}
      className={`mm-glass mm-glow flex items-end gap-2 rounded-[1.75rem] p-2 ${empty ? 'pl-4' : 'pl-2'} transition focus-within:ring-2 focus-within:ring-primary/30`}
    >
      {!empty && (
        <Button type="button" variant="ghost" size="icon" className="size-10 shrink-0 rounded-full text-muted-foreground" aria-label="New chat" onClick={onNewChat}>
          <SquarePen className="size-5" />
        </Button>
      )}
      <textarea
        ref={inputRef}
        rows={1}
        value={text}
        onChange={(e) => { setText(e.target.value); setFromVoice(false); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(text); }
        }}
        placeholder={placeholder}
        aria-label={label}
        className="max-h-[140px] min-h-10 flex-1 resize-none bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground"
      />
      {text.trim() ? (
        <Button type="submit" size="icon" className="mm-gradient size-10 shrink-0 rounded-full shadow-md hover:opacity-90" aria-label="Send">
          <ArrowUp className="size-5" />
        </Button>
      ) : (
        <Button type="button" size="icon" className="mm-gradient size-10 shrink-0 rounded-full shadow-md hover:opacity-90" aria-label="Speak" onClick={() => setRecording(true)}>
          <Mic className="size-5" />
        </Button>
      )}
    </form>
  );

  return (
    <>
      {box}
      {fromVoice && text.trim() && !recording ? (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Mic className="size-3.5 text-primary" /> Heard you — edit if needed, then send
        </p>
      ) : (!recording && hint)}
    </>
  );
}
