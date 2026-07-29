import CourseDetailPage from './page.client';

export function generateStaticParams() {
  return [
    { id: 'course_cpp' },
    { id: 'course_python' },
    { id: 'course_scratch' },
  ];
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return <CourseDetailPage params={props.params} />;
}
