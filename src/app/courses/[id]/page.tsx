export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

import CourseDetailPage from './page.client';

export default function Page(props: { params: Promise<{ id: string }> }) {
  return <CourseDetailPage {...props} />;
}
