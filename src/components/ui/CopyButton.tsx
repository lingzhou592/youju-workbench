"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/state/AppStore";
import { Button, type ButtonProps } from "./Button";
import { IconCheck, IconCopy } from "./Icons";

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!ok) throw new Error("copy failed");
}

export function CopyButton({
  text,
  label = "复制",
  copiedLabel = "已复制",
  onCopied,
  ...props
}: Omit<ButtonProps, "onClick" | "icon"> & {
  text: string;
  label?: string;
  copiedLabel?: string;
  onCopied?: () => void;
}) {
  const { toast } = useApp();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await copyText(text);
      setCopied(true);
      toast("已复制到剪贴板。", "success");
      onCopied?.();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("复制失败，请手动选择文本复制。", "error");
    }
  };

  return (
    <Button
      {...props}
      onClick={handleCopy}
      icon={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}
