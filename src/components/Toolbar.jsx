const Icon = ({ children }) => (
  <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

const icons = {
  bold: (
    <Icon>
      <path d="M7 5h6.2a4.2 4.2 0 0 1 0 8.4H7z" />
      <path d="M7 13.4h7.1a4.3 4.3 0 0 1 0 8.6H7z" />
    </Icon>
  ),
  italic: (
    <Icon>
      <path d="M11 5h8" />
      <path d="M5 19h8" />
      <path d="M15 5 9 19" />
    </Icon>
  ),
  underline: (
    <Icon>
      <path d="M7 5v6a5 5 0 0 0 10 0V5" />
      <path d="M5 21h14" />
    </Icon>
  ),
  strike: (
    <Icon>
      <path d="M5 12h14" />
      <path d="M17 6.5A5.5 5.5 0 0 0 12.5 5H11a4 4 0 0 0-2.5 7.1" />
      <path d="M7 17.5A5.6 5.6 0 0 0 11.5 19H13a4 4 0 0 0 2.5-7.1" />
    </Icon>
  ),
  heading: (
    <Icon>
      <path d="M5 19V5" />
      <path d="M19 19V5" />
      <path d="M5 12h14" />
    </Icon>
  ),
  paragraph: (
    <Icon>
      <path d="M13 19V5" />
      <path d="M17 19V5" />
      <path d="M17 5H9.5a4.5 4.5 0 0 0 0 9H13" />
    </Icon>
  ),
  bulletList: (
    <Icon>
      <path d="M9 7h11" />
      <path d="M9 12h11" />
      <path d="M9 17h11" />
      <path d="M4 7h.01" />
      <path d="M4 12h.01" />
      <path d="M4 17h.01" />
    </Icon>
  ),
  orderedList: (
    <Icon>
      <path d="M10 7h10" />
      <path d="M10 12h10" />
      <path d="M10 17h10" />
      <path d="M4 6h1v3" />
      <path d="M4 9h2" />
      <path d="M4 12h2l-2 3h2" />
      <path d="M4 18h2" />
    </Icon>
  ),
  alignLeft: (
    <Icon>
      <path d="M4 6h16" />
      <path d="M4 10h10" />
      <path d="M4 14h16" />
      <path d="M4 18h10" />
    </Icon>
  ),
  alignCenter: (
    <Icon>
      <path d="M4 6h16" />
      <path d="M7 10h10" />
      <path d="M4 14h16" />
      <path d="M7 18h10" />
    </Icon>
  ),
  alignRight: (
    <Icon>
      <path d="M4 6h16" />
      <path d="M10 10h10" />
      <path d="M4 14h16" />
      <path d="M10 18h10" />
    </Icon>
  ),
  undo: (
    <Icon>
      <path d="M9 7 5 11l4 4" />
      <path d="M5 11h9a5 5 0 0 1 0 10h-1" />
    </Icon>
  ),
  redo: (
    <Icon>
      <path d="m15 7 4 4-4 4" />
      <path d="M19 11h-9a5 5 0 0 0 0 10h1" />
    </Icon>
  ),
  copy: (
    <Icon>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Icon>
  ),
  paste: (
    <Icon>
      <path d="M9 5h6" />
      <path d="M9 3h6v4H9z" />
      <path d="M7 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    </Icon>
  ),
  download: (
    <Icon>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </Icon>
  ),
  trash: (
    <Icon>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </Icon>
  ),
  translate: (
    <Icon>
      <path d="M4 5h7" />
      <path d="M8 3v2" />
      <path d="M5 9c1.3 3 3.7 5.1 7 6" />
      <path d="M12 5c-.8 4.6-3.3 8-8 10" />
      <path d="M13 21l4-10 4 10" />
      <path d="M15 17h4" />
    </Icon>
  ),
  search: (
    <Icon>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </Icon>
  )
};

function IconButton({ className = 'tool-button', title, onClick, children }) {
  return (
    <button
      className={className}
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Toolbar({
  onCommand,
  onHeading,
  onParagraph,
  onCopy,
  onPaste,
  onClear,
  onDownload,
  onToggleTranslator,
  isTranslatorMode,
  searchQuery,
  onSearchQueryChange,
  onFind
}) {
  const formatButtons = [
    { icon: icons.bold, title: 'Bold', action: () => onCommand('bold') },
    { icon: icons.italic, title: 'Italic', action: () => onCommand('italic') },
    { icon: icons.underline, title: 'Underline', action: () => onCommand('underline') },
    { icon: icons.strike, title: 'Strikethrough', action: () => onCommand('strikeThrough') },
    { icon: icons.heading, title: 'Heading', action: onHeading },
    { icon: icons.paragraph, title: 'Paragraph', action: onParagraph }
  ];

  const structureButtons = [
    { icon: icons.bulletList, title: 'Bullet list', action: () => onCommand('insertUnorderedList') },
    { icon: icons.orderedList, title: 'Numbered list', action: () => onCommand('insertOrderedList') },
    { icon: icons.alignLeft, title: 'Align left', action: () => onCommand('justifyLeft') },
    { icon: icons.alignCenter, title: 'Align center', action: () => onCommand('justifyCenter') },
    { icon: icons.alignRight, title: 'Align right', action: () => onCommand('justifyRight') },
    { icon: icons.undo, title: 'Undo', action: () => onCommand('undo') },
    { icon: icons.redo, title: 'Redo', action: () => onCommand('redo') }
  ];

  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <div className="toolbar-section" aria-label="Formatting controls">
          {formatButtons.map((button) => (
            <IconButton key={button.title} title={button.title} onClick={button.action}>
              {button.icon}
            </IconButton>
          ))}
        </div>

        <div className="toolbar-section" aria-label="Layout controls">
          {structureButtons.map((button) => (
            <IconButton key={button.title} title={button.title} onClick={button.action}>
              {button.icon}
            </IconButton>
          ))}
        </div>
      </div>

      <div className="toolbar-row toolbar-row-secondary">
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
          <IconButton title="Find text" onClick={onFind}>
            {icons.search}
          </IconButton>
        </div>

        <div className="toolbar-actions" aria-label="Editor actions">
          <IconButton
            className={`action-button ${isTranslatorMode ? 'active-action' : ''}`}
            title={isTranslatorMode ? 'Switch to editor' : 'Switch to translator'}
            onClick={onToggleTranslator}
          >
            {icons.translate}
          </IconButton>
          <IconButton className="action-button" title="Copy text" onClick={onCopy}>
            {icons.copy}
          </IconButton>
          <IconButton className="action-button" title="Paste text" onClick={onPaste}>
            {icons.paste}
          </IconButton>
          <IconButton className="action-button primary-action" title="Download text" onClick={onDownload}>
            {icons.download}
          </IconButton>
          <IconButton className="action-button danger-action" title="Clear editor" onClick={onClear}>
            {icons.trash}
          </IconButton>
        </div>
      </div>
    </div>
  );
}

export default Toolbar;
