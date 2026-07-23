-- ============================================
-- 仙码录 (CodeTracker) Supabase 数据库 Schema
-- 修复版：修正触发器语法，兼容 PostgreSQL
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 课程表
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  curriculum JSONB DEFAULT '[]'::jsonb,
  teaching_content TEXT,
  knowledge_points JSONB DEFAULT '[]'::jsonb,
  problems JSONB DEFAULT '[]'::jsonb,
  classes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 学员表
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  class_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_course_id ON students(course_id);
CREATE INDEX IF NOT EXISTS idx_students_class_name ON students(class_name);

-- 3. 打字记录表
CREATE TABLE IF NOT EXISTS typing_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  speed NUMERIC NOT NULL,
  accuracy NUMERIC DEFAULT 0,
  praise_tags TEXT[] DEFAULT '{}',
  improve_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_typing_records_student_id ON typing_records(student_id);
CREATE INDEX IF NOT EXISTS idx_typing_records_date ON typing_records(date);

-- 4. 三刷记录表
CREATE TABLE IF NOT EXISTS retry_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  problem_id TEXT NOT NULL,
  problem_name TEXT NOT NULL,
  attempt INTEGER DEFAULT 1,
  time_spent NUMERIC NOT NULL,
  notes TEXT,
  praise_tags TEXT[] DEFAULT '{}',
  improve_tags TEXT[] DEFAULT '{}',
  growth_suggestions TEXT[] DEFAULT '{}',
  is_qualified BOOLEAN DEFAULT true,
  unqualified_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retry_records_student_id ON retry_records(student_id);
CREATE INDEX IF NOT EXISTS idx_retry_records_date ON retry_records(date);

-- 5. 作业记录表
CREATE TABLE IF NOT EXISTS homework_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  score NUMERIC,
  comment TEXT,
  image_url TEXT,
  praise_tags TEXT[] DEFAULT '{}',
  improve_tags TEXT[] DEFAULT '{}',
  growth_suggestions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_homework_records_student_id ON homework_records(student_id);
CREATE INDEX IF NOT EXISTS idx_homework_records_date ON homework_records(date);

-- 6. 知识点进度表
CREATE TABLE IF NOT EXISTS knowledge_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  knowledge_point_id TEXT NOT NULL,
  knowledge_point_name TEXT NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started',
  score INTEGER,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, knowledge_point_id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_progress_student_id ON knowledge_progress(student_id);

-- 7. 考级记录表
CREATE TABLE IF NOT EXISTS exam_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  exam_date TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  wrong_count INTEGER NOT NULL,
  results JSONB DEFAULT '[]'::jsonb,
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_records_student_id ON exam_records(student_id);

-- 8. 赛事记录表
CREATE TABLE IF NOT EXISTS competition_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  competition_name TEXT NOT NULL,
  competition_date TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  wrong_count INTEGER NOT NULL,
  results JSONB DEFAULT '[]'::jsonb,
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competition_records_student_id ON competition_records(student_id);

-- 9. 荣誉记录表
CREATE TABLE IF NOT EXISTS honor_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  level INTEGER,
  achieved_date TEXT NOT NULL,
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_honor_records_student_id ON honor_records(student_id);

-- 10. 赛事/活动表
CREATE TABLE IF NOT EXISTS competition_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date TEXT,
  description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. 冲刺目标表
CREATE TABLE IF NOT EXISTS sprint_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month TEXT NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  course_goal TEXT NOT NULL,
  gesp_levels INTEGER[] DEFAULT '{}',
  competition_ids UUID[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, month)
);

CREATE INDEX IF NOT EXISTS idx_sprint_goals_student_id ON sprint_goals(student_id);

