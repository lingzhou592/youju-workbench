"use client";

import type { ReactNode } from "react";
import { useApp } from "@/state/AppStore";

export function StoreGate({ children }: { children: ReactNode }) {
  const { hydrated, storageWarning, clearStorageWarning } = useApp();

  if (!hydrated) {
    return (
      <div className="boot-screen" role="status" aria-live="polite">
        <div className="boot-mark">有据</div>
        <p>正在读取本地的品牌资料与运行记录…</p>
        <div className="boot-lines">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  return (
    <>
      {storageWarning ? (
        <div className="storage-warning" role="alert">
          <span>{storageWarning}</span>
          <button type="button" onClick={clearStorageWarning}>
            知道了
          </button>
        </div>
      ) : null}
      {children}
    </>
  );
}
