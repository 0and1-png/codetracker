import { pgTable, serial, timestamp, varchar, text, integer, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 保留系统表
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// ============ Users ============
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    username: varchar("username", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    email: varchar("email", { length: 200 }),
    password: varchar("password", { length: 200 }).notNull(),
    is_blocked: boolean("is_blocked").default(false).notNull(),
    last_login_at: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
    last_login_ip: varchar("last_login_ip", { length: 50 }),
    last_login_device: varchar("last_login_device", { length: 50 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("users_username_idx").on(table.username),
    index("users_phone_idx").on(table.phone),
  ]
);

// ============ Courses ============
export const courses = pgTable(
  "courses",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    curriculum: jsonb("curriculum").default(sql`'[]'::jsonb`).notNull(),
    teaching_content: text("teaching_content"),
    knowledge_points: jsonb("knowledge_points").default(sql`'[]'::jsonb`).notNull(),
    problems: jsonb("problems").default(sql`'[]'::jsonb`).notNull(),
    classes: jsonb("classes").default(sql`'[]'::jsonb`).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("courses_name_idx").on(table.name),
  ]
);

// ============ Students ============
export const students = pgTable(
  "students",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    course_id: varchar("course_id", { length: 100 }).notNull().references(() => courses.id),
    class_name: varchar("class_name", { length: 100 }),
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("students_course_id_idx").on(table.course_id),
    index("students_name_idx").on(table.name),
  ]
);

// ============ Typing Records ============
export const typingRecords = pgTable(
  "typing_records",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    student_id: varchar("student_id", { length: 100 }).notNull().references(() => students.id),
    course_id: varchar("course_id", { length: 100 }).notNull().references(() => courses.id),
    date: varchar("date", { length: 20 }).notNull(),
    speed: integer("speed").notNull(),
    accuracy: integer("accuracy").notNull(),
    praise_tags: jsonb("praise_tags").default(sql`'[]'::jsonb`),
    improve_tags: jsonb("improve_tags").default(sql`'[]'::jsonb`),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("typing_records_student_id_idx").on(table.student_id),
    index("typing_records_course_id_idx").on(table.course_id),
    index("typing_records_date_idx").on(table.date),
  ]
);

// ============ Problem Retry Records ============
export const retryRecords = pgTable(
  "retry_records",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    student_id: varchar("student_id", { length: 100 }).notNull().references(() => students.id),
    course_id: varchar("course_id", { length: 100 }).notNull().references(() => courses.id),
    date: varchar("date", { length: 20 }).notNull(),
    problem_id: varchar("problem_id", { length: 100 }).notNull(),
    problem_name: varchar("problem_name", { length: 200 }).notNull(),
    attempt: integer("attempt").notNull(),
    time_spent: integer("time_spent").notNull(),
    notes: text("notes"),
    praise_tags: jsonb("praise_tags").default(sql`'[]'::jsonb`),
    improve_tags: jsonb("improve_tags").default(sql`'[]'::jsonb`),
    growth_suggestions: jsonb("growth_suggestions").default(sql`'[]'::jsonb`),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("retry_records_student_id_idx").on(table.student_id),
    index("retry_records_course_id_idx").on(table.course_id),
    index("retry_records_problem_id_idx").on(table.problem_id),
    index("retry_records_date_idx").on(table.date),
  ]
);

