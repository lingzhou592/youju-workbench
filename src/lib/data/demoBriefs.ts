import type { Brief, BriefTemplate } from "@/lib/domain/types";

export const emptyBrief: Brief = {
  campaignName: "",
  product: "",
  goal: "",
  audience: "",
  sellingPoints: "",
  toneOverride: "",
  constraints: "",
  channel: "小红书",
};

export const demoBriefs: BriefTemplate[] = [
  {
    id: "brief-night",
    label: "大学生 · 桂花季夜行",
    description: "岳麓山夜游，周末两小时轻散步；适合演示完整流程。",
    brief: {
      campaignName: "桂花季夜行·岳麓山夜游",
      product: "岳麓山夜游·大学城散步线",
      goal: "内容种草 + 周末场次报名",
      audience: "长沙高校大学生，18–24 岁，周末想找一件不用出远门的小事",
      sellingPoints:
        "周五/周六 18:30 出发，2 小时左右的轻散步\n12 人以内小团，有领队和讲解\n爱晚亭停留 15 分钟，听 3 个夜行故事\n大学生凭学生证 39 元/人",
      toneOverride: "像朋友发来的周末邀约，轻松但不吵闹",
      constraints:
        "必须提到官方小程序「麓行周末」；不要写“必去”“治愈”；价格只写 39 元学生价，不要编造其他优惠",
      channel: "小红书",
    },
    recommendedFactIds: [
      "F-002",
      "F-101",
      "F-102",
      "F-103",
      "F-104",
      "F-105",
      "F-106",
      "F-107",
      "F-109",
      "F-110",
    ],
  },
  {
    id: "brief-pottery",
    label: "亲子 · 把秋天印进陶杯",
    description: "铜官窑亲子半日，重点是可预期的信息与窑裂说明。",
    brief: {
      campaignName: "把秋天印进陶杯里",
      product: "铜官窑陶艺亲子半日",
      goal: "周末亲子活动报名",
      audience: "长沙 5–12 岁孩子的家庭，周末想安排半天室内活动",
      sellingPoints:
        "周日 9:30–12:00，2.5 小时\n亲子共同完成一件陶坯，杯子或小碗\n作品烧制后 15 个工作日内寄到家\n每场 6–10 组家庭",
      toneOverride: "温和、具体，给家长可预期的信息",
      constraints:
        "必须说明窑裂概率和免费重做一次；不要承诺作品一定完美；不要写“治愈”“必去”",
      channel: "小红书",
    },
    recommendedFactIds: [
      "F-002",
      "F-201",
      "F-202",
      "F-203",
      "F-204",
      "F-205",
      "F-206",
      "F-208",
      "F-209",
      "F-210",
    ],
  },
  {
    id: "brief-hike",
    label: "上班族 · 山谷里没有闹钟",
    description: "大围山两天一夜，强调体力门槛、包含项与不确定性。",
    brief: {
      campaignName: "去山谷里过一个没有闹钟的周末",
      product: "大围山轻徒步·山谷放空周末",
      goal: "周末短途产品认知 + 预订",
      audience: "长沙 22–35 岁上班族，有基础体力，想离开城市一晚",
      sellingPoints:
        "两天一夜，徒步总里程约 11 公里\n住山谷民宿，晚上 40 分钟自由观星\n10–12 人小团，含往返交通和 1 早 1 晚\n成人 680 元/人，不含午餐",
      toneOverride: "克制、松弛，不喊口号",
      constraints:
        "必须说明适合有基础体力的人、不含午餐；不要写“治愈”“封神”；不要承诺一定看到星星",
      channel: "小红书",
    },
    recommendedFactIds: [
      "F-002",
      "F-301",
      "F-302",
      "F-303",
      "F-304",
      "F-305",
      "F-306",
      "F-307",
      "F-308",
      "F-309",
      "F-310",
    ],
  },
];

export function getBriefTemplate(id: string): BriefTemplate | undefined {
  return demoBriefs.find((template) => template.id === id);
}
