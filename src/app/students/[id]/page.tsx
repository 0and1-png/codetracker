import StudentDetailClient from './page.client';

export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <StudentDetailClient />;
}
