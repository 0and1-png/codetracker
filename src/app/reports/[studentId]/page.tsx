export function generateStaticParams() {
  return [{ studentId: 'placeholder' }];
}

import ReportPage from './page.client';

export default function Page(props: { params: Promise<{ studentId: string }> }) {
  return <ReportPage {...props} />;
}
