# LearnSpace MCQ Practice Upgrade

## Included
- Normalizes Windows line endings and non-breaking spaces before parsing.
- Splits numbered question blocks and accepts blank-line-separated unnumbered blocks.
- Accepts options formatted as `A)`, `A.`, `(A)`, `[A]`, and lowercase variants.
- Accepts `Answer:`, `Ans:`, and `Correct:` with `:`, `=`, or `-` separators. Missing answer keys remain ungraded; malformed multi-letter answer lines are rejected.
- Start Practice automatically parses and saves edited textarea content. Empty input shows an inline prompt.
- Quiz submission shows correct/incorrect/unanswered badges, locks the submitted quiz, and records score history.
- Per-note attempt history is stored under `mcq_history_<noteId>` and displayed newest first.
- Insert Sample fills the editor with two practice questions.
- HTML quizzes can be uploaded using fieldsets, legends, and labeled radio options with one `data-correct="true"` marker per question. HTML content is sanitized, scripts are not executed, and the imported questions use the same practice, scoring, and history flow.

## Install
Replace your existing `index.html`, `script.js`, and `style.css` with the matching files in this package. Back up your current project and browser data first.

## Storage
Question banks remain part of LearnSpace's main localStorage state. Attempt history is additionally stored per note under `mcq_history_<noteId>` and mirrored into the main state for backup compatibility. Data remains browser-local; it is not synchronized across devices.

## Validation
JavaScript syntax check passed. Parser smoke tests covered CRLF input, four option-label styles, default answer A, duplicate labels, and rejection of multi-letter answer lines. A full live-browser interaction test has not been performed.
