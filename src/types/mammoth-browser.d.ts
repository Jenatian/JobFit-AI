/**
 * mammoth 浏览器构建版本的类型声明
 * 主模块 mammoth 的类型来自 @types/mammoth 或 lib/index.d.ts，
 * 但 mammoth/mammoth.browser 子路径无独立 .d.ts，需手动声明
 */
declare module "mammoth/mammoth.browser" {
  export interface ExtractRawTextResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  export interface ExtractRawTextOptions {
    arrayBuffer?: ArrayBuffer;
    buffer?: ArrayBuffer | Uint8Array;
  }

  export function extractRawText(
    options: ExtractRawTextOptions
  ): Promise<ExtractRawTextResult>;

  export function convertToHtml(
    options: { arrayBuffer?: ArrayBuffer; buffer?: ArrayBuffer | Uint8Array }
  ): Promise<{ value: string; messages: Array<{ type: string; message: string }> }>;

  const _default: {
    extractRawText: typeof extractRawText;
    convertToHtml: typeof convertToHtml;
  };
  export default _default;
}
