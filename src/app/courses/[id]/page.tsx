export const runtime = 'edge';

import CourseDetailPage from './page.client';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <CourseDetailPage params={params} />;
}
