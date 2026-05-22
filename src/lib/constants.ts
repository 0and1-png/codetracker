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
  knowledge: '知识点',
  typing: '速度练习',
  retry: '三刷',
  homework: '作业',
  curriculum: '功法谱',
  report: '月度报告',
  teacher: '老师',
  focus: '专注度',
  attendance: '出勤',
  strengths: '亮点标签',
  improvements: '待改进',
  save: '保存',
  history: '学习记录',
  detail: '弟子档案',
  addStudent: '收入门下',
  importCSV: '批量收徒',
  speed: '打字速度',
  accuracy: '正确率',
  mastered: '已掌握',
  learning: '学习中',
  notStarted: '未开始',
  bestWork: '本月最佳作品',
  teacherComment: '老师寄语',
  nextGoal: '下月目标',
  knowledgePoints: '知识点',
} as const;

export const KNOWLEDGE_STATUS_LABELS: Record<string, string> = {
  not_started: '未开始',
  learning: '学习中',
  mastered: '已掌握',
};

export const KNOWLEDGE_STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-800/50 text-gray-400 border border-gray-700/50',
  learning: 'bg-amber-900/30 text-amber-400 border border-amber-700/50',
  mastered: 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/50',
};

export const BEHAVIOR_LABELS = {
  focus: '专注度',
  attendance: '出勤',
} as const;

export const PRESET_STRENGTHS = [
  '逻辑清晰',
  '独立完成',
  '打字速度进步',
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
    name: '稳步进步',
    matchTags: ['打字速度进步', '逻辑清晰'],
    content: '本月学习稳步进步，知识点掌握日渐扎实。望继续保持这份专注与努力，假以时日必能更上一层楼。',
  },
  {
    id: 'breakthrough',
    name: '突破进步',
    matchTags: ['举一反三', '快速理解'],
    content: '本月学习突飞猛进，多个知识点相继攻克，可喜可贺！切记戒骄戒躁，保持良好学习习惯，方能持续进步。',
  },
  {
    id: 'typing_master',
    name: '速度达人',
    matchTags: ['打字速度进步', '代码规范'],
    content: '本月打字速度与正确率均有显著提升，代码编写效率大幅提高。望继续坚持练习，为更复杂的编程挑战打下坚实基础。',
  },
  {
    id: 'problem_solver',
    name: '解题能手',
    matchTags: ['独立完成', '逻辑清晰'],
    content: '本月三刷练习表现出色，能独立完成多道题目，逻辑推理能力稳步提升。建议在更难的知识点上继续钻研。',
  },
  {
    id: 'creative',
    name: '创意之星',
    matchTags: ['创意丰富', '思维活跃'],
    content: '思维活跃，创意层出不穷，作业中常有令人眼前一亮之作。望在代码规范上也多下功夫，使作品更加完善。',
  },
  {
    id: 'needs_patience',
    name: '需要耐心',
    matchTags: ['缺乏耐心', '粗心大意'],
    content: '理解能力不错，但做题尚需更多耐心。粗心之处需要多加注意，望下月静心练习，减少失误，定能取得更大进步。',
  },
  {
    id: 'needs_focus',
    name: '提升专注',
    matchTags: ['注意力不集中', '依赖性强'],
    content: '潜力可期，但上课时常注意力不集中。望下月能更好地专注课堂，减少依赖，独立完成更多练习。',
  },
  {
    id: 'general',
    name: '通用评语',
    matchTags: [],
    content: '本月学习态度端正，各项练习均有进展。望继续努力，在薄弱环节多加练习，下月定有更大收获。',
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
