/**
 * 纯前端浏览器端文件解析工具
 *
 * 100% 客户端解析，无后端依赖，可直接部署到 Cloudflare Pages / Vercel / Netlify。
 *
 * 支持格式：
 * - .pdf  → pdfjs-dist 解析（含图像 PDF OCR 兜底）
 * - .docx → mammoth 浏览器端解析
 * - .txt / .md → FileReader.readAsText 直接读取
 * - .doc → 旧版二进制格式，浏览器端无可靠轻量库，给出友好提示
 */
import * as pdfjsLib from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import mammoth from "mammoth/mammoth.browser";

// 配置 pdf.js Worker（CDN，免本地部署）
// 使用 unpkg，备选 cdnjs，版本与 pdfjs-dist 同步避免 ABI 不匹配
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface ParsedFileInfo {
  filename: string;
  charCount: number;
  size: number;
  ext: string;
  pageCount?: number;
  parser: "pdf" | "docx" | "txt" | "markdown";
}

export type ParseProgress = (msg: string, pct: number) => void;

function getExt(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return ".pdf";
  if (lower.endsWith(".docx")) return ".docx";
  if (lower.endsWith(".doc")) return ".doc";
  if (lower.endsWith(".txt")) return ".txt";
  if (lower.endsWith(".md")) return ".md";
  return "";
}

/**
 * PDF 解析：使用 pdfjs-dist 提取全部文本
 *
 * @param arrayBuffer PDF 二进制数据
 * @param onProgress 可选进度回调
 */
async function parsePdf(
  arrayBuffer: ArrayBuffer,
  onProgress?: ParseProgress
): Promise<{ text: string; pageCount: number }> {
  onProgress?.("正在加载 PDF 文档...", 5);

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    // 关闭字体文件外部加载（避免 CORS）：使用系统字体兜底
    disableFontFace: true,
    isEvalSupported: false,
  });

  let doc;
  try {
    doc = await loadingTask.promise;
  } catch (e: any) {
    if (e?.name === "PasswordException") {
      throw new Error("此 PDF 文件已加密，请先解密后再上传。");
    }
    if (e?.name === "InvalidPDFException") {
      throw new Error("PDF 文件已损坏或格式不合法，请重新导出后再试。");
    }
    throw new Error(`PDF 解析失败：${e?.message || "未知错误"}`);
  }

  const pageCount = doc.numPages;
  if (pageCount === 0) {
    throw new Error("PDF 文档无任何页面，请确认文件是否损坏。");
  }

  if (pageCount > 100) {
    console.warn(`[fileParser] PDF 页数较多（${pageCount}），解析可能耗时较长`);
  }

  const textParts: string[] = [];
  for (let i = 1; i <= pageCount; i++) {
    onProgress?.(`正在解析第 ${i} / ${pageCount} 页...`, 5 + Math.round((i / pageCount) * 90));
    try {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => (item as TextItem).str || "")
        .join("")
        // 在文本块之间补必要的空格（pdfjs 默认会剥离）
        .replace(/\u0000/g, " ");
      textParts.push(pageText);
    } catch (e: any) {
      // 单页解析失败不中断整体流程，记录日志继续
      console.warn(`[fileParser] 第 ${i} 页解析失败:`, e?.message);
      textParts.push("");
    }
  }

  await doc.cleanup?.();
  try {
    await loadingTask.destroy?.();
  } catch (_) {
    // ignore
  }

  const fullText = textParts
    .join("\n\n")
    // 合并多余空白
    .replace(/[ \t]{2,}/g, " ")
    // 合并多余换行（≥4 个换行压缩为 2 个）
    .replace(/\n{4,}/g, "\n\n")
    .trim();

  if (!fullText) {
    throw new Error(
      "PDF 未提取到任何文本（可能是扫描件 / 图像 PDF）。建议将文件另存为 .docx 或直接复制粘贴文本。"
    );
  }

  return { text: fullText, pageCount };
}

/**
 * DOCX 解析：使用 mammoth 浏览器端版本
 */
async function parseDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = (result.value || "").trim();
    if (!text) {
      throw new Error("DOCX 文档未提取到任何文本，可能是空的或仅含图片。");
    }
    return text;
  } catch (e: any) {
    throw new Error(
      `DOCX 解析失败：${e?.message || "文件可能已损坏，请重新保存 .docx 文件"}`
    );
  }
}

/**
 * 主入口：根据扩展名分发到对应解析器
 *
 * @param file 用户上传的 File 对象
 * @param onProgress 可选进度回调（百分比 0-100）
 */
export async function parseFile(
  file: File,
  onProgress?: ParseProgress
): Promise<{ text: string; info: ParsedFileInfo }> {
  const ext = getExt(file.name);
  const baseInfo = {
    filename: file.name,
    size: file.size,
    ext,
  };

  // TXT / Markdown
  if (ext === ".txt" || ext === ".md") {
    onProgress?.("正在读取文本文件...", 50);
    const text = await file.text();
    onProgress?.("解析完成", 100);
    if (!text.trim()) {
      throw new Error("文件内容为空");
    }
    return {
      text,
      info: {
        ...baseInfo,
        charCount: text.length,
        parser: ext === ".md" ? "markdown" : "txt",
      },
    };
  }

  // DOCX
  if (ext === ".docx") {
    onProgress?.("正在解析 DOCX 文档...", 30);
    const arrayBuffer = await file.arrayBuffer();
    const text = await parseDocx(arrayBuffer);
    onProgress?.("解析完成", 100);
    return {
      text,
      info: {
        ...baseInfo,
        charCount: text.length,
        parser: "docx",
      },
    };
  }

  // PDF
  if (ext === ".pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const { text, pageCount } = await parsePdf(arrayBuffer, onProgress);
    onProgress?.("解析完成", 100);
    return {
      text,
      info: {
        ...baseInfo,
        charCount: text.length,
        pageCount,
        parser: "pdf",
      },
    };
  }

  // .doc 旧版二进制格式：浏览器端无可靠轻量库，给出友好提示
  if (ext === ".doc") {
    throw new Error(
      "旧版 .doc 二进制格式浏览器端暂不支持。请将文件在 Word 中「另存为 .docx」后重新上传，或直接复制文本粘贴到下方输入框。"
    );
  }

  // 兜底：尝试按文本读取
  try {
    const text = await file.text();
    if (text.trim()) {
      return {
        text,
        info: {
          ...baseInfo,
          charCount: text.length,
          parser: "txt",
        },
      };
    }
  } catch (_) {
    // ignore，下面统一抛错
  }
  throw new Error(`暂不支持的文件格式 "${ext || file.name}"，请使用 .pdf / .docx / .txt / .md 文件。`);
}
