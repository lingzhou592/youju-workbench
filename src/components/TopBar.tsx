"use client";

import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconAlert, IconInfo, IconRefresh, IconSettings } from "@/components/ui/Icons";
import { Modal } from "@/components/ui/Modal";
import { useApp } from "@/state/AppStore";

export function TopBar({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  const { health, healthLoading, refreshHealth } = useApp();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <header className="topbar">
        <div className="topbar-title">
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h1>{title}</h1>
          {description ? <div className="page-description">{description}</div> : null}
        </div>
        <div className="topbar-actions">
          {actions}
          <button
            type="button"
            className={`model-chip ${
              health?.configured ? "model-chip-on" : "model-chip-off"
            }`}
            onClick={() => setHelpOpen(true)}
            title="查看模型配置与使用说明"
          >
            <span className="model-dot" aria-hidden="true" />
            {healthLoading
              ? "检查模型…"
              : health?.configured
                ? `模型已配置 · ${health.model ?? "未知模型"}`
                : "模型未配置"}
          </button>
          <Button
            variant="ghost"
            size="sm"
            icon={<IconInfo size={16} />}
            onClick={() => setHelpOpen(true)}
          >
            使用说明
          </Button>
        </div>
      </header>

      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="使用说明与模型配置"
        size="lg"
        footer={
          <div className="modal-footer-row">
            <Button
              variant="secondary"
              size="sm"
              icon={<IconRefresh size={15} />}
              onClick={() => void refreshHealth()}
              loading={healthLoading}
            >
              重新检查连接
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setHelpOpen(false)}
            >
              知道了
            </Button>
          </div>
        }
      >
        <div className="help-grid">
          <section className="help-section">
            <h3>五步走完一条内容生产线</h3>
            <ol className="help-steps">
              <li>
                <strong>Brief</strong>：填写活动、人群、卖点和限制。
              </li>
              <li>
                <strong>依据</strong>：从事实卡中检索并人工勾选可用资料。
              </li>
              <li>
                <strong>生成</strong>：得到共享正文 + 两个标题候选，选定一个进入审核。
              </li>
              <li>
                <strong>校验与修订</strong>：规则检查、模型建议、人工确认分开处理。
              </li>
              <li>
                <strong>导出</strong>：导出带引用、修订记录与确认状态的 Markdown / JSON。
              </li>
            </ol>
          </section>

          <section className="help-section">
            <h3>模型配置</h3>
            <p>
              在项目根目录创建 <code>.env.local</code>，填写一个
              OpenAI-compatible 的 Chat Completions 服务：
            </p>
            <pre className="code-block">{`LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=sk-你的密钥
LLM_MODEL=deepseek-chat
LLM_TIMEOUT_MS=60000`}</pre>
            <p className="muted">
              修改后重启 <code>npm run dev</code>。密钥只在服务端读取，不会进入浏览器代码或仓库。
            </p>
          </section>

          <section className="help-section">
            <h3>当前连接</h3>
            {healthLoading ? (
              <p className="muted">正在检查…</p>
            ) : health?.configured ? (
              <div className="help-status">
                <Badge tone="green" dot>
                  已配置
                </Badge>
                <dl>
                  <div>
                    <dt>模型</dt>
                    <dd>{health.model}</dd>
                  </div>
                  <div>
                    <dt>服务地址</dt>
                    <dd>{health.baseHost}</dd>
                  </div>
                  <div>
                    <dt>超时</dt>
                    <dd>{Math.round(health.timeoutMs / 1000)} 秒</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="help-status">
                <Badge tone="amber" dot>
                  未配置
                </Badge>
                <p className="muted">
                  不配置也可以点击工作台里的“加载内置示例运行”，预览完整界面和规则检查；示例不会伪装成实时生成。
                </p>
              </div>
            )}
          </section>

          <section className="help-section help-section-warning">
            <h3>
              <IconAlert size={16} /> 数据与口径
            </h3>
            <ul className="help-list">
              <li>品牌、事实卡、运行记录保存在本机浏览器；生成/审核/修订时，相关内容会发送到你配置的模型服务。</li>
              <li>演示品牌与全部价格、排期、服务承诺均为模拟资料，不应作为真实业务信息使用。</li>
              <li>“引用可定位”只表示能在本次运行的事实卡快照中回查，不代表已在现实世界核实。</li>
              <li>模型建议是待人工判断的意见，置信度为模型自评且未校准。</li>
            </ul>
          </section>
        </div>
      </Modal>
    </>
  );
}

export function ModelConfigHint() {
  return (
    <div className="model-config-hint">
      <IconSettings size={16} />
      <span>
        需要配置模型后才能实时生成。打开右上角“使用说明”查看 <code>.env.local</code> 示例。
      </span>
    </div>
  );
}
