import { useMemo, useRef, useState } from 'react';
import Toolbar from './components/Toolbar.jsx';
import Editor from './components/Editor.jsx';
import StatsBar from './components/StatsBar.jsx';
import Toast from './components/Toast.jsx';
import Translator from './components/Translator.jsx';
import CodeEditor from './components/CodeEditor.jsx';

const INITIAL_CONTENT =
  '<p>Kiddoo...... Start writing here. Select text to format it, or use the toolbar to shape your notes.</p>';

const INITIAL_CODE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f7f7f8;
        color: #111827;
        font-family: Arial, sans-serif;
      }

      .card {
        width: min(520px, calc(100% - 32px));
        padding: 32px;
        border: 1px solid #e5e7eb;
        border-radius: 18px;
        background: #ffffff;
        box-shadow: 0 16px 36px rgba(17, 24, 39, 0.1);
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Hello from HTML preview</h1>
      <p>Edit this HTML and export the rendered preview as an image or PDF.</p>
    </main>
  </body>
</html>`;

const getPlainText = (element) => element?.innerText || '';

const getClipboardHtml = (element) => {
  const html = element?.innerHTML || '';

  return `<!doctype html><html><body>${html}</body></html>`;
};

const textToHtml = (text) =>
  text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`)
    .join('');

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const downloadTextFile = (text, filename, type = 'text/plain;charset=utf-8') => {
  downloadBlob(new Blob([text], { type }), filename);
};

const downloadTextPdf = async (text, filename) => {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 36;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const lineHeight = 13;
  let y = margin;

  pdf.setFont('courier', 'normal');
  pdf.setFontSize(9);

  text.split('\n').forEach((line) => {
    const wrappedLines = pdf.splitTextToSize(line || ' ', pageWidth - margin * 2);

    wrappedLines.forEach((wrappedLine) => {
      if (y > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }

      pdf.text(wrappedLine, margin, y);
      y += lineHeight;
    });
  });

  pdf.save(filename);
};

const downloadImagePdf = async (canvas, filename) => {
  const { jsPDF } = await import('jspdf');
  const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const scale = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
  const imageWidth = canvas.width * scale;
  const imageHeight = canvas.height * scale;
  const x = (pageWidth - imageWidth) / 2;
  const y = (pageHeight - imageHeight) / 2;

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, imageWidth, imageHeight);
  pdf.save(filename);
};

const getCodeExtension = (language) => {
  const extensions = {
    html: 'html',
    css: 'css',
    javascript: 'js',
    text: 'txt'
  };

  return extensions[language] || 'txt';
};

const splitTextForTranslation = (text, maxLength = 1400) => {
  const chunks = [];
  let currentChunk = '';

  text.split(/(\n+)/).forEach((part) => {
    if ((currentChunk + part).length > maxLength && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = part;
      return;
    }

    currentChunk += part;
  });

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
};

const translateWithGoogle = async (text, sourceLanguage, targetLanguage) => {
  const source = sourceLanguage === 'auto' ? 'auto' : sourceLanguage;
  const translatedChunks = await Promise.all(
    splitTextForTranslation(text).map(async (chunk) => {
      const params = new URLSearchParams({
        client: 'gtx',
        sl: source,
        tl: targetLanguage,
        dt: 't',
        q: chunk
      });
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Google translation failed');
      }

      const data = await response.json();
      return data?.[0]?.map((segment) => segment?.[0] || '').join('') || '';
    })
  );

  return translatedChunks.join('');
};

