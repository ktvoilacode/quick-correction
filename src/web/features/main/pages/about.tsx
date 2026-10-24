/**
 * /about — a PAGE. AppLayoutRoute supplies the chrome.
 *
 * Deliberately short. An about page earns attention by saying one true thing
 * about what you do and who it is for; the padding most of them carry is why
 * nobody reads them. Replace VALUES and the two paragraphs and you are done.
 */
import { Link } from 'react-router-dom';
import { Button, Card, CardContent } from '@bloomneo/uikit';
import { ArrowRight, Compass, Layers, ShieldCheck } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { brand } from '@/shared/brand';

const VALUES = [
  {
    icon: Compass,
    title: 'Built for one job',
    body: 'A tool that does one thing predictably beats one that does five things you have to check.',
  },
  {
    icon: Layers,
    title: 'Boring where it counts',
    body: 'Familiar patterns in the places people rely on, and novelty only where it earns its keep.',
  },
  {
    icon: ShieldCheck,
    title: 'Your data stays yours',
    body: 'Exportable at any time, deleted when you ask, never sold. Stated here so we can be held to it.',
  },
];

export default function AboutPage() {
  return (
    <>
      <SEO title="About" description={`What ${brand.name} is and who it is for`} />

      <div className="mx-auto max-w-3xl py-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          About {brand.name}
        </h1>

        <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted-foreground">
          <p>
            {brand.name} exists because the work it handles used to take a spreadsheet, three
            browser tabs and someone remembering to check on Friday.
          </p>
          <p>
            Replace this with the specific problem you solve and who has it. The more concrete
            the reader can picture it, the less the rest of the page has to do.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardContent className="py-5">
                <span className="grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon className="size-4" />
                </span>
                <h2 className="mt-3.5 text-sm font-semibold">{title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-border pt-8">
          <Button asChild>
            <Link to="/contact">Talk to us <ArrowRight className="size-4" /></Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/register">Create an account</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
