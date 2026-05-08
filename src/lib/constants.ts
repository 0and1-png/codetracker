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

export const KNOWLEDGE_STATUS_LABELS: Record<string, string> = {
  not_started: '未开始',
  learning: '学习中',
  mastered: '已掌握',
};

export const KNOWLEDGE_STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-200 text-gray-600',
  learning: 'bg-amber-100 text-amber-700',
  mastered: 'bg-emerald-100 text-emerald-700',
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
