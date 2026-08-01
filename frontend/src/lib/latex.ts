import katex from "katex"

// Рендерит одно матем. выражение в HTML через KaTeX.
// throwOnError: false — битая формула не должна ронять всю страницу.
function renderMath(expr: string, displayMode: boolean): string {
  try {
    return katex.renderToString(expr.trim(), { throwOnError: false, displayMode })
  } catch {
    return "<span class=\"text-red-400\">" + expr + "</span>"
  }
}

/**
 * Превращает текст задачи (обычная проза + LaTeX-разметка: $...$, \[...\],
 * \begin{enumerate}, \begin{tabular}, \textbf{...}) в безопасный HTML.
 *
 * Это не полноценный LaTeX-движок — поддерживается только то, что реально
 * встречается в текстах задач (см. app/seed_data.py на бэкенде).
 */
export function renderLatexHtml(raw: string): string {
  if (!raw) return ""

  // Блочные куски (формулы, списки, таблицы) прячем за токенами, чтобы
  // последующая разбивка на параграфы не резала их по живому.
  const blocks: string[] = []
  const stash = (html: string) => {
    const token = "@@BLOCK" + blocks.length + "@@"
    blocks.push(html)
    return token
  }

  // 1) экранируем HTML — всё, что не наша разметка, должно остаться текстом
  let s = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  // 2) формулы — сначала блочные, потом строчные
  s = s.replace(/\\\[([\s\S]+?)\\\]/g, (_, expr) => stash(renderMath(expr, true)))
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => stash(renderMath(expr, true)))
  s = s.replace(/\$([^$]+?)\$/g, (_, expr) => stash(renderMath(expr, false)))

  // 2.5) экранированные спецсимволы LaTeX вне формул (исходник хранит их
  // экранированными — это нужно для корректной компиляции в PDF/TeX, см.
  // app/seed_data.py), для браузера превращаем их в обычные символы
  s = s.replace(/\\%/g, "%")
  s = s.replace(/\\,/g, "&thinsp;")
  s = s.replace(/\\&amp;/g, "&amp;")
  s = s.replace(/\\#/g, "#")
  s = s.replace(/\\_/g, "_")
  s = s.replace(/\\\{/g, "{")
  s = s.replace(/\\\}/g, "}")

  // 3) нумерованные списки \begin{enumerate}...\item...\end{enumerate}
  s = s.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, body: string) => {
    const items = body.split(/\\item/).map((x) => x.trim()).filter(Boolean)
    const li = items.map((i) => "<li>" + i + "</li>").join("")
    return stash("<ol class=\"list-decimal ml-6 space-y-1 my-2\">" + li + "</ol>")
  })

  // 4) таблицы \begin{tabular}{...}...\end{tabular} (обычно внутри \begin{center})
  s = s.replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, (_, body: string) => body)
  s = s.replace(/\\begin\{tabular\}\{[^}]*\}([\s\S]*?)\\end\{tabular\}/g, (_, body: string) => {
    const rows = body.split(/\\\\/).map((r) => r.trim()).filter(Boolean)
    const trs = rows
      .map((r) => {
        // на этом шаге "&" уже экранирован в "&amp;" (см. п.1) — делим по нему
        const cells = r.split("&amp;").map((c) => c.trim())
        const tds = cells.map((c) => "<td class=\"pr-4 py-0.5\">" + c + "</td>").join("")
        return "<tr>" + tds + "</tr>"
      })
      .join("")
    return stash("<table class=\"my-2 border-collapse mx-auto\">" + trs + "</table>")
  })

  // 5) простое форматирование
  s = s.replace(/\\textbf\{([^}]*)\}/g, "<strong>$1</strong>")
  s = s.replace(/\\noindent/g, "")
  s = s.replace(/\\vspace\{[^}]*\}/g, "")
  s = s.replace(/~/g, "&nbsp;")

  // 6) параграфы (разделены пустой строкой)
  const paragraphs = s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  s = paragraphs.map((p) => "<p>" + p.replace(/\n/g, "<br/>") + "</p>").join("")

  // 7) возвращаем спрятанные блоки на место — циклом, т.к. таблицы/списки
  // могут содержать вложенные токены формул (@@BLOCK@@ внутри @@BLOCK@@)
  while (/@@BLOCK\d+@@/.test(s)) {
    s = s.replace(/@@BLOCK(\d+)@@/g, (_, i: string) => blocks[Number(i)])
  }

  return s
}
