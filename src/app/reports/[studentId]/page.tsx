import ReportClient from './page.client';

export async function generateStaticParams() {
  return [{ studentId: 'placeholder' }];
}

export default async function ReportPage({ params }: { params: Promise<{ studentId: string }> }) {
  return <ReportClient />;
}
