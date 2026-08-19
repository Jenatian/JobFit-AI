import { Router, Request, Response } from "express";
import multer from "multer";
import mammoth from "mammoth";

const parseFileRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const ALLOWED_EXT = [".pdf", ".docx", ".doc", ".txt", ".md"];
const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/markdown",
];

function decodeFilename(name: string): string {
  try {
    const decoded = Buffer.from(name, "latin1").toString("utf8");
    return decoded || name;
  } catch (_) {
    return name;
  }
}

function getExt(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const uint8 = new Uint8Array(buffer);
  const parser = new PDFParse({ data: uint8 });
  try {
    const result = await parser.getText();
    const text = (result.text || "").trim();
    if (!text) {
      throw new Error("PDF 中未提取到文字内容");
    }
    return text;
  } finally {
    await parser.destroy();
  }
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  const text = (result.value || "").trim();
  if (!text) {
    throw new Error("Word 文档中未提取到文字内容");
  }
  return text;
}

function parsePlainText(buffer: Buffer): string {
  const text = buffer.toString("utf-8").trim();
  if (!text) {
    throw new Error("文件内容为空");
  }
  return text;
}

parseFileRouter.post(
  "/parse-file",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "未接收到文件，请重新上传" });
      }

      const originalName = decodeFilename(file.originalname);
      const ext = getExt(originalName);
      const isAllowedExt = ALLOWED_EXT.includes(ext);
      const isAllowedMime = ALLOWED_MIME.includes(file.mimetype);

      if (!isAllowedExt && !isAllowedMime) {
        return res.status(400).json({
          error: `不支持的文件格式「${ext || "未知"}」。仅支持：PDF、DOCX、DOC、TXT、MD`,
        });
      }

      if (ext === ".doc") {
        return res.status(400).json({
          error:
            "暂不支持旧版 .doc 二进制格式。请将文件另存为 .docx 后重新上传（Word → 另存为 → Word 文档 *.docx）",
        });
      }

      if (file.size > 10 * 1024 * 1024) {
        return res.status(400).json({
          error: "文件过大（超过 10MB），请压缩或精简后再上传",
        });
      }

      let text = "";
      const startTime = Date.now();

      try {
        if (ext === ".pdf") {
          text = await parsePdf(file.buffer);
        } else if (ext === ".docx") {
          text = await parseDocx(file.buffer);
        } else if (ext === ".txt" || ext === ".md") {
          text = parsePlainText(file.buffer);
        } else {
          return res.status(400).json({
            error: `不支持的文件格式「${ext}」`,
          });
        }
      } catch (parseErr: any) {
        const msg = parseErr?.message || String(parseErr);

        if (msg.includes("encrypted") || msg.includes("password")) {
          return res.status(400).json({
            error: "该文件已加密，无法解析。请先移除密码保护后重试",
          });
        }

        if (msg.includes("未提取到文字") || msg.includes("empty")) {
          return res.status(400).json({
            error:
              "未能从该文件中提取到文字。如果是扫描件图片 PDF，请尝试复制纯文本或使用 OCR 工具处理",
          });
        }

        return res.status(500).json({
          error: `文件解析失败：${msg}。请确认文件未损坏且为标准格式`,
        });
      }

      const elapsed = Date.now() - startTime;
      const charCount = text.length;

      if (charCount > 200000) {
        text = text.slice(0, 200000);
      }

      return res.status(200).json({
        text,
        charCount,
        filename: originalName,
        size: file.size,
        ext,
        parseTimeMs: elapsed,
      });
    } catch (err: any) {
      console.error("[parse-file] unexpected error:", err?.message);
      return res
        .status(500)
        .json({ error: "服务器解析异常，请稍后重试或尝试手动粘贴文本" });
    }
  }
);

export { parseFileRouter };
