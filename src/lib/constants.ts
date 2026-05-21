export const COURSE_PRESETS = [
  { id: 'course_cpp', name: 'C++信奥' },
  { id: 'course_python', name: 'Python' },
  { id: 'course_visual', name: '图形化' },
] as const;

export const DEFAULT_CPP_KNOWLEDGE = [
  '变量与数据类型',
  '运算符与表达式',
  '顺序结构',
  '分支结构',
  '循环结构',
  '数组',
  '字符串',
  '函数',
  '递归',
  '排序算法',
  '搜索算法',
  '贪心算法',
  '动态规划入门',
] as const;

export const DEFAULT_PYTHON_KNOWLEDGE = [
  '变量与数据类型',
  '运算符',
  '条件判断',
  '循环结构',
  '列表与元组',
  '字典与集合',
  '字符串操作',
  '函数定义',
  '文件操作',
  '模块与包',
  '面向对象基础',
  '常用库使用',
] as const;

export const DEFAULT_VISUAL_KNOWLEDGE = [
  '角色与舞台',
  '运动与坐标',
  '外观与造型',
  '事件与广播',
  '条件判断',
  '循环结构',
  '变量',
  '列表',
  '自定义积木',
  '侦测与感知',
  '画笔与绘图',
  '克隆',
] as const;

/* ===== 修仙术语映射 ===== */
export const XIAN = {
  app: '仙码录',
  student: '弟子',
  students: '弟子',
  course: '功法',
  courses: '功法阁',
  knowledge: '心法',
  typing: '指力测试',
  retry: '炼题',
  homework: '修炼日志',
  curriculum: '功法谱',
  report: '宗门月报',
  teacher: '师尊',
  focus: '心境',
  attendance: '修行勤勉',
  strengths: '悟道印记',
  improvements: '瓶颈警示',
  save: '铭刻',
  history: '修炼历程',
  detail: '弟子档案',
  addStudent: '收入门下',
  importCSV: '批量收徒',
  speed: '指力',
  accuracy: '悟性',
  mastered: '已参悟',
  learning: '参悟中',
  notStarted: '未参悟',
  bestWork: '本月杰作',
  teacherComment: '师尊寄语',
  nextGoal: '下月修炼目标',
  knowledgePoints: '心法',
} as const;

export const KNOWLEDGE_STATUS_LABELS: Record<string, string> = {
  not_started: '未参悟',
  learning: '参悟中',
  mastered: '已参悟',
};

export const KNOWLEDGE_STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-800/50 text-gray-400 border border-gray-700/50',
  learning: 'bg-amber-900/30 text-amber-400 border border-amber-700/50',
  mastered: 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/50',
};

export const BEHAVIOR_LABELS = {
  focus: '心境',
  attendance: '修行勤勉',
} as const;

export const PRESET_STRENGTHS = [
  '逻辑清晰',
  '独立完成',
  '指力精进',
  '思维活跃',
  '善于提问',
  '代码规范',
  '举一反三',
  '耐心细致',
  '团队协作',
  '创意丰富',
  '快速理解',
  '积极发言',
] as const;

export const PRESET_IMPROVEMENTS = [
  '粗心大意',
  '循环理解不足',
  '变量命名不规范',
  '缺乏耐心',
  '依赖性强',
  '注意力不集中',
  '条件判断易混',
  '函数理解薄弱',
  '代码重复多',
  '调试能力待提升',
  '注释缺失',
  '顺序逻辑不清',
] as const;

/* 评语模板 */
export const COMMENT_TEMPLATES = [
  {
    id: 'steady',
    name: '稳步精进',
    matchTags: ['指力精进', '逻辑清晰'],
    content: '本月修炼稳步精进，心法参悟日渐深入。望继续保持此番定力，假以时日必成大器。',
  },
  {
    id: 'breakthrough',
    name: '突破瓶颈',
    matchTags: ['举一反三', '快速理解'],
    content: '本月修炼突飞猛进，数个瓶颈相继突破，可喜可贺！切记戒骄戒躁，方能更上一层楼。',
  },
  {
    id: 'typing_master',
    name: '指力超群',
    matchTags: ['指力精进', '代码规范'],
    content: '指力修炼成绩斐然，打字速度与正确率皆有显著提升。望继续磨砺指尖功力，为更高阶功法打下坚实基础。',
  },
  {
    id: 'problem_solver',
    name: '解题能手',
    matchTags: ['独立完成', '逻辑清晰'],
    content: '炼题能力出众，能独立完成多道题目，逻辑推理能力稳步提升。建议在更复杂的心法上继续钻研。',
  },
  {
    id: 'creative',
    name: '创意之星',
    matchTags: ['创意丰富', '思维活跃'],
    content: '思维活跃，创意层出不穷，修炼日志中常有令人眼前一亮之作。望在代码规范上也多下功夫，使作品更加完善。',
  },
  {
    id: 'needs_patience',
    name: '需增耐心',
    matchTags: ['缺乏耐心', '粗心大意'],
    content: '悟性不差，但修行尚需更多耐心。粗心之处正是心魔作祟，望下月静心修炼，减少失误，定可更上一层。',
  },
  {
    id: 'needs_focus',
    name: '凝聚心神',
    matchTags: ['注意力不集中', '依赖性强'],
    content: '天赋可期，但修行时常心神不宁。望下月能更好地凝聚心神，减少对外依赖，独立参悟更多心法。',
  },
  {
    id: 'general',
    name: '通用评语',
    matchTags: [],
    content: '本月修炼态度端正，各项功课均有进展。望继续勤勉修行，在薄弱环节多加练习，下月定有更大收获。',
  },
] as const;

/* 课程对应颜色（修仙风） */
export const COURSE_COLORS: Record<string, { bg: string; border: string; text: string; gradient: string; icon: string; from: string; to: string }> = {
  course_cpp: {
    bg: 'bg-blue-950/40',
    border: 'border-blue-800/40',
    text: 'text-blue-400',
    gradient: 'from-blue-600 to-indigo-700',
    icon: '⚔️',
    from: '#2563eb',
    to: '#4338ca',
  },
  course_python: {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-800/40',
    text: 'text-emerald-400',
    gradient: 'from-emerald-600 to-teal-700',
    icon: '🐍',
    from: '#059669',
    to: '#0f766e',
  },
  course_visual: {
    bg: 'bg-orange-950/40',
    border: 'border-orange-800/40',
    text: 'text-orange-400',
    gradient: 'from-orange-500 to-amber-700',
    icon: '🎨',
    from: '#f97316',
    to: '#b45309',
  },
};
