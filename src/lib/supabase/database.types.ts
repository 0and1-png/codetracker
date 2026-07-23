// Supabase 数据库类型定义
// 此文件定义 Supabase 表的 TypeScript 类型

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      courses: {
        Row: {
          id: string;
          name: string;
          curriculum: Json;
          teaching_content: string | null;
          knowledge_points: Json;
          problems: Json;
          classes: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          curriculum?: Json;
          teaching_content?: string | null;
          knowledge_points?: Json;
          problems?: Json;
          classes?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          curriculum?: Json;
          teaching_content?: string | null;
          knowledge_points?: Json;
          problems?: Json;
          classes?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          name: string;
          course_id: string | null;
          class_name: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          course_id?: string | null;
          class_name?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          course_id?: string | null;
          class_name?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      typing_records: {
        Row: {
          id: string;
          student_id: string | null;
          course_id: string | null;
          date: string;
          speed: number;
          accuracy: number;
          praise_tags: string[];
          improve_tags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id?: string | null;
          course_id?: string | null;
          date: string;
          speed: number;
          accuracy?: number;
          praise_tags?: string[];
          improve_tags?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          course_id?: string | null;
          date?: string;
          speed?: number;
          accuracy?: number;
          praise_tags?: string[];
          improve_tags?: string[];
          created_at?: string;
        };
      };
      retry_records: {
        Row: {
          id: string;
          student_id: string | null;
          course_id: string | null;
          date: string;
          problem_id: string;
          problem_name: string;
          attempt: number;
          time_spent: number;
          notes: string | null;
          praise_tags: string[];
          improve_tags: string[];
          growth_suggestions: string[];
          is_qualified: boolean;
          unqualified_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id?: string | null;
          course_id?: string | null;
          date: string;
          problem_id: string;
          problem_name: string;
          attempt?: number;
          time_spent: number;
          notes?: string | null;
          praise_tags?: string[];
          improve_tags?: string[];
          growth_suggestions?: string[];
          is_qualified?: boolean;
          unqualified_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          course_id?: string | null;
          date?: string;
          problem_id?: string;
          problem_name?: string;
          attempt?: number;
          time_spent?: number;
          notes?: string | null;
          praise_tags?: string[];
          improve_tags?: string[];
          growth_suggestions?: string[];
          is_qualified?: boolean;
          unqualified_reason?: string | null;
          created_at?: string;
        };
      };
      homework_records: {
        Row: {
          id: string;
          student_id: string | null;
          course_id: string | null;
          date: string;
          title: string;
          content: string;
          score: number | null;
          comment: string | null;
          image_url: string | null;
          praise_tags: string[];
          improve_tags: string[];
          growth_suggestions: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id?: string | null;
          course_id?: string | null;
          date: string;
          title: string;
          content: string;
          score?: number | null;
          comment?: string | null;
          image_url?: string | null;
          praise_tags?: string[];
          improve_tags?: string[];
          growth_suggestions?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          course_id?: string | null;
          date?: string;
          title?: string;
          content?: string;
          score?: number | null;
          comment?: string | null;
          image_url?: string | null;
          praise_tags?: string[];
          improve_tags?: string[];
          growth_suggestions?: string[];
          created_at?: string;
        };
      };
      knowledge_progress: {
        Row: {
          id: string;
          student_id: string | null;
          knowledge_point_id: string;
          knowledge_point_name: string;
          course_id: string | null;
          status: string;
          score: number | null;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id?: string | null;
          knowledge_point_id: string;
          knowledge_point_name: string;
          course_id?: string | null;
          status?: string;
          score?: number | null;
          description?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          knowledge_point_id?: string;
          knowledge_point_name?: string;
          course_id?: string | null;
          status?: string;
          score?: number | null;
          description?: string | null;
          updated_at?: string;
        };
      };
      exam_records: {
        Row: {
          id: string;
          student_id: string | null;
          course_id: string | null;
          level: number;
          exam_date: string;
          total_questions: number;
          correct_count: number;
          wrong_count: number;
          results: Json;
          certificate_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id?: string | null;
          course_id?: string | null;
          level: number;
          exam_date: string;
          total_questions: number;
          correct_count: number;
          wrong_count: number;
          results?: Json;
          certificate_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          course_id?: string | null;
          level?: number;
          exam_date?: string;
          total_questions?: number;
          correct_count?: number;
          wrong_count?: number;
          results?: Json;
          certificate_url?: string | null;
          created_at?: string;
        };
      };
      competition_records: {
        Row: {
          id: string;
          student_id: string | null;
          course_id: string | null;
          competition_name: string;
          competition_date: string;
          total_questions: number;
          correct_count: number;
          wrong_count: number;
          results: Json;
          certificate_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id?: string | null;
          course_id?: string | null;
          competition_name: string;
          competition_date: string;
          total_questions: number;
          correct_count: number;
          wrong_count: number;
          results?: Json;
          certificate_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          course_id?: string | null;
          competition_name?: string;
          competition_date?: string;
          total_questions?: number;
          correct_count?: number;
          wrong_count?: number;
          results?: Json;
          certificate_url?: string | null;
          created_at?: string;
        };
      };
      honor_records: {
        Row: {
          id: string;
          student_id: string | null;
          course_id: string | null;
          type: string;
          title: string;
          level: number | null;
          achieved_date: string;
          certificate_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id?: string | null;
          course_id?: string | null;
          type: string;
          title: string;
          level?: number | null;
          achieved_date: string;
          certificate_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          course_id?: string | null;
          type?: string;
          title?: string;
          level?: number | null;
          achieved_date?: string;
          certificate_url?: string | null;
          created_at?: string;
        };
      };
      competition_events: {
        Row: {
          id: string;
          name: string;
          date: string | null;
          description: string | null;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          date?: string | null;
          description?: string | null;
          category?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          date?: string | null;
          description?: string | null;
          category?: string | null;
          created_at?: string;
        };
      };
      sprint_goals: {
        Row: {
          id: string;
          month: string;
          student_id: string | null;
          course_goal: string;
          gesp_levels: number[];
          competition_ids: string[];
          updated_at: string;
        };
        Insert: {
          id?: string;
          month: string;
          student_id?: string | null;
          course_goal: string;
          gesp_levels?: number[];
          competition_ids?: string[];
          updated_at?: string;
        };
        Update: {
          id?: string;
          month?: string;
          student_id?: string | null;
          course_goal?: string;
          gesp_levels?: number[];
          competition_ids?: string[];
          updated_at?: string;
        };
      };
      report_data: {
        Row: {
          id: string;
          student_id: string | null;
          month: string;
          teacher_comment: string;
          next_goal: string;
          student_age: string;
          student_school: string;
          programming_time: string;
          learning_content: string;
          interests: string;
          student_photo: string;
          student_avatar_photo: string;
          cover_photo: string;
          classroom_photos: string[];
          sprint_course_goal: string;
          sprint_gesp_levels: number[];
          sprint_competition_ids: string[];
          month_focus: string;
          selected_comment_presets: string[];
          student_words: string;
          report_month: string;
          monthly_quote: string;
          timeline_quotes: Json;
          editable_strengths: string[];
          editable_weaknesses: string[];
          editable_attendance_days: Json;
          editable_homework_count: Json;
          editable_full_attendance_days: Json;
          editable_homework_standard: Json;
          editable_growth_suggestions: Json;
          editable_home_school_tips: Json;
          editable_kp_descriptions: Json;
          honor_records: Json;
          merge_title: string;
          merged_quote: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id?: string | null;
          month: string;
          teacher_comment?: string;
          next_goal?: string;
          student_age?: string;
          student_school?: string;
          programming_time?: string;
          learning_content?: string;
          interests?: string;
          student_photo?: string;
          student_avatar_photo?: string;
          cover_photo?: string;
          classroom_photos?: string[];
          sprint_course_goal?: string;
          sprint_gesp_levels?: number[];
          sprint_competition_ids?: string[];
          month_focus?: string;
          selected_comment_presets?: string[];
          student_words?: string;
          report_month?: string;
          monthly_quote?: string;
          timeline_quotes?: Json;
          editable_strengths?: string[];
          editable_weaknesses?: string[];
          editable_attendance_days?: Json;
          editable_homework_count?: Json;
          editable_full_attendance_days?: Json;
          editable_homework_standard?: Json;
          editable_growth_suggestions?: Json;
          editable_home_school_tips?: Json;
          editable_kp_descriptions?: Json;
          honor_records?: Json;
          merge_title?: string;
          merged_quote?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          month?: string;
          teacher_comment?: string;
          next_goal?: string;
          student_age?: string;
          student_school?: string;
          programming_time?: string;
          learning_content?: string;
          interests?: string;
          student_photo?: string;
          student_avatar_photo?: string;
          cover_photo?: string;
          classroom_photos?: string[];
          sprint_course_goal?: string;
          sprint_gesp_levels?: number[];
          sprint_competition_ids?: string[];
          month_focus?: string;
          selected_comment_presets?: string[];
          student_words?: string;
          report_month?: string;
          monthly_quote?: string;
          timeline_quotes?: Json;
          editable_strengths?: string[];
          editable_weaknesses?: string[];
          editable_attendance_days?: Json;
          editable_homework_count?: Json;
          editable_full_attendance_days?: Json;
          editable_homework_standard?: Json;
          editable_growth_suggestions?: Json;
          editable_home_school_tips?: Json;
          editable_kp_descriptions?: Json;
          honor_records?: Json;
          merge_title?: string;
          merged_quote?: string;
          updated_at?: string;
        };
      };
      student_photos: {
        Row: {
          id: string;
          student_id: string | null;
          photo_url: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id?: string | null;
          photo_url: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          photo_url?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
    };
  };
}
