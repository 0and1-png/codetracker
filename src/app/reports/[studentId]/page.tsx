export function generateStaticParams() {
  return [{ studentId: 'placeholder' }];
}

import ReportPage from './page.client';

export default function Page() {
  return <ReportPage />;
}
