/**
 * Vercel Serverless Function 入口
 * 将现有 Express 应用包装为 Vercel 可识别的 serverless handler
 *
 * 路由约定：
 * - POST /api/analyze   → 简历-JD 智能分析
 * - POST /api/parse-file → 简历/JD 文件解析（PDF/DOCX/TXT/MD）
 *
 * Vercel 通过 @vercel/node 自动识别 /api 目录下的 .ts 文件
 * 导出 default handler 即可作为 serverless 函数运行
 */
import type { IncomingMessage, ServerResponse } from "http";
import express, { Request, Response } from "express";
import cors from "cors";
import { analyzeRouter } from "../server/routes/analyze";
import { parseFileRouter } from "../server/routes/parse-file";

// 单例化 Express app（避免冷启动时重复构造）
const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// 挂载业务路由（Vercel rewrites 将 /api/* 转发到此函数）
app.use("/api", analyzeRouter);
app.use("/api", parseFileRouter);

// 健康检查
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    runtime: "vercel-serverless",
    hasApiKey: !!process.env.ZHIPU_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// 404 兜底
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found", path: _req.url });
});

// 导出 default handler：Vercel 会将其作为 serverless 入口
export default function handler(
  req: IncomingMessage,
  res: ServerResponse
): void {
  app(req as Request, res as Response);
}
