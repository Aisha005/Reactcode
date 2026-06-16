function Toolbar({
  onCommand,
  onHeading,
  onParagraph,
  onCopy,
  onPaste,
  onClear,
  onDownload,
  searchQuery,
  onSearchQueryChange,
  onFind
}) {
  const formatButtons = [
    { label: 'B', title: 'Bold', action: () => onCommand('bold') },
    { label: 'I', title: 'Italic', action: () => onCommand('italic') },
    { label: 'U', title: 'Underline', action: () => onCommand('underline') },
    { label: 'S', title: 'Strikethrough', action: () => onCommand('strikeThrough') },
    { label: 'H', title: 'Heading', action: onHeading },
    { label: 'P', title: 'Paragraph', action: onParagraph }
  ];

  const structureButtons = [
    { label: '• List', title: 'Bullet list', action: () => onCommand('insertUnorderedList') },
    { label: '1. List', title: 'Numbered list', action: () => onCommand('insertOrderedList') },
    { label: 'Left', title: 'Align left', action: () => onCommand('justifyLeft') },
    { label: 'Center', title: 'Align center', action: () => onCommand('justifyCenter') },
    { label: 'Right', title: 'Align right', action: () => onCommand('justifyRight') },
    { label: 'Undo', title: 'Undo', action: () => onCommand('undo') },
    { label: 'Redo', title: 'Redo', action: () => onCommand('redo') }
  ];

  return (
    <div className="toolbar">
      <div className="toolbar-section" aria-label="Formatting controls">
        {formatButtons.map((button) => (
          <button
            className="tool-button compact-button"
            key={button.title}
            type="button"
            title={button.title}
            aria-label={button.title}
            onMouseDown={(event) => event.preventDefault()}
            onClick={button.action}
          >
            {button.label}
          </button>
        ))}
      </div>

      <div className="toolbar-section" aria-label="Layout controls">
        {structureButtons.map((button) => (
          <button
            className="tool-button"
            key={button.title}
            type="button"
            title={button.title}
            aria-label={button.title}
            onMouseDown={(event) => event.preventDefault()}
            onClick={button.action}
          >
            {button.label}
          </button>
        ))}
      </div>

      <div className="search-box">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onFind();
          }}
          placeholder="Find text"
          aria-label="Find text"
        />
        <button className="tool-button" type="button" onClick={onFind}>
          Find
        </button>
      </div>

      <div className="toolbar-actions" aria-label="Editor actions">
        <button className="secondary-action" type="button" onClick={onCopy}>
          Copy
        </button>
        <button className="secondary-action" type="button" onClick={onPaste}>
          Paste
        </button>
        <button className="primary-action" type="button" onClick={onDownload}>
          Download
        </button>
        <button className="danger-action" type="button" onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  );
}

export default Toolbar;
