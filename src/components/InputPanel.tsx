import { FileText, Briefcase, FolderPlus, Info } from "lucide-react";
import { useState } from "react";
import { FileUpload } from "./FileUpload";

interface InputPanelProps {
  resume: string;
  jd: string;
  extraProjects: string;
  loading: boolean;
  onChangeResume: (v: string) => void;
  onChangeJD: (v: string) => void;
  onChangeExtra: (v: string) => void;
  onSubmit: () => void;
}

interface UploadedFile {
  filename: string;
  charCount: number;
  size: number;
  ext: string;
}

function TextareaField({
  icon: Icon,
  label,
  required,
  value,
  onChange,
  placeholder,
  rows = 8,
  hint,
  uploadSlot,
}: {
  icon: any;
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows?: number;
  hint?: string;
  uploadSlot?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-sage-50 to-sage-100 border border-sage-100 flex items-center justify-center">
            <Icon className="w-4 h-4 text-sage-600" strokeWidth={2.2} />
          </span>
          {label}
          {required && <span className="text-rose-500">*</span>}
        </label>
        <span
          className={`text-xs tabular-nums ${
            value.length > 0 ? "text-slate-500" : "text-slate-400"
          }`}
        >
          {value.length.toLocaleString()} 字
        </span>
      </div>
      {uploadSlot}
      <textarea
        className="input-base min-h-[160px]"
        style={{ height: `${rows * 28}px` }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
      {hint && (
        <p className="flex items-start gap-1.5 text-xs text-slate-500 leading-relaxed pt-0.5">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
          <span>{hint}</span>
        </p>
      )}
    </div>
  );
}

export function InputPanel({
  resume,
  jd,
  extraProjects,
  loading,
  onChangeResume,
  onChangeJD,
  onChangeExtra,
  onSubmit,
}: InputPanelProps) {
  const [resumeFile, setResumeFile] = useState<UploadedFile | null>(null);
  const [extraFile, setExtraFile] = useState<UploadedFile | null>(null);

  const handleResumeParsed = (text: string, info: UploadedFile) => {
    setResumeFile(info);
    onChangeResume(text);
  };

  const handleExtraParsed = (text: string, info: UploadedFile) => {
    setExtraFile(info);
    onChangeExtra(text);
  };

  const handleClearResume = () => {
    setResumeFile(null);
    onChangeResume("");
  };

  const handleClearExtra = () => {
    setExtraFile(null);
    onChangeExtra("");
  };

  const canSubmit = resume.trim().length > 0 && jd.trim().length > 0 && !loading;

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-5 flex-1 overflow-y-auto pr-1 -mr-1 py-1">
        <TextareaField
          icon={FileText}
          label="简历原文"
          required
          value={resume}
          onChange={onChangeResume}
          rows={10}
          uploadSlot={
            <FileUpload
              onParsed={handleResumeParsed}
              onClear={handleClearResume}
              uploadedFile={resumeFile}
            />
          }
          placeholder={`请粘贴你的完整简历，建议包含：

• 个人简介 / 自我评价
• 工作经历（公司 + 岗位 + 时间 + 核心职责与成果）
• 项目经历（项目名 + 角色 + 做了什么 + 量化结果）
• 教育背景
• 技能标签 / 其他信息

建议直接复制 PDF/Word 中的纯文本即可，无需保留格式。`}
        />

        <TextareaField
          icon={Briefcase}
          label="目标岗位 JD"
          required
          value={jd}
          onChange={onChangeJD}
          rows={9}
          placeholder={`请粘贴目标岗位的职位描述（JD），包含：

• 岗位名称、所属部门、工作地点
• 岗位职责（Responsibilities）
• 任职要求 / 硬性条件（Requirements）
• 加分项 / Preferred Qualifications

粘贴越完整，对齐诊断越精准。支持中文 / 英文 JD。`}
          hint="AI 会自动提取关键技能、能力模型和关键词清单，作为对齐基准。"
        />

        <TextareaField
          icon={FolderPlus}
          label="素材库 · 未写入简历的项目 / 经历（选填）"
          value={extraProjects}
          onChange={onChangeExtra}
          rows={7}
          uploadSlot={
            <FileUpload
              onParsed={handleExtraParsed}
              onClear={handleClearExtra}
              uploadedFile={extraFile}
            />
          }
          placeholder={`把暂时没放进简历的素材都粘进来，AI 会帮你判断「要不要加」「加哪个」「替换哪个」：

• Side Project / 开源项目 / GitHub 作品
• 比赛经历（挑战杯 / Kaggle / 黑客松等）
• 课程设计 / 毕业设计（含金量高的）
• 业余写的技术博客、公众号文章
• 证书 / 在线课程项目作业

描述方式参考：项目名 + 背景 + 你的工作 + 技术栈 + 量化结果。`}
          hint="这是「项目战略取舍」模块的数据基础，没有也没关系，AI 会聚焦在现有简历的优化上。"
        />
      </div>

      {/* 底部操作区 */}
      <div className="sticky bottom-0 pt-5 mt-4 border-t border-dashed border-slate-200/80">
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="btn-primary w-full text-base py-3.5 group"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeOpacity="0.25"
                    strokeWidth="3"
                  />
                  <path
                    d="M22 12a10 10 0 01-10 10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                <span>深度 Agent 推理中，请稍候…</span>
              </>
            ) : (
              <>
                <span className="text-lg leading-none">🚀</span>
                <span>开始全维度对齐与项目取舍诊断</span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/20 text-xs font-normal backdrop-blur ml-1">
                  约 60-90s 深度全案诊断
                </span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sage-500" />
                本地加密处理
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sand-400" />
                不存入数据库
              </span>
            </div>
            <span>
              支持 <b className="text-slate-700">GLM-4-Flash</b> 智谱大模型
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
