# LearnSpace MCQ improvements

- Parser reports invalid blocks and partial saves.
- Duplicate option labels and malformed/multiple answer keys are rejected per block; answer keys must match a listed option.
- Numbered headings and blank-line-separated plain-text question blocks are supported.
- Unsaved editor changes trigger a warning before practice; practice uses the last saved bank.
- Practice shows answered-question progress and optionally permits partial submissions.
- Attempt history includes best and average percentages, individual attempts, and a clear-history action.
- Imported MCQ banks and attempt records are sanitized against known note IDs and basic data constraints.

MCQ banks and attempt history remain in localStorage and are included in JSON backups. Run the app locally and test import/export with a copy of your existing backup before replacing your working files.
