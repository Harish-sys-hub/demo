# LearnSpace MCQ report fixes

This update addresses the five reproducible MCQ findings in the 2026-11-07 test report.

## Changes
- Missing answer keys remain empty; those questions display **Not graded** and do not affect score or percentage.
- Results and attempt history show both answered and graded counts. Attempts retain `total`, `graded`, `ungraded`, `answered`, `score`, and `percentage`.
- MCQ card actions are handled by one delegated notes-grid click listener. MCQ and mind-map actions return before the note-card preview branch.
- Start Practice is enabled when the textarea has content (or a saved bank exists), and automatically parses/saves the current text before rendering the quiz.
- Imported attempt records are normalized once, including legacy records without `graded` (fallback: `total`). Imported state becomes authoritative and stale per-note localStorage history keys are cleared and synchronized.

## Install
Replace your existing `index.html`, `script.js`, and `style.css` with the files in this folder. Back up your current project and browser data first.

## Storage note
The main LearnSpace state is authoritative. Per-note `mcq_history_<noteId>` keys are maintained for compatibility with previous versions and synchronized on import.

## Validation
`node --check script.js` passed. Static regression checks confirmed the old default-to-A behavior and duplicate notes-grid MCQ handler are removed. A full live-browser test is still required for dialog interactions, localStorage behavior, and file:// browser restrictions.
