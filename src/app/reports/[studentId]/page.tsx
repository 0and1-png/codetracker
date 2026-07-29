import ReportPageClient from './page.client';

export const runtime = 'edge';

export default async function ReportPage({ params }: { params: Promise<{ studentId: string }> }) {
  return <ReportPageClient />;
}
