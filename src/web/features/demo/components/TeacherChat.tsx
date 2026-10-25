/**
 * TeacherChat — the AI-native way to make a test paper.
 *
 * Chat first, but never chat only: every assistant turn offers something to
 * tap (chips, a chapter picker, a paper card with buttons), so a teacher can
 * get from "hi" to an assigned board-format paper without typing a sentence.
 *
 * Replies are scripted for the prototype. `parse()` stands in for the LLM's
 * tool-call arguments and the handlers below stand in for the tools
 * (generate_paper, update_paper, assign_paper). Assigning always needs an
 * explicit confirm tap — the assistant never sends anything on its own.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, CardContent, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, Sheet, SheetContent, SheetTrigger,
} from '@bloomneo/uikit';
import {
  ArrowUp, Eye, Download, Send, Shuffle, Plus, Check, FileText, Timer, Layers,
  CalendarDays, Users, CheckCircle2, Zap, GraduationCap, Target, Loader2, Menu, SquarePen, Mic, X,
} from 'lucide-react';
import { LogoMark, Wordmark } from '@/shared/Logo';
import { Sidebar, RoleSwitcher, ModeToggle } from './DemoShell';
import { CHAPTERS, SECTIONS, buildPaper, totalMarks, type SectionId } from '../data/questions';
import { parse, dueFrom, fmtDue, type Pattern } from '../data/intent';
import { useDemo, questionsOf, STUDENTS } from '../data/store';
import { PaperView } from './parts';

/* ── conversation model ─────────────────────────────────────────────────── */

type Act =
  | { t: 'say'; text: string }
  | { t: 'pattern'; pattern: Pattern }
  | { t: 'tweak'; paperId: string; tweak: 'shorter' | 'board' | 'shuffle' }
  | { t: 'addChapters'; paperId: string }
  | { t: 'assign'; paperId: string }
  | { t: 'due'; paperId: string; due: string }
  | { t: 'nav'; to: string };

type Chip = { label: string; act: Act; icon?: React.ComponentType<{ className?: string }> };

type Msg =
  | { id: number; from: 'me'; text: string }
  | { id: number; from: 'ai'; kind: 'text'; text: string; chips?: Chip[] }
  | { id: number; from: 'ai'; kind: 'chapters'; preset: string[]; paperId?: string; done?: boolean }
  | { id: number; from: 'ai'; kind: 'thinking' }
  | { id: number; from: 'ai'; kind: 'paper'; paperId: string }
  | { id: number; from: 'ai'; kind: 'confirm'; paperId: string; due: string; done?: 'yes' | 'no' }
  | { id: number; from: 'ai'; kind: 'assigned'; paperId: string; due: string; count: number };

type AiMsg = Extract<Msg, { from: 'ai' }>;
type NewAiMsg = AiMsg extends infer M ? (M extends AiMsg ? Omit<M, 'id' | 'from'> : never) : never;

type Draft = { chapters?: string[]; pattern?: Pattern; marks?: number; due?: string };

/** Survives navigating away and back within the session. */
const memory: { msgs: Msg[]; draft: Draft; active?: string } = { msgs: [], draft: {} };

let nextId = 1;
const id = () => nextId++;

const SHORT: Record<string, string> = {
  'Pair of Linear Equations': 'Linear Equations',
  'Arithmetic Progressions': 'APs',
  'Areas Related to Circles': 'Areas of Circles',
  'Surface Areas and Volumes': 'Surface Areas',
  'Coordinate Geometry': 'Coordinate Geo.',
};
const short = (c: string) => SHORT[c] ?? c;

function titleFor(chapters: string[], pattern: Pattern) {
  if (pattern === 'board') return chapters.length === CHAPTERS.length ? 'Pre-Board Practice Paper' : `Board Practice — ${chapters.length} chapters`;
  if (chapters.length === CHAPTERS.length) return 'Unit Test — Full Syllabus';
  return `Unit Test — ${chapters.length <= 2 ? chapters.map(short).join(' & ') : `${chapters.length} chapters`}`;
}

const SUGGESTIONS: { label: string; hint: string; text: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: 'Quick unit test', hint: '~30 marks · 1 hour', text: 'Make a quick unit test', icon: Zap },
  { label: 'Full board paper', hint: 'Sections A–E · 80 marks', text: 'Make a full board pattern paper on all chapters', icon: GraduationCap },
  { label: 'Trig & Circles, due Friday', hint: 'Short test, due Friday', text: 'Short test on trigonometry and circles, due Friday', icon: Target },
];

