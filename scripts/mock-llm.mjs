/**
 * 本地 OpenAI-compatible mock，仅用于工程联调 / 自动化测试。
 * 它不是模型，不代表生成质量。
 *
 * 用法：
 *   npm run mock
 *   LLM_BASE_URL=http://127.0.0.1:8787/v1 LLM_API_KEY=mock-key LLM_MODEL=mock-model npm run dev
 *
 * 错误模式（把 LLM_BASE_URL 换成对应路径）：
 *   http://127.0.0.1:8787/v1-401
 *   http://127.0.0.1:8787/v1-429
 *   http://127.0.0.1:8787/v1-500
 *   http://127.0.0.1:8787/v1-invalid
 *   http://127.0.0.1:8787/v1-timeout
 *
 * 也可以写入 tmp/mock-mode（无需重启 Next）：
 *   401 | 429 | 500 | invalid | timeout | slow
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = Number.parseInt(process.env.MOCK_PORT || "8787", 10);
const HOST = "127.0.0.1";

function currentMode(url) {
  let mode = process.env.MOCK_MODE || "";
  try {
    const file = path.join(process.cwd(), "tmp", "mock-mode");
    mode = fs.readFileSync(file, "utf8").trim() || mode;
  } catch {
    // no file mode
  }
  if (url.includes("v1-401")) return "401";
  if (url.includes("v1-429")) return "429";
  if (url.includes("v1-500")) return "500";
  if (url.includes("v1-invalid")) return "invalid";
  if (url.includes("v1-timeout")) return "timeout";
  return mode;
}

function parseFacts(prompt) {
  const facts = [];
  const regex =
    /\[(F-\d{3})\]\s*([^\n]+)\n分类：([^\n]*)\n来源：([^\n]*)\n原文：([\s\S]*?)(?=\n\n\[F-\d{3}\]|\n\n【|\n\n请|\s*$)/g;
  for (const match of prompt.matchAll(regex)) {
    facts.push({
      id: match[1],
      title: match[2].trim(),
      category: match[3].trim(),
      source: match[4].trim(),
      content: match[5].trim(),
    });
  }
  return facts;
}

function pickFacts(prompt, count = 4) {
  const facts = parseFacts(prompt);
  if (facts.length === 0) {
    return [
      {
        id: "F-101",
        title: "产品概况",
        category: "产品信息",
        source: "产品手册",
        content: "岳麓山夜游·大学城散步线全程约 3.5 公里，步行约 2 小时。",
      },
    ];
  }
  const preferred = facts.filter((fact) =>
    /产品|时间|价格|体验|报名|服务/.test(fact.category),
  );
  return (preferred.length > 0 ? preferred : facts).slice(0, count);
}

function buildCopy(prompt) {
  const facts = pickFacts(prompt, 4);
  const bodyParts = facts.map(
    (fact) => `${fact.content}[${fact.id}]`,
  );
  const body = `${bodyParts.join("\n\n")}

余量和报名以官方小程序「麓行周末」为准；每团不超过 12 人；活动安排以现场实际情况为准。`;

  return {
    titles: [
      {
        id: "A",
        angle: "场景切入",
        title: "周末去走一段不赶时间的路",
        rationale: "用具体动作和节奏切入，避免空泛的“周末去哪儿”。",
        hypothesis: "具体动作可能比目的地名称更容易让人代入。",
      },
      {
        id: "B",
        angle: "人群需求",
        title: "想出门又不想走远，就选这条",
        rationale: "直接回应“想出门但不想折腾”的周末需求。",
        hypothesis: "人群阻力表达可能提升点击，但需要正文快速给出可核对信息。",
      },
    ],
    body,
    tags: ["#长沙周末", "#小团出行", "#周末去哪儿"],
    imageSuggestion: [
      "傍晚的集合点，几个人背着帆布包站在路灯下，领队手里提着一盏暖光马灯。",
      "路线中途的石阶，同行人停下来喝水，远处树影里有一盏路灯。",
      "活动结束前的合影，大家站在路边，背景是暗下来的山和零星的灯。",
    ],
    citations: facts.map((fact) => ({
      factId: fact.id,
      quote: fact.content.slice(0, 120),
      usedFor: "正文事实",
    })),
    selfCheck: ["仅使用事实卡内容", "必提信息已覆盖", "没有使用品牌禁用表达"],
  };
}

function buildReview(prompt) {
  const bodyMatch = prompt.match(/正文：\n([\s\S]*?)\n\n话题标签/);
  const body = bodyMatch?.[1]?.trim() || "";
  const firstSentence = body.split(/(?<=[。！？])/)[0] || "";
  const factIds = [...body.matchAll(/\[(F-\d{3})\]/g)].map(
    (match) => match[1],
  );
  return {
    issues: [
      {
        category: "品牌语气",
        severity: "warning",
        quote: firstSentence.slice(0, 80),
        problem: "开头信息完整，但动作感还可以更强；目前更像说明，不像朋友发来的邀约。",
        evidenceFactIds: factIds.slice(0, 1),
        suggestion: "把第一句改成一个具体动作，例如“周五 18:30，先在东方红广场见”。",
        confidence: "medium",
      },
      {
        category: "人群匹配",
        severity: "info",
        quote: body.slice(0, 40),
        problem: "目标人群是大学生，正文可以再明确一次“学生价”或“周末时间”。",
        evidenceFactIds: factIds.slice(0, 2),
        suggestion: "在价格句前补一句“大学生凭学生证”，让目标人群更快确认。",
        confidence: "low",
      },
    ],
    summary: "整体事实与结构完整，建议加强开头动作感和人群指向。",
  };
}

function buildRevision(prompt) {
  const titleMatch = prompt.match(/标题：([^\n]+)/);
  const bodyMatch = prompt.match(/正文：\n([\s\S]*?)\n\n话题标签/);
  const tagsMatch = prompt.match(/话题标签：([^\n]*)/);
  const imagesMatch = prompt.match(/配图建议：\n([\s\S]*?)\n\n引用映射/);
  const citationsMatch = prompt.match(/引用映射：(\[[\s\S]*?\])/);

  const title = titleMatch?.[1]?.trim() || "周末去走一段不赶时间的路";
  const body = bodyMatch?.[1]?.trim() || "";
  const revisedBody = body.startsWith("周五")
    ? body.replace(/^周五/, "周五 18:30，先在东方红广场见。周五")
    : `周五 18:30，先在东方红广场见。\n\n${body}`;

  let citations = [];
  try {
    citations = citationsMatch ? JSON.parse(citationsMatch[1]) : [];
  } catch {
    citations = [];
  }

  return {
    title: title.slice(0, 20),
    body: revisedBody,
    tags: (tagsMatch?.[1] || "#长沙周末 #小团出行 #周末去哪儿")
      .split(/\s+/)
      .filter(Boolean),
    imageSuggestion: (imagesMatch?.[1] || "")
      .split("\n")
      .map((line) => line.replace(/^\d+\.\s*/, "").trim())
      .filter(Boolean),
    citations,
    changeNotes: [
      "按语气建议把开头改成了具体动作。",
      "保留了全部事实引用，没有新增价格或承诺。",
    ],
    unresolved: [],
  };
}

