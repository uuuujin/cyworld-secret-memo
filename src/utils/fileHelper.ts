import { AttachmentKind, PendingUploadFile } from '../types';

const MAX_IMAGE_DATAURL_LENGTH = 720_000; // Safe margin under Firestore 1MB doc limit
const MAX_TEXT_CONTENT_LENGTH = 750_000;
export const MAX_FILES_PER_BUNDLE = 20;

export type SupportedExt = 'html' | 'txt' | 'png' | 'jpg' | 'jpeg';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function detectSupportedFile(file: File): {
  ext: SupportedExt;
  kind: AttachmentKind;
  mimeType: string;
} | null {
  const nameLower = file.name.toLowerCase();
  const rawExt = nameLower.includes('.') ? nameLower.split('.').pop() || '' : '';

  if (rawExt === 'html' || rawExt === 'htm' || file.type === 'text/html') {
    return { ext: 'html', kind: 'html', mimeType: 'text/html;charset=utf-8' };
  }
  if (rawExt === 'txt' || file.type === 'text/plain') {
    return { ext: 'txt', kind: 'txt', mimeType: 'text/plain;charset=utf-8' };
  }
  if (rawExt === 'png' || file.type === 'image/png') {
    return { ext: 'png', kind: 'image', mimeType: 'image/png' };
  }
  if (rawExt === 'jpg' || file.type === 'image/jpeg') {
    return { ext: 'jpg', kind: 'image', mimeType: 'image/jpeg' };
  }
  if (rawExt === 'jpeg') {
    return { ext: 'jpeg', kind: 'image', mimeType: 'image/jpeg' };
  }

  return null;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('파일을 읽을 수 없습니다.'));
      }
    };
    reader.onerror = () => reject(new Error('파일 읽기 중 오류가 발생했습니다.'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지를 디코딩할 수 없습니다.'));
    img.src = src;
  });
}

function resizeImageOnCanvas(
  img: HTMLImageElement,
  maxDim: number,
  mimeType: string,
  quality: number
): string {
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // For JPEG output, paint white background in case source has alpha
  if (mimeType === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  if (mimeType === 'image/png') {
    return canvas.toDataURL('image/png');
  }
  return canvas.toDataURL('image/jpeg', quality);
}

async function processImageFile(
  file: File,
  ext: SupportedExt,
  mimeType: string
): Promise<{ dataUrl: string; thumbnailUrl: string; storedMimeType: string }> {
  const originalDataUrl = await readFileAsDataUrl(file);
  const img = await loadImageElement(originalDataUrl);

  // Small crisp thumbnail for quick chat bubble rendering (<= ~15KB)
  const thumbnailUrl = resizeImageOnCanvas(img, 260, 'image/jpeg', 0.65);

  if (originalDataUrl.length <= MAX_IMAGE_DATAURL_LENGTH) {
    return {
      dataUrl: originalDataUrl,
      thumbnailUrl: thumbnailUrl || originalDataUrl,
      storedMimeType: mimeType,
    };
  }

  // Try preserving PNG first if png, otherwise step down dimensions & JPEG quality
  const attempts: { dim: number; mime: string; q: number }[] =
    ext === 'png'
      ? [
          { dim: 1600, mime: 'image/png', q: 0.9 },
          { dim: 1200, mime: 'image/png', q: 0.9 },
          { dim: 1920, mime: 'image/jpeg', q: 0.85 },
          { dim: 1440, mime: 'image/jpeg', q: 0.78 },
          { dim: 1080, mime: 'image/jpeg', q: 0.72 },
          { dim: 800, mime: 'image/jpeg', q: 0.65 },
        ]
      : [
          { dim: 1920, mime: 'image/jpeg', q: 0.85 },
          { dim: 1600, mime: 'image/jpeg', q: 0.78 },
          { dim: 1280, mime: 'image/jpeg', q: 0.72 },
          { dim: 960, mime: 'image/jpeg', q: 0.65 },
          { dim: 720, mime: 'image/jpeg', q: 0.58 },
        ];

  for (const step of attempts) {
    const candidate = resizeImageOnCanvas(img, step.dim, step.mime, step.q);
    if (candidate && candidate.length <= MAX_IMAGE_DATAURL_LENGTH) {
      return {
        dataUrl: candidate,
        thumbnailUrl: thumbnailUrl || candidate,
        storedMimeType: step.mime,
      };
    }
  }

  throw new Error(`"${file.name}" 이미지가 너무 커서 최적화 후에도 저장 용량을 초과합니다.`);
}

function buildTextSnippet(raw: string, kind: AttachmentKind): string {
  let clean = raw;
  if (kind === 'html') {
    clean = raw
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
  }
  clean = clean.replace(/\s+/g, ' ').trim();
  if (!clean) return '(내용 없음)';
  return clean.length > 160 ? `${clean.slice(0, 160)}...` : clean;
}

export async function prepareUploadFiles(
  fileList: FileList | File[]
): Promise<{ validFiles: PendingUploadFile[]; rejectedReasons: string[] }> {
  const files = Array.from(fileList);
  const validFiles: PendingUploadFile[] = [];
  const rejectedReasons: string[] = [];

  for (const file of files) {
    if (validFiles.length >= MAX_FILES_PER_BUNDLE) {
      rejectedReasons.push(`한 번에 최대 ${MAX_FILES_PER_BUNDLE}개까지만 묶어 업로드할 수 있습니다.`);
      break;
    }

    const detected = detectSupportedFile(file);
    if (!detected) {
      rejectedReasons.push(
        `"${file.name}": 지원하지 않는 형식입니다. (.html, .txt, .png, .jpg만 가능)`
      );
      continue;
    }

    try {
      const localId = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      if (detected.kind === 'image') {
        const processed = await processImageFile(file, detected.ext, detected.mimeType);
        validFiles.push({
          localId,
          name: file.name.slice(0, 255),
          ext: detected.ext,
          mimeType: processed.storedMimeType,
          kind: 'image',
          size: file.size,
          dataUrl: processed.dataUrl,
          thumbnailUrl: processed.thumbnailUrl,
        });
      } else {
        const textContent = await file.text();
        if (textContent.length > MAX_TEXT_CONTENT_LENGTH) {
          rejectedReasons.push(
            `"${file.name}": 텍스트/HTML 파일은 75만 자(약 750KB) 이하만 업로드 가능합니다.`
          );
          continue;
        }
        validFiles.push({
          localId,
          name: file.name.slice(0, 255),
          ext: detected.ext,
          mimeType: detected.mimeType,
          kind: detected.kind,
          size: file.size,
          textContent,
          textSnippet: buildTextSnippet(textContent, detected.kind),
        });
      }
    } catch (err: any) {
      rejectedReasons.push(err?.message || `"${file.name}" 처리 중 오류가 발생했습니다.`);
    }
  }

  return { validFiles, rejectedReasons };
}

export function triggerFileDownload(file: {
  name: string;
  mimeType?: string;
  dataUrl?: string;
  textContent?: string;
}): void {
  let href = '';
  let revokeAfter = false;

  if (file.dataUrl) {
    href = file.dataUrl;
  } else if (typeof file.textContent === 'string') {
    const blob = new Blob([file.textContent], {
      type: file.mimeType || 'text/plain;charset=utf-8',
    });
    href = URL.createObjectURL(blob);
    revokeAfter = true;
  } else {
    return;
  }

  const link = document.createElement('a');
  link.href = href;
  link.download = file.name || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (revokeAfter) {
    setTimeout(() => URL.revokeObjectURL(href), 1500);
  }
}