const translateWithMyMemory = async (text, sourceLanguage, targetLanguage) => {
  const source = sourceLanguage === 'auto' ? 'en' : sourceLanguage;
  const params = new URLSearchParams({
    q: text.slice(0, 4500),
    langpair: `${source}|${targetLanguage}`
  });
  const response = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`);

  if (!response.ok) {
    throw new Error('MyMemory translation failed');
  }

  const data = await response.json();
  return data?.responseData?.translatedText || '';
};

const translateText = async (text, sourceLanguage, targetLanguage) => {
  try {
    return await translateWithGoogle(text, sourceLanguage, targetLanguage);
  } catch {
    return translateWithMyMemory(text, sourceLanguage, targetLanguage);
  }
};

const getStats = (text) => {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const characters = text.length;
  const readingTime = Math.max(1, Math.ceil(words / 200));

  return { words, characters, readingTime };
};

function App() {
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const [content, setContent] = useState(INITIAL_CONTENT);
  const [plainText, setPlainText] = useState('Start writing here. Select text to format it, or use the toolbar to shape your notes.');
  const [toast, setToast] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const [mode, setMode] = useState('editor');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('hi');
  const [translatorText, setTranslatorText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [code, setCode] = useState(INITIAL_CODE);
  const [codeLanguage, setCodeLanguage] = useState('html');

  const stats = useMemo(() => getStats(plainText), [plainText]);

  const showToast = (message) => {
    setToast(message);
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const syncEditorState = () => {
    const editor = editorRef.current;
    if (!editor) return;

    setContent(editor.innerHTML);
    setPlainText(getPlainText(editor));
  };

  const runCommand = (command, value = null) => {
    if (mode !== 'editor') return;

    focusEditor();
    document.execCommand(command, false, value);
    syncEditorState();
  };

  const handleHeading = () => runCommand('formatBlock', 'h2');
  const handleParagraph = () => runCommand('formatBlock', 'p');

  const handleCopy = async () => {
    if (mode === 'code') {
      try {
        await navigator.clipboard.writeText(code);
        showToast('Code copied');
      } catch {
        showToast('Copy is blocked by your browser');
      }

      return;
    }

    if (mode === 'translator') {
      const text = translatedText.trim() ? translatedText : translatorText;

      if (!text.trim()) {
        showToast('No translator text to copy');
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        showToast(translatedText.trim() ? 'Translation copied' : 'Translator text copied');
      } catch {
        showToast('Copy is blocked by your browser');
      }

      return;
    }

    const editor = editorRef.current;
    const text = getPlainText(editor);
    const html = getClipboardHtml(editor);

    try {
      if (window.ClipboardItem && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' })
          })
        ]);
        showToast('Formatted text copied');
        return;
      }

      await navigator.clipboard.writeText(text);
      showToast('Text copied without formatting');
    } catch {
      focusEditor();
      const selection = window.getSelection();
      const previousRanges = [];

      for (let index = 0; index < selection.rangeCount; index += 1) {
        previousRanges.push(selection.getRangeAt(index).cloneRange());
      }

      const range = document.createRange();
      range.selectNodeContents(editor);
      selection.removeAllRanges();
      selection.addRange(range);

      const copied = document.execCommand('copy');

      selection.removeAllRanges();
      previousRanges.forEach((previousRange) => selection.addRange(previousRange));

      showToast(copied ? 'Formatted text copied' : 'Copy is blocked by your browser');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();

      if (mode === 'translator') {
        setTranslatorText((currentText) => `${currentText}${currentText ? '\n' : ''}${text}`);
        showToast('Text pasted into translator');
        return;
      }

      if (mode === 'code') {
        setCode((currentCode) => `${currentCode}${currentCode ? '\n' : ''}${text}`);
        showToast('Text pasted into code editor');
        return;
      }

      focusEditor();
      document.execCommand('insertText', false, text);
      syncEditorState();
      showToast('Text pasted');
    } catch {
      focusEditor();
      showToast('Paste with Ctrl + V');
    }
  };

  const handleClear = () => {
    if (mode === 'code') {
      setCode('');
      showToast('Code editor cleared');
      return;
    }

    if (mode === 'translator') {
      setTranslatorText('');
      setTranslatedText('');
      showToast('Translator cleared');
      return;
    }

    focusEditor();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertHTML', false, '<p><br></p>');
    syncEditorState();
    showToast('Editor cleared');
  };

  const handleDownload = () => {
    if (mode === 'code') {
      handleDownloadCode();
      return;
    }

    const text = mode === 'translator'
      ? translatedText || translatorText
      : getPlainText(editorRef.current);

    if (!text.trim()) {
      showToast('Nothing to download');
      return;
    }

    downloadTextFile(text, mode === 'translator' ? 'translated-text.txt' : 'simple-text-editor.txt');
    showToast('Text downloaded');
  };

  const handleToggleTranslator = () => {
    const nextMode = mode === 'translator' ? 'editor' : 'translator';

    if (nextMode === 'translator' && !translatorText.trim()) {
      setTranslatorText(getPlainText(editorRef.current));
    }

    setMode(nextMode);
  };

  const handleToggleCode = () => {
    setMode((currentMode) => (currentMode === 'code' ? 'editor' : 'code'));
  };

  const handleUseEditorText = () => {
    setTranslatorText(getPlainText(editorRef.current));
    showToast('Editor text loaded');
  };

  const handleTranslate = async () => {
    const text = translatorText.trim();

    if (!text) {
      showToast('Add text to translate');
      return;
    }

    if (sourceLanguage === targetLanguage) {
      setTranslatedText(translatorText);
      showToast('Source and target languages match');
      return;
    }

    setIsTranslating(true);

    try {
      const result = await translateText(translatorText, sourceLanguage, targetLanguage);
      setTranslatedText(result);
      showToast('Text translated');
    } catch {
      showToast('Translation service is unavailable');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopyTranslation = async () => {
    if (!translatedText.trim()) {
      showToast('No translation to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(translatedText);
      showToast('Translation copied');
    } catch {
      showToast('Copy is blocked by your browser');
    }
  };

  const handleInsertTranslation = () => {
    if (!translatedText.trim()) {
      showToast('No translation to insert');
      return;
    }

    const html = textToHtml(translatedText);
    setContent(html);
    setPlainText(translatedText);
    setMode('editor');
    window.requestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
      }
    });
    showToast('Translation inserted');
  };

  const createPreviewCanvas = () =>
    new Promise((resolve, reject) => {
      if (codeLanguage !== 'html') {
        reject(new Error('Preview export is available for HTML only'));
        return;
      }

      const iframe = previewRef.current;
      const previewDocument = iframe?.contentDocument;
      const previewBody = previewDocument?.body;
      const previewRoot = previewDocument?.documentElement;

      if (!previewBody || !previewRoot) {
        reject(new Error('Preview is not ready'));
        return;
      }

      const capture = async () => {
        const width = Math.max(previewRoot.scrollWidth, previewBody.scrollWidth, iframe.clientWidth, 900);
        const height = Math.max(previewRoot.scrollHeight, previewBody.scrollHeight, iframe.clientHeight, 560);

        try {
          const { default: html2canvas } = await import('html2canvas');
          const canvas = await html2canvas(previewBody, {
            backgroundColor: '#ffffff',
            width,
            height,
            windowWidth: width,
            windowHeight: height,
            scrollX: 0,
            scrollY: 0,
            scale: Math.min(2, window.devicePixelRatio || 1),
            useCORS: true
          });

          resolve(canvas);
        } catch (error) {
          reject(error);
        }
      };

      if (previewDocument.readyState === 'complete') {
        window.requestAnimationFrame(capture);
      } else {
        iframe.addEventListener('load', () => window.requestAnimationFrame(capture), { once: true });
      }
    });

  const handleDownloadCode = () => {
    if (!code.trim()) {
      showToast('No code to download');
      return;
    }

    const extension = getCodeExtension(codeLanguage);
    downloadTextFile(code, `code-output.${extension}`, 'text/plain;charset=utf-8');
    showToast('Code downloaded');
  };

  const handleDownloadCodePdf = async () => {
    if (!code.trim()) {
      showToast('No code to export');
      return;
    }

    await downloadTextPdf(code, 'code-output.pdf');
    showToast('Code PDF downloaded');
  };

  const handleDownloadPreviewImage = async () => {
    try {
      const canvas = await createPreviewCanvas();
      canvas.toBlob((blob) => {
        if (!blob) {
          showToast('Preview image failed');
          return;
        }

        downloadBlob(blob, 'preview-output.png');
        showToast('Preview image downloaded');
      }, 'image/png');
    } catch {
      showToast('Preview image works for basic HTML');
    }
  };

  const handleDownloadPreviewPdf = async () => {
    try {
      const canvas = await createPreviewCanvas();
      await downloadImagePdf(canvas, 'preview-output.pdf');
      showToast('Preview PDF downloaded');
    } catch {
      showToast('Preview PDF works for basic HTML');
    }
  };

  const findMatches = () => {
    const text = getPlainText(editorRef.current).toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const matches = [];
    let position = text.indexOf(query);

    while (position !== -1) {
      matches.push(position);
      position = text.indexOf(query, position + query.length);
    }

    return matches;
  };

  const selectTextRange = (start, length) => {
    const editor = editorRef.current;
    if (!editor) return;

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let currentOffset = 0;
    let startNode = null;
    let startOffset = 0;
    let endNode = null;
    let endOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const nextOffset = currentOffset + node.textContent.length;

      if (!startNode && start >= currentOffset && start <= nextOffset) {
        startNode = node;
        startOffset = start - currentOffset;
      }

      if (startNode && start + length >= currentOffset && start + length <= nextOffset) {
        endNode = node;
        endOffset = start + length - currentOffset;
        break;
      }

      currentOffset = nextOffset;
    }

    if (!startNode || !endNode) return;

    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    editor.focus();
    range.startContainer.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const handleFind = () => {
    const matches = findMatches();
    if (!searchQuery.trim()) {
      showToast('Enter text to find');
      return;
    }

    if (!matches.length) {
      showToast('No matches found');
      setSearchIndex(0);
      return;
    }

    const nextIndex = searchIndex % matches.length;
    selectTextRange(matches[nextIndex], searchQuery.trim().length);
    setSearchIndex(nextIndex + 1);
    showToast(`Match ${nextIndex + 1} of ${matches.length}`);
  };

  const handleEditorInput = () => {
    syncEditorState();
  };

  const handleShortcut = (event) => {
    if (!event.ctrlKey && !event.metaKey) return;

    const key = event.key.toLowerCase();
    const shortcuts = {
      b: () => runCommand('bold'),
      i: () => runCommand('italic'),
      u: () => runCommand('underline'),
      z: () => runCommand('undo'),
      y: () => runCommand('redo')
    };

    if (shortcuts[key]) {
      event.preventDefault();
      shortcuts[key]();
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>Simple Text Editor</h1>
          <p>Write, format, copy, paste, and download your text easily.</p>
        </div>
      </header>

      <section className="editor-card" aria-label="Text editor">
        <Toolbar
          onCommand={runCommand}
          onHeading={handleHeading}
          onParagraph={handleParagraph}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onClear={handleClear}
          onDownload={handleDownload}
          onToggleTranslator={handleToggleTranslator}
          onToggleCode={handleToggleCode}
          isTranslatorMode={mode === 'translator'}
          isCodeMode={mode === 'code'}
          searchQuery={searchQuery}
          onSearchQueryChange={(value) => {
            setSearchQuery(value);
            setSearchIndex(0);
          }}
          onFind={handleFind}
        />

        {mode === 'editor' ? (
          <Editor
            ref={editorRef}
            content={content}
            onInput={handleEditorInput}
            onKeyDown={handleShortcut}
          />
        ) : mode === 'translator' ? (
          <Translator
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            sourceText={translatorText}
            translatedText={translatedText}
            isTranslating={isTranslating}
            onSourceLanguageChange={setSourceLanguage}
            onTargetLanguageChange={setTargetLanguage}
            onSourceTextChange={setTranslatorText}
            onTranslate={handleTranslate}
            onUseEditorText={handleUseEditorText}
            onCopyTranslation={handleCopyTranslation}
            onInsertTranslation={handleInsertTranslation}
          />
        ) : (
          <CodeEditor
            previewRef={previewRef}
            code={code}
            language={codeLanguage}
            onCodeChange={setCode}
            onLanguageChange={setCodeLanguage}
            onDownloadCode={handleDownloadCode}
            onDownloadCodePdf={handleDownloadCodePdf}
            onDownloadPreviewImage={handleDownloadPreviewImage}
            onDownloadPreviewPdf={handleDownloadPreviewPdf}
          />
        )}

        <StatsBar stats={stats} />
      </section>

      <Toast message={toast} onClose={() => setToast('')} />
    </main>
  );
}

export default App;
