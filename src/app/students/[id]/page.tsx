export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

import StudentDetailPage from './page.client';

export default function Page(props: { params: Promise<{ id: string }> }) {
  return <StudentDetailPage {...props} />;
}
