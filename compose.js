(() => {
  if (window.__renderSelectedMarkdownLoaded) return;
  window.__renderSelectedMarkdownLoaded = true;

  const esc = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Inline styles, because mail clients strip classes and stylesheets.
  const MONO = "font-family:'Cascadia Mono','Cascadia Code','SF Mono',Menlo,'DejaVu Sans Mono',Consolas,'Courier New',monospace;font-size:0.65em;font-weight:normal;";
  const PRE_STYLE =
    "background-color:#f0f0f0;color:#333333;border:1px solid #d8d8d8;" +
    "border-radius:4px;padding:8px 10px;white-space:pre-wrap;" +
    "display:table;max-width:100%;box-sizing:border-box;" + MONO;
  const LANG_LABEL_STYLE = "color:#6a737d;font-size:0.85em;margin-bottom:4px;text-align:left;";
  const CODE_STYLE =
    "background-color:#ececec;color:#333333;border-radius:3px;padding:1px 4px;" + MONO;

  // highlight.js emits class names; map them to inline colors (GitHub light theme).
  const TOKEN_COLORS = {
    keyword: "#d73a49", doctag: "#d73a49", "template-tag": "#d73a49", "template-variable": "#d73a49", type: "#d73a49",
    title: "#6f42c1",
    attr: "#005cc5", attribute: "#005cc5", literal: "#005cc5", meta: "#005cc5", number: "#005cc5",
    operator: "#005cc5", variable: "#005cc5", property: "#005cc5", section: "#005cc5;font-weight:bold",
    "selector-attr": "#005cc5", "selector-class": "#005cc5", "selector-id": "#005cc5",
    regexp: "#032f62", string: "#032f62", char: "#032f62",
    "built_in": "#e36209", symbol: "#e36209", bullet: "#735c0f",
    comment: "#6a737d", code: "#6a737d", formula: "#6a737d",
    name: "#22863a", quote: "#22863a", "selector-tag": "#22863a", "selector-pseudo": "#22863a",
    addition: "#22863a", deletion: "#b31d28",
    emphasis: "inherit;font-style:italic", strong: "inherit;font-weight:bold"
  };

  function highlightCode(code, lang) {
    if (!lang || typeof hljs === "undefined" || !hljs.getLanguage(lang)) return esc(code);
    try {
      const html = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
      return html.replace(/<span class="([^"]*)">/g, (_, cls) => {
        const token = cls.split(/\s+/)[0].replace(/^hljs-/, "");
        const color = TOKEN_COLORS[token];
        return color ? `<span style="color:${color};">` : "<span>";
      });
    } catch (e) {
      return esc(code);
    }
  }

  function inline(text) {
    const codes = [];
    text = esc(text).replace(/`([^`]+)`/g, (_, c) => {
      codes.push(c);
      return `\u0000${codes.length - 1}\u0000`;
    });
    text = text
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => `<strong>${a || b}</strong>`)
      .replace(/\*([^*]+)\*|\b_([^_]+)_\b/g, (_, a, b) => `<em>${a || b}</em>`)
      .replace(/~~([^~]+)~~/g, "<del>$1</del>");
    return text.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code style="${CODE_STYLE}">${codes[i]}</code>`);
  }

  function markdownToHtml(md) {
    const lines = md.replace(/\r\n?/g, "\n").replace(/ /g, " ").split("\n");
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      let m;
      if (/^\s*$/.test(line)) { i++; continue; }
      if ((m = line.match(/^```\s*([\w+#.-]*)/))) {
        const lang = m[1].toLowerCase();
        const buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++;
        const label = lang
          ? `<div data-lang="${esc(lang)}" style="${LANG_LABEL_STYLE}">${esc(lang)}</div>`
          : "";
        out.push(`<pre style="${PRE_STYLE}">${label}<code style="font:inherit;">${highlightCode(buf.join("\n"), lang)}</code></pre>`);
      } else if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
        out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`);
        i++;
      } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
        out.push("<hr>");
        i++;
      } else if (/^>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
        out.push(`<blockquote>${markdownToHtml(buf.join("\n"))}</blockquote>`);
      } else if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
        const ordered = /^\s*\d+\./.test(line);
        const items = [];
        while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
          items.push(`<li>${inline(lines[i++].replace(/^\s*([-*+]|\d+\.)\s+/, ""))}</li>`);
        }
        const tag = ordered ? "ol" : "ul";
        out.push(`<${tag}>${items.join("")}</${tag}>`);
      } else {
        const buf = [];
        while (
          i < lines.length &&
          !/^\s*$/.test(lines[i]) &&
          !/^(#{1,6}\s|```|>\s?|\s*([-*+]|\d+\.)\s+)/.test(lines[i])
        ) buf.push(inline(lines[i++]));
        out.push(`<p>${buf.join("<br>")}</p>`);
      }
    }
    return out.join("\n");
  }

  const RENDERED = "h1,h2,h3,h4,h5,h6,strong,b,em,i,del,s,strike,pre,code,ul,ol,blockquote,a,img,hr";

  function htmlToMarkdown(root) {
    const kids = (n) => Array.from(n.childNodes).map(toMd).join("");
    function toMd(n) {
      if (n.nodeType === Node.TEXT_NODE) return n.nodeValue.replace(/ /g, " ");
      if (n.nodeType !== Node.ELEMENT_NODE) return "";
      const tag = n.tagName.toLowerCase();
      let m;
      if ((m = tag.match(/^h([1-6])$/))) return `\n\n${"#".repeat(+m[1])} ${kids(n).trim()}\n\n`;
      switch (tag) {
        case "strong": case "b": return `**${kids(n)}**`;
        case "em": case "i": return `*${kids(n)}*`;
        case "del": case "s": case "strike": return `~~${kids(n)}~~`;
        case "code": return `\`${n.textContent}\``;
        case "pre": {
          const labelEl = n.querySelector("[data-lang]");
          const lang = labelEl ? labelEl.getAttribute("data-lang") : "";
          const codeEl = n.querySelector("code");
          const text = (codeEl || n).textContent;
          return `\n\n\`\`\`${lang}\n${text.replace(/ /g, " ").replace(/\n$/, "")}\n\`\`\`\n\n`;
        }
        case "a": return `[${kids(n)}](${n.getAttribute("href") || ""})`;
        case "img": return `![${n.getAttribute("alt") || ""}](${n.getAttribute("src") || ""})`;
        case "br": return "\n";
        case "hr": return "\n\n---\n\n";
        case "ul": case "ol": {
          let idx = 0;
          const items = Array.from(n.children)
            .filter((c) => c.tagName.toLowerCase() === "li")
            .map((li) => {
              const body = kids(li).trim().replace(/\n/g, "\n  ");
              return (tag === "ol" ? `${++idx}. ` : "- ") + body;
            });
          return `\n\n${items.join("\n")}\n\n`;
        }
        case "blockquote":
          return "\n\n" + kids(n).trim().split("\n").map((l) => `> ${l}`.trimEnd()).join("\n") + "\n\n";
        case "p": return `\n\n${kids(n)}\n\n`;
        case "div": return `\n${kids(n)}\n`;
        default: return kids(n);
      }
    }
    return toMd(root).replace(/\n{3,}/g, "\n\n").trim();
  }

  function textToHtml(text) {
    return text
      .split("\n")
      .map((line) => esc(line).replace(/^ +/, (s) => "&nbsp;".repeat(s.length)))
      .join("<br>");
  }


  browser.runtime.onMessage.addListener((message) => {
    if (!message || message.command !== "render-selected-markdown") return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return Promise.resolve({ ok: false, error: "Select some Markdown text first." });
    }
    if (document.body.isContentEditable === false && !document.designMode) {
      return Promise.resolve({ ok: false, error: "Compose editor is not editable." });
    }

    const range = selection.getRangeAt(0);
    const selected = range.cloneContents();

    let html;
    if (selected.querySelector(RENDERED)) {
      // Selection is already rendered: turn it back into Markdown source.
      const wrapper = document.createElement("div");
      wrapper.appendChild(selected);
      html = textToHtml(htmlToMarkdown(wrapper));
    } else {
      html = markdownToHtml(selection.toString());
    }
    // execCommand goes through the editor, so Ctrl+Z undoes the whole replacement.
    if (!document.execCommand("insertHTML", false, html)) {
      range.deleteContents();
      range.insertNode(range.createContextualFragment(html));
    }
    selection.removeAllRanges();
    return Promise.resolve({ ok: true });
  });
})();