function buildDirect(prompt) {
  const facts = pickFacts(prompt, 3);
  const body = `${facts.map((fact) => fact.content).join("\n\n")}

如果想在周末找一件不用出远门的小事，可以把这段时间留出来。价格、时间和报名方式以官方信息为准。`;
  return `标题：周末去走一段不赶时间的路

正文：
${body}

话题：
#长沙周末 #周末去哪儿 #小团出行

配图建议：
1. 傍晚集合点，几个人站在路灯下，领队提着马灯。
2. 路线中途的石阶，同行人停下来喝水。
3. 活动结束前的合影，背景是暗下来的山。`;
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json;charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function completion(content, prompt) {
  return {
    id: "mock-completion",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "mock-model",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: Math.max(1, Math.round(prompt.length / 4)),
      completion_tokens: Math.max(1, Math.round(content.length / 4)),
      total_tokens:
        Math.max(1, Math.round(prompt.length / 4)) +
        Math.max(1, Math.round(content.length / 4)),
    },
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { ok: true, service: "youju-mock-llm" });
    return;
  }

  if (req.method !== "POST" || !req.url.includes("/chat/completions")) {
    sendJson(res, 404, { error: "not found" });
    return;
  }

  let raw = "";
  for await (const chunk of req) raw += chunk;
  let payload = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    sendJson(res, 400, { error: "invalid request json" });
    return;
  }

  const url = req.url || "";
  const mode = currentMode(url);
  if (mode === "401") {
    sendJson(res, 401, { error: { message: "mock unauthorized" } });
    return;
  }
  if (mode === "429") {
    sendJson(res, 429, { error: { message: "mock rate limited" } });
    return;
  }
  if (mode === "500") {
    sendJson(res, 500, { error: { message: "mock upstream error" } });
    return;
  }
  if (mode === "timeout") {
    await new Promise((resolve) => setTimeout(resolve, 90_000));
    sendJson(res, 200, completion("{}", ""));
    return;
  }
  if (mode === "invalid") {
    sendJson(
      res,
      200,
      completion("这次我没有按 JSON 返回，只是一段普通文本。", "invalid"),
    );
    return;
  }
  if (mode === "slow") {
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const system = messages.find((message) => message.role === "system");
  const user = messages.find((message) => message.role === "user");
  const prompt = `${system?.content ?? ""}\n${user?.content ?? ""}`;

  let content;
  if (system?.content?.includes("品牌内容审核员")) {
    content = JSON.stringify(buildReview(prompt));
  } else if (system?.content?.includes("定向修订编辑")) {
    content = JSON.stringify(buildRevision(prompt));
  } else if (system?.content?.includes("中文小红书文旅文案写手")) {
    content = buildDirect(prompt);
  } else {
    content = JSON.stringify(buildCopy(prompt));
  }

  console.log(
    `[mock] ${new Date().toISOString()} ${url} ${mode || "normal"} ${prompt.length} chars`,
  );
  sendJson(res, 200, completion(content, prompt));
});

server.listen(PORT, HOST, () => {
  console.log(`[mock] listening on http://${HOST}:${PORT}`);
  console.log("[mock] use LLM_BASE_URL=http://127.0.0.1:8787/v1");
});
