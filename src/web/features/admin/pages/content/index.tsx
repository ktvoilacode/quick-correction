/**
 * Content — `/admin/content`. The curriculum, the paper layouts and the
 * questions they are built from, in one place with a tab each:
 *
 *   Skill library  board > class > subject > chapter > topic
 *   Paper patterns sections, question types and marks per subject
 *   Question bank  every question, tagged to a topic
 *
 * The tab is in the address (`?tab=`), so links and the back button work. Other
 * parameters belong to the tab (for example `review=flagged` on the question bank).
 */
import { useSearchParams } from 'react-router-dom';
import { SEO } from '@/shared/SEO';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { LibraryPanel } from '../../components/content/LibraryPanel';
import { PatternsPanel } from '../../components/content/PatternsPanel';
import { QuestionsPanel } from '../../components/content/QuestionsPanel';

const TABS = [
  { id: 'library', label: 'Skill library' },
  { id: 'patterns', label: 'Paper patterns' },
  { id: 'questions', label: 'Question bank' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export default function AdminContentPage() {
  const [params, setParams] = useSearchParams();
  const tab: TabId = TABS.find((t) => t.id === params.get('tab'))?.id ?? 'library';

  // Changing tab keeps the address tidy: only `tab` stays, the old tab's filters go.
  const go = (id: TabId) => setParams({ tab: id });

  return (
    <>
      <SEO title="Content" />
      <AdminPageHeader title="Content" description="The curriculum, how papers are laid out, and the questions they are built from." />

      <div role="tablist" aria-label="Content" className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => go(t.id)}
            className={`shrink-0 cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === t.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'library' && <LibraryPanel />}
        {tab === 'patterns' && <PatternsPanel />}
        {tab === 'questions' && <QuestionsPanel />}
      </div>
    </>
  );
}
