import {
  Home,
  Document,
  Folder,
  Images,
  Videocam,
  MusicalNotes,
  Archive,
  CodeWorkingOutline,
  Text
} from '@vicons/ionicons5';

// MIME类型映射
const mimeIconMap: Record<string, any> = {
  // 图片
  'image/': Images,
  // 视频
  'video/': Videocam,
  // 音频
  'audio/': MusicalNotes,
  // 文档
  'application/pdf': Document,
  'text/plain': Text,
  // 代码
  'text/html': CodeWorkingOutline,
  'text/css': CodeWorkingOutline,
  'text/javascript': CodeWorkingOutline,
  'application/javascript': CodeWorkingOutline,
  'application/json': CodeWorkingOutline,
  'application/xml': CodeWorkingOutline,
  'text/xml': CodeWorkingOutline,
  // 压缩包
  'application/zip': Archive,
  'application/x-rar-compressed': Archive,
  'application/x-7z-compressed': Archive,
  'application/x-tar': Archive,
  'application/gzip': Archive
};

// 文件扩展名映射
const extensionMap: Record<string, any> = {
  // 图片
  '.jpg': Images, '.jpeg': Images, '.png': Images, '.gif': Images, '.webp': Images, '.svg': Images, '.bmp': Images,
  // 视频
  '.mp4': Videocam, '.avi': Videocam, '.mkv': Videocam, '.mov': Videocam, '.wmv': Videocam, '.flv': Videocam,
  // 音频
  '.mp3': MusicalNotes, '.wav': MusicalNotes, '.ogg': MusicalNotes, '.flac': MusicalNotes, '.aac': MusicalNotes,
  // 文档
  '.pdf': Document, '.txt': Text, '.doc': Document, '.docx': Document, '.xls': Document, '.xlsx': Document,
  // 代码
  '.html': CodeWorkingOutline, '.htm': CodeWorkingOutline, '.css': CodeWorkingOutline, '.js': CodeWorkingOutline,
  '.ts': CodeWorkingOutline, '.json': CodeWorkingOutline, '.xml': CodeWorkingOutline, '.md': Text,
  // 压缩包
  '.zip': Archive, '.rar': Archive, '.7z': Archive, '.tar': Archive, '.gz': Archive
};

/**
 * 根据文件的 MIME 类型和文件名获取对应的图标
 * @param mimeType 文件的 MIME 类型
 * @param fileName 文件名
 * @returns 对应的图标组件
 */
function getFileIconByMime(mimeType: string | undefined, fileName: string): any {
  const normalizedMimeType = (mimeType || '').toLowerCase();
  const normalizedFileName = fileName.toLowerCase();

  // 检查MIME类型前缀匹配
  for (const [prefix, icon] of Object.entries(mimeIconMap)) {
    if (prefix.endsWith('/') ? normalizedMimeType.startsWith(prefix) : normalizedMimeType === prefix) {
      return icon;
    }
  }

  // 检查文件扩展名匹配
  for (const [ext, icon] of Object.entries(extensionMap)) {
    if (normalizedFileName.endsWith(ext)) {
      return icon;
    }
  }

  return Document;
}

/**
 * 获取文件夹图标
 */
function getFolderIcon(isDir: boolean, root?: boolean): any {
  return isDir ? (root ? Home : Folder) : File;
}

export function getIcon(isDir: boolean, fileName: string, mimeType?: string | undefined, root?: boolean): any {
  return isDir ? getFolderIcon(isDir, root) : getFileIconByMime(mimeType, fileName);
}