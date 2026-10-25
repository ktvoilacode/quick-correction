/**
 * ParentChat — the parent's assistant. Same feel as the teacher's: ask in
 * plain words (or by voice) and get an answer with something to tap.
 *
 * Jobs it covers: upload answer sheets, see the latest marks, how the child
 * is doing, and what to revise. Replies are scripted from the demo data;
 * the real app would hand these questions to the model with the child's
 * results as context.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, toast } from '@bloomneo/uikit';
import { Camera, ChevronRight, Sparkles, Target, TrendingUp, Send, Mic } from 'lucide-react';
import { useDemo, ME_STUDENT, studentById, pct, weakChapters } from '../data/store';
import { AiRow, Chips as ChipRow, Typing, ChatInput, type ChipOf } from './chat';
import { fmt, useStudentProgress } from './parts';

type Act = { t: 'say'; text: string } | { t: 'nav'; to: string } | { t: 'request'; chapter: string };
type Chip = ChipOf<Act>;
const Chips = ChipRow<Act>;

/** A tappable summary: a paper to upload, or a result to open. */
type CardData = { title: string; sub: string; badge?: string; low?: boolean; to: string; cta: string; upload?: boolean };

type Msg =
  | { id: number; from: 'me'; text: string }
  | { id: number; from: 'ai'; text: string; cards?: CardData[]; chips?: Chip[] };

const memory: { msgs: Msg[] } = { msgs: [] };
let nextId = 1;

const VOICE_SAMPLES = [
  'How is Aarav doing in maths?',
  'What should he revise this week?',
  'Upload today’s answer sheet',
];

function ResultCard({ c, onOpen }: { c: CardData; onOpen: (to: string) => void }) {
  return (
    <button
      onClick={() => onOpen(c.to)}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl p-3.5 text-left transition active:scale-[0.98] ${c.upload ? 'mm-gradient mm-glow' : 'mm-glass'}`}
    >
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${c.upload ? 'bg-white/20' : 'mm-tint text-primary'}`}>
        {c.upload ? <Camera className="size-5" /> : <Sparkles className="size-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{c.title}</span>
        <span className={`block truncate text-xs ${c.upload ? 'text-white/85' : 'text-muted-foreground'}`}>{c.sub}</span>
      </span>
      {c.badge && <Badge variant={c.low ? 'destructive' : 'secondary'}>{c.badge}</Badge>}
      <span className="sr-only">{c.cta}</span>
      <ChevronRight className="size-4 shrink-0" />
    </button>
  );
}

