/**
 * /demo/school — the teacher's home: a chat assistant for making papers.
 */
import { SEO } from '@/shared/SEO';
import { TeacherChat } from '../../components/TeacherChat';

export default function TeacherHome() {
  return (
    <>
      <SEO title="Assistant" />
      <TeacherChat />
    </>
  );
}
