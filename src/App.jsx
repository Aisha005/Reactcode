import { useMemo, useRef, useState } from 'react';
import Toolbar from './components/Toolbar.jsx';
import Editor from './components/Editor.jsx';
import StatsBar from './components/StatsBar.jsx';
import Toast from './components/Toast.jsx';
import Translator from './components/Translator.jsx';

const INITIAL_CONTENT =
  '<p>Kiddoo...... Start writing here. Select text to format it, or use the toolbar to shape your notes.</p>';

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
    focusEditor();
    document.execCommand(command, false, value);
    syncEditorState();
  };

  const handleHeading = () => runCommand('formatBlock', 'h2');
  const handleParagraph = () => runCommand('formatBlock', 'p');

  const handleCopy = async () => {
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
    const text = mode === 'translator'
      ? translatedText || translatorText
      : getPlainText(editorRef.current);

    if (!text.trim()) {
      showToast('Nothing to download');
      return;
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = mode === 'translator' ? 'translated-text.txt' : 'simple-text-editor.txt';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Text downloaded');
  };

  const handleToggleTranslator = () => {
    const nextMode = mode === 'editor' ? 'translator' : 'editor';

    if (nextMode === 'translator' && !translatorText.trim()) {
      setTranslatorText(getPlainText(editorRef.current));
    }

    setMode(nextMode);
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
          isTranslatorMode={mode === 'translator'}
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
        ) : (
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
        )}

        <StatsBar stats={stats} />
      </section>

      <Toast message={toast} onClose={() => setToast('')} />
    </main>
  );
}

export default App;
