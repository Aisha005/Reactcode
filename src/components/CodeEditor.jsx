const LANGUAGE_OPTIONS = [
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'text', label: 'Plain text' }
];

function CodeEditor({
  previewRef,
  code,
  language,
  onCodeChange,
  onLanguageChange,
  onDownloadCode,
  onDownloadCodePdf,
  onDownloadPreviewImage,
  onDownloadPreviewPdf
}) {
  return (
    <section className="code-panel" aria-label="Code editor">
      <div className="code-header">
        <div>
          <h2>Code Editor</h2>
          <p>Write code, preview HTML, and export both the source and rendered output.</p>
        </div>

        <label className="code-language">
          <span>Format</span>
          <select value={language} onChange={(event) => onLanguageChange(event.target.value)}>
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="code-grid">
        <label className="code-box">
          <span>Source code</span>
          <textarea
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
            spellCheck="false"
            placeholder="Write HTML, CSS, JavaScript, or plain text here."
          />
        </label>

        <div className="preview-box">
          <span>Preview</span>
          {language === 'html' ? (
            <iframe ref={previewRef} title="HTML preview" srcDoc={code} sandbox="allow-same-origin" />
          ) : (
            <div className="preview-placeholder">
              HTML preview is available when the format is set to HTML.
            </div>
          )}
        </div>
      </div>

      <div className="code-actions">
        <button className="secondary-text-button" type="button" onClick={onDownloadCode}>
          Download code
        </button>
        <button className="secondary-text-button" type="button" onClick={onDownloadCodePdf}>
          Code PDF
        </button>
        <button className="secondary-text-button" type="button" onClick={onDownloadPreviewImage}>
          Preview image
        </button>
        <button className="primary-text-button" type="button" onClick={onDownloadPreviewPdf}>
          Preview PDF
        </button>
      </div>
    </section>
  );
}

export default CodeEditor;
