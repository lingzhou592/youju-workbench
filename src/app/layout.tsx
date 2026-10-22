import type { Metadata } from "next";
import "./globals.css";
import { AppNav } from "@/components/AppNav";
import { StoreGate } from "@/components/StoreGate";
import { AppStoreProvider } from "@/state/AppStore";

export const metadata: Metadata = {
  title: "有据 · 文旅营销素材生成与校验工作台",
  description:
    "把品牌约束、活动 Brief 和事实资料，转成有出处、可校验、可修订、可导出的小红书图文文案。",
  keywords: [
    "文旅营销",
    "小红书文案",
    "AI 内容审核",
    "品牌约束",
    "事实依据",
    "内容工作台",
  ],
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <AppStoreProvider>
          <StoreGate>
            <div className="app-shell">
              <AppNav />
              <main className="app-main">{children}</main>
            </div>
          </StoreGate>
        </AppStoreProvider>
      </body>
    </html>
  );
}
