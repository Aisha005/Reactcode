import { forwardRef, useEffect } from 'react';

const Editor = forwardRef(function Editor({ content, onInput, onKeyDown }, ref) {
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== content) {
      ref.current.innerHTML = content;
    }
  }, [content, ref]);

  return (
    <div
      ref={ref}
      className="editor-surface"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="Editable document"
      spellCheck="true"
      onInput={onInput}
      onKeyDown={onKeyDown}
    />
  );
});

export default Editor;