/* ── small pieces ───────────────────────────────────────────────────────── */

function AiRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <LogoMark className="mt-0.5 size-7 shrink-0" />
      <div className="min-w-0 flex-1 space-y-3">{children}</div>
    </div>
  );
}

function Chips({ chips, onAct, disabled }: { chips: Chip[]; onAct: (a: Act, label: string) => void; disabled?: boolean }) {
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

function Typing() {
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

const STEPS = ['Picking questions from the CBSE bank', 'Balancing sections A–E', 'Checking the marks total'];

function Thinking() {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    const t = window.setInterval(() => setN((x) => Math.min(x + 1, STEPS.length - 1)), 550);
    return () => window.clearInterval(t);
  }, []);
  return (
    <AiRow>
      <ul className="space-y-1.5 text-sm">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-2 ${i > n ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
            {i < n ? <Check className="size-4 text-success" /> : i === n ? <Loader2 className="size-4 animate-spin text-primary" /> : <span className="size-4" />}
            {s}
          </li>
        ))}
      </ul>
    </AiRow>
  );
}

function ChapterPicker({ msg, onSubmit }: { msg: Extract<Msg, { kind: 'chapters' }>; onSubmit: (chapters: string[]) => void }) {
  const [sel, setSel] = React.useState<string[]>(msg.preset);
  const all = sel.length === CHAPTERS.length;
  const toggle = (c: string) => setSel((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  if (msg.done) return null;
  return (
    <Card className="mm-glass mm-glow overflow-hidden rounded-3xl p-0">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSel(all ? [] : [...CHAPTERS])}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition ${all ? 'bg-[var(--color-highlight)] text-[var(--color-highlight-foreground)]' : 'border border-dashed border-border'}`}
          >
            All chapters
          </button>
          {CHAPTERS.map((c) => {
            const on = sel.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggle(c)}
                aria-pressed={on}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-sm transition active:scale-95 ${on ? 'bg-primary text-primary-foreground' : 'border border-border bg-card hover:border-primary'}`}
              >
                {on && <Check className="-ml-0.5 mr-1 inline size-3.5" />}
                {short(c)}
              </button>
            );
          })}
        </div>
        <Button className="w-full" disabled={!sel.length} onClick={() => onSubmit(sel)}>
          {sel.length ? `Continue with ${sel.length} chapter${sel.length > 1 ? 's' : ''}` : 'Pick at least one'}
        </Button>
      </CardContent>
    </Card>
  );
}

