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

const escapePdfText = (text) => text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

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

const binaryStringToBlob = (content, type) => {
  const bytes = new Uint8Array(content.length);

  for (let index = 0; index < content.length; index += 1) {
    bytes[index] = content.charCodeAt(index) & 0xff;
  }

  return new Blob([bytes], { type });
};

const buildPdf = (objects) => {
  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return binaryStringToBlob(pdf, 'application/pdf');
};

const downloadTextPdf = (text, filename) => {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 36;
  const lineHeight = 13;
  const maxChars = 86;
  const maxLines = Math.floor((pageHeight - margin * 2) / lineHeight);
  const lines = text.split('\n').flatMap((line) => {
    if (!line) return [''];
    const wrapped = [];

    for (let index = 0; index < line.length; index += maxChars) {
      wrapped.push(line.slice(index, index + maxChars));
    }

    return wrapped;
  });
  const pages = [];

  for (let index = 0; index < lines.length; index += maxLines) {
    pages.push(lines.slice(index, index + maxLines));
  }

  const objects = [];
  const pageRefs = pages.map((_, index) => `${4 + index * 2} 0 R`).join(' ');
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(`<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');

  pages.forEach((pageLines, index) => {
    const pageObjectNumber = 4 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    const stream = `BT /F1 10 Tf ${margin} ${pageHeight - margin} Td ${lineHeight} TL ${pageLines
      .map((line) => `(${escapePdfText(line)}) Tj T*`)
      .join(' ')} ET`;

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  downloadBlob(buildPdf(objects), filename);
};

const downloadImagePdf = (canvas, filename) => {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 32;
  const scale = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
  const imageWidth = canvas.width * scale;
  const imageHeight = canvas.height * scale;
  const x = (pageWidth - imageWidth) / 2;
  const y = (pageHeight - imageHeight) / 2;
  const jpegBinary = atob(canvas.toDataURL('image/jpeg', 0.94).split(',')[1]);
  const content = `q ${imageWidth.toFixed(2)} 0 0 ${imageHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im1 Do Q`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>`,
    `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBinary.length} >>\nstream\n${jpegBinary}\nendstream`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ];

  downloadBlob(buildPdf(objects), filename);
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

const createNativeTranslator = async (sourceLanguage, targetLanguage) => {
  if (window.Translator?.create) {
    return window.Translator.create({ sourceLanguage, targetLanguage });
  }

  if (window.ai?.translator?.create) {
    return window.ai.translator.create({ sourceLanguage, targetLanguage });
  }

  if (window.translation?.createTranslator) {
    return window.translation.createTranslator({ sourceLanguage, targetLanguage });
  }

  return null;
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
  const [sourceLanguage, setSourceLanguage] = useState('en');
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
      const translator = await createNativeTranslator(sourceLanguage, targetLanguage);

      if (!translator?.translate) {
        showToast('Browser translation is not available');
        return;
      }

      const result = await translator.translate(translatorText);
      setTranslatedText(result);
      showToast('Text translated');
    } catch {
      showToast('Translation is not available in this browser');
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
      const width = Math.max(800, iframe?.clientWidth || 800);
      const height = Math.max(520, iframe?.clientHeight || 520);
      const previewDocument = iframe?.contentDocument;
      const styleTags = Array.from(previewDocument?.head?.querySelectorAll('style') || [])
        .map((style) => style.outerHTML)
        .join('');
      const bodyHtml = previewDocument?.body?.innerHTML || code;
      const bodyStyle = previewDocument?.body?.getAttribute('style') || '';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <html xmlns="http://www.w3.org/1999/xhtml">
            <head>${styleTags}</head>
            <body style="width:${width}px;height:${height}px;margin:0;background:#ffffff;${bodyStyle}">
              ${bodyHtml}
            </body>
          </html>
        </foreignObject>
      </svg>`;
      const image = new Image();
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      canvas.width = width;
      canvas.height = height;
      image.onload = () => {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0);
        URL.revokeObjectURL(image.src);
        resolve(canvas);
      };
      image.onerror = () => {
        URL.revokeObjectURL(image.src);
        reject(new Error('Preview capture failed'));
      };
      image.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
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

  const handleDownloadCodePdf = () => {
    if (!code.trim()) {
      showToast('No code to export');
      return;
    }

    downloadTextPdf(code, 'code-output.pdf');
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
      downloadImagePdf(canvas, 'preview-output.pdf');
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