-- 12. 成长档案报告表
CREATE TABLE IF NOT EXISTS report_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  teacher_comment TEXT DEFAULT '',
  next_goal TEXT DEFAULT '',
  student_age TEXT DEFAULT '',
  student_school TEXT DEFAULT '',
  programming_time TEXT DEFAULT '',
  learning_content TEXT DEFAULT '',
  interests TEXT DEFAULT '',
  student_photo TEXT DEFAULT '',
  student_avatar_photo TEXT DEFAULT '',
  cover_photo TEXT DEFAULT '',
  classroom_photos TEXT[] DEFAULT '{}',
  sprint_course_goal TEXT DEFAULT '',
  sprint_gesp_levels INTEGER[] DEFAULT '{}',
  sprint_competition_ids UUID[] DEFAULT '{}',
  month_focus TEXT DEFAULT '',
  selected_comment_presets TEXT[] DEFAULT '{}',
  student_words TEXT DEFAULT '',
  report_month TEXT DEFAULT '',
  monthly_quote TEXT DEFAULT '',
  timeline_quotes JSONB DEFAULT '{}'::jsonb,
  editable_strengths TEXT[] DEFAULT '{}',
  editable_weaknesses TEXT[] DEFAULT '{}',
  editable_attendance_days JSONB DEFAULT '{}'::jsonb,
  editable_homework_count JSONB DEFAULT '{}'::jsonb,
  editable_full_attendance_days JSONB DEFAULT '{}'::jsonb,
  editable_homework_standard JSONB DEFAULT '{}'::jsonb,
  editable_growth_suggestions JSONB DEFAULT '{}'::jsonb,
  editable_home_school_tips JSONB DEFAULT '{}'::jsonb,
  editable_kp_descriptions JSONB DEFAULT '{}'::jsonb,
  honor_records JSONB DEFAULT '[]'::jsonb,
  merge_title TEXT DEFAULT '',
  merged_quote TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, month)
);

CREATE INDEX IF NOT EXISTS idx_report_data_student_id ON report_data(student_id);

-- 13. 学员图片表
CREATE TABLE IF NOT EXISTS student_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_photos_student_id ON student_photos(student_id);

-- 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 使用 DROP + CREATE 替代 IF NOT EXISTS（兼容 PostgreSQL）
DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_knowledge_progress_updated_at ON knowledge_progress;
CREATE TRIGGER update_knowledge_progress_updated_at BEFORE UPDATE ON knowledge_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sprint_goals_updated_at ON sprint_goals;
CREATE TRIGGER update_sprint_goals_updated_at BEFORE UPDATE ON sprint_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_report_data_updated_at ON report_data;
CREATE TRIGGER update_report_data_updated_at BEFORE UPDATE ON report_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 行级安全策略 (RLS)
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE retry_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE honor_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_photos ENABLE ROW LEVEL SECURITY;

-- 允许所有操作（单用户模式）
DROP POLICY IF EXISTS "Allow all operations" ON courses;
CREATE POLICY "Allow all operations" ON courses FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations" ON students;
CREATE POLICY "Allow all operations" ON students FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations" ON typing_records;
CREATE POLICY "Allow all operations" ON typing_records FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations" ON retry_records;
CREATE POLICY "Allow all operations" ON retry_records FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations" ON homework_records;
CREATE POLICY "Allow all operations" ON homework_records FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations" ON knowledge_progress;
CREATE POLICY "Allow all operations" ON knowledge_progress FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations" ON exam_records;
CREATE POLICY "Allow all operations" ON exam_records FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations" ON competition_records;
CREATE POLICY "Allow all operations" ON competition_records FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations" ON honor_records;
CREATE POLICY "Allow all operations" ON honor_records FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations" ON competition_events;
CREATE POLICY "Allow all operations" ON competition_events FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations" ON sprint_goals;
CREATE POLICY "Allow all operations" ON sprint_goals FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations" ON report_data;
CREATE POLICY "Allow all operations" ON report_data FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations" ON student_photos;
CREATE POLICY "Allow all operations" ON student_photos FOR ALL USING (true) WITH CHECK (true);