function PaperCard({
  paperId, latest, onAct, onPreview, onDownload,
}: {
  paperId: string;
  latest: boolean;
  onAct: (a: Act, label: string) => void;
  onPreview: (id: string) => void;
  onDownload: (id: string) => void;
}) {
  const { papers, submissions } = useDemo();
  const paper = papers.find((p) => p.id === paperId);
  if (!paper) return null;
  const qs = questionsOf(paper);
  const assigned = submissions.some((s) => s.paperId === paper.id);

  if (!latest) {
    return <p className="text-sm text-muted-foreground">↳ {paper.title} — updated below</p>;
  }

  const sections = (Object.keys(SECTIONS) as SectionId[])
    .map((s) => ({ s, n: qs.filter((q) => q.section === s).length }))
    .filter((x) => x.n);
  const chapters = [...new Set(qs.map((q) => q.chapter))];

  return (
    <div className="space-y-3">
      <Card className="mm-glass mm-glow gap-0 overflow-hidden rounded-3xl p-0">
        <div className="mm-tint border-b border-border/60 px-4 py-3.5">
          <div className="flex items-start gap-3">
            <span className="mm-gradient grid size-10 shrink-0 place-items-center rounded-xl shadow-sm">
              <FileText className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">{paper.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">CBSE · Class {paper.className} · Mathematics</p>
            </div>
            {assigned && <Badge variant="secondary">Assigned</Badge>}
          </div>
        </div>

        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-muted/70 px-2 py-2.5">
              <p className="text-lg font-semibold leading-none">{totalMarks(qs)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">marks</p>
            </div>
            <div className="rounded-lg bg-muted px-2 py-2">
              <p className="text-lg font-semibold leading-none">{qs.length}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">questions</p>
            </div>
            <div className="rounded-lg bg-muted px-2 py-2">
              <p className="text-lg font-semibold leading-none">{paper.durationMins >= 60 ? `${paper.durationMins / 60}h` : `${paper.durationMins}m`}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">duration</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {sections.map(({ s, n }) => (
              <span key={s} className="rounded-md border border-border px-2 py-0.5 text-xs">
                <span className="font-semibold">Sec {s}</span> <span className="text-muted-foreground">· {n}×{SECTIONS[s].marks}m</span>
              </span>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            <Layers className="mr-1 inline size-3.5" />
            {chapters.map(short).join(' · ')}
          </p>

          <ol className="space-y-1.5 border-t border-border pt-3 text-sm">
            {qs.slice(0, 3).map((q, i) => (
              <li key={q.id} className="flex gap-2">
                <span className="text-muted-foreground">{i + 1}.</span>
                <span className="line-clamp-1">{q.text}</span>
              </li>
            ))}
            {qs.length > 3 && <li className="pl-5 text-xs text-muted-foreground">+ {qs.length - 3} more questions</li>}
          </ol>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => onPreview(paper.id)}><Eye className="size-4" /> Preview</Button>
            <Button variant="outline" size="sm" onClick={() => onDownload(paper.id)}><Download className="size-4" /> PDF</Button>
            <Button size="sm" className="mm-gradient border-0 hover:opacity-90" onClick={() => onAct({ t: 'assign', paperId: paper.id }, 'Assign to 10-A')}><Send className="size-4" /> Assign</Button>
          </div>
        </CardContent>
      </Card>

      <Chips
        onAct={onAct}
        chips={[
          paper.pattern === 'board'
            ? { label: 'Make it shorter', act: { t: 'tweak', paperId: paper.id, tweak: 'shorter' }, icon: Timer }
            : { label: 'Full board pattern', act: { t: 'tweak', paperId: paper.id, tweak: 'board' }, icon: GraduationCap },
          { label: 'Shuffle questions', act: { t: 'tweak', paperId: paper.id, tweak: 'shuffle' }, icon: Shuffle },
          { label: 'Change chapters', act: { t: 'addChapters', paperId: paper.id }, icon: Plus },
        ]}
      />
    </div>
  );
}

