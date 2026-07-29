import CourseDetailClient from './page.client';

export const runtime = 'edge';

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <CourseDetailClient params={params} />;
}
