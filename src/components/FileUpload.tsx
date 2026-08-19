import { useState, useRef, useCallback } from "react";
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileIcon,
} from "lucide-react";

interface FileInfo {
  filename: string;
  charCount: number;
  size: number;
  ext: string;
}

interface FileUploadProps {
  onParsed: (text: string, fileInfo: FileInfo) => void;
  onClear: () => void;
  label?: string;
  accept?: string;
  uploadedFile?: FileInfo | null;
}

const ALLOWED_ACCEPT = ".pdf,.docx,.doc,.txt,.md";

const EXT_LABELS: Record<string, string> = {
  ".pdf": "PDF",
  ".docx": "DOCX",
  ".doc": "DOC",
  ".txt": "TXT",
  ".md": "MD",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function FileUpload({
  onParsed,
  onClear,
  label = "上传文件",
  accept = ALLOWED_ACCEPT,
  uploadedFile,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsParsing(true);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const resp = await fetch("/api/parse-file", {
          method: "POST",
          body: formData,
        });

        const data = await resp.json().catch(() => ({}));

        if (resp.ok && data.text) {
          onParsed(data.text, {
            filename: data.filename || file.name,
            charCount: data.charCount || data.text.length,
            size: data.size || file.size,
            ext: data.ext || "",
          });
        } else {
          setError(data.error || "文件解析失败，请重试");
        }
      } catch (e: any) {
        setError("网络异常，文件上传失败，请重试");
      } finally {
        setIsParsing(false);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    },
    [onParsed]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      parseFile(file);
    },
    [parseFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      handleFiles(files);
    },
    [handleFiles]
  );

  const handleClick = useCallback(() => {
    if (!isParsing) {
      inputRef.current?.click();
    }
  }, [isParsing]);

  if (isParsing) {
    return (
      <div className="rounded-xl border border-dusty-200 bg-dusty-50/60 p-3 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-dusty-600 animate-spin flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-dusty-900">
            正在解析文件内容...
          </div>
          <div className="text-xs text-dusty-600 mt-0.5">
            正在提取文本，请稍候
          </div>
        </div>
      </div>
    );
  }

  if (uploadedFile) {
    return (
      <div className="rounded-xl border border-sage-200 bg-sage-50/60 p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-sage-100 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-sage-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-sage-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-sage-900 truncate">
              {uploadedFile.filename}
            </span>
            {uploadedFile.ext && (
              <span className="text-[10px] font-bold text-sage-700 bg-sage-100 rounded px-1.5 py-0.5 flex-shrink-0">
                {EXT_LABELS[uploadedFile.ext]?.toUpperCase() ||
                  uploadedFile.ext.slice(1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="text-xs text-sage-700 mt-0.5">
            已解析 {uploadedFile.charCount.toLocaleString()} 字 ·{" "}
            {formatSize(uploadedFile.size)}
          </div>
        </div>
        <button
          onClick={onClear}
          className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-sage-100 flex items-center justify-center text-sage-600 hover:text-sage-800 transition-colors"
          title="移除文件"
          type="button"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`rounded-xl border-2 border-dashed p-3 flex items-center gap-3 cursor-pointer transition-all duration-200 ${
          isDragging
            ? "border-sage-400 bg-sage-50"
            : "border-[#d5d0c8] bg-[#faf8f4]/60 hover:border-sage-300 hover:bg-sage-50/40"
        }`}
      >
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
            isDragging
              ? "bg-sage-500 text-white"
              : "bg-white border border-[#d5d0c8] text-[#8a8a8a]"
          }`}
        >
          <UploadCloud className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-700">
            点击或拖拽文件到此处上传
          </div>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <FileIcon className="w-3 h-3" />
            支持 PDF / DOCX / TXT / MD（最大 10MB）
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}
    </div>
  );
}
