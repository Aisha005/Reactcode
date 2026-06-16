import { useMemo, useRef, useState } from 'react';
import Toolbar from './components/Toolbar.jsx';
import Editor from './components/Editor.jsx';
import StatsBar from './components/StatsBar.jsx';
import Toast from './components/Toast.jsx';

const INITIAL_CONTENT =
  '<p>Kiddoo...... Start writing here. Select text to format it, or use the toolbar to shape your notes.</p>';

const getPlainText = (element) => element?.innerText || '';

const getClipboardHtml = (element) => {
  const html = element?.innerHTML || '';

  return `<!doctype html><html><body>${html}</body></html>`;
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
    focusEditor();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertHTML', false, '<p><br></p>');
    syncEditorState();
    showToast('Editor cleared');
  };

  const handleDownload = () => {
    const text = getPlainText(editorRef.current);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'simple-text-editor.txt';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Text downloaded');
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
          searchQuery={searchQuery}
          onSearchQueryChange={(value) => {
            setSearchQuery(value);
            setSearchIndex(0);
          }}
          onFind={handleFind}
        />

        <Editor
          ref={editorRef}
          content={content}
          onInput={handleEditorInput}
          onKeyDown={handleShortcut}
        />

        <StatsBar stats={stats} />
      </section>

      <Toast message={toast} onClose={() => setToast('')} />
    </main>
  );
}

export default App;
