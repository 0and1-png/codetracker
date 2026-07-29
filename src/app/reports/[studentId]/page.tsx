import ReportPage from './page.client';

export function generateStaticParams() {
  return [{ studentId: 'placeholder' }];
}

export default function Page() {
  return <ReportPage />;
}