function ConfirmCard({ msg, onConfirm, onCancel }: { msg: Extract<Msg, { kind: 'confirm' }>; onConfirm: () => void; onCancel: () => void }) {
  const { papers } = useDemo();
  const paper = papers.find((p) => p.id === msg.paperId);
  if (!paper) return null;
  return (
    <Card className="mm-glass mm-glow rounded-3xl p-0">
      <CardContent className="space-y-3 p-4">
        <p className="font-medium">Assign “{paper.title}”?</p>
        <dl className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2"><Users className="size-4 text-muted-foreground" /><dt className="text-muted-foreground">To</dt><dd className="ml-auto font-medium">Class 10-A · {STUDENTS.length} students</dd></div>
          <div className="flex items-center gap-2"><CalendarDays className="size-4 text-muted-foreground" /><dt className="text-muted-foreground">Due</dt><dd className="ml-auto font-medium">{fmtDue(msg.due)}</dd></div>
        </dl>
        <p className="text-xs text-muted-foreground">Parents get a reminder to download it. Marks come to you as soon as they upload.</p>
        {msg.done ? (
          <p className="text-sm font-medium text-muted-foreground">{msg.done === 'yes' ? 'Confirmed' : 'Cancelled'}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onCancel}>Not now</Button>
            <Button className="mm-gradient border-0 hover:opacity-90" onClick={onConfirm}><Check className="size-4" /> Confirm</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── voice input (simulated) ───────────────────────────────────────────────
 * What the real app does: record → POST the audio to our API → OpenAI
 * gpt-4o-mini-transcribe → text back into the box for the teacher to check.
 * The prototype has no server, so it plays a sample request as if spoken. */

const VOICE_SAMPLES = [
  '40-mark test on trigonometry and circles, due Friday',
  'Make a full board pattern paper on all chapters',
  'Quick unit test on quadratic equations and APs for tomorrow',
];
let voiceTurn = 0;

function VoiceBar({ onDone, onCancel }: { onDone: (text: string) => void; onCancel: () => void }) {
  const [phrase] = React.useState(() => VOICE_SAMPLES[voiceTurn++ % VOICE_SAMPLES.length]);
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

/** Honest note when the bank can't reach the marks the teacher asked for. */
function shortfall(got: number, target?: number): NewAiMsg[] {
  if (!target || got >= target) return [];
  return [{
    kind: 'text',
    text: `Heads-up: the question bank only has ${got} marks of questions for these chapters, so it’s ${target - got} short of ${target}. Add more chapters to reach it?`,
  }];
}

/* ── the chat ───────────────────────────────────────────────────────────── */

export function TeacherChat() {
  const { papers, createPaper, updatePaper, assignPaper } = useDemo();
  const navigate = useNavigate();
  const [msgs, setMsgs] = React.useState<Msg[]>(memory.msgs);
  const [typing, setTyping] = React.useState(false);
  const [text, setText] = React.useState('');
  const [preview, setPreview] = React.useState<string | null>(null);
  const [printId, setPrintId] = React.useState<string | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const [fromVoice, setFromVoice] = React.useState(false);

  // While recording, the phone tab bar steps aside (see .qc-tabbar in brand.css).
  React.useEffect(() => {
    const root = document.documentElement;
    if (recording) root.dataset.qcRecording = '';
    else delete root.dataset.qcRecording;
    return () => { delete root.dataset.qcRecording; };
  }, [recording]);
  const draft = React.useRef<Draft>(memory.draft);
  const active = React.useRef<string | undefined>(memory.active);
  const end = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    memory.msgs = msgs;
    memory.draft = draft.current;
    memory.active = active.current;
  });

  React.useEffect(() => {
    if (msgs.length) end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs.length, typing]);

  // Fit the box to its text — also when voice fills it, not only on typing.
  React.useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text, recording]);

  const push = (m: Msg) => setMsgs((xs) => [...xs, m]);
  const patch = (mid: number, p: Partial<Msg>) => setMsgs((xs) => xs.map((m) => (m.id === mid ? ({ ...m, ...p } as Msg) : m)));

  /** Assistant replies after a short "typing" beat, like a real model would. */
  const reply = (items: NewAiMsg[], delay = 550) => {
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setMsgs((xs) => [...xs, ...items.map((m) => ({ ...m, id: id(), from: 'ai' as const }) as Msg)]);
    }, delay);
  };

  /* tools ------------------------------------------------------------------ */

  const generate = (d: Required<Pick<Draft, 'chapters' | 'pattern'>> & Draft) => {
    const thinkingId = id();
    push({ id: thinkingId, from: 'ai', kind: 'thinking' });
    window.setTimeout(() => {
      const qs = buildPaper(d.chapters, d.pattern, 0, d.marks);
      const paper = createPaper({
        title: titleFor(d.chapters, d.pattern),
        subject: 'Mathematics (Standard)',
        className: '10-A',
        pattern: d.pattern,
        durationMins: d.pattern === 'board' ? 180 : 60,
        targetMarks: d.marks,
        questionIds: qs.map((q) => q.id),
      });
      active.current = paper.id;
      setMsgs((xs) => {
        const rest = xs.filter((m) => m.id !== thinkingId);
        const out: Msg[] = [
          ...rest,
          { id: id(), from: 'ai', kind: 'text', text: `Here’s your paper — ${qs.length} questions, ${totalMarks(qs)} marks, in the exact CBSE section format.` },
          { id: id(), from: 'ai', kind: 'paper', paperId: paper.id },
          ...shortfall(totalMarks(qs), d.marks).map((x) => ({ ...x, id: id(), from: 'ai' as const }) as Msg),
        ];
        if (d.due) out.push({ id: id(), from: 'ai', kind: 'confirm', paperId: paper.id, due: d.due });
        return out;
      });
      draft.current = {};
    }, 1800);
  };

  const advance = () => {
    const d = draft.current;
    if (!d.chapters?.length) {
      reply([
        { kind: 'text', text: 'Sure! Which chapters should it cover?' },
        { kind: 'chapters', preset: [] },
      ]);
    } else if (!d.pattern) {
      reply([{
        kind: 'text',
        text: `Got it — ${d.chapters.length === CHAPTERS.length ? 'all chapters' : d.chapters.map(short).join(', ')}. How long should it be?`,
        chips: [
          { label: 'Quick test · 1 hr', act: { t: 'pattern', pattern: 'unit' }, icon: Zap },
          { label: 'Full board paper · 3 hrs', act: { t: 'pattern', pattern: 'board' }, icon: GraduationCap },
        ],
      }]);
    } else {
      setTyping(false);
      generate(d as Required<Pick<Draft, 'chapters' | 'pattern'>> & Draft);
    }
  };

  const rebuild = (paperId: string, next: { chapters?: string[]; pattern?: Pattern; variant?: number; marks?: number | null }, note: string) => {
    const paper = papers.find((p) => p.id === paperId);
    if (!paper) return;
    const chapters = next.chapters ?? [...new Set(questionsOf(paper).map((q) => q.chapter))];
    const pattern = next.pattern ?? paper.pattern;
    // A pattern switch drops any old marks target; a new number replaces it.
    const marks = next.marks === null ? undefined : next.marks ?? (next.pattern ? undefined : paper.targetMarks);
    const qs = buildPaper(chapters, pattern, next.variant ?? 0, marks);
    updatePaper(paperId, {
      title: titleFor(chapters, pattern),
      pattern,
      durationMins: pattern === 'board' ? 180 : 60,
      targetMarks: marks,
      questionIds: qs.map((q) => q.id),
    });
    active.current = paperId;
    reply([
      { kind: 'text', text: note },
      { kind: 'paper', paperId },
      ...shortfall(totalMarks(qs), marks),
    ], 900);
  };

  const askDue = (paperId: string) =>
    reply([{
      kind: 'text',
      text: 'When is it due?',
      chips: [
        { label: 'Tomorrow', act: { t: 'due', paperId, due: dueFrom('tomorrow') }, icon: CalendarDays },
        { label: fmtDue(dueFrom('friday')), act: { t: 'due', paperId, due: dueFrom('friday') }, icon: CalendarDays },
        { label: 'In a week', act: { t: 'due', paperId, due: dueFrom('next week') }, icon: CalendarDays },
      ],
    }]);

  /* input handlers ---------------------------------------------------------- */

  const onAct = (a: Act, label: string) => {
    if (a.t === 'nav') return navigate(a.to);
    if (a.t === 'say') return send(a.text);
    push({ id: id(), from: 'me', text: label });
    switch (a.t) {
      case 'pattern':
        draft.current = { ...draft.current, pattern: a.pattern };
        return advance();
      case 'tweak': {
        const p = papers.find((x) => x.id === a.paperId);
        if (a.tweak === 'shuffle') return rebuild(a.paperId, { variant: Math.floor(Math.random() * 7) + 1 }, 'Shuffled — fresh questions, same chapters and section mix.');
        if (a.tweak === 'board') return rebuild(a.paperId, { pattern: 'board', marks: null }, 'Switched to the full board pattern — sections A to E, 3 hours.');
        return rebuild(a.paperId, { pattern: 'unit', marks: null }, p ? 'Done — trimmed to a 1-hour unit test.' : '');
      }
      case 'addChapters': {
        const p = papers.find((x) => x.id === a.paperId);
        const preset = p ? [...new Set(questionsOf(p).map((q) => q.chapter))] : [];
        return reply([
          { kind: 'text', text: 'Pick the chapters you want in it.' },
          { kind: 'chapters', preset, paperId: a.paperId },
        ]);
      }
      case 'assign':
        return askDue(a.paperId);
      case 'due':
        return reply([{ kind: 'confirm', paperId: a.paperId, due: a.due }], 400);
    }
  };

  const onChapters = (m: Extract<Msg, { kind: 'chapters' }>, chapters: string[]) => {
    patch(m.id, { done: true });
    push({ id: id(), from: 'me', text: chapters.length === CHAPTERS.length ? 'All chapters' : chapters.map(short).join(', ') });
    if (m.paperId) return rebuild(m.paperId, { chapters }, 'Updated the chapters — here’s the new paper.');
    draft.current = { ...draft.current, chapters };
    advance();
  };

  const onConfirm = (m: Extract<Msg, { kind: 'confirm' }>) => {
    patch(m.id, { done: 'yes' });
    assignPaper(m.paperId, STUDENTS.map((s) => s.id), m.due);
    reply([{ kind: 'assigned', paperId: m.paperId, due: m.due, count: STUDENTS.length }], 700);
  };

  const send = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    push({ id: id(), from: 'me', text: t });
    setText('');
    setFromVoice(false);
    const p = parse(t);
    const current = active.current && papers.find((x) => x.id === active.current);
    const fresh = /\b(new|another|fresh|different) (paper|test)\b/i.test(t);

    if (current && !fresh && (p.chapters.length || p.pattern || p.marks)) {
      const add = /\b(add|include|also|plus)\b/i.test(t);
      const now = [...new Set(questionsOf(current).map((q) => q.chapter))];
      const chapters = p.chapters.length ? (add ? [...new Set([...now, ...p.chapters])] : p.chapters) : undefined;
      rebuild(current.id, { chapters, pattern: p.marks ? undefined : p.pattern, marks: p.marks }, 'Done — I’ve updated the paper.');
      if (p.due) window.setTimeout(() => reply([{ kind: 'confirm', paperId: current.id, due: p.due! }], 400), 1000);
      return;
    }
    if (current && !fresh && p.wantsAssign && !p.chapters.length) {
      return p.due ? reply([{ kind: 'confirm', paperId: current.id, due: p.due }], 500) : askDue(current.id);
    }
    if (p.wantsPaper || fresh) {
      draft.current = {
        chapters: p.chapters.length ? p.chapters : undefined,
        pattern: p.pattern,
        marks: p.marks,
        due: p.due,
      };
      if (draft.current.chapters && draft.current.pattern) {
        setTyping(true);
        window.setTimeout(advance, 400);
      } else advance();
      return;
    }
    reply([{
      kind: 'text',
      text: 'I can make board-format test papers and assign them to your class. Tell me the chapters and length, or pick one:',
      chips: SUGGESTIONS.slice(0, 3).map((s) => ({ label: s.label, act: { t: 'say', text: s.text } as Act, icon: s.icon })),
    }]);
  };

  const download = (pid: string) => {
    setPrintId(pid);
    window.setTimeout(() => window.print(), 60);
  };

  const newChat = () => {
    setMsgs([]);
    draft.current = {};
    active.current = undefined;
  };

  /* render ------------------------------------------------------------------ */

  // Only the newest card for a paper is shown in full; earlier ones point down to it.
  const lastCard: Record<string, number> = {};
  msgs.forEach((m) => { if (m.from === 'ai' && m.kind === 'paper') lastCard[m.paperId] = m.id; });

  const previewPaper = preview ? papers.find((p) => p.id === preview) : undefined;
  const printPaper = printId ? papers.find((p) => p.id === printId) : undefined;
  const empty = msgs.length === 0;

  const composer = recording ? (
    <VoiceBar
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
      onSubmit={(e) => { e.preventDefault(); send(text); }}
      className={`mm-glass mm-glow flex items-end gap-2 rounded-[1.75rem] p-2 ${empty ? 'pl-4' : 'pl-2'} transition focus-within:ring-2 focus-within:ring-primary/30 lg:pl-4`}
    >
      {!empty && (
        <Button type="button" variant="ghost" size="icon" className="size-10 shrink-0 rounded-full text-muted-foreground lg:hidden" aria-label="New chat" onClick={newChat}>
          <SquarePen className="size-5" />
        </Button>
      )}
      <textarea
        ref={inputRef}
        rows={1}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setFromVoice(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); }
        }}
        placeholder="Ask for a test paper…"
        aria-label="Message the paper assistant"
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

  const voiceHint = fromVoice && text.trim() && !recording && (
    <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
      <Mic className="size-3.5 text-primary" /> Heard you — edit if needed, then send
    </p>
  );

  return (
    <>
      <div className="mm-mesh flex h-dvh flex-col pt-[env(safe-area-inset-top)] print:hidden lg:pt-0">
        {/* Slim top bar — everything else lives behind the menu. */}
        {/* Desktop only: on phones the logo/menu live in the bottom tab bar and New chat sits in the composer. */}
        <header className="hidden h-14 shrink-0 items-center gap-1 px-2 pt-[env(safe-area-inset-top)] lg:flex">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-10" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-2 border-b border-sidebar-border py-3 pl-4 pr-12">
                  <RoleSwitcher />
                  <span className="ml-auto"><ModeToggle /></span>
                </div>
                <div className="min-h-0 flex-1"><Sidebar onNavigate={() => setMenuOpen(false)} /></div>
              </div>
            </SheetContent>
          </Sheet>
          <span className="flex flex-1 items-center justify-center gap-2">
            <LogoMark className="size-6" />
            <Wordmark className="text-[15px]" />
          </span>
          <Button variant="ghost" size="icon" className="size-10" aria-label="New chat" onClick={newChat} disabled={empty}>
            <SquarePen className="size-5" />
          </Button>
        </header>

        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 pb-28 lg:pb-16">
            <div className="w-full max-w-2xl">
              <p className="mb-2 text-center text-sm font-medium text-muted-foreground">Hi Kavya 👋</p>
              <h1 className="mb-7 text-center text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">What should we <span className="mm-gradient-text">prepare</span> today?</h1>
              {composer}
              {voiceHint || (!recording && (
                <p className="mt-2 text-center text-xs text-muted-foreground">Type, or tap <Mic className="inline size-3.5" /> and just say it</p>
              ))}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map(({ label, text: t, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={() => send(t)}
                    className="mm-glass inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-sm text-foreground/80 transition hover:-translate-y-px hover:text-foreground active:scale-95"
                  >
                    <Icon className="size-4 text-[var(--color-highlight-ink)]" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-4">
                {msgs.map((m) => {
                  if (m.from === 'me') {
                    return (
                      <div key={m.id} className="flex justify-end">
                        <p className="mm-gradient max-w-[85%] rounded-3xl rounded-br-lg px-4 py-2.5 text-[15px] shadow-sm">{m.text}</p>
                      </div>
                    );
                  }
                  switch (m.kind) {
                    case 'text':
                      return (
                        <AiRow key={m.id}>
                          <p className="text-[15px] leading-relaxed">{m.text}</p>
                          {m.chips && <Chips chips={m.chips} onAct={onAct} />}
                        </AiRow>
                      );
                    case 'chapters':
                      return m.done ? null : <AiRow key={m.id}><ChapterPicker msg={m} onSubmit={(c) => onChapters(m, c)} /></AiRow>;
                    case 'thinking':
                      return <Thinking key={m.id} />;
                    case 'paper':
                      return (
                        <AiRow key={m.id}>
                          <PaperCard paperId={m.paperId} latest={lastCard[m.paperId] === m.id} onAct={onAct} onPreview={setPreview} onDownload={download} />
                        </AiRow>
                      );
                    case 'confirm':
                      return (
                        <AiRow key={m.id}>
                          <ConfirmCard
                            msg={m}
                            onConfirm={() => onConfirm(m)}
                            onCancel={() => { patch(m.id, { done: 'no' }); reply([{ kind: 'text', text: 'No problem — it’s saved in Test papers whenever you’re ready.' }], 400); }}
                          />
                        </AiRow>
                      );
                    case 'assigned':
                      return (
                        <AiRow key={m.id}>
                          <div className="mm-glass flex items-start gap-3 rounded-3xl p-4">
                            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                            <p className="text-sm">
                              <span className="font-semibold">Assigned to {m.count} students</span>, due {fmtDue(m.due)}. Parents have been notified — I’ll tell you as each paper is marked.
                            </p>
                          </div>
                          <Chips
                            onAct={onAct}
                            chips={[
                              { label: 'Make another paper', act: { t: 'say', text: 'Make a new test paper' }, icon: Plus },
                              { label: 'Open paper', act: { t: 'nav', to: `/demo/school/papers/${m.paperId}` }, icon: FileText },
                              { label: 'Class insights', act: { t: 'nav', to: '/demo/school/insights' }, icon: Target },
                            ]}
                          />
                        </AiRow>
                      );
                  }
                })}
                {typing && <Typing />}
                <div ref={end} />
              </div>
            </div>
            <div className="qc-above-tabs mx-auto w-full max-w-2xl shrink-0 px-3 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-2 lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {composer}
              {voiceHint || <p className="mt-2 text-center text-[11px] text-muted-foreground">Prototype · voice and replies are simulated</p>}
            </div>
          </>
        )}
      </div>

      {/* Printed when "PDF" is tapped on a paper card. */}
      <div className="hidden print:block">{printPaper && <PaperView paper={printPaper} />}</div>

      <Dialog open={!!previewPaper} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto p-3 sm:p-6">
          <DialogHeader><DialogTitle>{previewPaper?.title}</DialogTitle></DialogHeader>
          {previewPaper && <PaperView paper={previewPaper} studentName="" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
