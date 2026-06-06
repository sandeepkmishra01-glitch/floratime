"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  align?: "left" | "right";
  children: React.ReactNode;
}

export default function DropdownPortal({ open, onClose, triggerRef, align = "right", children }: Props) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: align === "right" ? rect.right : rect.left, width: rect.width });
    }
  }, [open, triggerRef, align]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return createPortal(
    <div ref={menuRef}
      className="fixed bg-white rounded-lg shadow-xl border border-sage py-1 max-h-72 overflow-y-auto"
      style={{
        zIndex: 99999,
        top: pos.top,
        left: align === "right" ? pos.left - 140 : pos.left,
        minWidth: "140px",
      }}>
      {children}
    </div>,
    document.body
  );
}
