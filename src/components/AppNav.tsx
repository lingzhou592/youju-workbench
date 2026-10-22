"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBook,
  IconClock,
  IconPen,
} from "@/components/ui/Icons";
import { useApp } from "@/state/AppStore";

const NAV = [
  {
    href: "/",
    label: "工作台",
    hint: "Brief 到导出",
    icon: IconPen,
    exact: true,
  },
  {
    href: "/sources",
    label: "品牌与资料",
    hint: "约束与事实卡",
    icon: IconBook,
  },
  {
    href: "/history",
    label: "历史与评测",
    hint: "记录与对照",
    icon: IconClock,
  },
];

export function AppNav() {
  const pathname = usePathname();
  const { state } = useApp();
  const brandName = state.brand.name.trim() || "未命名品牌";

  return (
    <aside className="sidebar">
      <Link href="/" className="brand-lockup" aria-label="有据工作台首页">
        <span className="brand-mark" aria-hidden="true">
          据
        </span>
        <span className="brand-text">
          <strong>有据</strong>
          <small>文旅内容工作台</small>
        </span>
      </Link>

      <div className="sidebar-section-label">工作区</div>
      <nav className="sidebar-nav" aria-label="主导航">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${active ? "nav-item-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="nav-icon">
                <Icon size={18} />
              </span>
              <span className="nav-text">
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-brand-card">
        <span className="overline">当前品牌</span>
        <strong>{brandName}</strong>
        <span className="sidebar-brand-note">
          {state.settings.demoBrand ? "虚构演示品牌" : "本地品牌配置"}
          <br />
          价格、排期与承诺请以事实卡为准
        </span>
        <Link href="/sources" className="sidebar-brand-link">
          编辑品牌与资料
        </Link>
      </div>

      <p className="sidebar-footnote">
        数据保存在本机浏览器
        <br />
        生成时发送至你配置的模型服务
      </p>
    </aside>
  );
}
