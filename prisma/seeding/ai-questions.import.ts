/**
 * Imports AI-written questions (docs/content/generated/verified/*.json) into
 * the question bank as hidden drafts for admin review. A question the
 * independent verifier disputed is imported as 'flagged' with its note.
 * Safe to re-run: a question whose text already exists is skipped.
 * Run: npm run db:import:ai [-- --raw]   (--raw reads generated/*.json, unverified)
 */
import 'dotenv/config';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { databaseClass } from '@bloomneo/appkit/database';

type Row = {
  chapter: string; topic: string; type: string; marks: number; complexity: string; competency?: boolean;
  text: string; options?: string[]; answer?: string;
  verification?: { status: 'ok' | 'mismatch' | 'ambiguous' | 'invalid'; note?: string; correctedAnswer?: string };
};

async function main() {
  const raw = process.argv.includes('--raw');
  const dir = new URL(`../../docs/content/generated/${raw ? '' : 'verified/'}`, import.meta.url);
  if (!existsSync(dir)) throw new Error(`${dir.pathname} not found`);
  const db = await databaseClass.get();
  const subject = await db.curriculumNode.findFirst({ where: { kind: 'subject', name: 'Mathematics (Standard)' } });
  if (!subject) throw new Error('Run npm run db:seed:library first');

  const have = new Set((await db.question.findMany({ select: { text: true } })).map((q: { text: string }) => q.text.trim()));
  const topicCache = new Map<string, string>();
  let added = 0, flagged = 0, skipped = 0;

  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'brief.json').sort()) {
    const rows: Row[] = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    for (const r of rows) {
      const key = `${r.chapter}|${r.topic}`;
      if (!topicCache.has(key)) {
        const chapter = await db.curriculumNode.findFirst({ where: { kind: 'chapter', name: r.chapter, parentId: subject.id } });
        const topic = chapter && await db.curriculumNode.findFirst({ where: { kind: 'topic', name: r.topic, parentId: chapter.id } });
        if (!topic) { console.warn(`  no topic "${r.topic}" in "${r.chapter}": skipped one question`); skipped++; continue; }
        topicCache.set(key, topic.id);
      }
      if (have.has(r.text.trim())) { skipped++; continue; }
      const bad = r.verification && r.verification.status !== 'ok';
      const answer = r.verification?.correctedAnswer || r.answer;
      await db.question.create({
        data: {
          topicId: topicCache.get(key)!, type: r.type, complexity: r.complexity, marks: r.marks, text: r.text.trim(),
          options: r.options ?? undefined, answer, competency: !!r.competency,
          isActive: false, source: 'ai', reviewStatus: bad ? 'flagged' : 'draft',
          reviewNote: bad ? `${r.verification!.status}: ${r.verification!.note ?? ''}`.trim() : null,
        },
      });
      have.add(r.text.trim());
      added++; if (bad) flagged++;
    }
  }
  console.log(`✅ Imported ${added} questions as drafts (${flagged} flagged by the verifier); ${skipped} skipped.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
