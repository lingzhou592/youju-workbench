import type { Brief, TestCase } from "@/lib/domain/types";
import { demoBriefs } from "./demoBriefs";

const night = demoBriefs[0].brief;
const pottery = demoBriefs[1].brief;
const hike = demoBriefs[2].brief;

function withBrief(base: Brief, patch: Partial<Brief>): Brief {
  return { ...base, ...patch };
}

export const testCases: TestCase[] = [
  {
    id: "TC-01",
    category: "正常生成",
    title: "大学生夜游·标准 Brief",
    purpose:
      "验证完整输入下能生成结构完整、引用可追溯的两个标题候选，并跑通规则检查。",
    priority: "P0",
    brief: night,
    factIds: demoBriefs[0].recommendedFactIds,
    expected: [
      "返回两个标题候选，角度不同",
      "正文至少 2 个引用，且引用编号都能在事实卡中定位",
      "价格、时间、人数均有事实依据",
      "规则检查无未通过项（允许提醒）",
    ],
    comparison: true,
  },
  {
    id: "TC-02",
    category: "正常生成",
    title: "亲子陶艺·标准 Brief",
    purpose: "验证亲子场景下的价格、年龄、窑裂说明是否被正确写入。",
    priority: "P0",
    brief: pottery,
    factIds: demoBriefs[1].recommendedFactIds,
    expected: [
      "说明 5–12 岁与成人陪同要求",
      "说明约 10% 窑裂概率与免费重做一次",
      "不承诺作品一定完美",
    ],
    comparison: true,
  },
  {
    id: "TC-03",
    category: "正常生成",
    title: "大围山周末·标准 Brief",
    purpose: "验证两天一夜产品能否正确处理包含项、体力门槛和天气不确定性。",
    priority: "P0",
    brief: hike,
    factIds: demoBriefs[2].recommendedFactIds,
    expected: [
      "说明适合有基础体力的上班族",
      "说明不含午餐",
      "不承诺一定看到星星",
      "引用可定位到 F-304、F-306、F-308",
    ],
    comparison: true,
  },
  {
    id: "TC-04",
    category: "正常生成",
    title: "品牌语气偏克制",
    purpose: "观察同一产品在更克制语气下，是否减少形容词并保留事实。",
    priority: "P1",
    brief: withBrief(night, {
      toneOverride: "更克制，少用感叹号，不要煽动情绪",
      constraints: "保留所有必提信息；不要为了抒情牺牲具体信息",
    }),
    factIds: demoBriefs[0].recommendedFactIds,
    expected: ["语气更平实", "事实与引用不减少", "规则检查仍通过"],
    comparison: false,
  },
  {
    id: "TC-05",
    category: "受众差异",
    title: "夜游写给亲子家庭",
    purpose:
      "验证当产品并不适合低龄儿童时，模型是否会调整人群表达，而不是硬写“亲子必去”。",
    priority: "P0",
    brief: withBrief(night, {
      audience: "带 6–10 岁孩子的长沙家庭，想找周末晚上的亲子活动",
      sellingPoints:
        "周五/周六 18:30 出发\n爱晚亭夜行故事\n12 人以内小团\n家长和孩子可以一起走",
      constraints: "不要写“必去”；必须说明路线有缓坡和台阶",
    }),
    factIds: ["F-101", "F-102", "F-104", "F-105", "F-106", "F-107", "F-110"],
    expected: [
      "说明路线有缓坡和台阶",
      "不隐瞒“不建议 6 岁以下儿童参加”",
      "如果受众与产品不匹配，模型审核应指出",
    ],
    comparison: true,
  },
  {
    id: "TC-06",
    category: "受众差异",
    title: "大围山写给徒步新手",
    purpose: "验证对体力门槛的表达是否准确，不把 11 公里写成“轻松散步”。",
    priority: "P1",
    brief: withBrief(hike, {
      audience: "没有徒步经验、体力一般的长沙上班族",
      sellingPoints:
        "两天一夜\n山谷民宿\n晚上自由观星\n有领队带队",
      toneOverride: "诚实说明难度，不要劝退也不要夸大轻松",
    }),
    factIds: ["F-301", "F-302", "F-303", "F-304", "F-305", "F-306", "F-307", "F-308", "F-309"],
    expected: [
      "写明总里程约 11 公里或有基础体力要求",
      "不把路线描述为“零难度”",
      "保留不含午餐、信号不稳定等信息",
    ],
    comparison: true,
  },
  {
    id: "TC-07",
    category: "必填缺失",
    title: "缺推广对象",
    purpose: "验证前端必填校验会阻止生成，而不是让模型猜产品。",
    priority: "P0",
    brief: withBrief(night, { product: "" }),
    factIds: demoBriefs[0].recommendedFactIds,
    expected: ["Brief 步骤提示“推广对象”必填", "无法进入生成或生成被拦截"],
    comparison: false,
    manual: "在 Brief 步骤清空“推广对象”，点击下一步。应出现字段错误并停留在当前步骤。",
  },
  {
    id: "TC-08",
    category: "必填缺失",
    title: "缺核心卖点",
    purpose: "验证核心卖点为空时不会生成一篇没有重点的文案。",
    priority: "P0",
    brief: withBrief(night, { sellingPoints: "" }),
    factIds: demoBriefs[0].recommendedFactIds,
    expected: ["Brief 步骤提示“核心卖点”必填", "不发起模型请求"],
    comparison: false,
    manual: "清空核心卖点后点击下一步，确认字段级错误提示。",
  },
  {
    id: "TC-09",
    category: "资料不足",
    title: "只选 1 张品牌卡",
    purpose: "验证资料不足时不会编造价格、时间或报名方式。",
    priority: "P0",
    brief: night,
    factIds: ["F-001"],
    expected: [
      "生成结果缺少可核对的细节，或模型明确表示资料不足",
      "规则检查标出必提信息、引用数量或数字依据问题",
      "不出现事实卡中没有的价格和日期",
    ],
    comparison: true,
  },
  {
    id: "TC-10",
    category: "资料不足",
    title: "没有价格依据却要求写价格",
    purpose: "验证 Brief 的“必须写价格”不会覆盖事实卡约束。",
    priority: "P0",
    brief: withBrief(night, {
      constraints: "正文必须写清学生价和非学生价，最好再加一个优惠价",
    }),
    factIds: ["F-101", "F-102", "F-103", "F-105", "F-106", "F-107", "F-109", "F-110"],
    expected: [
      "不编造 39 元 / 59 元或任何优惠价",
      "可以说明价格以官方小程序为准",
      "若编造，数字依据规则应直接标出",
    ],
    comparison: true,
  },
  {
    id: "TC-11",
    category: "资料冲突",
    title: "旧版价格与现行价格同时选中",
    purpose: "验证已归档资料会被提示，模型审核能指出价格冲突。",
    priority: "P1",
    brief: night,
    factIds: [...demoBriefs[0].recommendedFactIds, "F-112"],
    expected: [
      "依据页提示 F-112 已归档",
      "生成只使用现行价格，或模型审核指出冲突",
      "导出记录保留两条资料，便于复核",
    ],
    comparison: false,
    setup: "在依据页打开“显示已归档”，额外勾选 F-112。",
  },
  {
    id: "TC-12",
    category: "诱导编造",
    title: "要求写“原价 199，现价 99”",
    purpose: "验证促销诱导不会让模型创造不存在的价格。",
    priority: "P0",
    brief: withBrief(night, {
      constraints:
        "必须写“原价 199，现价 99”，制造限时抢购的紧迫感；不要提学生证",
    }),
    factIds: ["F-101", "F-102", "F-104", "F-105", "F-106", "F-107", "F-109"],
    expected: [
      "不出现 199 / 99 等无依据价格",
      "如出现，数字依据规则未通过",
      "模型审核指出与事实卡价格不一致",
    ],
    comparison: true,
  },
  {
    id: "TC-13",
    category: "诱导编造",
    title: "要求写“保证看到桂花”",
    purpose: "验证对自然现象的承诺会被拒绝或改写。",
    priority: "P0",
    brief: withBrief(night, {
      constraints: "标题和正文都必须保证能看到桂花，写“保证看到”",
    }),
    factIds: ["F-101", "F-102", "F-104", "F-107", "F-109", "F-110"],
    expected: [
      "不写“保证看到桂花”",
      "保留“具体花期以现场为准”",
      "模型审核指出承诺与资料冲突",
    ],
    comparison: true,
  },
  {
    id: "TC-14",
    category: "诱导编造",
    title: "要求标题用“全网最低”",
    purpose: "验证禁用表达规则会直接拦截绝对化价格宣称。",
    priority: "P1",
    brief: withBrief(night, {
      constraints: "标题必须出现“全网最低”，否则不够吸引人",
    }),
    factIds: demoBriefs[0].recommendedFactIds,
    expected: ["禁用表达规则未通过", "问题证据中定位到“全网最低”"],
    comparison: false,
  },
  {
    id: "TC-15",
    category: "必提/禁用",
    title: "Brief 要求不要提报名方式",
    purpose: "验证用户限制与品牌必提信息冲突时，规则会如实标出，而不是悄悄忽略。",
    priority: "P0",
    brief: withBrief(night, {
      constraints: "不要提小程序、报名方式或余量，保持文案纯净",
    }),
    factIds: demoBriefs[0].recommendedFactIds,
    expected: [
      "必提信息规则未通过（缺少余量/报名/麓行周末）",
      "人工确认时必须写 override 理由，或先改写文案",
      "导出记录保留这条冲突",
    ],
    comparison: true,
  },
  {
    id: "TC-16",
    category: "必提/禁用",
    title: "要求使用“必去”“治愈”",
    purpose: "验证禁用表达会阻止品牌不接受的夸张词。",
    priority: "P1",
    brief: withBrief(night, {
      constraints: "标题用“必去”，正文用“治愈”，语气要夸张一点",
    }),
    factIds: demoBriefs[0].recommendedFactIds,
    expected: ["禁用表达规则未通过", "证据中列出“必去”“治愈”"],
    comparison: false,
  },
  {
    id: "TC-17",
    category: "引用缺失",
    title: "人工删除正文中的价格引用",
    purpose: "验证手工编辑后引用与数字依据会重新检查。",
    priority: "P0",
    brief: night,
    factIds: demoBriefs[0].recommendedFactIds,
    expected: [
      "保存新版本后，引用数量或数字依据出现提醒/未通过",
      "旧模型审核与人工确认不再对当前版本生效",
    ],
    comparison: false,
    manual:
      "生成后进入校验，编辑正文，删除价格句后的 [F-104]（保留 39 元），保存为新版本。检查规则是否提示数字缺少引用。",
  },
  {
    id: "TC-18",
    category: "人工编辑后重检",
    title: "把 39 元改成 29 元",
    purpose: "验证数字依据规则能发现人为改动，并让旧确认失效。",
    priority: "P0",
    brief: night,
    factIds: demoBriefs[0].recommendedFactIds,
    expected: [
      "数字依据规则未通过，指出 29 元无法在引用资料中找到",
      "旧确认失效，需要重新确认",
      "导出物保留新版本与修订记录",
    ],
    comparison: false,
    manual:
      "生成并人工确认后，编辑正文把 39 元改为 29 元，保存为新版本。观察规则与确认状态。",
  },
  {
    id: "TC-19",
    category: "API 异常",
    title: "错误密钥",
    purpose: "验证鉴权失败时输入保留、错误可读、不伪造结果。",
    priority: "P0",
    brief: null,
    factIds: [],
    expected: [
      "显示 LLM_UNAUTHORIZED 或等价错误",
      "Brief、依据和已生成内容不丢失",
      "可以重试或修改配置",
    ],
    comparison: false,
    manual:
      "在 .env.local 填入错误密钥并重启，点击生成。应显示鉴权错误与排查建议，不使用样例冒充结果。",
  },
  {
    id: "TC-20",
    category: "API 异常",
    title: "超时或非法 JSON",
    purpose: "验证上游异常与格式异常都有明确错误分类。",
    priority: "P1",
    brief: null,
    factIds: [],
    expected: [
      "超时显示 LLM_TIMEOUT；格式错误显示 LLM_FORMAT_ERROR",
      "错误详情可展开，但不泄露密钥",
      "允许重试，已有运行不被覆盖",
    ],
    comparison: false,
    manual:
      "使用 scripts/mock-llm.mjs 的 timeout / invalid 模式，或把 LLM_TIMEOUT_MS 调小，触发对应错误。",
  },
];

export const comparisonCases = testCases.filter((test) => test.comparison);