// ============ Homework Records ============
export const homeworkRecords = pgTable(
  "homework_records",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    student_id: varchar("student_id", { length: 100 }).notNull().references(() => students.id),
    course_id: varchar("course_id", { length: 100 }).notNull().references(() => courses.id),
    date: varchar("date", { length: 20 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    content: text("content").notNull(),
    score: integer("score"),
    comment: text("comment"),
    image_url: text("image_url"),
    praise_tags: jsonb("praise_tags").default(sql`'[]'::jsonb`),
    improve_tags: jsonb("improve_tags").default(sql`'[]'::jsonb`),
    growth_suggestions: jsonb("growth_suggestions").default(sql`'[]'::jsonb`),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("homework_records_student_id_idx").on(table.student_id),
    index("homework_records_course_id_idx").on(table.course_id),
    index("homework_records_date_idx").on(table.date),
  ]
);

// ============ Knowledge Progress ============
export const knowledgeProgress = pgTable(
  "knowledge_progress",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    student_id: varchar("student_id", { length: 100 }).notNull().references(() => students.id),
    knowledge_point_id: varchar("knowledge_point_id", { length: 100 }).notNull(),
    knowledge_point_name: varchar("knowledge_point_name", { length: 200 }).notNull(),
    course_id: varchar("course_id", { length: 100 }).notNull().references(() => courses.id),
    status: varchar("status", { length: 20 }).notNull().default("not_started"),
    score: integer("score"),
    description: text("description"),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("knowledge_progress_student_id_idx").on(table.student_id),
    index("knowledge_progress_course_id_idx").on(table.course_id),
    index("knowledge_progress_kp_id_idx").on(table.knowledge_point_id),
  ]
);

// ============ Competitions (自定义赛事) ============
export const competitions = pgTable(
  "competitions",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    date: varchar("date", { length: 20 }),
    description: text("description"),
    category: varchar("category", { length: 100 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

// ============ Sprint Goals ============
export const sprintGoals = pgTable(
  "sprint_goals",
  {
    id: varchar("id", { length: 100 }).primaryKey().default(sql`gen_random_uuid()`),
    student_id: varchar("student_id", { length: 100 }).notNull().references(() => students.id),
    month: varchar("month", { length: 10 }).notNull(),
    course_goal: text("course_goal").notNull().default(""),
    gesp_levels: jsonb("gesp_levels").default(sql`'[]'::jsonb`).notNull(),
    competition_ids: jsonb("competition_ids").default(sql`'[]'::jsonb`).notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("sprint_goals_student_id_idx").on(table.student_id),
    index("sprint_goals_month_idx").on(table.month),
  ]
);

// ============ Exam Records ============
export const examRecords = pgTable(
  "exam_records",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    student_id: varchar("student_id", { length: 100 }).notNull().references(() => students.id),
    course_id: varchar("course_id", { length: 100 }).notNull().references(() => courses.id),
    level: integer("level").notNull(),
    exam_date: varchar("exam_date", { length: 20 }).notNull(),
    total_questions: integer("total_questions").notNull(),
    correct_count: integer("correct_count").notNull(),
    wrong_count: integer("wrong_count").notNull(),
    results: jsonb("results").default(sql`'[]'::jsonb`).notNull(),
    certificate_url: text("certificate_url"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("exam_records_student_id_idx").on(table.student_id),
    index("exam_records_course_id_idx").on(table.course_id),
  ]
);

// ============ Competition Records ============
export const competitionRecords = pgTable(
  "competition_records",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    student_id: varchar("student_id", { length: 100 }).notNull().references(() => students.id),
    course_id: varchar("course_id", { length: 100 }).notNull().references(() => courses.id),
    competition_name: varchar("competition_name", { length: 200 }).notNull(),
    competition_date: varchar("competition_date", { length: 20 }).notNull(),
    total_questions: integer("total_questions").notNull(),
    correct_count: integer("correct_count").notNull(),
    wrong_count: integer("wrong_count").notNull(),
    results: jsonb("results").default(sql`'[]'::jsonb`).notNull(),
    certificate_url: text("certificate_url"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("competition_records_student_id_idx").on(table.student_id),
    index("competition_records_course_id_idx").on(table.course_id),
  ]
);

// ============ Honor Records ============
export const honorRecords = pgTable(
  "honor_records",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    student_id: varchar("student_id", { length: 100 }).notNull().references(() => students.id),
    course_id: varchar("course_id", { length: 100 }).notNull().references(() => courses.id),
    type: varchar("type", { length: 20 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    level: integer("level"),
    achieved_date: varchar("achieved_date", { length: 20 }).notNull(),
    certificate_url: text("certificate_url"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("honor_records_student_id_idx").on(table.student_id),
    index("honor_records_course_id_idx").on(table.course_id),
  ]
);
