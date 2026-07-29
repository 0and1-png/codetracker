import CourseDetailClient from './page.client';

export async function generateStaticParams() {
  return [
    { id: 'course_cpp' },
    { id: 'course_python' },
    { id: 'course_scratch' },
  ];
}

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <CourseDetailClient params={params} />;
}
