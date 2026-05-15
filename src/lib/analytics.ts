/**
 * analytics.ts - 自动计算工具层
 * 所有数据聚合、对比、标签提取、知识点掌握度计算等逻辑
 */
import type {
  TypingRecord,
  ProblemRetryRecord,
  HomeworkRecord,
  KnowledgeProgress,
  Course,
} from './types';

// ============ Period Helpers ============

export type PeriodType = 'week' | 'month' | 'custom';

export function getRecordsInPeriod<T extends { date: string }>(
  records: T[],
  start: string,
  end: string
): T[] {
  return records.filter((r) => r.date >= start && r.date <= end);
}

export function getMonthRange(month: string): { start: string; end: string } {
  const start = `${month}-01`;
  const d = new Date(month + '-01');
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const end = `${month}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function getPreviousMonthRange(month: string): { start: string; end: string } {
  const d = new Date(month + '-01');
  d.setMonth(d.getMonth() - 1);
  const prevMonth = d.toISOString().substring(0, 7);
  return getMonthRange(prevMonth);
}

export function getWeekRanges(month: string): { label: string; start: string; end: string }[] {
  const { start: monthStart, end: monthEnd } = getMonthRange(month);
  const startDay = new Date(monthStart);
  const endDay = new Date(monthEnd);
  const weeks: { label: string; start: string; end: string }[] = [];
  const weekLabels = ['第一周', '第二周', '第三周', '第四周', '第五周'];
  let current = new Date(startDay);
  let weekIdx = 0;
  while (current <= endDay && weekIdx < 5) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekEnd > endDay) weekEnd.setTime(endDay.getTime());
    weeks.push({
      label: weekLabels[weekIdx],
      start: weekStart.toISOString().substring(0, 10),
      end: weekEnd.toISOString().substring(0, 10),
    });
    current.setDate(current.getDate() + 7);
    weekIdx++;
  }
  return weeks;
}

// ============ Typing Analytics ============

export interface TypingSummary {
  avgSpeed: number;
  avgAccuracy: number;
  count: number;
  maxSpeed: number;
  minSpeed: number;
}

export function calcTypingSummary(records: TypingRecord[]): TypingSummary {
  if (records.length === 0) {
    return { avgSpeed: 0, avgAccuracy: 0, count: 0, maxSpeed: 0, minSpeed: 0 };
  }
  const speeds = records.map((r) => r.speed);
  return {
    avgSpeed: Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length),
    avgAccuracy: Math.round(records.reduce((a, b) => a + b.accuracy, 0) / records.length),
    count: records.length,
    maxSpeed: Math.max(...speeds),
    minSpeed: Math.min(...speeds),
  };
}

export function calcTypingImprovement(current: TypingSummary, previous: TypingSummary): number {
  if (previous.avgSpeed === 0) return 0;
  return Math.round(((current.avgSpeed - previous.avgSpeed) / previous.avgSpeed) * 100);
}

export function getTypingWeeklyData(
  records: TypingRecord[],
  month: string
): { week: string; avgSpeed: number; avgAccuracy: number; count: number }[] {
  const weeks = getWeekRanges(month);
  return weeks.map((w) => {
    const weekRecords = getRecordsInPeriod(records, w.start, w.end);
    const summary = calcTypingSummary(weekRecords);
    return { week: w.label, ...summary };
  });
}

// ============ Retry Analytics ============

export interface RetrySummary {
  count: number;
  avgTimeSpent: number;
  avgImprovement: number;
  problems: {
    problemName: string;
    firstTime: number;
    lastTime: number;
    improvement: number;
    knowledgePoint: string;
  }[];
}

export function calcRetrySummary(
  records: ProblemRetryRecord[],
  course?: Course
): RetrySummary {
  if (records.length === 0) {
    return { count: 0, avgTimeSpent: 0, avgImprovement: 0, problems: [] };
  }

  const problemMap = new Map<string, ProblemRetryRecord[]>();
  records.forEach((r) => {
    const key = r.problemId || r.problemName;
    if (!problemMap.has(key)) problemMap.set(key, []);
    problemMap.get(key)!.push(r);
  });

  const problems = Array.from(problemMap.entries()).map(([, attempts]) => {
    const sorted = [...attempts].sort((a, b) => a.attempt - b.attempt);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const pct =
      first.timeSpent > 0
        ? Math.round(((first.timeSpent - last.timeSpent) / first.timeSpent) * 100)
        : 0;
    const problemDef = course?.problems.find((p) => p.id === first.problemId);
    const knowledgePoint = problemDef?.knowledgePointId
      ? course?.knowledgePoints.find((kp) => kp.id === problemDef.knowledgePointId)?.name || ''
      : '';
    return {
      problemName: first.problemName,
      firstTime: first.timeSpent,
      lastTime: last.timeSpent,
      improvement: pct,
      knowledgePoint,
    };
  });

  const avgTimeSpent = Math.round(
    records.reduce((s, r) => s + r.timeSpent, 0) / records.length
  );
  const avgImprovement =
    problems.length > 0
      ? Math.round(problems.reduce((s, p) => s + p.improvement, 0) / problems.length)
      : 0;

  return { count: records.length, avgTimeSpent, avgImprovement, problems };
}

// ============ Homework Analytics ============

export interface HomeworkSummary {
  count: number;
  avgScore: number;
  bestTitle: string;
  bestScore: number;
}

export function calcHomeworkSummary(records: HomeworkRecord[]): HomeworkSummary {
  if (records.length === 0) {
    return { count: 0, avgScore: 0, bestTitle: '', bestScore: 0 };
  }
  const scores = records.map((r) => r.score ?? 0);
  const best = records.reduce((a, b) => ((a.score ?? 0) >= (b.score ?? 0) ? a : b));
  return {
    count: records.length,
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    bestTitle: best.title,
    bestScore: best.score ?? 0,
  };
}

// ============ Knowledge Mastery ============

export interface KnowledgeMastery {
  knowledgePointId: string;
  knowledgePointName: string;
  masteryPercent: number; // 0-100
  status: string;
  score: number;
  isWeak: boolean;
}

/**
 * Auto-calculate knowledge mastery (0-100%) based on:
 * - Manual status: not_started=0, learning=50, mastered=100
 * - Score: adds 0-5 bonus to learning
 * - Problem retry data: if problems under this KP have improvement > 0, boost
 */
export function calcKnowledgeMastery(
  knowledge: KnowledgeProgress[],
  retryRecords: ProblemRetryRecord[],
  course?: Course
): KnowledgeMastery[] {
  return knowledge.map((k) => {
    let base: number;
    if (k.status === 'mastered') {
      base = 85;
    } else if (k.status === 'learning') {
      base = 35;
    } else {
      base = 0;
    }

    // Score bonus (1-10 maps to 0-10 extra)
    const scoreBonus = k.score ? (k.score / 10) * 10 : 0;

    // Problem retry bonus: check problems linked to this KP
    let retryBonus = 0;
    if (course) {
      const kpProblems = course.problems.filter(
        (p) => p.knowledgePointId === k.knowledgePointId
      );
      if (kpProblems.length > 0) {
        const kpRetries = retryRecords.filter((r) =>
          kpProblems.some((p) => p.id === r.problemId)
        );
        if (kpRetries.length > 0) {
          const avgImprovement =
            kpRetries.reduce((s, r) => {
              // Find previous attempt for same problem
              const prev = retryRecords.find(
                (pr) =>
                  pr.problemId === r.problemId &&
                  pr.attempt === r.attempt - 1 &&
                  pr.studentId === r.studentId
              );
              if (prev && prev.timeSpent > 0) {
                return s + ((prev.timeSpent - r.timeSpent) / prev.timeSpent) * 100;
              }
              return s;
            }, 0) / kpRetries.length;
          retryBonus = Math.min(Math.max(avgImprovement * 0.05, 0), 5);
        }
      }
    }

    const masteryPercent = Math.min(Math.round(base + scoreBonus + retryBonus), 100);
    return {
      knowledgePointId: k.knowledgePointId,
      knowledgePointName: k.knowledgePointName,
      masteryPercent,
      status: k.status,
      score: k.score || 0,
      isWeak: masteryPercent < 40 && k.status !== 'not_started',
    };
  });
}

export function getWeakKnowledgePoints(mastery: KnowledgeMastery[]): KnowledgeMastery[] {
  return mastery
    .filter((m) => m.isWeak)
    .sort((a, b) => a.masteryPercent - b.masteryPercent);
}

export function getStrongKnowledgePoints(mastery: KnowledgeMastery[]): KnowledgeMastery[] {
  return mastery
    .filter((m) => m.masteryPercent >= 70)
    .sort((a, b) => b.masteryPercent - a.masteryPercent);
}

// ============ Auto Tags ============

export interface AutoTag {
  type: 'highlight' | 'weakness';
  label: string;
  source: string; // what data generated this tag
}

export function generateAutoTags(
  typing: TypingSummary,
  prevTyping: TypingSummary,
  retry: RetrySummary,
  prevRetry: RetrySummary,
  homework: HomeworkSummary,
  mastery: KnowledgeMastery[]
): AutoTag[] {
  const tags: AutoTag[] = [];

  // Typing speed improvement
  const speedImprove = calcTypingImprovement(typing, prevTyping);
  if (speedImprove > 15) {
    tags.push({ type: 'highlight', label: '打字速度进步显著', source: `速度提升${speedImprove}%` });
  } else if (speedImprove > 0) {
    tags.push({ type: 'highlight', label: '打字速度稳步提升', source: `速度提升${speedImprove}%` });
  } else if (speedImprove < -10) {
    tags.push({ type: 'weakness', label: '打字速度需加强', source: `速度下降${Math.abs(speedImprove)}%` });
  }

  // Accuracy
  if (typing.avgAccuracy >= 95) {
    tags.push({ type: 'highlight', label: '正确率优秀', source: `平均${typing.avgAccuracy}%` });
  } else if (typing.avgAccuracy > 0 && typing.avgAccuracy < 80) {
    tags.push({ type: 'weakness', label: '正确率待提升', source: `平均${typing.avgAccuracy}%` });
  }

  // Retry improvement
  if (retry.avgImprovement > 30) {
    tags.push({ type: 'highlight', label: '做题效率大幅提升', source: `平均提升${retry.avgImprovement}%` });
  } else if (retry.avgImprovement > 0) {
    tags.push({ type: 'highlight', label: '做题效率提升', source: `平均提升${retry.avgImprovement}%` });
  }

  // Knowledge mastery
  const mastered = mastery.filter((m) => m.masteryPercent >= 80).length;
  const total = mastery.length;
  if (total > 0 && mastered >= total * 0.5) {
    tags.push({ type: 'highlight', label: '知识掌握扎实', source: `${mastered}/${total}知识点达标` });
  }

  const weakCount = mastery.filter((m) => m.isWeak).length;
  if (weakCount >= 2) {
    tags.push({ type: 'weakness', label: `${weakCount}个知识点薄弱`, source: `需加强练习` });
  }

  // Homework
  if (homework.count >= 4) {
    tags.push({ type: 'highlight', label: '作业完成积极', source: `${homework.count}次作业` });
  }
  if (homework.avgScore >= 8) {
    tags.push({ type: 'highlight', label: '作业质量高', source: `平均${homework.avgScore}分` });
  }

  return tags;
}

// ============ Auto Growth Description ============

export function generateGrowthDescription(
  studentName: string,
  typing: TypingSummary,
  prevTyping: TypingSummary,
  retry: RetrySummary,
  mastery: KnowledgeMastery[],
  monthLabel: string
): string {
  const traits: string[] = [];
  const strongKPs = getStrongKnowledgePoints(mastery);
  const weakKPs = getWeakKnowledgePoints(mastery);
  const speedImprove = calcTypingImprovement(typing, prevTyping);

  if (strongKPs.length > weakKPs.length) traits.push('基础知识掌握扎实');
  if (retry.avgImprovement > 30) traits.push('做题效率提升显著');
  if (retry.problems.length > 0 && retry.problems.every((r) => r.improvement > 0)) traits.push('各题型均有进步');
  if (speedImprove > 0) traits.push('打字速度持续提升');
  if (strongKPs.length >= 3) traits.push('知识面覆盖广泛');

  const strongProblemNames = retry.problems.filter((r) => r.improvement > 20).map((r) => r.problemName);

  let desc = `${studentName}${monthLabel}`;
  if (traits.length > 0) desc += `表现${traits.slice(0, 3).join('，')}`;
  if (strongProblemNames.length > 0) desc += `，在${strongProblemNames.slice(0, 2).join('、')}等题型上进步突出`;
  if (strongKPs.length > 0) desc += `。已扎实掌握${strongKPs.slice(0, 3).map((k) => k.knowledgePointName).join('、')}等知识点`;
  if (weakKPs.length > 0) desc += `，${weakKPs.slice(0, 2).map((k) => k.knowledgePointName).join('、')}仍需加强`;
  desc += '。';

  return desc;
}

// ============ Auto Study Suggestions ============

export function generateStudySuggestions(
  weakKPs: KnowledgeMastery[],
  retry: RetrySummary,
  typing: TypingSummary
): string[] {
  const suggestions: string[] = [];

  weakKPs.forEach((kp) => {
    suggestions.push(`加强「${kp.knowledgePointName}」的练习，当前掌握度${kp.masteryPercent}%，建议通过反复做题巩固理解`);
  });

  if (retry.avgTimeSpent > 15) {
    suggestions.push('做题用时偏长，建议加强基础概念的快速识别能力训练');
  }

  if (typing.avgAccuracy < 85 && typing.count > 0) {
    suggestions.push('打字正确率有待提升，建议每天安排10分钟打字练习，注重准确率而非速度');
  }

  if (suggestions.length === 0) {
    suggestions.push('继续保持良好的学习节奏，稳步推进新知识点的学习');
  }

  return suggestions;
}

// ============ Comment Templates ============

export interface CommentTemplate {
  id: string;
  category: 'excellent' | 'good' | 'average' | 'needs_effort';
  label: string;
  content: string;
}

export const COMMENT_TEMPLATES: CommentTemplate[] = [
  {
    id: 'excellent_1',
    category: 'excellent',
    label: '全面发展型',
    content: '本月表现出色，各方面均衡发展，继续保持这个势头！',
  },
  {
    id: 'excellent_2',
    category: 'excellent',
    label: '突破进步型',
    content: '这个月进步非常明显，特别是在做题效率上有了质的飞跃，老师为你骄傲！',
  },
  {
    id: 'good_1',
    category: 'good',
    label: '稳步成长型',
    content: '本月学习态度认真，各项数据稳步提升，继续保持加油！',
  },
  {
    id: 'good_2',
    category: 'good',
    label: '潜力待发型',
    content: '基础扎实，有很大的提升空间，再多加练习一定能取得更大进步！',
  },
  {
    id: 'average_1',
    category: 'average',
    label: '需加把劲型',
    content: '本月学习有所松懈，部分知识点掌握不够牢固，下个月要更加努力哦！',
  },
  {
    id: 'average_2',
    category: 'average',
    label: '偏科需补型',
    content: '有些知识点学得不错，但薄弱项需要多花时间补强，不能偏科哦！',
  },
  {
    id: 'needs_effort_1',
    category: 'needs_effort',
    label: '鼓励加油型',
    content: '这个月遇到了一些困难，但老师相信你一定能克服！下个月我们一起加油！',
  },
  {
    id: 'needs_effort_2',
    category: 'needs_effort',
    label: '耐心陪伴型',
    content: '学习编程需要时间和耐心，不要着急，按照自己的节奏一步步来，老师一直陪着你！',
  },
];

export function recommendCommentTemplate(tags: AutoTag[]): CommentTemplate {
  const highlights = tags.filter((t) => t.type === 'highlight').length;
  const weaknesses = tags.filter((t) => t.type === 'weakness').length;

  if (highlights >= 3 && weaknesses === 0) {
    return COMMENT_TEMPLATES.find((t) => t.id === 'excellent_1')!;
  }
  if (highlights >= 2 && weaknesses <= 1) {
    return COMMENT_TEMPLATES.find((t) => t.id === 'excellent_2')!;
  }
  if (highlights >= 1 && weaknesses <= 1) {
    return COMMENT_TEMPLATES.find((t) => t.id === 'good_1')!;
  }
  if (highlights >= 1 && weaknesses >= 2) {
    return COMMENT_TEMPLATES.find((t) => t.id === 'average_2')!;
  }
  if (weaknesses >= 2) {
    return COMMENT_TEMPLATES.find((t) => t.id === 'needs_effort_1')!;
  }
  return COMMENT_TEMPLATES.find((t) => t.id === 'good_2')!;
}
