import { useState, useRef, useEffect } from 'react';
import {
  PendingUploadFile,
  QuickNote,
  QuickNoteAttachment,
  QuickNoteFile,
} from '../types';
import { retroAudio } from '../utils/retroAudio';
import {
  formatFileSize,
  prepareUploadFiles,
  triggerFileDownload,
} from '../utils/fileHelper';
import {
  Send,
  Trash2,
  Copy,
  Check,
  Keyboard,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Filter,
  Calendar,
  History,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Download,
  FileText,
  FileCode2,
  Image as ImageIcon,
  Eye,
  Upload,
  Link2,
  Loader2,
  FolderDown,
} from 'lucide-react';

interface Props {
  notes: QuickNote[];
  isOneWeekOnly?: boolean;
  onToggleOneWeekFilter?: () => void;
  onCreateNote: (
    content: string,
    mood?: string,
    files?: PendingUploadFile[]
  ) => Promise<void>;
  onDeleteNote: (noteId: string, attachmentFileIds?: string[]) => Promise<void>;
  onFetchFile: (fileId: string) => Promise<QuickNoteFile | null>;
}

export type BubbleWidth = 'normal' | 'wide' | 'full';

export default function InstantChatMemo({
  notes,
  isOneWeekOnly = true,
  onToggleOneWeekFilter,
  onCreateNote,
  onDeleteNote,
  onFetchFile,
}: Props) {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [bubbleTheme, setBubbleTheme] = useState<'kakao' | 'cyworld'>('kakao');
  const [sendOnEnter, setSendOnEnter] = useState(true);
  const [expandedNoteIds, setExpandedNoteIds] = useState<{ [id: string]: boolean }>({});
  const [textareaRows, setTextareaRows] = useState(3);

  // Bubble Font Size Setting for comfortable reading (sm: 11.5px, base: 12.5px, lg: 14.5px)
  const [bubbleFontSize, setBubbleFontSize] = useState<'sm' | 'base' | 'lg'>(() => {
    try {
      const saved = localStorage.getItem('chat_bubble_font_size');
      if (saved === 'sm' || saved === 'base' || saved === 'lg') return saved;
    } catch {}
    return 'base'; // 기본값: 기존(14px)보다 아담하고 편안한 12.5px
  });

  const changeBubbleFontSize = (size: 'sm' | 'base' | 'lg') => {
    retroAudio.playClick();
    setBubbleFontSize(size);
    try {
      localStorage.setItem('chat_bubble_font_size', size);
    } catch {}
  };

  // Bubble Width Setting (Saved to localStorage: normal: 78% right-aligned, wide: 90% wide card, full: 100% full-width)
  const [bubbleWidth, setBubbleWidth] = useState<BubbleWidth>(() => {
    try {
      const saved = localStorage.getItem('chat_bubble_width');
      if (saved === 'normal' || saved === 'wide' || saved === 'full') return saved;
    } catch {}
    return 'wide'; // default to wider layout for comfortable reading
  });

  const changeBubbleWidth = (width: BubbleWidth) => {
    retroAudio.playClick();
    setBubbleWidth(width);
    try {
      localStorage.setItem('chat_bubble_width', width);
    } catch {}
  };

  const toggleBubbleWidth = () => {
    const next: BubbleWidth =
      bubbleWidth === 'normal' ? 'wide' : bubbleWidth === 'wide' ? 'full' : 'normal';
    changeBubbleWidth(next);
  };

  // Fullscreen Modal for Note (전체 펼치기 -> 전체 화면 모달)
  const [fullscreenNote, setFullscreenNote] = useState<QuickNote | null>(null);
  const [fullscreenFontSize, setFullscreenFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');

  // Fullscreen Window Mode for InstantChatMemo container
  const [isWindowFullscreen, setIsWindowFullscreen] = useState(false);

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOnlyMatches, setFilterOnlyMatches] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  // File Upload / Drag & Drop / Download / Preview State
  const [pendingFiles, setPendingFiles] = useState<PendingUploadFile[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [instantDropUpload, setInstantDropUpload] = useState(true);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<{
    type: 'error' | 'info' | 'success';
    message: string;
  } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [copiedRoute, setCopiedRoute] = useState(false);

  const [lightboxState, setLightboxState] = useState<{
    note: QuickNote;
    images: QuickNoteAttachment[];
    currentIndex: number;
    fullSrc: string | null;
    loading: boolean;
  } | null>(null);

  const [fileViewerState, setFileViewerState] = useState<{
    attachment: QuickNoteAttachment;
    file: QuickNoteFile | null;
    loading: boolean;
    htmlMode: 'preview' | 'source';
    copied: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const fileCacheRef = useRef<Record<string, QuickNoteFile>>({});

  const searchInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const matchedNoteRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});

  const showNotice = (type: 'error' | 'info' | 'success', message: string) => {
    setUploadNotice({ type, message });
    setTimeout(() => {
      setUploadNotice((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const toggleNoteExpand = (noteId: string) => {
    retroAudio.playClick();
    setExpandedNoteIds((prev) => ({ ...prev, [noteId]: !prev[noteId] }));
  };

  // Sort notes oldest first (top to bottom like PC KakaoTalk)
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Filtered or matched notes based on search query (includes attached filenames)
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const noteMatchesQuery = (n: QuickNote) =>
    n.content.toLowerCase().includes(trimmedQuery) ||
    (n.attachments?.some((att) => att.name.toLowerCase().includes(trimmedQuery)) ?? false);

  const matchedNotes = trimmedQuery ? sortedNotes.filter(noteMatchesQuery) : [];

  const displayNotes =
    trimmedQuery && filterOnlyMatches ? sortedNotes.filter(noteMatchesQuery) : sortedNotes;

  // Auto-scroll to bottom on new message or tab load (only when not searching)
  const scrollToBottom = (smooth = true) => {
    if (isSearchOpen && searchQuery.trim()) return;
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [notes.length]);

  // Keep focus on textarea by default
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // When search bar opens, focus search input
  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    } else {
      setSearchQuery('');
      setFilterOnlyMatches(false);
      textareaRef.current?.focus();
    }
  }, [isSearchOpen]);

  // Jump to matched note
  const jumpToMatch = (index: number) => {
    if (matchedNotes.length === 0) return;
    const target = matchedNotes[index];
    if (target && matchedNoteRefs.current[target.id]) {
      matchedNoteRefs.current[target.id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  const handleNextMatch = () => {
    if (matchedNotes.length === 0) return;
    retroAudio.playClick();
    const nextIndex = (activeMatchIndex + 1) % matchedNotes.length;
    setActiveMatchIndex(nextIndex);
    jumpToMatch(nextIndex);
  };

  const handlePrevMatch = () => {
    if (matchedNotes.length === 0) return;
    retroAudio.playClick();
    const prevIndex = (activeMatchIndex - 1 + matchedNotes.length) % matchedNotes.length;
    setActiveMatchIndex(prevIndex);
    jumpToMatch(prevIndex);
  };

  // Fullscreen Note navigation helpers
  const currentFullscreenIndex = fullscreenNote
    ? sortedNotes.findIndex((n) => n.id === fullscreenNote.id)
    : -1;

  const handlePrevFullscreenNote = () => {
    if (currentFullscreenIndex > 0) {
      retroAudio.playClick();
      setFullscreenNote(sortedNotes[currentFullscreenIndex - 1]);
    }
  };

  const handleNextFullscreenNote = () => {
    if (currentFullscreenIndex >= 0 && currentFullscreenIndex < sortedNotes.length - 1) {
      retroAudio.playClick();
      setFullscreenNote(sortedNotes[currentFullscreenIndex + 1]);
    }
  };

  // Fetch and cache full file payload from Firestore
  const loadFilePayload = async (fileId: string): Promise<QuickNoteFile | null> => {
    if (fileCacheRef.current[fileId]) {
      return fileCacheRef.current[fileId];
    }
    const fetched = await onFetchFile(fileId);
    if (fetched) {
      fileCacheRef.current[fileId] = fetched;
    }
    return fetched;
  };

  // Open Lightbox for single or bundled image(s)
  const openImageLightbox = async (
    note: QuickNote,
    images: QuickNoteAttachment[],
    startIndex: number
  ) => {
    retroAudio.playClick();
    const target = images[startIndex];
    if (!target) return;

    const cached = fileCacheRef.current[target.fileId];
    setLightboxState({
      note,
      images,
      currentIndex: startIndex,
      fullSrc: cached?.dataUrl || target.thumbnailUrl || null,
      loading: !cached,
    });

    if (!cached) {
      const fetched = await loadFilePayload(target.fileId);
      setLightboxState((prev) => {
        if (!prev || prev.images[prev.currentIndex]?.fileId !== target.fileId) return prev;
        return {
          ...prev,
          fullSrc: fetched?.dataUrl || target.thumbnailUrl || null,
          loading: false,
        };
      });
    }
  };

  const navigateLightbox = async (nextIndex: number) => {
    if (!lightboxState) return;
    if (nextIndex < 0 || nextIndex >= lightboxState.images.length) return;
    retroAudio.playClick();
    const target = lightboxState.images[nextIndex];
    const cached = fileCacheRef.current[target.fileId];
    setLightboxState({
      ...lightboxState,
      currentIndex: nextIndex,
      fullSrc: cached?.dataUrl || target.thumbnailUrl || null,
      loading: !cached,
    });

    if (!cached) {
      const fetched = await loadFilePayload(target.fileId);
      setLightboxState((prev) => {
        if (!prev || prev.images[prev.currentIndex]?.fileId !== target.fileId) return prev;
        return {
          ...prev,
          fullSrc: fetched?.dataUrl || target.thumbnailUrl || null,
          loading: false,
        };
      });
    }
  };

  // Open HTML / TXT preview modal
  const openDocumentViewer = async (attachment: QuickNoteAttachment) => {
    retroAudio.playClick();
    const cached = fileCacheRef.current[attachment.fileId];
    setFileViewerState({
      attachment,
      file: cached || null,
      loading: !cached,
      htmlMode: attachment.kind === 'html' ? 'preview' : 'source',
      copied: false,
    });

    if (!cached) {
      const fetched = await loadFilePayload(attachment.fileId);
      setFileViewerState((prev) => {
        if (!prev || prev.attachment.fileId !== attachment.fileId) return prev;
        return { ...prev, file: fetched, loading: false };
      });
    }
  };

  // Download a single attachment
  const handleDownloadAttachment = async (attachment: QuickNoteAttachment) => {
    retroAudio.playClick();
    setDownloadingId(attachment.fileId);
    try {
      const file = await loadFilePayload(attachment.fileId);
      if (!file) {
        showNotice('error', `"${attachment.name}" 파일을 불러올 수 없습니다.`);
        return;
      }
      triggerFileDownload({
        name: file.name,
        mimeType: file.mimeType,
        dataUrl: file.dataUrl,
        textContent: file.textContent,
      });
    } catch (err) {
      console.error('Download failed:', err);
      showNotice('error', `"${attachment.name}" 다운로드 중 오류가 발생했습니다.`);
    } finally {
      setDownloadingId((curr) => (curr === attachment.fileId ? null : curr));
    }
  };

  // Download all attachments in a bundle
  const handleDownloadBundle = async (
    noteId: string,
    attachments: QuickNoteAttachment[]
  ) => {
    retroAudio.playClick();
    setDownloadingId(`bundle_${noteId}`);
    try {
      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        const file = await loadFilePayload(att.fileId);
        if (file) {
          triggerFileDownload({
            name: file.name,
            mimeType: file.mimeType,
            dataUrl: file.dataUrl,
            textContent: file.textContent,
          });
          // Small gap so browsers don't block multi-file downloads
          if (i < attachments.length - 1) {
            await new Promise((res) => setTimeout(res, 220));
          }
        }
      }
      showNotice('success', `${attachments.length}개 파일 다운로드를 시작했습니다!`);
    } catch (err) {
      console.error('Bundle download error:', err);
      showNotice('error', '묶음 다운로드 중 일부 오류가 발생했습니다.');
    } finally {
      setDownloadingId((curr) => (curr === `bundle_${noteId}` ? null : curr));
    }
  };

  // Global Ctrl+F / Cmd+F and ESC / Arrow navigation handler
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 0. If Lightbox or FileViewer is open
      if (lightboxState) {
        if (e.key === 'Escape') {
          e.preventDefault();
          retroAudio.playClick();
          setLightboxState(null);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigateLightbox(lightboxState.currentIndex - 1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigateLightbox(lightboxState.currentIndex + 1);
        }
        return;
      }

      if (fileViewerState) {
        if (e.key === 'Escape') {
          e.preventDefault();
          retroAudio.playClick();
          setFileViewerState(null);
        }
        return;
      }

      // 1. If Fullscreen Note modal is open
      if (fullscreenNote) {
        if (e.key === 'Escape') {
          e.preventDefault();
          retroAudio.playClick();
          setFullscreenNote(null);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrevFullscreenNote();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextFullscreenNote();
        }
        return;
      }

      // 2. Search shortcut
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
        retroAudio.playClick();
        return;
      }

      // 3. Escape key handling
      if (e.key === 'Escape') {
        if (isSearchOpen) {
          setIsSearchOpen(false);
          retroAudio.playClick();
        } else if (isWindowFullscreen) {
          setIsWindowFullscreen(false);
          retroAudio.playClick();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    lightboxState,
    fileViewerState,
    fullscreenNote,
    currentFullscreenIndex,
    isSearchOpen,
    isWindowFullscreen,
    sortedNotes,
  ]);

  const handleSend = async (overrideFiles?: PendingUploadFile[]) => {
    const trimmed = inputText.trim();
    const filesToUpload = overrideFiles ?? pendingFiles;
    if ((!trimmed && filesToUpload.length === 0) || isSending) return;

    setIsSending(true);
    const prevText = inputText;
    const prevFiles = pendingFiles;
    setInputText('');
    if (!overrideFiles) {
      setPendingFiles([]);
    }

    try {
      retroAudio.playClick();
      await onCreateNote(trimmed, '💬', filesToUpload);
      if (filesToUpload.length > 0) {
        retroAudio.playChime();
        showNotice(
          'success',
          filesToUpload.length > 1
            ? `${filesToUpload.length}개 파일이 묶음으로 업로드되었습니다!`
            : `"${filesToUpload[0].name}" 파일이 업로드되었습니다!`
        );
      }
      setTimeout(() => {
        textareaRef.current?.focus();
        scrollToBottom(true);
      }, 60);
    } catch (err) {
      console.error('Failed to send memo:', err);
      setInputText(prevText);
      if (!overrideFiles) {
        setPendingFiles(prevFiles);
      }
      showNotice('error', '업로드 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSending(false);
    }
  };

  // Process picked / dropped / pasted files
  const handleIncomingFiles = async (fileList: FileList | File[], isDrop: boolean) => {
    if (!fileList || fileList.length === 0) return;
    setIsProcessingFiles(true);
    try {
      const { validFiles, rejectedReasons } = await prepareUploadFiles(fileList);

      if (rejectedReasons.length > 0) {
        showNotice('error', rejectedReasons[0]);
      }

      if (validFiles.length === 0) return;

      if (isDrop && instantDropUpload) {
        // Immediate bundled upload on drag & drop!
        const combined = [...pendingFiles, ...validFiles].slice(0, 20);
        setPendingFiles([]);
        await handleSend(combined);
      } else {
        setPendingFiles((prev) => {
          const merged = [...prev, ...validFiles];
          if (merged.length > 20) {
            showNotice('info', '한 번에 최대 20개까지만 묶어서 업로드할 수 있습니다.');
            return merged.slice(0, 20);
          }
          return merged;
        });
        retroAudio.playClick();
        showNotice(
          'info',
          `${validFiles.length}개 파일 준비됨 — [Tab] 또는 [전송]을 누르면 업로드됩니다!`
        );
        textareaRef.current?.focus();
      }
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    setIsDraggingOver(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      await handleIncomingFiles(e.dataTransfer.files, true);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedFiles = e.clipboardData?.files;
    if (pastedFiles && pastedFiles.length > 0) {
      e.preventDefault();
      await handleIncomingFiles(pastedFiles, false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      handleSend();
      return;
    }

    if (sendOnEnter && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
  };

  const handleCopy = (note: QuickNote) => {
    retroAudio.playClick();
    navigator.clipboard.writeText(note.content);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Group notes by date (YYYY-MM-DD)
  const groupedNotes: { [dateStr: string]: QuickNote[] } = {};
  displayNotes.forEach((note) => {
    const d = new Date(note.createdAt);
    const dateKey = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    if (!groupedNotes[dateKey]) {
      groupedNotes[dateKey] = [];
    }
    groupedNotes[dateKey].push(note);
  });

  // Highlight search matches in text
  const renderHighlightedContent = (text: string, isCurrentMatchTarget: boolean) => {
    if (!trimmedQuery) return text;

    const regex = new RegExp(`(${trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      part.toLowerCase() === trimmedQuery ? (
        <mark
          key={i}
          className={`px-0.5 rounded font-bold transition-all ${
            isCurrentMatchTarget
              ? 'bg-[#ff5252] text-white ring-2 ring-[#ff5252]'
              : 'bg-amber-300 text-black'
          }`}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={
        isWindowFullscreen
          ? 'fixed inset-0 z-50 w-full h-full h-[100dvh] max-h-[100dvh] bg-[#b2c7d9] flex flex-col font-pixel text-xs overflow-hidden select-text shadow-2xl animate-in fade-in duration-100'
          : 'flex flex-col h-full max-h-full min-h-0 font-pixel text-xs bg-[#b2c7d9] rounded-lg border-2 border-[#8ba3b8] overflow-hidden select-text relative'
      }
    >
      {/* Hidden File Picker Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".html,.htm,.txt,.png,.jpg,.jpeg,text/html,text/plain,image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleIncomingFiles(e.target.files, false);
            e.target.value = '';
          }
        }}
      />

      {/* Full-Room Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-40 bg-[#10558a]/75 backdrop-blur-xs flex items-center justify-center p-4 pointer-events-none animate-in fade-in duration-100">
          <div className="w-full max-w-md bg-[#fffdf0] border-4 border-dashed border-[#fee500] rounded-2xl p-6 text-center shadow-2xl">
            <div className="w-14 h-14 mx-auto mb-3 bg-[#fee500] text-[#1f2937] rounded-2xl flex items-center justify-center shadow-md animate-bounce">
              <Upload className="w-7 h-7" />
            </div>
            <div className="text-base font-bold text-[#10558a] mb-1">
              여기에 파일을 놓아 업로드하세요!
            </div>
            <p className="text-xs text-gray-700 leading-relaxed mb-2">
              <span className="font-bold text-[#2b84cb]">.html · .txt · .png · .jpg</span> 파일 지원
              <br />
              사진 여러 장을 한꺼번에 놓으면 <strong>묶음으로 함께 업로드</strong>됩니다!
            </p>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#e0f2fe] text-[#0369a1] rounded-full text-[11px] font-bold">
              {instantDropUpload ? '⚡ 놓자마자 바로 묶음 업로드' : '📥 입력창에 첨부 대기'}
            </div>
          </div>
        </div>
      )}

      {/* 1. PC Kakao-style Room Header (2-row layout so title & toolbar controls never clip) */}
      <div className="bg-[#9bbad0] border-b border-[#84a5be] px-2.5 sm:px-3 py-2 flex flex-col gap-1.5 text-xs font-bold text-gray-800 shrink-0 select-none">
        {/* Top Row: Room Identity, /memo link, Count & Subtitle */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#fee500] text-[#3c1e1e] rounded-full flex items-center justify-center font-bold text-[10px] sm:text-[11px] shadow-xs shrink-0">
              💬
            </div>
            <span className="font-bold text-[#1f2937] text-xs sm:text-[13px] shrink-0">
              아무낙서
            </span>
            <button
              type="button"
              onClick={() => {
                retroAudio.playClick();
                const url = `${window.location.origin}/memo`;
                navigator.clipboard.writeText(url);
                setCopiedRoute(true);
                setTimeout(() => setCopiedRoute(false), 1800);
              }}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/85 hover:bg-white text-[#10558a] border border-[#7dd3fc] rounded text-[10px] font-bold shrink-0 transition-colors"
              title="클릭하여 /memo 전용 URL 복사"
            >
              <Link2 className="w-2.5 h-2.5" />
              <span>{copiedRoute ? '복사됨!' : '/memo'}</span>
            </button>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                isOneWeekOnly
                  ? 'bg-blue-100 text-[#0369a1] border border-blue-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              {isOneWeekOnly ? '최근 7일' : '전체'} {notes.length}개
            </span>
            {isWindowFullscreen && (
              <span className="hidden sm:inline-flex items-center gap-1 bg-[#10558a] text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-2xs shrink-0">
                ⛶ 전체 화면 모드 (ESC: 원래 크기)
              </span>
            )}
          </div>

          <div className="hidden sm:block text-[10px] text-gray-700/85 font-normal truncate">
            🔒 나만 보는 메모방 · 파일 Drag & Drop (.html, .txt, .png, .jpg) · Tab 즉시 저장
          </div>
        </div>

        {/* Bottom Row: Width Control, Font Size, 1-Week Filter, Search, Fullscreen & Theme */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap pt-1.5 border-t border-[#84a5be]/60">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Bubble Width Segmented Control (너비 조절) */}
            <div className="flex items-center bg-white/95 rounded border border-gray-300 p-0.5 text-[10px] sm:text-[11px] shadow-xs">
              <span className="text-[10px] text-gray-500 font-bold px-1">너비:</span>
              <button
                type="button"
                onClick={() => changeBubbleWidth('normal')}
                className={`px-1.5 py-0.5 rounded transition-all font-medium ${
                  bubbleWidth === 'normal'
                    ? 'bg-[#2b84cb] text-white font-bold shadow-2xs'
                    : 'text-gray-600 hover:text-black hover:bg-gray-100'
                }`}
                title="기본: 일반 말풍선 (최대 62% 우측 정렬)"
              >
                기본
              </button>
              <button
                type="button"
                onClick={() => changeBubbleWidth('wide')}
                className={`px-1.5 py-0.5 rounded transition-all font-medium ${
                  bubbleWidth === 'wide'
                    ? 'bg-[#2b84cb] text-white font-bold shadow-2xs'
                    : 'text-gray-600 hover:text-black hover:bg-gray-100'
                }`}
                title="넓게: 가로 폭 75% 와이드 카드"
              >
                넓게
              </button>
              <button
                type="button"
                onClick={() => changeBubbleWidth('full')}
                className={`px-1.5 py-0.5 rounded transition-all font-medium ${
                  bubbleWidth === 'full'
                    ? 'bg-[#2b84cb] text-white font-bold shadow-2xs'
                    : 'text-gray-600 hover:text-black hover:bg-gray-100'
                }`}
                title="꽉차게: 100% 전폭 메모장 모드"
              >
                꽉차게
              </button>
            </div>

            {/* Bubble Font Size Control (글자 크기 조절: 소 11.5px / 중 12.5px / 대 14.5px) */}
            <div className="flex items-center bg-white/95 rounded border border-gray-300 p-0.5 text-[10px] sm:text-[11px] shadow-xs ring-1 ring-[#2b84cb]/20">
              <span className="text-[10px] text-[#2b84cb] font-bold px-1 flex items-center gap-0.5">
                <span>글자:</span>
              </span>
              <button
                type="button"
                onClick={() => changeBubbleFontSize('sm')}
                className={`px-1.5 py-0.5 rounded transition-all font-medium ${
                  bubbleFontSize === 'sm'
                    ? 'bg-[#2b84cb] text-white font-bold shadow-2xs'
                    : 'text-gray-600 hover:text-black hover:bg-gray-100'
                }`}
                title="글씨 작게 (11.5px)"
              >
                소
              </button>
              <button
                type="button"
                onClick={() => changeBubbleFontSize('base')}
                className={`px-1.5 py-0.5 rounded transition-all font-medium ${
                  bubbleFontSize === 'base'
                    ? 'bg-[#2b84cb] text-white font-bold shadow-2xs'
                    : 'text-gray-600 hover:text-black hover:bg-gray-100'
                }`}
                title="글씨 보통 (12.5px - 기본 권장)"
              >
                중
              </button>
              <button
                type="button"
                onClick={() => changeBubbleFontSize('lg')}
                className={`px-1.5 py-0.5 rounded transition-all font-medium ${
                  bubbleFontSize === 'lg'
                    ? 'bg-[#2b84cb] text-white font-bold shadow-2xs'
                    : 'text-gray-600 hover:text-black hover:bg-gray-100'
                }`}
                title="글씨 크게 (14.5px)"
              >
                대
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            {/* 1-Week / All Filter Toggle */}
            {onToggleOneWeekFilter && (
              <button
                type="button"
                onClick={() => {
                  retroAudio.playClick();
                  onToggleOneWeekFilter();
                }}
                className={`px-2 py-1 rounded border flex items-center gap-1 text-[10px] sm:text-[11px] font-medium transition-all ${
                  isOneWeekOnly
                    ? 'bg-white/85 hover:bg-white text-gray-700 border-gray-300 shadow-xs'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 font-bold shadow-xs'
                }`}
                title={
                  isOneWeekOnly
                    ? '과거 1주일 이전 낙서까지 전체 불러오기'
                    : '최근 7일치 낙서만 보기로 전환 (속도 최적화)'
                }
              >
                <History className="w-3 h-3 text-[#2b84cb]" />
                <span>{isOneWeekOnly ? '최근 7일' : '전체'}</span>
              </button>
            )}

            {/* Search Toggle Button */}
            <button
              type="button"
              onClick={() => {
                retroAudio.playClick();
                setIsSearchOpen((prev) => !prev);
              }}
              className={`px-2 py-1 rounded border flex items-center gap-1 text-[10px] sm:text-[11px] font-bold transition-all ${
                isSearchOpen
                  ? 'bg-[#2b84cb] text-white border-[#10558a] shadow-inner'
                  : 'bg-white/85 hover:bg-white text-gray-700 border-gray-300 shadow-xs'
              }`}
              title="아무낙서 검색 (단축키: Ctrl + F)"
            >
              <Search className="w-3 h-3" />
              <span>검색</span>
            </button>

            {/* Window Fullscreen Toggle Button */}
            <button
              type="button"
              onClick={() => {
                retroAudio.playClick();
                setIsWindowFullscreen((prev) => !prev);
              }}
              className={`px-2 py-1 rounded border text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all ${
                isWindowFullscreen
                  ? 'bg-[#10558a] text-white border-[#0c3e66] shadow-inner ring-1 ring-white/50'
                  : 'bg-white/85 hover:bg-white text-gray-700 border-gray-300 shadow-xs'
              }`}
              title={isWindowFullscreen ? '원래 창 크기로 축소 (ESC)' : '아무낙서 전체 화면으로 크게 보기'}
            >
              {isWindowFullscreen ? (
                <>
                  <Minimize2 className="w-3 h-3 text-amber-300" />
                  <span>창 축소</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3 h-3 text-[#2b84cb]" />
                  <span>전체 화면</span>
                </>
              )}
            </button>

            {/* Theme button */}
            <button
              type="button"
              onClick={() => {
                retroAudio.playClick();
                setBubbleTheme((prev) => (prev === 'kakao' ? 'cyworld' : 'kakao'));
              }}
              className="px-2 py-1 bg-white/85 hover:bg-white text-gray-700 rounded border border-gray-300 text-[10px] sm:text-[11px]"
              title="말풍선 테마 변경"
            >
              {bubbleTheme === 'kakao' ? '💛' : '💙'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. PC Kakao-style Retro Search Bar Tray (when open) */}
      {isSearchOpen && (
        <div className="bg-[#f0f4f8] border-b-2 border-[#2b84cb] p-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 shadow-md animate-in slide-in-from-top-2 duration-150 shrink-0 select-none">
          <div className="flex items-center gap-1.5 flex-1 bg-white border border-[#2b84cb] rounded-md px-2 py-1 shadow-inner">
            <Search className="w-3.5 h-3.5 text-[#2b84cb] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveMatchIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) handlePrevMatch();
                  else handleNextMatch();
                } else if (e.key === 'Escape') {
                  setIsSearchOpen(false);
                }
              }}
              placeholder="검색어를 입력하세요... (Enter: 다음 일치)"
              className="w-full text-xs text-[#222] focus:outline-none bg-transparent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Search Result Controls */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 text-[11px]">
            {trimmedQuery ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-[#0369a1] bg-[#e0f2fe] px-1.5 py-0.5 rounded border border-[#bae6fd]">
                  {matchedNotes.length > 0
                    ? `${activeMatchIndex + 1} / ${matchedNotes.length}건 일치`
                    : '일치 없음'}
                </span>

                {/* Match Jump Buttons */}
                {matchedNotes.length > 0 && (
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={handlePrevMatch}
                      className="p-1 bg-white hover:bg-gray-100 rounded border border-gray-300 text-gray-700"
                      title="이전 일치 결과 (Shift + Enter)"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMatch}
                      className="p-1 bg-white hover:bg-gray-100 rounded border border-gray-300 text-gray-700"
                      title="다음 일치 결과 (Enter)"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Filter Only Matches Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.playClick();
                    setFilterOnlyMatches((prev) => !prev);
                  }}
                  className={`px-1.5 py-0.5 rounded border text-[10px] flex items-center gap-0.5 ${
                    filterOnlyMatches
                      ? 'bg-[#2b84cb] text-white border-[#10558a]'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                  title="일치하는 낙서만 모아보기"
                >
                  <Filter className="w-2.5 h-2.5" />
                  <span>{filterOnlyMatches ? '모아보기 켬' : '모아보기'}</span>
                </button>

                {/* 1-week search expansion hint */}
                {isOneWeekOnly && onToggleOneWeekFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.playClick();
                      onToggleOneWeekFilter();
                    }}
                    className="hidden sm:inline-flex items-center gap-1 text-[10px] text-[#0369a1] bg-[#e0f2fe] hover:bg-[#bae6fd] px-1.5 py-0.5 rounded border border-[#bae6fd] transition-colors"
                    title="1주일 이전의 모든 과거 낙서까지 검색 범위 확장"
                  >
                    <History className="w-2.5 h-2.5" />
                    <span>과거 낙서까지 검색</span>
                  </button>
                )}
              </div>
            ) : (
              <span className="text-[10px] text-gray-500">ESC: 닫기</span>
            )}

            {/* Close Search Tray */}
            <button
              type="button"
              onClick={() => {
                retroAudio.playClick();
                setIsSearchOpen(false);
              }}
              className="p-1 hover:bg-gray-200 text-gray-600 rounded"
              title="검색 닫기"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Messages Chat Stream (Middle Area) */}
      <div className="flex-1 overflow-y-auto min-h-0 p-2.5 sm:p-3 space-y-3 sm:space-y-4">
        {/* Top 1-Week Filter Banner / Load Older History */}
        {isOneWeekOnly ? (
          <div className="bg-white/75 backdrop-blur-xs border border-[#8ba3b8] rounded-xl p-2.5 text-center shadow-xs flex flex-col items-center justify-center gap-1 text-gray-700 select-none">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#10558a]">
              <Calendar className="w-3.5 h-3.5 text-[#2b84cb]" />
              <span>최근 1주일(7일)간의 낙서만 실시간 표시 중입니다</span>
              <span className="px-1.5 py-0.2 bg-[#2b84cb] text-white rounded-full text-[9px] font-bold">
                {notes.length}개
              </span>
            </div>
            <p className="text-[10px] text-gray-500 leading-tight max-w-sm">
              빠른 로딩과 대용량 데이터 최적화를 위해 최근 7일치 낙서만 DB에서 실시간으로 가져옵니다.
            </p>
            {onToggleOneWeekFilter && (
              <button
                type="button"
                onClick={() => {
                  retroAudio.playClick();
                  onToggleOneWeekFilter();
                }}
                className="mt-0.5 px-3 py-1 bg-white hover:bg-[#e0f2fe] text-[#0369a1] border border-[#7dd3fc] rounded-lg text-[11px] font-bold shadow-2xs transition-all active:scale-95 flex items-center gap-1"
                title="1주일 이전의 모든 과거 낙서 불러오기"
              >
                <History className="w-3 h-3 text-[#0369a1]" />
                <span>이전 과거 낙서 전체 불러오기</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-[#fef3c7] border border-[#fde68a] rounded-xl p-2 shadow-xs flex items-center justify-between text-amber-900 select-none px-3">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span>📂 과거를 포함한 전체 낙서가 표시 중입니다 ({notes.length}개)</span>
            </div>
            {onToggleOneWeekFilter && (
              <button
                type="button"
                onClick={() => {
                  retroAudio.playClick();
                  onToggleOneWeekFilter();
                }}
                className="px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-[10px] font-bold transition-all shadow-2xs"
              >
                ⚡ 최근 7일치만 보기
              </button>
            )}
          </div>
        )}
        {displayNotes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-600 p-6 space-y-2 select-none">
            <div className="w-12 h-12 bg-white/60 rounded-full flex items-center justify-center text-2xl shadow-inner">
              {trimmedQuery ? '🔍' : '📝'}
            </div>
            <div className="font-bold text-sm text-gray-800">
              {trimmedQuery
                ? `"${searchQuery}" 검색 결과가 없습니다.`
                : '첫 번째 아무낙서를 남겨보세요!'}
            </div>
            <p className="text-xs text-gray-600 max-w-xs leading-relaxed">
              {trimmedQuery ? (
                <span>다른 검색어를 입력하시거나 검색창을 닫아주세요.</span>
              ) : (
                <span>
                  하단 입력창에 생각을 적고 <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-400 font-bold text-[#2b84cb]">Tab</kbd> 키를 누르면 PC 카톡처럼 바로바로 대화창에 기록됩니다.
                </span>
              )}
            </p>
          </div>
        ) : (
          Object.entries(groupedNotes).map(([dateLabel, dateNotes]) => (
            <div key={dateLabel} className="space-y-3">
              {/* Date divider */}
              <div className="flex items-center justify-center my-2 select-none">
                <span className="bg-[#000000]/15 text-white px-3 py-0.5 rounded-full text-[10px] font-bold shadow-xs">
                  {dateLabel}
                </span>
              </div>

              {/* Chat bubbles */}
              {dateNotes.map((note) => {
                const dateObj = new Date(note.createdAt);
                const timeStr = dateObj.toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                });

                const isCurrentMatchTarget =
                  matchedNotes.length > 0 &&
                  matchedNotes[activeMatchIndex]?.id === note.id;

                const isKakao = bubbleTheme === 'kakao';
                const bubbleBg = isKakao
                  ? 'bg-[#fee500] text-[#1f2937] border-[#eed500]'
                  : 'bg-white text-[#1f2937] border-[#b8c6d4]';

                // Responsive width styling:
                // normal: 내용 길이에 맞춘 컴팩트 카톡 말풍선 (최대 62%)
                // wide: 가로 75%의 널찍한 우측 카드형 (왼쪽에 약 25% 여백 유지)
                // full: 화면 좌우 여백 없이 100% 꽉 채우는 전폭 메모장 모드
                const isFull = bubbleWidth === 'full';
                const currentWidthClass =
                  bubbleWidth === 'normal'
                    ? 'max-w-[70%] sm:max-w-[62%]'
                    : bubbleWidth === 'wide'
                    ? 'w-[84%] sm:w-[75%]'
                    : 'w-full min-w-full';

                return (
                  <div
                    key={note.id}
                    ref={(el) => {
                      matchedNoteRefs.current[note.id] = el;
                    }}
                    className={`w-full transition-all group pr-1 ${
                      isFull
                        ? 'flex flex-col gap-1'
                        : 'flex items-end justify-end gap-1.5'
                    } ${
                      isCurrentMatchTarget
                        ? 'p-1 rounded-xl bg-blue-400/20 ring-2 ring-[#2b84cb]'
                        : ''
                    }`}
                  >
                    {/* If full mode, show top metadata bar */}
                    {isFull ? (
                      <div className="flex items-center justify-between text-[10px] text-gray-500 px-1 select-none">
                        <span className="font-semibold text-gray-600 flex items-center gap-1">
                          <span>🕒</span>
                          <span>{timeStr}</span>
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <button
                            onClick={() => {
                              retroAudio.playClick();
                              setFullscreenNote(note);
                            }}
                            className="p-1 bg-white hover:bg-gray-100 text-gray-700 rounded border border-gray-300 shadow-2xs"
                            title="전체 펼치기"
                          >
                            <Maximize2 className="w-2.5 h-2.5 text-[#2b84cb]" />
                          </button>
                          <button
                            onClick={() => handleCopy(note)}
                            className="p-1 bg-white hover:bg-gray-100 text-gray-600 rounded border border-gray-300 shadow-2xs"
                            title="내용 복사"
                          >
                            {copiedId === note.id ? (
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-2.5 h-2.5" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              retroAudio.playClick();
                              onDeleteNote(
                                note.id,
                                note.attachments?.map((a) => a.fileId) || []
                              );
                            }}
                            className="p-1 bg-white hover:bg-rose-50 text-rose-600 rounded border border-gray-300 shadow-2xs"
                            title="삭제"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Hover action buttons (Copy / Delete / Fullscreen / Width) */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pb-1 shrink-0">
                          <button
                            onClick={() => {
                              retroAudio.playClick();
                              setFullscreenNote(note);
                            }}
                            className="p-1 bg-white/90 hover:bg-white text-gray-700 rounded border border-gray-300 shadow-xs"
                            title="전체 펼치기 (전체 화면으로 크게 보기)"
                          >
                            <Maximize2 className="w-2.5 h-2.5 text-[#2b84cb]" />
                          </button>
                          <button
                            onClick={toggleBubbleWidth}
                            className={`p-1 rounded border shadow-xs transition-colors ${
                              bubbleWidth !== 'normal'
                                ? 'bg-[#2b84cb] text-white border-[#10558a]'
                                : 'bg-white/90 hover:bg-white text-gray-700 border-gray-300'
                            }`}
                            title={
                              bubbleWidth === 'normal'
                                ? '넓게 늘리기 (75%)'
                                : bubbleWidth === 'wide'
                                ? '100% 꽉차게 늘리기'
                                : '기본 말풍선으로 축소'
                            }
                          >
                            <MoveHorizontal className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={() => handleCopy(note)}
                            className="p-1 bg-white/90 hover:bg-white text-gray-600 rounded border border-gray-300 shadow-xs"
                            title="내용 복사"
                          >
                            {copiedId === note.id ? (
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-2.5 h-2.5" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              retroAudio.playClick();
                              onDeleteNote(
                                note.id,
                                note.attachments?.map((a) => a.fileId) || []
                              );
                            }}
                            className="p-1 bg-white/90 hover:bg-rose-50 text-rose-600 rounded border border-gray-300 shadow-xs"
                            title="삭제"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {/* Timestamp */}
                        <div className="text-[10px] text-gray-600 pb-0.5 select-none shrink-0">
                          {timeStr}
                        </div>
                      </>
                    )}

                    {/* Speech Bubble */}
                    {(() => {
                      const isLong = note.content.length > 300;
                      const isExpanded = !!expandedNoteIds[note.id];
                      const displayContent =
                        isLong && !isExpanded
                          ? note.content.slice(0, 280) + '...'
                          : note.content;

                      const fontSizeClass =
                        bubbleFontSize === 'sm'
                          ? 'text-[11.5px] leading-[1.6]'
                          : bubbleFontSize === 'lg'
                          ? 'text-[14.5px] leading-[1.75]'
                          : 'text-[12.5px] leading-[1.65]';

                      const attachments = note.attachments || [];
                      const imageAttachments = attachments.filter((a) => a.kind === 'image');
                      const docAttachments = attachments.filter((a) => a.kind !== 'image');

                      return (
                        <div
                          className={`relative ${currentWidthClass} min-h-[72px] sm:min-h-[78px] p-3 sm:p-3.5 rounded-2xl rounded-tr-xs border shadow-sm break-words ${bubbleBg} transition-all duration-150 flex flex-col justify-between`}
                        >
                          {/* Inner memo text (only when text content exists) */}
                          {note.content.trim().length > 0 && (
                            <div
                              className={`font-memo-readable whitespace-pre-wrap max-h-[520px] overflow-y-auto pr-1 select-text tracking-normal ${fontSizeClass} text-gray-900 font-normal`}
                            >
                              {renderHighlightedContent(displayContent, isCurrentMatchTarget)}
                            </div>
                          )}

                          {/* Bundled or Single File Attachments (.png, .jpg, .html, .txt) */}
                          {attachments.length > 0 && (
                            <div
                              className={`${
                                note.content.trim().length > 0 ? 'mt-2.5' : ''
                              } space-y-2 select-none`}
                            >
                              {/* Bundle summary bar when 2+ items */}
                              {attachments.length >= 2 && (
                                <div
                                  className={`flex items-center justify-between gap-2 bg-black/5 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold text-gray-800 ${
                                    docAttachments.length === 0 ? 'max-w-[420px]' : ''
                                  }`}
                                >
                                  <span className="flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3 text-[#2b84cb]" />
                                    <span>
                                      {imageAttachments.length === attachments.length
                                        ? `묶음 사진 ${attachments.length}장`
                                        : `묶음 첨부파일 ${attachments.length}개`}
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadBundle(note.id, attachments)}
                                    disabled={downloadingId === `bundle_${note.id}`}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-[#e0f2fe] text-[#0369a1] border border-[#7dd3fc] rounded shadow-2xs transition-colors disabled:opacity-50"
                                    title="묶인 파일/사진 전체 한 번에 다운로드"
                                  >
                                    {downloadingId === `bundle_${note.id}` ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <FolderDown className="w-3 h-3" />
                                    )}
                                    <span>묶음 전체 다운로드</span>
                                  </button>
                                </div>
                              )}

                              {/* Photo Attachment(s): Bounded single photo card OR bounded bundled photo grid */}
                              {imageAttachments.length === 1 && (
                                <div className="group/img relative w-full max-w-[260px] sm:max-w-[320px] rounded-xl overflow-hidden border border-black/15 bg-white/85 shadow-2xs">
                                  <div className="w-full bg-black/5 flex items-center justify-center p-1">
                                    <img
                                      src={imageAttachments[0].thumbnailUrl || ''}
                                      alt={imageAttachments[0].name}
                                      onClick={() => openImageLightbox(note, imageAttachments, 0)}
                                      className="block max-w-full max-h-[200px] sm:max-h-[230px] w-auto h-auto object-contain rounded cursor-pointer hover:opacity-95 transition-opacity"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white/95 border-t border-black/10 text-[10px]">
                                    <span className="truncate font-memo-readable font-semibold text-gray-800">
                                      🖼️ {imageAttachments[0].name}{' '}
                                      <span className="text-gray-400 font-normal">
                                        ({formatFileSize(imageAttachments[0].size)})
                                      </span>
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => openImageLightbox(note, imageAttachments, 0)}
                                        className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 flex items-center gap-0.5"
                                        title="크게 보기"
                                      >
                                        <Eye className="w-2.5 h-2.5" />
                                        <span>보기</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDownloadAttachment(imageAttachments[0])
                                        }
                                        disabled={downloadingId === imageAttachments[0].fileId}
                                        className="px-1.5 py-0.5 bg-[#2b84cb] hover:bg-[#10558a] text-white rounded flex items-center gap-0.5 font-bold"
                                        title="사진 다운로드"
                                      >
                                        {downloadingId === imageAttachments[0].fileId ? (
                                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                        ) : (
                                          <Download className="w-2.5 h-2.5" />
                                        )}
                                        <span>다운로드</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {imageAttachments.length > 1 && (
                                <div
                                  className={`grid gap-1.5 max-h-[340px] overflow-y-auto pr-0.5 ${
                                    imageAttachments.length === 2 || imageAttachments.length === 4
                                      ? 'grid-cols-2 max-w-[280px] sm:max-w-[340px]'
                                      : 'grid-cols-2 sm:grid-cols-3 max-w-[320px] sm:max-w-[420px]'
                                  }`}
                                >
                                  {imageAttachments.map((imgAtt, idx) => (
                                    <div
                                      key={imgAtt.fileId}
                                      className="relative group/tile rounded-xl overflow-hidden border border-black/15 bg-white/80 aspect-[4/3] max-h-[140px]"
                                    >
                                      <img
                                        src={imgAtt.thumbnailUrl || ''}
                                        alt={imgAtt.name}
                                        onClick={() =>
                                          openImageLightbox(note, imageAttachments, idx)
                                        }
                                        className="w-full h-full object-cover cursor-pointer hover:scale-[1.03] transition-transform duration-150"
                                      />
                                      <div className="absolute top-1 left-1 px-1.5 py-0.2 bg-black/60 text-white text-[9px] rounded-full font-bold">
                                        {idx + 1}
                                      </div>
                                      <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/75 via-black/40 to-transparent flex items-center justify-between gap-1 opacity-90 sm:opacity-0 sm:group-hover/tile:opacity-100 transition-opacity">
                                        <span className="text-[9px] text-white truncate px-1">
                                          {imgAtt.name}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadAttachment(imgAtt);
                                          }}
                                          disabled={downloadingId === imgAtt.fileId}
                                          className="p-1 bg-[#2b84cb] hover:bg-[#10558a] text-white rounded shadow-xs shrink-0"
                                          title={`${imgAtt.name} 다운로드`}
                                        >
                                          {downloadingId === imgAtt.fileId ? (
                                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                          ) : (
                                            <Download className="w-2.5 h-2.5" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* HTML / TXT File Cards */}
                              {docAttachments.length > 0 && (
                                <div className="space-y-1.5">
                                  {docAttachments.map((docAtt) => {
                                    const isHtml = docAtt.kind === 'html';
                                    return (
                                      <div
                                        key={docAtt.fileId}
                                        className="bg-white/95 border border-black/15 rounded-xl p-2.5 flex flex-col gap-1.5 shadow-2xs"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <div
                                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-[10px] border ${
                                                isHtml
                                                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                              }`}
                                            >
                                              {isHtml ? (
                                                <FileCode2 className="w-4 h-4" />
                                              ) : (
                                                <FileText className="w-4 h-4" />
                                              )}
                                            </div>
                                            <div className="min-w-0">
                                              <div className="font-memo-readable font-bold text-xs text-gray-900 truncate">
                                                {docAtt.name}
                                              </div>
                                              <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
                                                <span
                                                  className={`px-1 rounded font-bold uppercase text-[9px] ${
                                                    isHtml
                                                      ? 'bg-orange-100 text-orange-800'
                                                      : 'bg-emerald-100 text-emerald-800'
                                                  }`}
                                                >
                                                  {docAtt.ext}
                                                </span>
                                                <span>{formatFileSize(docAtt.size)}</span>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => openDocumentViewer(docAtt)}
                                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md border border-gray-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                                              title={
                                                isHtml
                                                  ? 'HTML 화면/소스 미리보기'
                                                  : 'TXT 내용 크게 보기'
                                              }
                                            >
                                              <Eye className="w-3 h-3 text-[#2b84cb]" />
                                              <span>미리보기</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDownloadAttachment(docAtt)}
                                              disabled={downloadingId === docAtt.fileId}
                                              className="px-2 py-1 bg-[#2b84cb] hover:bg-[#10558a] text-white rounded-md text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                                              title={`${docAtt.name} 다운로드`}
                                            >
                                              {downloadingId === docAtt.fileId ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                              ) : (
                                                <Download className="w-3 h-3" />
                                              )}
                                              <span>다운로드</span>
                                            </button>
                                          </div>
                                        </div>

                                        {docAtt.textSnippet && (
                                          <div
                                            onClick={() => openDocumentViewer(docAtt)}
                                            className="font-memo-readable text-[11px] text-gray-600 bg-[#f8fafc] border border-gray-200 rounded px-2 py-1 truncate cursor-pointer hover:bg-[#f1f5f9]"
                                          >
                                            {docAtt.textSnippet}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Bubble bottom action bar */}
                          <div className="mt-2.5 pt-2 border-t border-black/10 flex items-center justify-between gap-1 flex-wrap select-none">
                            {/* "전체 펼치기" 누르면 아예 전체 화면으로 크게 나오게 */}
                            <button
                              type="button"
                              onClick={() => {
                                retroAudio.playClick();
                                setFullscreenNote(note);
                              }}
                              className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-[#2b84cb] hover:bg-[#10558a] text-white rounded text-[10px] sm:text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                              title="이 메모를 전체 화면으로 시원하게 크게 펼쳐보기"
                            >
                              <Maximize2 className="w-2.5 h-2.5" />
                              <span>전체 펼치기 (전체 화면)</span>
                            </button>

                            <div className="flex items-center gap-1">
                              {/* 글자 크기 순환 버튼 (말풍선 바로 아래에서도 변경 가능) */}
                              <button
                                type="button"
                                onClick={() => {
                                  const next =
                                    bubbleFontSize === 'sm'
                                      ? 'base'
                                      : bubbleFontSize === 'base'
                                      ? 'lg'
                                      : 'sm';
                                  changeBubbleFontSize(next);
                                }}
                                className="text-[10px] text-gray-700 hover:text-black font-medium flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-black/5"
                                title="말풍선 글자 크기 변경 (소 11.5px → 중 12.5px → 대 14.5px)"
                              >
                                <span className="text-[#2b84cb] font-bold">글자:</span>
                                <span>{bubbleFontSize === 'sm' ? '소' : bubbleFontSize === 'lg' ? '대' : '중'}</span>
                              </button>

                              {/* 노란색 박스 너비 조절 버튼 (전체 노란 박스 동시 적용) */}
                              <button
                                type="button"
                                onClick={toggleBubbleWidth}
                                className="text-[10px] text-gray-700 hover:text-black font-medium flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-black/5"
                                title="모든 노란색 박스의 너비를 순환 변경합니다 (기본 → 넓게 → 꽉차게)"
                              >
                                <MoveHorizontal className="w-2.5 h-2.5 text-[#2b84cb]" />
                                <span>
                                  {bubbleWidth === 'normal'
                                    ? '넓게 늘리기 (75%)'
                                    : bubbleWidth === 'wide'
                                    ? '100% 꽉차게'
                                    : '기본 말풍선으로'}
                                </span>
                              </button>

                              {/* 긴 글 인라인 펼치기/접기 */}
                              {isLong && (
                                <button
                                  type="button"
                                  onClick={() => toggleNoteExpand(note.id)}
                                  className="text-[10px] font-bold text-[#2b84cb] hover:underline ml-1"
                                >
                                  {isExpanded ? '▲ 접기' : `▼ 더보기`}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Bottom Fixed Textarea & Drag/Drop Staging Box (무조건 하단 고정) */}
      <div className="bg-white border-t border-[#8ba3b8] p-2 flex flex-col gap-1.5 shrink-0">
        {/* Upload / Validation Notice Toast */}
        {uploadNotice && (
          <div
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
              uploadNotice.type === 'error'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : uploadNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]'
            }`}
          >
            <span className="truncate">{uploadNotice.message}</span>
            <button
              type="button"
              onClick={() => setUploadNotice(null)}
              className="p-0.5 hover:bg-black/5 rounded shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Staged Files / Bundled Photos Preview Tray */}
        {pendingFiles.length > 0 && (
          <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-amber-900">
              <span className="flex items-center gap-1">
                <Paperclip className="w-3 h-3 text-[#2b84cb]" />
                <span>
                  첨부 대기중 {pendingFiles.length}개 (전송 시 하나로 묶어서 업로드됩니다)
                </span>
              </span>
              <button
                type="button"
                onClick={() => setPendingFiles([])}
                className="text-rose-600 hover:underline text-[10px]"
              >
                모두 비우기
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {pendingFiles.map((file) => (
                <div
                  key={file.localId}
                  className="relative group/chip shrink-0 bg-white border border-amber-300 rounded-lg p-1.5 flex items-center gap-1.5 shadow-2xs max-w-[180px]"
                >
                  {file.kind === 'image' ? (
                    <img
                      src={file.thumbnailUrl || file.dataUrl}
                      alt={file.name}
                      className="w-9 h-9 rounded object-cover border border-gray-200 shrink-0"
                    />
                  ) : (
                    <div
                      className={`w-9 h-9 rounded flex items-center justify-center shrink-0 ${
                        file.kind === 'html'
                          ? 'bg-orange-50 text-orange-600 border border-orange-200'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      }`}
                    >
                      {file.kind === 'html' ? (
                        <FileCode2 className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                  )}
                  <div className="min-w-0 pr-3">
                    <div className="text-[10px] font-bold text-gray-800 truncate">
                      {file.name}
                    </div>
                    <div className="text-[9px] text-gray-500 uppercase">
                      {file.ext} · {formatFileSize(file.size)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingFiles((prev) =>
                        prev.filter((item) => item.localId !== file.localId)
                      )
                    }
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-xs"
                    title="첨부 취소"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shortcut guide & options */}
        <div className="flex items-center justify-between text-[10px] text-gray-500 px-1 select-none flex-wrap gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                retroAudio.playClick();
                fileInputRef.current?.click();
              }}
              disabled={isProcessingFiles}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#fef08a] hover:bg-[#fde047] text-gray-900 border border-[#eab308] rounded font-bold shadow-2xs transition-colors disabled:opacity-50"
              title="HTML, TXT, PNG, JPG 파일 1개 또는 여러 개 선택 업로드"
            >
              {isProcessingFiles ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Paperclip className="w-3 h-3 text-[#10558a]" />
              )}
              <span>파일/사진 업로드</span>
            </button>

            <label
              className="flex items-center gap-1 cursor-pointer bg-[#f0f9ff] px-1.5 py-0.5 rounded border border-[#bae6fd] text-[#0369a1] font-medium"
              title="체크 시 파일을 화면에 드롭하자마자 묶어서 바로 업로드합니다. 해제 시 입력창에 대기시켜 글과 함께 올립니다."
            >
              <input
                type="checkbox"
                checked={instantDropUpload}
                onChange={(e) => setInstantDropUpload(e.target.checked)}
                className="rounded text-[#2b84cb] focus:ring-0 w-3 h-3"
              />
              <span>⚡ 드롭 즉시 업로드</span>
            </label>

            <span className="hidden sm:inline-flex items-center gap-0.5 px-1 py-0.2 bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd] rounded font-bold">
              <Keyboard className="w-2.5 h-2.5" />
              Tab : 저장
            </span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={sendOnEnter}
                onChange={(e) => setSendOnEnter(e.target.checked)}
                className="rounded text-[#2b84cb] focus:ring-0 w-3 h-3"
              />
              <span>Enter 전송</span>
            </label>
            <button
              type="button"
              onClick={() => setTextareaRows((r) => (r === 3 ? 7 : 3))}
              className="text-[#2b84cb] hover:underline"
            >
              [{textareaRows === 3 ? '창 크게 (7줄)' : '창 작게 (3줄)'}]
            </button>
          </div>
          <span className="text-gray-400 hidden sm:inline">
            {inputText.length > 0 ? (
              <span className="text-[#2b84cb] font-bold">
                {inputText.length.toLocaleString()}자 작성 중
              </span>
            ) : (
              'html · txt · png · jpg 드래그 & 드롭 지원'
            )}
          </span>
        </div>

        {/* Textarea & Send Button */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={textareaRows}
            placeholder="글을 적거나 .html / .txt / .png / .jpg 파일을 여기에 끌어다 놓으세요! (사진 여러 장은 자동으로 묶여 업로드됩니다)"
            className="flex-1 p-2 bg-[#f8fafc] border border-gray-300 focus:border-[#2b84cb] rounded-lg text-[13px] font-memo-readable leading-relaxed resize-y focus:outline-none focus:bg-white transition-colors text-gray-900"
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={isSending || isProcessingFiles || (!inputText.trim() && pendingFiles.length === 0)}
            className="cyworld-btn px-4 py-3 rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs font-bold shrink-0 disabled:opacity-40 transition-transform active:scale-95 shadow-sm"
            title="Tab 키를 눌러도 바로 전송/업로드됩니다"
          >
            {isSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span className="text-[11px]">
              {pendingFiles.length > 0 ? `업로드(${pendingFiles.length})` : '전송'}
            </span>
            <span className="text-[9px] opacity-80">(Tab)</span>
          </button>
        </div>
      </div>

      {/* 5. Fullscreen Note Reader Modal (전체 펼치기 클릭 시 아예 전체 화면으로 크게 표시) */}
      {fullscreenNote && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150 select-text overflow-y-auto"
        >
          <div className="w-full max-w-4xl h-full max-h-[96vh] sm:max-h-[90vh] my-auto bg-[#fffdf0] border-3 sm:border-4 border-[#eab308] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-pixel">
            {/* Modal Header */}
            <div className="bg-[#fef08a] border-b-2 border-[#eab308] px-3 sm:px-5 py-3 flex items-center justify-between text-gray-800 select-none shrink-0 gap-2">
              <div className="flex items-center gap-2 truncate">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#fee500] text-[#3c1e1e] rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs shrink-0 border border-[#ca8a04]">
                  💬
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-gray-900 truncate">
                      아무낙서 전체 펼치기 (전체 화면)
                    </span>
                    {currentFullscreenIndex >= 0 && (
                      <span className="text-[10px] sm:text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold shrink-0">
                        {currentFullscreenIndex + 1} / {sortedNotes.length}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600 flex items-center gap-1.5 sm:gap-2 mt-0.5 truncate">
                    <span>{new Date(fullscreenNote.createdAt).toLocaleString('ko-KR')}</span>
                    <span>·</span>
                    <span className="font-bold text-[#10558a]">
                      {fullscreenNote.content.length.toLocaleString()}자
                    </span>
                    <span>·</span>
                    <span>{fullscreenNote.content.split('\n').length}줄</span>
                  </div>
                </div>
              </div>

              {/* Modal Controls */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/* Prev / Next Note navigation */}
                <div className="flex items-center gap-0.5 bg-amber-100 rounded-lg p-0.5 border border-amber-300">
                  <button
                    type="button"
                    disabled={currentFullscreenIndex <= 0}
                    onClick={handlePrevFullscreenNote}
                    className="p-1 hover:bg-amber-200 disabled:opacity-30 rounded text-gray-700 transition-colors"
                    title="이전 낙서 (← 키)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={currentFullscreenIndex >= sortedNotes.length - 1}
                    onClick={handleNextFullscreenNote}
                    className="p-1 hover:bg-amber-200 disabled:opacity-30 rounded text-gray-700 transition-colors"
                    title="다음 낙서 (→ 키)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Font Size Adjust */}
                <div className="flex items-center gap-0.5 bg-amber-100 rounded-lg p-0.5 border border-amber-300 text-[10px] font-bold text-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.playClick();
                      setFullscreenFontSize('sm');
                    }}
                    className={`px-1.5 py-0.5 rounded ${fullscreenFontSize === 'sm' ? 'bg-[#2b84cb] text-white' : 'hover:bg-amber-200'}`}
                    title="글자 작게 (12.5~13px)"
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.playClick();
                      setFullscreenFontSize('base');
                    }}
                    className={`px-1.5 py-0.5 rounded ${fullscreenFontSize === 'base' ? 'bg-[#2b84cb] text-white' : 'hover:bg-amber-200'}`}
                    title="글자 보통 (13.5~14.5px)"
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.playClick();
                      setFullscreenFontSize('lg');
                    }}
                    className={`px-1.5 py-0.5 rounded ${fullscreenFontSize === 'lg' ? 'bg-[#2b84cb] text-white' : 'hover:bg-amber-200'}`}
                    title="글자 크게 (15~16px)"
                  >
                    A+
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.playClick();
                      setFullscreenFontSize('xl');
                    }}
                    className={`px-1.5 py-0.5 rounded ${fullscreenFontSize === 'xl' ? 'bg-[#2b84cb] text-white' : 'hover:bg-amber-200'}`}
                    title="글자 아주 크게 (17~18px)"
                  >
                    A++
                  </button>
                </div>

                {/* Copy Button */}
                <button
                  type="button"
                  onClick={() => handleCopy(fullscreenNote)}
                  className="px-2.5 py-1 bg-white hover:bg-amber-50 text-gray-800 rounded-lg border border-amber-300 font-bold text-xs flex items-center gap-1 shadow-xs transition-all active:scale-95"
                  title="본문 전체 복사"
                >
                  {copiedId === fullscreenNote.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">복사됨!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">복사</span>
                    </>
                  )}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.playClick();
                    setFullscreenNote(null);
                  }}
                  className="p-1 sm:p-1.5 hover:bg-rose-100 text-gray-700 hover:text-rose-600 rounded-lg border border-amber-300 transition-colors"
                  title="닫기 (ESC)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Large, Beautiful Yellow Post-It / Notepad Paper */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#fffbeb] selection:bg-amber-200 space-y-6">
              {fullscreenNote.content.trim().length > 0 && (
                <div
                  className={`font-memo-readable whitespace-pre-wrap break-words text-gray-900 select-text ${
                    fullscreenFontSize === 'sm'
                      ? 'text-[12.5px] sm:text-[13px] leading-[1.7]'
                      : fullscreenFontSize === 'base'
                      ? 'text-[13.5px] sm:text-[14.5px] leading-[1.75]'
                      : fullscreenFontSize === 'lg'
                      ? 'text-[15px] sm:text-[16px] leading-[1.8]'
                      : 'text-[17px] sm:text-[18px] leading-[1.8]'
                  }`}
                >
                  {renderHighlightedContent(fullscreenNote.content, false)}
                </div>
              )}

              {fullscreenNote.attachments && fullscreenNote.attachments.length > 0 && (
                <div className="border-t-2 border-amber-200 pt-4 space-y-3 select-none">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-[#2b84cb]" />
                      <span>첨부 파일 ({fullscreenNote.attachments.length}개)</span>
                    </span>
                    {fullscreenNote.attachments.length >= 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadBundle(
                            fullscreenNote.id,
                            fullscreenNote.attachments || []
                          )
                        }
                        className="px-2.5 py-1 bg-[#2b84cb] hover:bg-[#10558a] text-white rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <FolderDown className="w-3.5 h-3.5" />
                        <span>묶음 전체 다운로드</span>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {fullscreenNote.attachments.map((att) => (
                      <div
                        key={att.fileId}
                        className="bg-white border border-amber-300 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {att.kind === 'image' ? (
                            <img
                              src={att.thumbnailUrl || ''}
                              alt={att.name}
                              onClick={() => {
                                const imgs = (fullscreenNote.attachments || []).filter(
                                  (a) => a.kind === 'image'
                                );
                                const idx = imgs.findIndex((i) => i.fileId === att.fileId);
                                openImageLightbox(fullscreenNote, imgs, Math.max(0, idx));
                              }}
                              className="w-12 h-12 rounded-lg object-cover border border-gray-200 cursor-pointer shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#2b84cb] flex items-center justify-center shrink-0">
                              {att.kind === 'html' ? (
                                <FileCode2 className="w-5 h-5" />
                              ) : (
                                <FileText className="w-5 h-5" />
                              )}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-memo-readable text-xs font-bold text-gray-900 truncate">
                              {att.name}
                            </div>
                            <div className="text-[10px] text-gray-500 uppercase">
                              {att.ext} · {formatFileSize(att.size)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (att.kind === 'image') {
                                const imgs = (fullscreenNote.attachments || []).filter(
                                  (a) => a.kind === 'image'
                                );
                                const idx = imgs.findIndex((i) => i.fileId === att.fileId);
                                openImageLightbox(fullscreenNote, imgs, Math.max(0, idx));
                              } else {
                                openDocumentViewer(att);
                              }
                            }}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-bold"
                          >
                            보기
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(att)}
                            className="px-2 py-1 bg-[#2b84cb] hover:bg-[#10558a] text-white rounded text-[10px] font-bold flex items-center gap-0.5"
                          >
                            <Download className="w-3 h-3" />
                            <span>받기</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-[#fef08a]/90 border-t border-[#eab308] px-4 py-2 flex items-center justify-between text-[11px] text-gray-600 select-none shrink-0">
              <div className="flex items-center gap-2">
                <span>단축키: <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-400 font-bold text-black">ESC</kbd> 닫기</span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline"><kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-400 font-bold text-black">←</kbd> / <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-400 font-bold text-black">→</kbd> 이전/다음 낙서</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  retroAudio.playClick();
                  setFullscreenNote(null);
                }}
                className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-800 rounded-lg border border-gray-300 font-bold shadow-xs active:scale-95"
              >
                창 닫기 (ESC)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Image Lightbox Gallery Modal (단일 / 묶음 사진 확대 보기 & 다운로드) */}
      {lightboxState && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxState(null)}
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-between p-3 sm:p-5 select-none animate-in fade-in duration-150"
        >
          {/* Top Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl flex items-center justify-between gap-2 text-white bg-white/10 border border-white/15 rounded-xl px-3 sm:px-4 py-2 backdrop-blur-md"
          >
            <div className="flex items-center gap-2 min-w-0">
              <ImageIcon className="w-4 h-4 text-[#fee500] shrink-0" />
              <div className="min-w-0">
                <div className="font-memo-readable font-bold text-xs sm:text-sm truncate">
                  {lightboxState.images[lightboxState.currentIndex]?.name}
                </div>
                <div className="text-[10px] text-white/70 flex items-center gap-2">
                  <span>
                    {lightboxState.currentIndex + 1} / {lightboxState.images.length}장
                  </span>
                  <span>·</span>
                  <span>
                    {formatFileSize(
                      lightboxState.images[lightboxState.currentIndex]?.size || 0
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {lightboxState.images.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadBundle(lightboxState.note.id, lightboxState.images)
                  }
                  className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 border border-white/20"
                >
                  <FolderDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">사진 전체 받기</span>
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  handleDownloadAttachment(
                    lightboxState.images[lightboxState.currentIndex]
                  )
                }
                className="px-3 py-1.5 bg-[#2b84cb] hover:bg-[#3a94db] text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>원본 다운로드</span>
              </button>
              <button
                type="button"
                onClick={() => setLightboxState(null)}
                className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors"
                title="닫기 (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Image Stage */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex-1 w-full max-w-5xl flex items-center justify-center relative my-3 min-h-0"
          >
            {lightboxState.images.length > 1 && (
              <button
                type="button"
                disabled={lightboxState.currentIndex <= 0}
                onClick={() => navigateLightbox(lightboxState.currentIndex - 1)}
                className="absolute left-1 sm:left-3 z-10 p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 disabled:opacity-25 transition-all"
                title="이전 사진 (←)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div className="relative max-w-full max-h-full flex items-center justify-center">
              {lightboxState.fullSrc && (
                <img
                  src={lightboxState.fullSrc}
                  alt={lightboxState.images[lightboxState.currentIndex]?.name}
                  className="max-w-[min(86vw,780px)] max-h-[68vh] w-auto h-auto object-contain rounded-lg shadow-2xl border border-white/10"
                />
              )}
              {lightboxState.loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                  <div className="px-3 py-1.5 bg-black/80 text-white rounded-full text-xs flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>고화질 원본 불러오는 중...</span>
                  </div>
                </div>
              )}
            </div>

            {lightboxState.images.length > 1 && (
              <button
                type="button"
                disabled={lightboxState.currentIndex >= lightboxState.images.length - 1}
                onClick={() => navigateLightbox(lightboxState.currentIndex + 1)}
                className="absolute right-1 sm:right-3 z-10 p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 disabled:opacity-25 transition-all"
                title="다음 사진 (→)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnail Strip (for bundled photos) */}
          {lightboxState.images.length > 1 ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 overflow-x-auto max-w-full px-2 py-1.5 bg-white/10 rounded-xl border border-white/15"
            >
              {lightboxState.images.map((img, i) => (
                <button
                  key={img.fileId}
                  type="button"
                  onClick={() => navigateLightbox(i)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                    i === lightboxState.currentIndex
                      ? 'border-[#fee500] scale-105'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.thumbnailUrl || ''}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-white/60">ESC 키를 누르면 닫힙니다</div>
          )}
        </div>
      )}

      {/* 7. HTML / TXT File Reader & Preview Modal */}
      {fileViewerState && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-4xl h-full max-h-[92vh] bg-white border-3 border-[#2b84cb] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-[#f0f4f8] border-b-2 border-[#b8c6d4] px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 shrink-0 select-none">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    fileViewerState.attachment.kind === 'html'
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {fileViewerState.attachment.kind === 'html' ? (
                    <FileCode2 className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-memo-readable font-bold text-xs sm:text-sm text-gray-900 truncate">
                    {fileViewerState.attachment.name}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase">
                    {fileViewerState.attachment.ext} ·{' '}
                    {formatFileSize(fileViewerState.attachment.size)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {fileViewerState.attachment.kind === 'html' && (
                  <div className="flex items-center bg-white border border-gray-300 rounded-lg p-0.5 text-[10px] sm:text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        setFileViewerState((prev) =>
                          prev ? { ...prev, htmlMode: 'preview' } : prev
                        )
                      }
                      className={`px-2 py-0.5 rounded font-bold transition-colors ${
                        fileViewerState.htmlMode === 'preview'
                          ? 'bg-[#2b84cb] text-white'
                          : 'text-gray-600 hover:text-black'
                      }`}
                    >
                      화면 미리보기
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFileViewerState((prev) =>
                          prev ? { ...prev, htmlMode: 'source' } : prev
                        )
                      }
                      className={`px-2 py-0.5 rounded font-bold transition-colors ${
                        fileViewerState.htmlMode === 'source'
                          ? 'bg-[#2b84cb] text-white'
                          : 'text-gray-600 hover:text-black'
                      }`}
                    >
                      HTML 소스
                    </button>
                  </div>
                )}

                {fileViewerState.file?.textContent && (
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.playClick();
                      navigator.clipboard.writeText(
                        fileViewerState.file?.textContent || ''
                      );
                      setFileViewerState((prev) =>
                        prev ? { ...prev, copied: true } : prev
                      );
                      setTimeout(() => {
                        setFileViewerState((prev) =>
                          prev ? { ...prev, copied: false } : prev
                        );
                      }, 1800);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-lg text-[11px] font-bold flex items-center gap-1"
                  >
                    {fileViewerState.copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">복사</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDownloadAttachment(fileViewerState.attachment)}
                  className="px-2.5 py-1 bg-[#2b84cb] hover:bg-[#10558a] text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>다운로드</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFileViewerState(null)}
                  className="p-1 hover:bg-rose-100 text-gray-600 hover:text-rose-600 rounded-lg border border-gray-300"
                  title="닫기 (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto min-h-0 bg-white">
              {fileViewerState.loading ? (
                <div className="h-full flex items-center justify-center text-gray-500 gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-[#2b84cb]" />
                  <span>파일 내용을 불러오는 중입니다...</span>
                </div>
              ) : !fileViewerState.file?.textContent ? (
                <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                  파일 내용을 표시할 수 없습니다.
                </div>
              ) : fileViewerState.attachment.kind === 'html' &&
                fileViewerState.htmlMode === 'preview' ? (
                <iframe
                  title={fileViewerState.attachment.name}
                  sandbox=""
                  srcDoc={fileViewerState.file.textContent}
                  className="w-full h-full border-0 bg-white"
                />
              ) : (
                <pre className="p-4 sm:p-6 font-memo-readable text-[13px] leading-[1.7] text-gray-900 whitespace-pre-wrap break-words select-text">
                  {fileViewerState.file.textContent}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
