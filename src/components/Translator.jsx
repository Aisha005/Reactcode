const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'mr', label: 'Marathi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'or', label: 'Odia' },
  { code: 'as', label: 'Assamese' },
  { code: 'ur', label: 'Urdu' },
  { code: 'sa', label: 'Sanskrit' },
  { code: 'ne', label: 'Nepali' },
  { code: 'gom', label: 'Konkani' },
  { code: 'mai', label: 'Maithili' },
  { code: 'bho', label: 'Bhojpuri' },
  { code: 'doi', label: 'Dogri' },
  { code: 'mni-Mtei', label: 'Manipuri' },
  { code: 'lus', label: 'Mizo' },
  { code: 'sat', label: 'Santali' },
  { code: 'sd', label: 'Sindhi' },
  { code: 'ks', label: 'Kashmiri' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' }
];

const SOURCE_LANGUAGES = [{ code: 'auto', label: 'Auto detect' }, ...LANGUAGES];

function Translator({
  sourceLanguage,
  targetLanguage,
  sourceText,
  translatedText,
  isTranslating,
  onSourceLanguageChange,
  onTargetLanguageChange,
  onSourceTextChange,
  onTranslate,
  onUseEditorText,
  onCopyTranslation,
  onInsertTranslation
}) {
  return (
    <section className="translator-panel" aria-label="Translator">
      <div className="translator-header">
        <div>
          <h2>Translator</h2>
          <p>Select source and target languages, then translate your editor text.</p>
        </div>

        <button className="primary-text-button" type="button" onClick={onUseEditorText}>
          Use editor text
        </button>
      </div>

      <div className="language-controls">
        <label>
          <span>From</span>
          <select value={sourceLanguage} onChange={(event) => onSourceLanguageChange(event.target.value)}>
            {SOURCE_LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>To</span>
          <select value={targetLanguage} onChange={(event) => onTargetLanguageChange(event.target.value)}>
            {LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
        </label>

        <button className="primary-text-button translate-button" type="button" onClick={onTranslate}>
          {isTranslating ? 'Translating...' : 'Translate'}
        </button>
      </div>

      <div className="translator-grid">
        <label className="translation-box">
          <span>Original text</span>
          <textarea
            value={sourceText}
            onChange={(event) => onSourceTextChange(event.target.value)}
            placeholder="Type or import editor text to translate."
          />
        </label>

        <label className="translation-box">
          <span>Translated text</span>
          <textarea
            value={translatedText}
            readOnly
            placeholder="Your translation will appear here."
          />
        </label>
      </div>

      <div className="translator-actions">
        <button className="secondary-text-button" type="button" onClick={onCopyTranslation}>
          Copy translation
        </button>
        <button className="secondary-text-button" type="button" onClick={onInsertTranslation}>
          Insert into editor
        </button>
      </div>
    </section>
  );
}

export default Translator;
