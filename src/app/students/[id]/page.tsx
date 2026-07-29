import StudentDetailClient from './page.client';

export const runtime = 'edge';

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <StudentDetailClient />;
}
