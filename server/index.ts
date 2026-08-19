import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { analyzeRouter } from "./routes/analyze";
import { parseFileRouter } from "./routes/parse-file";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env.local");
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const hasApiKey = !!process.env.ZHIPU_API_KEY;
console.log(
  `[JobFit AI] ZHIPU_API_KEY: ${
    hasApiKey
      ? "已加载 (****" + process.env.ZHIPU_API_KEY?.slice(-6) + ")"
      : "未配置"
  }`
);

app.use("/api", analyzeRouter);
app.use("/api", parseFileRouter);

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`[JobFit AI] API server running on http://localhost:${PORT}`);
});
