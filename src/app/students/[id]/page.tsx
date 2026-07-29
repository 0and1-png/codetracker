export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

import StudentDetailPage from './page.client';

export default function Page() {
  return <StudentDetailPage />;
}