export function ParentChat() {
  const { papers } = useDemo();
  const navigate = useNavigate();
  const child = studentById(ME_STUDENT);
  const first = child.name.split(' ')[0];
  const { done, pending, trend, avg, chapters } = useStudentProgress(ME_STUDENT);
  const [msgs, setMsgs] = React.useState<Msg[]>(memory.msgs);
  const [typing, setTyping] = React.useState(false);
  const [text, setText] = React.useState('');
  const end = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { memory.msgs = msgs; });
  React.useEffect(() => {
    if (msgs.length) end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs.length, typing]);

  const paperOf = (id: string) => papers.find((p) => p.id === id)!;
  const toUpload = pending.filter((s) => s.status === 'assigned');
  const latest = done[done.length - 1];
  const weakest = chapters.slice(0, 3);

  const uploadCards = (): CardData[] => toUpload.map((s) => ({
    title: paperOf(s.paperId).title, sub: `Due ${fmt(s.dueDate)} · tap to upload answers`,
    to: `/demo/parent/tests/${s.id}`, cta: 'Upload answers', upload: true,
  }));
  const latestCard = (): CardData[] => latest ? [{
    title: latest.paper.title, sub: `Marked ${fmt(latest.s.submittedAt)} · ${latest.s.score}/${latest.s.max}`,
    badge: `${pct(latest.s)}%`, low: pct(latest.s) < 50, to: `/demo/parent/results/${latest.s.id}`, cta: 'Open result',
  }] : [];

  /** Scripted stand-in for the model: match the question, answer from the data. */
  const answer = (q: string): Omit<Extract<Msg, { from: 'ai' }>, 'id' | 'from'> => {
    const t = q.toLowerCase();
    if (/upload|submit|answer sheet|photo|snap|scan/.test(t)) {
      return toUpload.length
        ? { text: `${first} has ${toUpload.length === 1 ? 'one paper' : `${toUpload.length} papers`} waiting. Take a photo of each answer page and I’ll mark it in a few minutes.`, cards: uploadCards() }
        : { text: `Nothing to upload right now — ${first} is all caught up. I’ll tell you when Ms. Kavya sets the next paper.` };
    }
    if (/revise|weak|practice|focus|study|improve on|work on/.test(t)) {
      if (!weakest.length) return { text: `Once ${first}’s first paper is marked I’ll show what to revise.` };
      const [w] = weakest;
      return {
        text: `Focus on ${weakest.map((c) => `${c.chapter} (${c.pct}%)`).join(', ')}. ${w.chapter} needs the most work — a short practice paper on it would help.`,
        chips: [
          { label: `Ask for a ${w.chapter} paper`, act: { t: 'request', chapter: w.chapter }, icon: Send },
          { label: 'See progress', act: { t: 'nav', to: '/demo/parent/progress' }, icon: TrendingUp },
        ],
      };
    }
    if (/how (is|did|’s|'s)|doing|progress|improv|trend|overall/.test(t)) {
      const last = trend[trend.length - 1];
      const prev = trend[trend.length - 2];
      if (!last) return { text: `No marked papers yet. Upload ${first}’s first answer sheet and I’ll start tracking.` };
      const move = prev ? last.score - prev.score : 0;
      return {
        text: `${first} scored ${last.score}% in the last paper${prev ? ` — ${move >= 0 ? 'up' : 'down'} ${Math.abs(move)} points from the one before` : ''}. Average so far is ${avg}%, against a class average of ${last.classAvg}% on that paper.`,
        chips: [
          { label: 'See progress', act: { t: 'nav', to: '/demo/parent/progress' }, icon: TrendingUp },
          { label: 'What to revise?', act: { t: 'say', text: 'What should he revise?' }, icon: Target },
        ],
      };
    }
    if (/result|marks|score|latest|corrected|marked/.test(t)) {
      if (!latest) return { text: 'No marked papers yet.' };
      const weak = weakChapters(latest.s.results ?? []).slice(0, 2).map((c) => c.chapter);
      return {
        text: `Here’s the latest. ${weak.length ? `Most marks were lost in ${weak.join(' and ')}.` : ''}`,
        cards: latestCard(),
        chips: [{ label: 'All corrections', act: { t: 'nav', to: '/demo/parent/corrections' }, icon: Sparkles }],
      };
    }
    return {
      text: `I can help you upload ${first}’s answer sheets, show marks, and say what to revise. What would you like?`,
      chips: SUGGESTIONS.map((s) => ({ label: s.label, act: { t: 'say', text: s.text } as Act, icon: s.icon })),
    };
  };

  const send = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setText('');
    setMsgs((xs) => [...xs, { id: nextId++, from: 'me', text: q }]);
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setMsgs((xs) => [...xs, { id: nextId++, from: 'ai', ...answer(q) }]);
    }, 650);
  };

  const onAct = (a: Act) => {
    if (a.t === 'nav') return navigate(a.to);
    if (a.t === 'say') return send(a.text);
    toast.success(`Request sent to Ms. Kavya: practice paper on ${a.chapter}`);
  };

  const empty = msgs.length === 0;
  const input = (hint: React.ReactNode) => (
    <ChatInput
      text={text} setText={setText} onSend={send} empty={empty} onNewChat={() => setMsgs([])}
      samples={VOICE_SAMPLES} placeholder={`Ask about ${first}…`} label="Message the assistant" hint={hint}
    />
  );

  return (
    <div className="flex h-full flex-col">
      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-28 lg:pb-16">
          <div className="w-full max-w-2xl">
            {(toUpload.length > 0 || latest) && (
              <div className="mb-6 flex gap-2.5">
                {toUpload.length > 0 && (
                  <button
                    className="mm-gradient mm-glow flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[0.98]"
                    onClick={() => navigate(toUpload.length === 1 ? `/demo/parent/tests/${toUpload[0].id}` : '/demo/parent/papers')}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/20"><Camera className="size-[18px]" /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{toUpload.length} to upload</span>
                      <span className="block truncate text-xs text-white/85">Due {fmt(toUpload[0].dueDate)}</span>
                    </span>
                  </button>
                )}
                {latest && (
                  <button
                    className="mm-glass flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[0.98]"
                    onClick={() => navigate(`/demo/parent/results/${latest.s.id}`)}
                  >
                    <span className="mm-tint grid size-9 shrink-0 place-items-center rounded-xl text-primary"><Sparkles className="size-[18px]" /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">Latest: {pct(latest.s)}%</span>
                      <span className="block truncate text-xs text-muted-foreground">{latest.paper.title.split(' — ')[0]}</span>
                    </span>
                  </button>
                )}
              </div>
            )}
            <p className="mb-2 text-center text-sm font-medium text-muted-foreground">Hi {child.parent.split(' ')[0]} 👋</p>
            <h1 className="mb-7 text-center text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
              How can I help with <span className="mm-gradient-text">{first}</span> today?
            </h1>
            {input(<p className="mt-2 text-center text-xs text-muted-foreground">Type, or tap <Mic className="inline size-3.5" /> and just ask</p>)}
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
              {msgs.map((m) => m.from === 'me' ? (
                <div key={m.id} className="flex justify-end">
                  <p className="mm-gradient max-w-[85%] rounded-3xl rounded-br-lg px-4 py-2.5 text-[15px] shadow-sm">{m.text}</p>
                </div>
              ) : (
                <AiRow key={m.id}>
                  <p className="text-[15px] leading-relaxed">{m.text}</p>
                  {m.cards?.map((c) => <ResultCard key={c.to} c={c} onOpen={navigate} />)}
                  {m.chips && <Chips chips={m.chips} onAct={onAct} />}
                </AiRow>
              ))}
              {typing && <Typing />}
              <div ref={end} />
            </div>
          </div>
          <div className="qc-above-tabs mx-auto w-full max-w-2xl shrink-0 px-3 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-2 lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {input(<p className="mt-2 text-center text-[11px] text-muted-foreground">Prototype · voice and replies are simulated</p>)}
          </div>
        </>
      )}
    </div>
  );
}

const SUGGESTIONS = [
  { label: 'Upload answers', text: 'Upload answer sheet', icon: Camera },
  { label: 'Latest result', text: 'Show the latest result', icon: Sparkles },
  { label: 'How is he doing?', text: 'How is he doing?', icon: TrendingUp },
  { label: 'What to revise?', text: 'What should he revise?', icon: Target },
];
