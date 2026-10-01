const vm = require("vm"), fs = require("fs");
const dir = require("path").join(__dirname, "..") + "/";
const c = {};
vm.createContext(c);
vm.runInContext(fs.readFileSync(dir + "highlight.min.js", "utf8"), c);
const rows = JSON.parse(vm.runInContext(
  "JSON.stringify(hljs.listLanguages().map(n=>{const l=hljs.getLanguage(n);return [l.name||n,n,l.aliases||[]]}))", c
)).sort((a, b) => a[0].localeCompare(b[0]));
const html = `<!doctype html>
<meta charset="utf-8">
<title>Supported languages</title>
<style>body{font:15px system-ui;margin:1em}input{width:100%;padding:8px;font-size:16px;box-sizing:border-box}table{border-collapse:collapse;width:100%;margin-top:1em}td,th{text-align:left;padding:5px 8px;border-bottom:1px solid #ddd}code{background:#eee;color:#333;padding:1px 4px;border-radius:3px}@media(prefers-color-scheme:dark){body{background:#222;color:#eee}input{background:#333;color:#eee;border:1px solid #555}td,th{border-color:#444}code{background:#444;color:#eee}}</style>
<h3>Supported languages (<span id="n"></span>)</h3>
<p>Put the tag after the three backticks of a code block, for example <code>python</code>. Any alias works.</p>
<input id="q" placeholder="Search by name or alias" autofocus>
<table><thead><tr><th>Language<th>Tag<th>Aliases</tr></thead><tbody id="t"></tbody></table>
<script src="supported-languages.js"></script>`;
const js = `const rows = ${JSON.stringify(rows)};
const t = document.getElementById("t"), q = document.getElementById("q");
function draw() {
  const s = q.value.toLowerCase().trim();
  const r = rows.filter(x => !s || (x[0] + " " + x[1] + " " + x[2].join(" ")).toLowerCase().includes(s));
  t.innerHTML = r.map(x => "<tr><td>" + x[0] + "<td><code>" + x[1] + "</code><td>" + x[2].map(a => "<code>" + a + "</code>").join(" ") + "</tr>").join("");
  document.getElementById("n").textContent = r.length + " of " + rows.length;
}
q.oninput = draw;
draw();
`;
fs.writeFileSync(dir + "supported-languages.html", html);
fs.writeFileSync(dir + "supported-languages.js", js);
console.log(rows.length);
