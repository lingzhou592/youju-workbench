import type { GenerationResult, Run } from "@/lib/domain/types";
import { makeRun } from "@/lib/domain/factories";
import { demoBrand } from "./demoBrand";
import { demoBriefs } from "./demoBriefs";
import { demoFacts } from "./demoFacts";

const brief = demoBriefs[0].brief;
const facts = demoFacts.filter((fact) =>
  demoBriefs[0].recommendedFactIds.includes(fact.id),
);

const sampleGeneration: GenerationResult = {
  titles: [
    {
      id: "A",
      angle: "场景切入",
      title: "周五下班后，去岳麓山走一段夜路",
      rationale:
        "用“周五下班后”这个具体时间点，把夜游放进大学生已经熟悉的周末节奏里，降低决策门槛。",
      hypothesis:
        "具体时间点比“夜游”本身更能让人代入，但需要用正文里的路线和价格承接期待。",
    },
    {
      id: "B",
      angle: "人群需求",
      title: "周末别宅着，去岳麓山走 2 小时",
      rationale:
        "直接对大学生周末“想出门但不想走远”的阻力说话，用 2 小时强调轻量。",
      hypothesis:
        "“别宅着”可能带来一点行动感，但对不喜欢被说教的读者可能略强，需要看实际反馈。",
    },
  ],
  body: `周五 18:30，东方红广场见。我们从登高路往上走，穿过岳麓山南大门，到穿石坡湖时天已经黑了。[F-102][F-103]

全程约 3.5 公里，走 2 小时左右，沿途有 4 个讲解点。[F-101] 领队会带一盏暖光马灯，在爱晚亭停 15 分钟，讲 3 个和岳麓山有关的夜行故事。[F-107]

这周的两场是“桂花季夜行”，10 月 24 日、25 日出发，路上能闻到桂花；花期以现场为准。[F-109] 大学生凭学生证 39 元/人，非学生 59 元/人，费用含领队、讲解和保险，不含餐饮。[F-104]

每团 8–12 人，满 6 人成行。[F-105] 适合 18–28 岁的大学生和年轻上班族；路线有缓坡和台阶，不建议 6 岁以下儿童参加。[F-106]

余量和报名都在官方小程序「麓行周末」看，客服不单独留位。[F-002] 建议穿防滑运动鞋，自带水，山间蚊虫多，记得带驱蚊用品。[F-110]

周五下班后，给自己留两个小时，去山里走一走。`,
  tags: ["#长沙周末", "#岳麓山夜游", "#大学生周末", "#夜游"],
  imageSuggestion: [
    "18:40 的东方红广场，几个人背着帆布包站在路灯下，领队手里提一盏暖光马灯。",
    "爱晚亭前的石阶，马灯放在栏杆边，光落在同行人的鞋尖和手里的矿泉水瓶上。",
    "穿石坡湖边的夜路，树影压得很低，远处有一盏路灯，画面保留一点暗部。",
  ],
  citations: [
    {
      factId: "F-102",
      quote: "每周五、周六 18:30 在东方红广场集合",
      usedFor: "开头集合时间与地点",
    },
    {
      factId: "F-103",
      quote:
        "东方红广场—登高路—岳麓山南大门—穿石坡湖—爱晚亭—岳麓书院外围",
      usedFor: "路线",
    },
    {
      factId: "F-101",
      quote: "全程约 3.5 公里，步行约 2 小时，沿途设 4 个讲解点",
      usedFor: "里程、时长与讲解点",
    },
    {
      factId: "F-107",
      quote:
        "领队携带一盏暖光马灯；在爱晚亭停留约 15 分钟，讲 3 个与岳麓山有关的夜行故事",
      usedFor: "体验细节",
    },
    {
      factId: "F-109",
      quote: "10 月 24 日、25 日两场为",
      usedFor: "近期场次",
    },
    {
      factId: "F-104",
      quote: "大学生凭有效学生证 39 元/人；非学生 59 元/人",
      usedFor: "价格",
    },
    {
      factId: "F-105",
      quote: "每团 8–12 人，满 6 人成行",
      usedFor: "人数与成行条件",
    },
    {
      factId: "F-106",
      quote: "适合 18–28 岁大学生和年轻上班族",
      usedFor: "适合人群",
    },
    {
      factId: "F-002",
      quote:
        "所有活动余量查询、报名与改期均在官方小程序「麓行周末」完成",
      usedFor: "报名方式",
    },
    {
      factId: "F-110",
      quote: "建议穿防滑运动鞋，自带饮用水；山间蚊虫较多，请自备驱蚊用品",
      usedFor: "行前提示",
    },
  ],
  selfCheck: [
    "价格、时间、人数均来自事实卡。",
    "必提信息覆盖 2/3，缺少“活动安排以现场实际情况为准”中的“实际”。",
    "标题没有使用禁用表达。",
  ],
  source: "sample",
};

export function createSampleRun(): Run {
  const run = makeRun({
    brief,
    brand: demoBrand,
    facts,
    generation: sampleGeneration,
    candidate: "A",
  });
  return {
    ...run,
    sample: true,
  };
}
