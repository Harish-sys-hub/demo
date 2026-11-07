# LearnSpace

## Mind map access
- Every note card includes a **Mind map** action.
- The note preview also includes **Open this note's mind map**.
- Topic Workspace retains its **Open / Draw** action.
- All entry points open the same mind map stored for that note ID.
- Mind maps are stored in browser localStorage and included in JSON backups.

## Files
- `index.html` — application structure
- `style.css` — layout and styling
- `script.js` — note, workspace, and mind map behavior

The embedded diagrams.net editor requires an internet connection. Notes and mind map XML remain in browser localStorage; this project does not currently provide cloud synchronization.

## MCQ practice
- Every note card and note preview includes an **MCQ** action; Topic Workspace rows also include an MCQ action.
- MCQ questions and attempt history are stored separately for each note in browser localStorage.
- Paste numbered questions using `1.`, `1)`, or `1 ` headers. Options may use `A)`, `A.`, `(A)`, or lowercase labels. Answer keys accept `Answer: B`, `Ans: B`, `Correct: B`, `Answer - B`, and equivalent forms. Explanations are optional.
- Answer keys are optional: valid questions with at least two options are still saved. Questions without a key are clearly marked and included in practice, but excluded from the graded score until a key is supplied.
- Save the question bank, then select **Start practice**. Each submission records a new attempt with score, percentage, and date. Users can practice again without overwriting earlier attempts.
- JSON backup export/import includes MCQ banks and attempt history.
