"use client";

import { useRef, useEffect } from "react";
import {
  IconBold,
  IconUnderline,
  IconList,
  IconArrowBack,
  IconMail,
  IconPhone,
  IconCopy,
} from "@tabler/icons-react";

type LinkType = "mailto" | "tel" | "copy";

export function RichBioEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const savedSelection = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && !initializedRef.current) {
      editorRef.current.innerHTML = value;
      initializedRef.current = true;
    }
  }, [value]);

  function saveSelection(e: React.MouseEvent) {
    e.preventDefault();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedSelection.current = range.cloneRange();
      }
    }
  }

  /** Find <a> related to the current selection: ancestor, or contained inside */
  function findRelatedLinks(): HTMLAnchorElement[] {
    const range = savedSelection.current;
    const editor = editorRef.current;
    if (!range || !editor) return [];
    const found: HTMLAnchorElement[] = [];
    const seen = new Set<HTMLAnchorElement>();

    // 1. Walk up from startContainer, endContainer, commonAncestor
    for (const startNode of [range.startContainer, range.endContainer, range.commonAncestorContainer]) {
      let node: Node | null = startNode;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      while (node && node !== editor) {
        if (node instanceof HTMLAnchorElement && !seen.has(node)) {
          seen.add(node);
          found.push(node);
        }
        node = node.parentElement;
      }
    }

    // 2. Find <a> elements contained within the range
    const container = range.commonAncestorContainer;
    const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as HTMLElement;
    if (el) {
      const anchors = el.querySelectorAll("a");
      anchors.forEach((a) => {
        if (!seen.has(a) && range.intersectsNode(a)) {
          seen.add(a);
          found.push(a);
        }
      });
    }

    return found;
  }

  function getLinkType(a: HTMLAnchorElement): LinkType | null {
    if (a.hasAttribute("data-copy")) return "copy";
    const href = a.getAttribute("href") || "";
    if (href.startsWith("mailto:")) return "mailto";
    if (href.startsWith("tel:")) return "tel";
    return null;
  }

  function unwrapLink(a: HTMLAnchorElement) {
    const parent = a.parentNode;
    if (!parent) return;
    while (a.firstChild) {
      parent.insertBefore(a.firstChild, a);
    }
    parent.removeChild(a);
  }

  function toggleLink(type: LinkType) {
    const editor = editorRef.current;
    const range = savedSelection.current;
    if (!editor || !range) return;

    const existingLinks = findRelatedLinks();

    if (existingLinks.length > 0) {
      // Check if ALL found links are the same type we're toggling
      const allSameType = existingLinks.every((a) => getLinkType(a) === type);
      // Unwrap all existing links
      existingLinks.forEach((a) => unwrapLink(a));
      if (allSameType) {
        // Toggle off: just unwrap and done
        onChange(editor.innerHTML);
        return;
      }
      // Different type: unwrapped old, now fall through to apply new
    }

    // Get fresh text after any unwrapping
    const text = range.toString();
    if (!text) return;

    // Build the new <a> element
    const a = document.createElement("a");
    a.textContent = text;
    if (type === "mailto") {
      a.href = `mailto:${text}`;
    } else if (type === "tel") {
      a.href = `tel:${text}`;
    } else {
      a.setAttribute("data-copy", text);
    }

    range.deleteContents();
    range.insertNode(a);

    // Collapse cursor after
    const sel = window.getSelection();
    if (sel) {
      sel.collapseToEnd();
    }
    onChange(editor.innerHTML);
  }

  const btnClass =
    "rounded p-1.5 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700";

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700">
      {/* Editor link styles with icons */}
      <style dangerouslySetInnerHTML={{ __html: [
        `.rich-bio-editor a{color:#3b82f6;text-decoration:none;display:inline-flex;align-items:center;gap:3px;cursor:pointer}`,
        `.rich-bio-editor a[data-copy]{color:#8b5cf6}`,
        `.rich-bio-editor a::before{content:'';display:inline-block;width:14px;height:14px;flex-shrink:0;background-size:contain;background-repeat:no-repeat}`,
        `.rich-bio-editor a[href^=mailto]::before{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='%233b82f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='20' height='16' x='2' y='4' rx='2'/%3E%3Cpath d='m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'/%3E%3C/svg%3E")}`,
        `.rich-bio-editor a[href^=tel]::before{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='%233b82f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z'/%3E%3C/svg%3E")}`,
        `.rich-bio-editor a[data-copy]::before{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='%238b5cf6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='14' height='14' x='8' y='8' rx='2'/%3E%3Cpath d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'/%3E%3C/svg%3E")}`,
      ].join('') }} />
      <div className="flex gap-1 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800">
        <button
          type="button"
          onMouseDown={saveSelection}
          onClick={() => document.execCommand("bold")}
          className={btnClass}
          title="Grassetto"
        >
          <IconBold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={saveSelection}
          onClick={() => document.execCommand("underline")}
          className={btnClass}
          title="Sottolineato"
        >
          <IconUnderline className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={saveSelection}
          onClick={() => document.execCommand("insertUnorderedList")}
          className={btnClass}
          title="Elenco puntato"
        >
          <IconList className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={saveSelection}
          onClick={() => document.execCommand("insertHTML", false, "<br>")}
          className={btnClass}
          title="A capo"
        >
          <IconArrowBack className="h-4 w-4" />
        </button>
        <div className="mx-1 w-px bg-zinc-300 dark:bg-zinc-600" />
        <button
          type="button"
          onMouseDown={saveSelection}
          onClick={() => toggleLink("mailto")}
          className={btnClass}
          title="Link email"
        >
          <IconMail className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={saveSelection}
          onClick={() => toggleLink("tel")}
          className={btnClass}
          title="Link telefono"
        >
          <IconPhone className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={saveSelection}
          onClick={() => toggleLink("copy")}
          className={btnClass}
          title="Copia negli appunti"
        >
          <IconCopy className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="rich-bio-editor min-h-[80px] bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none dark:bg-zinc-800 dark:text-white"
        style={{ whiteSpace: "pre-wrap" }}
        onInput={() => onChange(editorRef.current?.innerHTML || "")}
      />
    </div>
  );
}
