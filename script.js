(() => {
  "use strict";

  const STORAGE_KEY = "learnspace-notes-v1";
  const THEME_KEY = "learnspace-theme";
  const DEFAULT_TOPICS = ["Python", "Git", "Playwright", "API Testing", "AI & ML", "System Design"];
  const $ = (selector) => document.querySelector(selector);
  const els = {
    newNoteBtn: $("#newNoteBtn"), topNewNoteBtn: $("#topNewNoteBtn"), emptyCreateBtn: $("#emptyCreateBtn"),
    notesGrid: $("#notesGrid"), emptyState: $("#emptyState"), emptyTitle: $("#emptyTitle"), emptyMessage: $("#emptyMessage"),
    allCount: $("#allCount"), statNotes: $("#statNotes"), statTopics: $("#statTopics"), statFavorites: $("#statFavorites"),
    topicList: $("#topicList"), pageTitle: $("#pageTitle"), breadcrumbCurrent: $("#breadcrumbCurrent"),
    listHeading: $("#listHeading"), listDescription: $("#listDescription"), searchInput: $("#searchInput"), sortSelect: $("#sortSelect"),
    editorDialog: $("#editorDialog"), noteForm: $("#noteForm"), editorHeading: $("#editorHeading"), noteTitle: $("#noteTitle"),
    noteTopic: $("#noteTopic"), noteTags: $("#noteTags"), noteSummary: $("#noteSummary"),
    imageUrl: $("#imageUrl"), imageAlt: $("#imageAlt"), deleteNoteBtn: $("#deleteNoteBtn"), saveStatus: $("#saveStatus"),
    previewDialog: $("#previewDialog"), previewContent: $("#previewContent"), editFromPreviewBtn: $("#editFromPreviewBtn"),
    topicDialog: $("#topicDialog"), topicForm: $("#topicForm"), topicName: $("#topicName"), importInput: $("#importInput"),
    clearSearchBtn: $("#clearSearchBtn"), themeToggle: $("#themeToggle"), toast: $("#toast")
  };

  let state = loadState();
  state.topicTitles = state.topicTitles && typeof state.topicTitles === "object" ? state.topicTitles : {};
  state.topicCreatedAt = state.topicCreatedAt && typeof state.topicCreatedAt === "object" ? state.topicCreatedAt : {};
  state.diagrams = state.diagrams && typeof state.diagrams === "object" ? state.diagrams : {};
  state.drawioDiagrams = state.drawioDiagrams && typeof state.drawioDiagrams === "object" ? state.drawioDiagrams : {};
  state.mcqs = state.mcqs && typeof state.mcqs === "object" ? state.mcqs : {};
  state.mcqAttempts = state.mcqAttempts && typeof state.mcqAttempts === "object" ? state.mcqAttempts : {};
  let activeDiagramNoteId = "";
  let diagramEditor = null;
  let isLoadingDiagram = false;

Quill.register({
  "modules/table-better": QuillTableBetter
}, true);

const quill = new Quill("#noteEditor", {
    theme: "snow",
    placeholder: "Paste your ChatGPT or Gemini notes here...",

    modules: {
        table: false,
        toolbar: {
            container: "#noteToolbar",

            handlers: {
                image: function () {
                    document
                        .getElementById("imageUploadInput")
                        .click();
                }
            }
        },
        "table-better": {
            language: "en_US",
            menus: ["column", "row", "merge", "table", "cell", "wrap", "copy", "delete"],
            toolbarTable: true
        },
        keyboard: {
            bindings: QuillTableBetter.keyboardBindings
        }
    }
});

document.getElementById("insertTableBtn").addEventListener("click", function () {
    quill.getModule("table-better").insertTable(3, 3);
});

quill.root.addEventListener("paste", function (event) {
    const clipboard = event.clipboardData;
    if (!clipboard) return;

    const text = clipboard.getData("text/plain");
    const html = clipboard.getData("text/html");
    if (!text || /<table\b/i.test(html)) return;

    const tableHTML = markdownTableToHTML(text);
    if (!tableHTML) return;

    event.preventDefault();
    const selection = quill.getSelection(true);
    const pasteTarget = event.target instanceof Element ? event.target.closest("table.ql-table-better") : null;
    const range = pasteTarget
        ? { index: quill.getLength() - 1, length: 0 }
        : selection;
    const delta = quill.clipboard.convert({
        html: pasteTarget ? `<p><br></p>${tableHTML}` : tableHTML
    });
    const Delta = Quill.import("delta");
    quill.updateContents(
        new Delta().retain(range.index).delete(range.length).concat(delta),
        Quill.sources.USER
    );
    quill.setSelection(range.index + delta.length(), Quill.sources.SILENT);
}, true);

let activeFilter = "all";
const imageInput =
    document.getElementById("imageUploadInput");

imageInput.addEventListener("change", function () {
    const file = this.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please select an image file.");
        this.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = function (event) {
        const range = quill.getSelection(true);

        quill.insertEmbed(
            range.index,
            "image",
            event.target.result,
            "user"
        );

        quill.setSelection(range.index + 1);
    };

    reader.readAsDataURL(file);
    this.value = "";
});

  let activeTopic = "";
  let editingId = null;
  let previewingId = null;
  let toastTimer;

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2600);
  }
  function applyTheme(theme) {
    const dark = theme === "dark";
    document.body.classList.toggle("dark-theme", dark);
    els.themeToggle.textContent = dark ? "☀" : "☾";
    const label = dark ? "Switch to light mode" : "Switch to dark mode";
    els.themeToggle.setAttribute("aria-label", label);
    els.themeToggle.title = label;
  }

  function makeId() {
    return "note-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }
  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (parsed && Array.isArray(parsed.notes) && Array.isArray(parsed.topics)) return parsed;
    } catch (error) { console.warn("Could not load saved notes:", error); }
    const now = new Date().toISOString();
    return {
      topics: [...DEFAULT_TOPICS],
      notes: [{
        id: makeId(), title: "Welcome to your learning space", topic: "Python",
        summary: "A simple place to capture concepts, examples, diagrams, and questions as you learn.",
        body: "## How to use this website\n- Create a note for each concept you learn.\n- Use **tags** to make notes easier to find.\n- Add an image URL for a diagram or screenshot.\n- Export a JSON backup regularly.\n\n## Example code\n```python\nmessage = \"Keep learning!\"\nprint(message)\n```\n\n## Remember\nNotes are saved in this browser, not automatically to GitHub. Export a backup if you want to keep a copy.",
        tags: ["getting-started", "notes"], imageUrl: "", imageAlt: "", favorite: true, createdAt: now, updatedAt: now
      }]
    };
  }
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      els.saveStatus.innerHTML = '<span class="status-dot"></span> All changes saved';
    } catch (error) {
      els.saveStatus.textContent = "Could not save — export a backup";
      console.error(error);
      alert("Your browser could not save these notes. Please export a JSON backup.");
    }
  }
  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }
  function safeImageURL(value) {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
  }
  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
  }
  function timeValue(value) { const n = new Date(value).getTime(); return Number.isFinite(n) ? n : 0; }
  function currentLabel() {
    if (activeFilter === "favorites") return "Favorites";
    if (activeFilter === "recent") return "Recently edited";
    return activeTopic || "All notes";
  }
  function filteredNotes() {
    const query = els.searchInput.value.trim().toLowerCase();
    let notes = state.notes.filter(note => {
      const matchesFilter = activeFilter === "favorites" ? note.favorite :
        activeFilter === "recent" ? true :
        activeTopic ? note.topic === activeTopic : true;
      const haystack = [note.title, note.summary, note.body, note.topic, ...(note.tags || [])].join(" ").toLowerCase();
      return matchesFilter && (!query || haystack.includes(query));
    });
    const sort = els.sortSelect.value;
    notes.sort((a, b) => activeFilter === "recent"
      ? timeValue(b.updatedAt) - timeValue(a.updatedAt) ||
        timeValue(a.createdAt) - timeValue(b.createdAt) ||
        state.notes.indexOf(a) - state.notes.indexOf(b)
      : sort === "title"
        ? a.title.localeCompare(b.title)
        : timeValue(a.createdAt) - timeValue(b.createdAt) ||
          state.notes.indexOf(a) - state.notes.indexOf(b));
    if (activeFilter === "recent") notes = notes.slice(0, 10);
    return notes;
  }
  function renderTopics() {
    els.topicList.innerHTML = state.topics.map(topic => {
      const count = state.notes.filter(note => note.topic === topic).length;
      return `<button class="topic-item ${activeTopic === topic && activeFilter === "all" ? "active" : ""}" data-topic="${escapeHTML(topic)}">
        <span class="topic-dot"></span><span>${escapeHTML(topic)}</span><span class="topic-count">${count}</span></button>`;
    }).join("");
    els.noteTopic.innerHTML = state.topics.map(topic => `<option value="${escapeHTML(topic)}">${escapeHTML(topic)}</option>`).join("");
    if (!state.topics.length) els.noteTopic.innerHTML = '<option value="">No topics — add one first</option>';
    els.statTopics.textContent = state.topics.length;
  }
  function renderStats() {
    els.allCount.textContent = state.notes.length;
    els.statNotes.textContent = state.notes.length;
    els.statFavorites.textContent = state.notes.filter(note => note.favorite).length;
  }
  function renderNotes() {
    const notes = filteredNotes();
    const label = currentLabel();
    els.pageTitle.innerHTML = `${escapeHTML(label)} <span class="heading-sparkle">✦</span>`;
    els.breadcrumbCurrent.textContent = label;
    els.listHeading.textContent = activeFilter === "recent" ? "Recently edited notes" : activeFilter === "favorites" ? "Your favorite notes" : activeTopic ? `${activeTopic} notes` : "Your notes";
    els.listDescription.textContent = `${notes.length} ${notes.length === 1 ? "note" : "notes"} ${els.searchInput.value.trim() ? "found" : "in this view"}.`;
    els.emptyState.hidden = notes.length > 0;
    els.notesGrid.hidden = notes.length === 0;
    if (!notes.length) {
      const hasSearch = Boolean(els.searchInput.value.trim());
      els.emptyTitle.textContent = hasSearch ? "No matching notes" : "Your notebook starts here";
      els.emptyMessage.textContent = hasSearch ? "Try another search term or switch to a different topic." : "Create your first note and capture something you learned today.";
      els.clearSearchBtn.hidden = !hasSearch;
    }
    else els.clearSearchBtn.hidden = true;
    els.notesGrid.innerHTML = notes.map(note => {
      const imageURL = safeImageURL(note.imageUrl);
      const tags = (note.tags || []).slice(0, 4).map(tag => `<span class="tag">#${escapeHTML(tag)}</span>`).join("");
      return `<article class="note-card" data-open-note="${escapeHTML(note.id)}" tabindex="0" role="button" aria-label="Open note ${escapeHTML(note.title)}">
        <div class="note-card-top"><span class="topic-pill"><span>●</span>${escapeHTML(note.topic || "Uncategorized")}</span>
        <div class="note-actions"><button class="card-action ${note.favorite ? "favorited" : ""}" data-favorite="${escapeHTML(note.id)}" title="${note.favorite ? "Remove favorite" : "Add favorite"}" aria-label="${note.favorite ? "Remove favorite" : "Add favorite"}">★</button>
        <button class="card-action" data-edit="${escapeHTML(note.id)}" title="Edit note" aria-label="Edit note">⋯</button></div></div>
        <h3>${escapeHTML(note.title)}</h3><p class="summary">${escapeHTML(note.summary || (note.body || "").replace(/[#*`>-]/g, "").slice(0, 150) || "No summary yet.")}</p>
        ${imageURL ? `<img class="note-image" src="${escapeHTML(imageURL)}" alt="${escapeHTML(note.imageAlt || note.title)}" loading="lazy">` : ""}
        <div class="tag-list">${tags}</div>
        <div class="note-card-footer">
          <span>◷ ${escapeHTML(formatDate(note.createdAt))}</span>
          <div class="note-card-footer-actions">
            <button class="mindmap-link" type="button" data-open-note-mindmap="${escapeHTML(note.id)}" aria-label="Open mind map for ${escapeHTML(note.title)}">✧ Mind map</button>
            <button class="mcq-link" type="button" data-open-note-mcq="${escapeHTML(note.id)}" aria-label="Practice MCQs for ${escapeHTML(note.title)}">▣ MCQ</button>
            <span class="open-note-label">↗ Open note</span>
          </div>
        </div>
      </article>`;
    }).join("");
    renderStats();
  }
  function render() { renderTopics(); renderNotes(); renderWorkspaceTable(); }
  function renderWorkspaceTable() {
    const tbody = $("#workspaceTableBody");
    const notes = [...state.notes].sort((a, b) =>
      timeValue(a.createdAt) - timeValue(b.createdAt) ||
      state.notes.indexOf(a) - state.notes.indexOf(b)
    );
    tbody.innerHTML = notes.length ? notes.map(note => {
      const createdAt = new Date(note.createdAt);
      const validCreatedAt = !Number.isNaN(createdAt.getTime());
      const date = validCreatedAt ? createdAt.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).replace(/\s+/g, "-") : "";
      const time = validCreatedAt ? createdAt.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      }).toUpperCase() : "";
      return `
        <tr>
          <td>${escapeHTML(date)}</td>
          <td>${escapeHTML(time)}</td>
          <td><strong>${escapeHTML(note.topic || "Uncategorized")}</strong></td>
          <td>${escapeHTML(note.title)}</td>
          <td><button class="open-diagram-btn" type="button" data-open-diagram="${escapeHTML(note.id)}">Open / Draw →</button></td>
          <td><button class="mcq-link" type="button" data-open-note-mcq="${escapeHTML(note.id)}">MCQ →</button></td>
        </tr>
      `;
    }).join("") : '<tr><td colspan="6">No saved notes yet. Create a note to add the first row.</td></tr>';
  }
  function showTopicWorkspace() {
    $("#notesContent").hidden = true;
    $("#topicWorkspace").hidden = false;
    $("#topicTableSection").hidden = false;
    $("#diagramSection").hidden = true;
    els.breadcrumbCurrent.textContent = "Topic Workspace";
    renderWorkspaceTable();
    document.querySelectorAll(".nav-item[data-filter], .topic-item").forEach(button => button.classList.remove("active"));
    $("#topicWorkspaceBtn").classList.add("active");
  }
  function showNotesWorkspace() {
    $("#topicWorkspace").hidden = true;
    $("#notesContent").hidden = false;
    $("#topicWorkspaceBtn").classList.remove("active");
  }
  // diagrams.net embed integration. Existing Drawflow diagrams remain preserved
  // in state.diagrams; new diagrams are stored separately as XML by note ID.
  state.drawioDiagrams = state.drawioDiagrams && typeof state.drawioDiagrams === "object"
    ? state.drawioDiagrams
    : {};
  let drawioFrame = null;
  let drawioReady = false;
  let drawioPendingExport = null;
  const DRAWIO_ORIGIN = "https://embed.diagrams.net";
  const BLANK_DIAGRAM_XML = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';

  function drawioPost(message) {
    if (!drawioFrame || !drawioFrame.contentWindow) return;
    drawioFrame.contentWindow.postMessage(JSON.stringify(message), DRAWIO_ORIGIN);
  }

  function saveDrawioXml(xml, showMessage = false) {
    if (!activeDiagramNoteId || typeof xml !== "string" || !xml.trim()) return;
    state.drawioDiagrams[activeDiagramNoteId] = xml;
    persist();
    if (showMessage) showToast("Diagram saved");
  }

  function closeDrawioEditor() {
    if (drawioFrame) {
      drawioFrame.remove();
      drawioFrame = null;
    }
    drawioReady = false;
    drawioPendingExport = null;
    $("#diagramSection").hidden = true;
    $("#topicTableSection").hidden = false;
    els.breadcrumbCurrent.textContent = "Topic Workspace";
  }

  function openNoteDiagram(noteId) {
    const note = state.notes.find(item => item.id === noteId);
    if (!note) return;

    // Mind maps can be opened from cards, previews, or Topic Workspace.
    // Always move into the shared diagram workspace before opening the note-specific map.
    if (els.previewDialog.open) els.previewDialog.close();
    showTopicWorkspace();
    activeDiagramNoteId = noteId;
    $("#topicTableSection").hidden = true;
    $("#diagramSection").hidden = false;
    $("#diagramTopicTitle").textContent = `${note.topic || "Uncategorized"} - ${note.title}`;
    els.breadcrumbCurrent.textContent = `${note.title} Diagram`;

    const host = $("#drawioHost");
    host.innerHTML = '<div class="drawio-loading" id="drawioLoading">Connecting to diagrams.net…</div>';
    drawioReady = false;
    drawioFrame = document.createElement("iframe");
    drawioFrame.className = "drawio-iframe";
    drawioFrame.title = `Mind map editor for ${note.title}`;
    drawioFrame.allow = "clipboard-read; clipboard-write";
    drawioFrame.referrerPolicy = "strict-origin-when-cross-origin";
    drawioFrame.src = `${DRAWIO_ORIGIN}/?embed=1&proto=json&spin=1&libraries=1&saveAndExit=1&noExitBtn=0`;
    host.appendChild(drawioFrame);
  }

  window.addEventListener("message", event => {
    // Validate both origin and source. Never inject returned XML into the DOM.
    if (event.origin !== DRAWIO_ORIGIN || !drawioFrame || event.source !== drawioFrame.contentWindow) return;

    let message;
    try {
      message = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
    } catch {
      return;
    }
    if (!message || typeof message !== "object") return;

    if (message.event === "init") {
      drawioReady = true;
      const loading = $("#drawioLoading");
      if (loading) loading.remove();
      const savedXml = state.drawioDiagrams[activeDiagramNoteId];
      drawioPost({
        action: "load",
        xml: typeof savedXml === "string" && savedXml.trim() ? savedXml : BLANK_DIAGRAM_XML,
        autosave: 1,
        title: state.notes.find(note => note.id === activeDiagramNoteId)?.title || "LearnSpace diagram",
        libs: true,
        dark: document.body.classList.contains("dark-theme")
      });
      return;
    }

    if (message.event === "autosave" && typeof message.xml === "string") {
      saveDrawioXml(message.xml, false);
      return;
    }

    if (message.event === "save" && typeof message.xml === "string") {
      saveDrawioXml(message.xml, true);
      if (message.exit) closeDrawioEditor();
      return;
    }

    if (message.event === "exit") {
      closeDrawioEditor();
      return;
    }

    if (message.event === "export" && drawioPendingExport) {
      const pending = drawioPendingExport;
      drawioPendingExport = null;
      if (pending.format === "save-close") {
        const xml = message.xml || message.data || "";
        if (typeof xml === "string" && xml) saveDrawioXml(xml, true);
        closeDrawioEditor();
      } else if (pending.format === "xml") {
        const xml = message.xml || message.data || "";
        if (typeof xml === "string" && xml) {
          saveDrawioXml(xml, false);
          downloadDiagramFile(new Blob([xml], { type: "application/xml;charset=utf-8" }), pending.filename);
          showToast("Editable XML exported");
        } else {
          showToast("Could not export XML");
        }
      } else if (typeof message.data === "string" && message.data.startsWith("data:")) {
        downloadDataUri(message.data, pending.filename);
        showToast(`${pending.format.toUpperCase()} exported`);
      } else {
        showToast(`Could not export ${pending.format.toUpperCase()}`);
      }
    }
  });

  function downloadDiagramFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadDataUri(dataUri, filename) {
    const link = document.createElement("a");
    link.href = dataUri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function requestDiagramExport(format) {
    if (!drawioReady || !drawioFrame) {
      showToast("The diagram editor is still loading");
      return;
    }
    const note = state.notes.find(item => item.id === activeDiagramNoteId);
    const safeTitle = (note?.title || "learnspace-diagram").replace(/[^\w\-]+/g, "-").replace(/^-|-$/g, "") || "learnspace-diagram";
    const extension = format === "xml" ? "drawio" : format;
    drawioPendingExport = { format, filename: `${safeTitle}.${extension}` };
    drawioPost({ action: "export", format, spin: true, border: 10 });
  }

  function saveAndCloseDiagram() {
    if (!drawioReady) {
      showToast("The diagram editor is still loading");
      return;
    }
    // Request the current editable XML. The export response saves it before closing.
    drawioPendingExport = { format: "save-close", filename: "" };
    drawioPost({ action: "export", format: "xml" });
  }

  function setFilter(filter, topic = "") {
    activeFilter = filter; activeTopic = topic;
    document.querySelectorAll(".nav-item[data-filter]").forEach(button => button.classList.toggle("active", button.dataset.filter === filter));
    render();
  }
  function openEditor(note = null) {
    editingId = note ? note.id : null;
    els.editorHeading.textContent = note ? "Edit your note" : "Create a note";
    els.noteTitle.value = note?.title || "";
    els.noteTopic.value = note?.topic || state.topics[0] || "";
    els.noteTags.value = (note?.tags || []).join(", ");
    els.noteSummary.value = note?.summary || "";
    if (note?.bodyFormat === "html") {
    quill.clipboard.dangerouslyPasteHTML(
        DOMPurify.sanitize(note.body || "")
    );
} else {
    quill.clipboard.dangerouslyPasteHTML(
        markdownToHTML(note?.body || "")
    );
}
    els.imageUrl.value = note?.imageUrl || "";
    els.imageAlt.value = note?.imageAlt || "";
    els.deleteNoteBtn.hidden = !note;
    els.editorDialog.showModal();
    setTimeout(() => els.noteTitle.focus(), 50);
  }
  function closeEditor() { els.editorDialog.close(); }
  function saveNote(event) {
    event.preventDefault();
    const title = els.noteTitle.value.trim();
    if (!title) return;
    if (!state.topics.length) { alert("Please add a topic before saving a note."); return; }
    const now = new Date().toISOString();
    const existing = state.notes.find(note => note.id === editingId);
    const note = {
      id: existing?.id || makeId(), title, topic: els.noteTopic.value || state.topics[0],
      tags: els.noteTags.value.split(",").map(tag => tag.trim().replace(/^#/, "")).filter(Boolean).slice(0, 20),
      summary: els.noteSummary.value.trim(),
body: quill.root.innerHTML,
bodyFormat: "html",
 imageUrl: safeImageURL(els.imageUrl.value.trim()), imageAlt: els.imageAlt.value.trim(),
      favorite: existing?.favorite || false, createdAt: existing?.createdAt || now, updatedAt: now
    };
    if (existing) {
      state.notes = state.notes.map(item => item.id === existing.id ? note : item);
    } else {
      state.notes.push(note);
    }
    persist(); closeEditor(); render();
    showToast(existing ? "Note updated" : "New row added to register");
  }
  function deleteNote(id) {
    const note = state.notes.find(item => item.id === id);
    if (!note || !confirm(`Delete "${note.title}"? This cannot be undone unless you have a backup.`)) return;
    state.notes = state.notes.filter(item => item.id !== id);
    delete state.diagrams[id];
    delete state.drawioDiagrams?.[id];
    delete state.mcqs?.[id];
    delete state.mcqAttempts?.[id];
    if (activeDiagramNoteId === id) {
      activeDiagramNoteId = "";
      closeDrawioEditor();
    }
    persist(); closeEditor(); els.previewDialog.close(); render(); showToast("Note deleted");
  }
  function markdownToHTML(markdown) {
    // Lightweight Markdown renderer for personal notes. Raw HTML is escaped.
    const escaped = escapeHTML(markdown || "");
    const blocks = escaped.split(/```([\w+-]*)\n([\s\S]*?)```/g);
    let html = "";
    for (let i = 0; i < blocks.length; i++) {
      if (i % 3 === 1) {
        const code = blocks[i + 1] || "";
        html += `<pre><code>${code.replace(/\n$/, "")}</code></pre>`;
        i += 1;
        continue;
      }
      let text = blocks[i];
      text = text.replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h2>$1</h2>")
        .replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`([^`]+)`/g, "<code>$1</code>");
      text = text.replace(/(?:^|\n)(- .+(?:\n- .+)*)/g, (match, list) => {
        return "<ul>" + list.split("\n").map(line => `<li>${line.replace(/^- /, "")}</li>`).join("") + "</ul>";
      });
      html += text.split(/\n{2,}/).map(part => {
        const trimmed = part.trim();
        if (!trimmed) return "";
        if (/^<(h2|h3|ul|blockquote|pre)/.test(trimmed)) return trimmed.replace(/\n/g, "");
        return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
      }).join("");
    }
    return html;
  }
  function markdownTableHTMLCells(line) {
    let value = line.trim();
    if (value.startsWith("|")) value = value.slice(1);
    if (value.endsWith("|") && !value.endsWith("\\|")) value = value.slice(0, -1);
    const cells = [];
    let cell = "";
    let escaped = false;
    for (const character of value) {
      if (character === "|" && !escaped) {
        cells.push(cell.trim().replace(/\\\|/g, "|"));
        cell = "";
      } else {
        cell += character;
      }
      escaped = character === "\\" && !escaped;
      if (character !== "\\") escaped = false;
    }
    cells.push(cell.trim().replace(/\\\|/g, "|"));
    return cells;
  }
  function markdownTableToHTML(text) {
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    const output = [];
    let foundTable = false;
    for (let index = 0; index < lines.length;) {
        if (index + 1 < lines.length && lines[index].includes("|") && lines[index + 1].includes("|")) {
          const headers = markdownTableHTMLCells(lines[index]);
          const separators = markdownTableHTMLCells(lines[index + 1]);
          if (headers.length === separators.length &&
              separators.every(cell => /^:?-{3,}:?$/.test(cell))) {
          foundTable = true;
          const rows = [headers];
          index += 2;
          while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
            const cells = markdownTableHTMLCells(lines[index]);
            rows.push(Array.from({ length: headers.length }, (_, cellIndex) => cells[cellIndex] || ""));
            index += 1;
          }
          output.push(`<table><tbody>${rows.map((row, rowIndex) =>
            `<tr>${row.map(cell => `<${rowIndex === 0 ? "th" : "td"}>${escapeHTML(cell)}</${rowIndex === 0 ? "th" : "td"}>`).join("")}</tr>`
          ).join("")}</tbody></table>`);
          continue;
        }
      }
      output.push(lines[index] ? `<p>${escapeHTML(lines[index])}</p>` : "<p><br></p>");
      index += 1;
    }
    return foundTable ? output.join("") : "";
  }
  // MCQ bank and attempt history are stored locally and isolated by note ID.
  let activeMcqNoteId = "";
  let activeMcqAnswers = {};
  let mcqEditorDirty = false;
  let mcqSavedText = "";
  let mcqHtmlMode = false;
  const mcqDialog = $("#mcqDialog");
  function sanitizeMcqMarkup(markup) {
    return DOMPurify.sanitize(markup, {
      ALLOWED_TAGS: ["a", "b", "br", "code", "em", "i", "img", "li", "ol", "p", "pre", "span", "strong", "sub", "sup", "table", "tbody", "td", "th", "thead", "tr", "u", "ul"],
      ALLOWED_ATTR: ["alt", "class", "colspan", "height", "href", "src", "title", "width"]
    });
  }
  function parseMcqHtml(source) {
    const document = new DOMParser().parseFromString(source, "text/html");
    const containers = [...document.querySelectorAll("fieldset")];
    const questionSelector = '[data-question], [data-question-text], .question, [class*="question"], [id*="question"], article';
    const optionSelector = '[data-option], .option, [class*="option"], li, button';
    const correctSelector = '[data-correct="true"], [data-answer="true"], .correct, .right, .is-correct';
    const seenContainers = new Set(containers);

    const candidates = [...document.querySelectorAll(questionSelector)].filter(container => {
      if (containers.some(existing => existing.contains(container))) return false;
      const radios = [...container.querySelectorAll('input[type="radio"]')];
      const options = [...container.querySelectorAll(optionSelector)].filter(option =>
        !option.querySelector(optionSelector) && option.textContent.trim()
      );
      return radios.length >= 2 || options.length >= 2;
    });
    candidates.filter(container => !candidates.some(other =>
      other !== container && container.contains(other)
    )).forEach(container => {
      containers.push(container);
      seenContainers.add(container);
    });

    const ungroupedRadios = [...document.querySelectorAll('input[type="radio"]')].filter(radio =>
      !containers.some(container => container.contains(radio))
    );
    const groups = new Map();
    ungroupedRadios.forEach(radio => {
      const key = radio.name || radio.closest(questionSelector) || radio.parentElement;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(radio);
    });
    groups.forEach(radios => {
      if (radios.length < 2) return;
      let container = radios[0].parentElement;
      while (container && !radios.every(radio => container.contains(radio))) container = container.parentElement;
      while (container && container !== document.body) {
        const namedRadios = [...container.querySelectorAll('input[type="radio"]')].filter(radio => radio.name === radios[0].name);
        if (namedRadios.length === radios.length &&
            container.querySelector("legend, [data-question-text], .question-text, h1, h2, h3, h4, p")) break;
        container = container.parentElement;
      }
      if (container && !seenContainers.has(container)) {
        containers.push(container);
        seenContainers.add(container);
      }
    });

    const questions = [];
    const issues = [];

    containers.forEach((container, questionIndex) => {
      const radios = [...container.querySelectorAll('input[type="radio"]')];
      let prompt = container.querySelector("legend, [data-question-text], .question-text, h1, h2, h3, h4");
      let optionNodes = [];

      if (radios.length) {
        optionNodes = radios.map(radio =>
          radio.closest("label") ||
          [...container.querySelectorAll("label[for]")].find(label => label.htmlFor === radio.id) ||
          radio.parentElement
        ).filter(Boolean);
      } else {
        optionNodes = [...container.querySelectorAll(optionSelector)].filter(option =>
          !option.querySelector(optionSelector) && option.textContent.trim()
        );
      }
      optionNodes = [...new Set(optionNodes)];

      if (!prompt) {
        prompt = [...container.children].find(child =>
          child.textContent.trim() && !optionNodes.some(option => child === option || child.contains(option))
        );
      }
      if (!prompt && !radios.length && optionNodes.length >= 3) prompt = optionNodes.shift();
      if (!prompt || optionNodes.length < 2) {
        issues.push(`Question ${questionIndex + 1} needs identifiable question text and at least two options.`);
        return;
      }
      if (optionNodes.length > 4) {
        issues.push(`Question ${questionIndex + 1} has more than four options.`);
        return;
      }

      const options = optionNodes.map((node, optionIndex) => {
        const radio = node.matches('input[type="radio"]')
          ? node
          : node.querySelector('input[type="radio"]');
        const clone = node.cloneNode(true);
        clone.querySelectorAll("input, button").forEach(element => element.remove());
        if (node.matches('input[type="radio"]')) clone.remove();
        const text = clone.textContent.trim() || node.getAttribute("value") || "";
        const markedCorrect = [node, radio, node.closest(correctSelector)].some(element =>
          element && (
            element.dataset?.correct?.toLowerCase() === "true" ||
            element.dataset?.answer?.toLowerCase() === "true" ||
            element.matches?.(correctSelector)
          )
        );
        return {
          key: String.fromCharCode(65 + optionIndex),
          text,
          html: sanitizeMcqMarkup(clone.innerHTML || text),
          correct: markedCorrect
        };
      });

      if (options.some(option => !option.text)) {
        issues.push(`Question ${questionIndex + 1} has an option without text.`);
        return;
      }

      const answerElement = container.querySelector("[data-answer], .answer-key, .correct-answer, [class*='answer']");
      const answerValue = container.dataset.answer || answerElement?.dataset.answer ||
        answerElement?.textContent.match(/(?:answer|correct)\s*[:=-]?\s*([A-D])/i)?.[1] || "";
      const markedOptions = options.filter(option => option.correct);
      if (markedOptions.length === 0 && answerValue) {
        const answer = answerValue.trim().toUpperCase();
        const answerIndex = /^[A-D]$/.test(answer)
          ? answer.charCodeAt(0) - 65
          : options.findIndex(option => option.text.toLowerCase() === answerValue.trim().toLowerCase());
        if (answerIndex >= 0 && answerIndex < options.length) options[answerIndex].correct = true;
      }
      const correctOptions = options.filter(option => option.correct);
      if (correctOptions.length !== 1) {
        issues.push(`Question ${questionIndex + 1} must identify exactly one correct option (for example with data-correct="true" or a data-answer value).`);
        return;
      }
      questions.push({
        id: `html_q_${questionIndex + 1}`,
        source: "html",
        question: prompt.textContent.trim(),
        questionHtml: sanitizeMcqMarkup(prompt.innerHTML),
        options: options.map(({ correct, ...option }) => option),
        answer: correctOptions[0].key,
        explanation: ""
      });
    });

    return { questions, issues, totalBlocks: containers.length };
  }
  function clearMcqHtmlQuiz() {
    if (!activeMcqNoteId || !mcqHtmlMode) return;
    state.mcqs[activeMcqNoteId] = [];
    persist();
    mcqHtmlMode = false;
    activeMcqAnswers = {};
    $("#mcqEditorSection").hidden = false;
    $("#mcqHtmlStatus").textContent = "";
    $("#clearMcqHtmlBtn").hidden = true;
    $("#mcqHtmlFile").value = "";
    $("#mcqQuizArea").innerHTML = "";
    $("#mcqSaveStatus").textContent = "";
    updateMcqCount();
  }
  function parseMcqText(raw) {
    const source = String(raw ?? "")
      .replace(/\r\n?/g, "\n")
      .replace(/\u00A0/g, " ")
      .split("\n").map(line => line.trim()).join("\n").trim();
    if (!source) return { questions: [], issues: [], totalBlocks: 0 };

    // Numbered question headings are the primary boundary. Also accept blank-line
    // separated unnumbered blocks as a forgiving fallback.
    let blocks = source.split(/\n(?=\s*\d+[.)]\s*)/).map(block => block.trim()).filter(Boolean);
    if (blocks.length <= 1 && !/^\s*\d+[.)]\s*/.test(source)) {
      blocks = source.split(/\n\s*\n+/).map(block => block.trim()).filter(Boolean);
    }
    const optionPattern = /^\s*(?:\(([A-D])\)|\[([A-D])\]|([A-D])\s*[).])\s*(.*?)\s*$/i;
    const answerPattern = /^\s*(?:answer|ans|correct)\s*[:=-]\s*(?:option\s*)?(.+?)\s*$/i;
    const parsed = [], issues = [];

    blocks.forEach((block, blockIndex) => {
      const rows = block.split("\n").map(line => line.trim()).filter(Boolean);
      let questionParts = [], options = [], answer = "", invalidAnswer = false, explanationParts = [], inExplanation = false;
      for (const row of rows) {
        const answerMatch = row.match(answerPattern);
        if (answerMatch) {
          const rawAnswer = answerMatch[1].trim();
          if (/^[A-D]$/i.test(rawAnswer)) answer = rawAnswer.toUpperCase();
          else invalidAnswer = true;
          inExplanation = false; continue;
        }
        const explanationMatch = row.match(/^explanation\s*[:=-]\s*(.*)$/i);
        if (explanationMatch) { explanationParts.push(explanationMatch[1]); inExplanation = true; continue; }
        const optionMatch = row.match(optionPattern);
        if (optionMatch) {
          options.push({ key: (optionMatch[1] || optionMatch[2] || optionMatch[3]).toUpperCase(), text: optionMatch[4].trim() });
          inExplanation = false;
          continue;
        }
        if (inExplanation) explanationParts.push(row);
        else questionParts.push(row.replace(/^\s*(?:(?:Q(?:uestion)?\s*)?\d+\s*[.)-]\s*|Q(?:uestion)?\s*\d*\s*[:.-]\s*)/i, "").trim());
      }
      const question = questionParts.filter(Boolean).join(" ").trim();
      const labels = options.map(option => option.key);
      const errors = [];
      if (!question) errors.push("missing question text");
      if (options.length < 2) errors.push("needs at least two options");
      if (options.some(option => !option.text)) errors.push("contains an option with no text");
      if (new Set(labels).size !== labels.length) errors.push("contains duplicate option labels");
      if (invalidAnswer) errors.push("answer line must contain exactly one option letter");
      // Missing answer keys remain empty and are excluded from scoring.
      if (answer && !labels.includes(answer)) errors.push(`answer ${answer} does not match a listed option`);
      if (errors.length) { issues.push(`Block ${blockIndex + 1}: ${errors.join(", ")}.`); return; }
      parsed.push({ id: `q_${Date.now()}_${blockIndex + 1}`, question, options, answer, explanation: explanationParts.join(" ").trim() });
    });
    return { questions: parsed, issues, totalBlocks: blocks.length };
  }
  function openMcqPage(noteId) {
    const note = state.notes.find(item => item.id === noteId);
    if (!note) return;
    activeMcqNoteId = noteId;
    mcqHtmlMode = (state.mcqs[noteId] || []).some(question => question.source === "html");
    activeMcqAnswers = {};
    $("#mcqNoteTitle").textContent = `${note.title} — MCQ`;
    $("#mcqNoteTopic").textContent = note.topic || "Uncategorized";
    $("#mcqInput").value = mcqHtmlMode ? "" : (state.mcqs[noteId] || []).map((q, i) => [
      `${i + 1}. ${q.question}`,
      ...q.options.map(option => `${option.key}) ${option.text}`),
      ...(q.answer ? [`Answer: ${q.answer}`] : []),
      ...(q.explanation ? [`Explanation: ${q.explanation}`] : [])
    ].join("\n")).join("\n\n");
    mcqSavedText = $("#mcqInput").value;
    mcqEditorDirty = false;
    $("#mcqSaveStatus").textContent = "";
    $("#mcqQuizArea").innerHTML = "";
    $("#mcqEditorSection").hidden = mcqHtmlMode;
    $("#mcqHtmlStatus").textContent = mcqHtmlMode
      ? `${(state.mcqs[noteId] || []).length} HTML questions loaded. Questions and answers are hidden until you start practice.`
      : "";
    $("#clearMcqHtmlBtn").hidden = !mcqHtmlMode;
    renderMcqHistory();
    updateMcqCount();
    $("#startMcqBtn").disabled = !(state.mcqs[noteId] || []).length && !$("#mcqInput").value.trim();
    if (els.previewDialog.open) els.previewDialog.close();
    if (!mcqDialog.open) mcqDialog.showModal();
  }
  function updateMcqCount() {
    const count = (state.mcqs[activeMcqNoteId] || []).length;
    const unkeyed = (state.mcqs[activeMcqNoteId] || []).filter(question => !question.answer).length;
    $("#mcqQuestionCount").textContent = mcqHtmlMode
      ? `${count} HTML ${count === 1 ? "question" : "questions"} loaded.`
      : `${count} ${count === 1 ? "question" : "questions"} saved${unkeyed ? ` · ${unkeyed} without answer key` : ""}.`;
    $("#startMcqBtn").disabled = count === 0;
  }
  function saveMcqs() {
    const result = parseMcqText($("#mcqInput").value);
    const parsed = result.questions;
    if (!parsed.length) {
      $("#mcqSaveStatus").textContent = `No questions saved. ${result.issues.join(' ') || 'Add at least one valid question.'}`;
      showToast("No valid MCQ questions found"); return;
    }
    state.mcqs[activeMcqNoteId] = parsed;
    persist();
    mcqSavedText = $("#mcqInput").value; mcqEditorDirty = false;
    const missingKeys = parsed.filter(question => !question.answer).length;
    const partial = result.issues.length > 0;
    $("#mcqSaveStatus").textContent = `${parsed.length} of ${result.totalBlocks} question block(s) saved.${missingKeys ? ` ${missingKeys} have no answer key and will be ungraded.` : ''}${partial ? `\nNot saved:\n${result.issues.join('\n')}` : ''}`;
    $("#mcqQuizArea").innerHTML = ""; updateMcqCount(); showToast(partial ? "Valid questions saved; some blocks need fixing" : "MCQ questions saved");
  }
  function getMcqHistory(noteId = activeMcqNoteId) {
    const key = `mcq_history_${noteId}`;
    if (Array.isArray(state.mcqAttempts[noteId])) return state.mcqAttempts[noteId];
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "null");
      if (Array.isArray(stored)) { state.mcqAttempts[noteId] = stored; return stored; }
    } catch (error) { console.warn("Could not read MCQ history", error); }
    return [];
  }
  function saveMcqHistory(noteId, attempts) {
    state.mcqAttempts[noteId] = attempts;
    try { localStorage.setItem(`mcq_history_${noteId}`, JSON.stringify(attempts)); } catch (error) { console.warn("Could not save MCQ history", error); }
    persist();
  }
  function startMcqPractice() {
    const input = $("#mcqInput");
    const raw = input.value.trim();
    if (!mcqHtmlMode && !raw) {
      $("#mcqSaveStatus").textContent = "Please paste your questions first.";
      input.focus();
      return;
    }
    // Start Practice also saves the current textarea content automatically.
    if (!mcqHtmlMode && (mcqEditorDirty || raw !== mcqSavedText || !(state.mcqs[activeMcqNoteId] || []).length)) {
      const result = parseMcqText(input.value);
      if (!result.questions.length) {
        $("#mcqSaveStatus").textContent = `No valid questions found. ${result.issues.join(" ") || "Check the question and option format."}`;
        return;
      }
      state.mcqs[activeMcqNoteId] = result.questions;
      persist();
      mcqSavedText = input.value;
      mcqEditorDirty = false;
      const skipped = result.issues.length;
      $("#mcqSaveStatus").textContent = `${result.questions.length} of ${result.totalBlocks} question block(s) saved.${skipped ? ` ${skipped} invalid block(s) were skipped: ${result.issues.join(" ")}` : " Questions saved automatically."}`;
      updateMcqCount();
    }
    const questions = state.mcqs[activeMcqNoteId] || [];
    if (!questions.length) {
      $("#mcqSaveStatus").textContent = "Please paste your questions first.";
      return;
    }
    activeMcqAnswers = {};
    const allowPartial = $("#mcqAllowPartial").checked;
    const form = $("#mcqQuizArea");
    form.innerHTML = `<form id="mcqPracticeForm"><p class="mcq-progress" id="mcqProgress">Question 0 of ${questions.length} answered</p>${questions.map((q, index) => `<fieldset class="mcq-question"><legend>${index + 1}. ${q.questionHtml ? sanitizeMcqMarkup(q.questionHtml) : escapeHTML(q.question)}</legend>${q.options.map(option => `<label class="mcq-option"><input type="radio" name="${escapeHTML(q.id)}" value="${escapeHTML(option.key)}"><span><strong>${escapeHTML(option.key)}.</strong> ${option.html ? sanitizeMcqMarkup(option.html) : escapeHTML(option.text)}</span></label>`).join("")}</fieldset>`).join("")}<button class="primary-button" type="submit">Submit Quiz</button></form>`;
    const practiceForm = $("#mcqPracticeForm");
    practiceForm.addEventListener("change", () => {
      const answered = questions.filter(q => practiceForm.querySelector(`input[name="${CSS.escape(q.id)}"]:checked`)).length;
      $("#mcqProgress").textContent = `Question ${answered} of ${questions.length} answered`;
    });
    practiceForm.addEventListener("submit", event => {
      event.preventDefault();
      const formData = new FormData(practiceForm);
      const answered = questions.filter(q => formData.get(q.id));
      const unanswered = questions.length - answered.length;
      if (unanswered && !allowPartial) { showToast(`Answer all ${questions.length} questions before submitting`); return; }
      if (!answered.length) { showToast("Answer at least one question before submitting"); return; }
      let score = 0, graded = 0;
      const review = questions.map((q, index) => {
        const chosen = formData.get(q.id);
        const hasKey = Boolean(q.answer);
        const correct = hasKey && chosen === q.answer;
        if (hasKey) { graded++; if (correct) score++; }
        const correctOption = hasKey ? q.options.find(option => option.key === q.answer) : null;
        const correctText = correctOption
          ? correctOption.html ? sanitizeMcqMarkup(correctOption.html) : escapeHTML(correctOption.text)
          : "";
        const badge = !hasKey ? `<span class="mcq-badge is-ungraded">Not graded</span>` : !chosen ? `<span class="mcq-badge is-unanswered">Unanswered</span>` : correct ? `<span class="mcq-badge is-correct">Correct</span>` : `<span class="mcq-badge is-wrong">Incorrect</span>`;
        const answerLine = hasKey ? `<p>Your answer: ${escapeHTML(chosen || "—")} · Correct answer: ${escapeHTML(q.answer)} — ${correctText}</p>` : `<p>Your answer: ${escapeHTML(chosen || "—")} · This question has no answer key and was not graded.</p>`;
        const questionContent = q.questionHtml ? sanitizeMcqMarkup(q.questionHtml) : escapeHTML(q.question);
        return `<div class="mcq-review-item ${!hasKey || !chosen ? "is-ungraded" : correct ? "is-correct" : "is-wrong"}"><strong>${index + 1}. ${questionContent}</strong> ${badge}${answerLine}${q.explanation ? `<p>${escapeHTML(q.explanation)}</p>` : ""}</div>`;
      }).join("");
      const percentage = graded ? Math.round(score / graded * 100) : 0;
      const timestamp = new Date().toISOString();
      const attempt = { timestamp, date: timestamp, score, total: questions.length, percentage, answered: answered.length, graded, ungraded: questions.length - graded };
      const attempts = getMcqHistory(activeMcqNoteId);
      attempts.unshift(attempt);
      saveMcqHistory(activeMcqNoteId, attempts);
      // Replacing the form locks all submitted answers against further changes.
      $("#mcqQuizArea").innerHTML = `<div class="mcq-result"><h3>Score: ${score}/${graded} graded (${percentage}%)</h3><p>${answered.length}/${questions.length} answered · ${graded}/${questions.length} graded · ${questions.length - graded} without answer keys. ${unanswered ? `${unanswered} unanswered. ` : ""}${percentage === 100 && graded ? "Excellent work!" : "Review the answers and try again."}</p></div>${review}<button class="secondary-button" id="retryMcqBtn" type="button">Retake quiz</button>`;
      $("#retryMcqBtn").addEventListener("click", startMcqPractice);
      renderMcqHistory();
    });
  }
  function renderMcqHistory() {
    const attempts = getMcqHistory(activeMcqNoteId).slice().sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0));
    state.mcqAttempts[activeMcqNoteId] = attempts;
    const best = attempts.length ? Math.max(...attempts.map(a => Number(a.percentage) || 0)) : null;
    const average = attempts.length ? Math.round(attempts.reduce((sum, a) => sum + (Number(a.percentage) || 0), 0) / attempts.length) : null;
    $("#mcqHistory").innerHTML = attempts.length ? `<div class="mcq-history-summary"><span>Attempts: <strong>${attempts.length}</strong></span><span>Best: <strong>${best}%</strong></span><span>Average: <strong>${average}%</strong></span><button type="button" class="secondary-button" id="clearMcqHistoryBtn">Clear history</button></div><div class="mcq-history-list">${attempts.map((attempt, index) => `<div class="mcq-history-row"><span>Attempt ${attempts.length - index}</span><strong>${Number(attempt.score) || 0}/${Number(attempt.total) || 0} (${Number(attempt.percentage) || 0}%)</strong><time>${escapeHTML(formatDate(attempt.timestamp || attempt.date))}</time><button type="button" class="secondary-button mcq-retake-history" data-retake-mcq>Retake</button></div>`).join("")}</div>` : '<p class="mcq-empty-history">No attempts yet. Complete a practice quiz and your score will appear here.</p>';
    $("#clearMcqHistoryBtn")?.addEventListener("click", () => {
      if (!confirm("Clear all attempt history for this note? This cannot be undone.")) return;
      saveMcqHistory(activeMcqNoteId, []);
      try { localStorage.removeItem(`mcq_history_${activeMcqNoteId}`); } catch (error) { console.warn(error); }
      renderMcqHistory();
    });
    $("#mcqHistory").querySelectorAll("[data-retake-mcq]").forEach(button => button.addEventListener("click", startMcqPractice));
  }


  function openPreview(id) {
    const note = state.notes.find(item => item.id === id);
    if (!note) return;
    previewingId = id;
    const imageURL = safeImageURL(note.imageUrl);
    els.previewContent.innerHTML = `
      <span class="topic-pill">${escapeHTML(note.topic || "Uncategorized")}</span>
      <h1>${escapeHTML(note.title)}</h1>
      <div class="preview-mindmap-row"><button class="mindmap-link mindmap-link-prominent" type="button" data-open-note-mindmap="${escapeHTML(note.id)}">✧ Open this note's mind map →</button> <button class="mcq-link mcq-link-prominent" type="button" data-open-note-mcq="${escapeHTML(note.id)}">▣ Practice MCQs →</button></div>
      <p class="preview-meta">Last edited ${escapeHTML(formatDate(note.updatedAt))} ${note.favorite ? " · ★ Favorite" : ""}</p>
      ${note.summary ? `<p class="preview-summary">${escapeHTML(note.summary)}</p>` : ""}
      ${imageURL ? `<img class="note-image" src="${escapeHTML(imageURL)}" alt="${escapeHTML(note.imageAlt || note.title)}">` : ""}
     <div class="preview-body">
    ${
        note.bodyFormat === "html"
            ? DOMPurify.sanitize(note.body || "")
            : markdownToHTML(note.body || "")
    }
</div>
  ${(note.tags || []).length ? `<div class="tag-list">${note.tags.map(tag => `<span class="tag">#${escapeHTML(tag)}</span>`).join("")}</div>` : ""}`;
    els.previewDialog.showModal();
  }
  function exportBackup() {
    const blob = new Blob([JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      ...state,
      topicTitles: state.topicTitles,
      topicCreatedAt: state.topicCreatedAt,
      diagrams: state.diagrams,
      drawioDiagrams: state.drawioDiagrams
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `learnspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }
  function validateImportedMcqs(rawMcqs, notes) {
    const validNoteIds = new Set(notes.map(note => note.id));
    const cleaned = {};
    if (!rawMcqs || typeof rawMcqs !== "object" || Array.isArray(rawMcqs)) return cleaned;
    for (const [noteId, bank] of Object.entries(rawMcqs)) {
      if (!validNoteIds.has(noteId) || !Array.isArray(bank)) continue;
      const valid = bank.filter(q => q && typeof q.question === "string" && q.question.trim() && Array.isArray(q.options) && q.options.length >= 2)
        .map((q, i) => {
          const seen = new Set();
          const options = q.options.filter(o => o && /^[A-D]$/.test(String(o.key || "").toUpperCase()) && typeof o.text === "string" && o.text.trim())
            .map(o => ({
              key: String(o.key).toUpperCase(),
              text: o.text.trim(),
              ...(typeof o.html === "string" ? { html: sanitizeMcqMarkup(o.html) } : {})
            }))
            .filter(o => !seen.has(o.key) && seen.add(o.key));
          const answer = String(q.answer || "").toUpperCase();
          if (options.length < 2) return null;
          return {
            id: `q_${i + 1}`,
            question: q.question.trim(),
            ...(typeof q.questionHtml === "string" ? { questionHtml: sanitizeMcqMarkup(q.questionHtml) } : {}),
            ...(q.source === "html" ? { source: "html" } : {}),
            options,
            answer: options.some(o => o.key === answer) ? answer : "",
            explanation: typeof q.explanation === "string" ? q.explanation : ""
          };
        }).filter(Boolean);
      if (valid.length) cleaned[noteId] = valid;
    }
    return cleaned;
  }
  function validateImportedAttempts(rawAttempts, notes) {
    const validNoteIds = new Set(notes.map(note => note.id));
    const cleaned = {};
    if (!rawAttempts || typeof rawAttempts !== "object" || Array.isArray(rawAttempts)) return cleaned;
    for (const [noteId, list] of Object.entries(rawAttempts)) {
      if (!validNoteIds.has(noteId) || !Array.isArray(list)) continue;
      cleaned[noteId] = list.map(a => {
        if (!a || typeof (a.timestamp || a.date) !== "string" || Number.isNaN(Date.parse(a.timestamp || a.date))) return null;
        const total = Number(a.total), score = Number(a.score), graded = Number(a.graded ?? a.total);
        const answered = Number(a.answered ?? a.total), percentage = Number(a.percentage);
        if (![total, score, graded, answered, percentage].every(Number.isFinite) || total < 0 || graded < 0 || graded > total || score < 0 || score > graded || answered < 0 || answered > total || percentage < 0 || percentage > 100) return null;
        return { timestamp: a.timestamp || a.date, date: a.timestamp || a.date, score, total, answered, graded, ungraded: Number.isFinite(Number(a.ungraded)) ? Number(a.ungraded) : total - graded, percentage };
      }).filter(Boolean);
    }
    return cleaned;
  }
  function importBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || !Array.isArray(data.notes) || !Array.isArray(data.topics)) throw new Error("This file does not look like a LearnSpace backup.");
        if (!confirm(`Import ${data.notes.length} notes and ${data.topics.length} topics? This replaces the notes currently in this browser.`)) return;
        state = {
          topics: [...new Set(data.topics.filter(topic => typeof topic === "string").map(topic => topic.trim()).filter(Boolean))],
          topicTitles: data.topicTitles && typeof data.topicTitles === "object" ? data.topicTitles : {},
          topicCreatedAt: data.topicCreatedAt && typeof data.topicCreatedAt === "object" ? data.topicCreatedAt : {},
          diagrams: data.diagrams && typeof data.diagrams === "object" ? data.diagrams : {},
          drawioDiagrams: data.drawioDiagrams && typeof data.drawioDiagrams === "object" ? data.drawioDiagrams : {},
          mcqs: {},
          mcqAttempts: {},
          notes: data.notes.filter(note => note && typeof note.title === "string").map(note => ({
            id: String(note.id || makeId()), title: note.title, topic: String(note.topic || data.topics[0] || "Uncategorized"),
            tags: Array.isArray(note.tags) ? note.tags.map(String) : [], summary: String(note.summary || ""),
            body: String(note.body || ""),
            bodyFormat: note.bodyFormat === "html" ? "html" : "markdown",
            imageUrl: safeImageURL(String(note.imageUrl || "")),
            imageAlt: String(note.imageAlt || ""),
            favorite: Boolean(note.favorite),
            createdAt: typeof note.createdAt === "string" && !Number.isNaN(Date.parse(note.createdAt))
              ? note.createdAt
              : new Date().toISOString(),
            updatedAt: typeof note.updatedAt === "string" && !Number.isNaN(Date.parse(note.updatedAt))
              ? note.updatedAt
              : note.createdAt || new Date().toISOString()
          }))
        };
        state.mcqs = validateImportedMcqs(data.mcqs, state.notes);
        state.mcqAttempts = validateImportedAttempts(data.mcqAttempts, state.notes);
        // The imported application state is authoritative; clear stale legacy keys and synchronize it.
        try {
          for (const key of Object.keys(localStorage)) if (key.startsWith("mcq_history_")) localStorage.removeItem(key);
          for (const [noteId, attempts] of Object.entries(state.mcqAttempts)) localStorage.setItem(`mcq_history_${noteId}`, JSON.stringify(attempts));
        } catch (error) { console.warn("Could not synchronize imported MCQ history", error); }
        persist(); setFilter("all"); showToast("Backup imported successfully");
      } catch (error) { alert("Could not import backup: " + error.message); }
      finally { els.importInput.value = ""; }
    };
    reader.readAsText(file);
  }

  els.newNoteBtn.addEventListener("click", () => openEditor());
  els.topNewNoteBtn.addEventListener("click", () => openEditor());
  els.emptyCreateBtn.addEventListener("click", () => openEditor());
  els.noteForm.addEventListener("submit", saveNote);
  $("#closeEditorBtn").addEventListener("click", closeEditor);
  $("#cancelEditorBtn").addEventListener("click", closeEditor);
  els.deleteNoteBtn.addEventListener("click", () => editingId && deleteNote(editingId));
  $("#closePreviewBtn").addEventListener("click", () => els.previewDialog.close());
  $("#previewCloseFooter").addEventListener("click", () => els.previewDialog.close());
  els.editFromPreviewBtn.addEventListener("click", () => {
    const note = state.notes.find(item => item.id === previewingId);
    els.previewDialog.close(); if (note) openEditor(note);
  });
  $("#addTopicBtn").addEventListener("click", () => { els.topicName.value = ""; els.topicDialog.showModal(); setTimeout(() => els.topicName.focus(), 40); });
  $("#closeTopicBtn").addEventListener("click", () => els.topicDialog.close());
  $("#cancelTopicBtn").addEventListener("click", () => els.topicDialog.close());
  els.topicForm.addEventListener("submit", event => {
    event.preventDefault();
    const topic = els.topicName.value.trim();
    if (!topic) return;
    if (state.topics.some(item => item.toLowerCase() === topic.toLowerCase())) { alert("That topic already exists."); return; }
    state.topics.push(topic);
    state.topicTitles[topic] = "";
    state.topicCreatedAt[topic] = new Date().toISOString();
    persist(); els.topicDialog.close(); render();
  });
  document.querySelectorAll(".nav-item[data-filter]").forEach(button => button.addEventListener("click", () => {
    showNotesWorkspace();
    setFilter(button.dataset.filter);
  }));
  $("#topicWorkspaceBtn").addEventListener("click", showTopicWorkspace);
  $("#workspaceAddTopic").addEventListener("click", () => $("#addTopicBtn").click());
  $("#closeMcqBtn").addEventListener("click", () => mcqDialog.close());
  $("#mcqHtmlUploadBtn").addEventListener("click", () => $("#mcqHtmlFile").click());
  $("#clearMcqHtmlBtn").addEventListener("click", clearMcqHtmlQuiz);
  $("#mcqHtmlFile").addEventListener("change", async event => {
    const input = event.currentTarget;
    const file = input.files[0];
    if (!file) return;
    const status = $("#mcqHtmlStatus");
    const isHtmlFile = /\.html?$/i.test(file.name);
    if (!isHtmlFile) {
      status.textContent = "Choose an .html or .htm file.";
      input.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      status.textContent = "The HTML file is too large. Maximum size is 2 MB.";
      input.value = "";
      return;
    }
    try {
      const source = await file.text();
      const result = parseMcqHtml(source);
      if (!result.questions.length) {
        status.textContent = `No valid questions found. ${result.issues.join(" ") || 'Use question containers with question text, 2–4 options, and a correct answer marked by data-correct="true", class="correct", or data-answer="A".'}`;
        return;
      }
      state.mcqs[activeMcqNoteId] = result.questions;
      persist();
      mcqHtmlMode = true;
      mcqSavedText = "";
      mcqEditorDirty = false;
      activeMcqAnswers = {};
      $("#mcqEditorSection").hidden = true;
      $("#mcqQuizArea").innerHTML = "";
      $("#mcqSaveStatus").textContent = "";
      updateMcqCount();
      $("#clearMcqHtmlBtn").hidden = false;
      status.textContent = `${result.questions.length} question(s) loaded from ${file.name}. Questions and answers are hidden until you start practice.${result.issues.length ? ` ${result.issues.length} invalid block(s) were skipped.` : ""}`;
    } catch (error) {
      status.textContent = `Could not load ${file.name}: ${error.message}`;
      showToast("Could not load the selected HTML quiz");
    } finally {
      input.value = "";
    }
  });
  $("#insertSampleMcqBtn").addEventListener("click", () => {
    $("#mcqInput").value = `1. What does HTML stand for?\nA) HyperText Markup Language\nB) HighText Machine Language\nC) HyperTool Multi Language\nD) Home Tool Markup Language\nAnswer: A\n\n2. Which language adds interactivity to web pages?\nA) CSS\nB) JavaScript\nC) SQL\nD) Markdown\nAnswer: B`;
    mcqEditorDirty = $("#mcqInput").value !== mcqSavedText;
    $("#startMcqBtn").disabled = false;
    $("#mcqSaveStatus").textContent = "Sample questions inserted. Click Start practice to save and begin.";
    $("#mcqInput").focus();
  });
  $("#saveMcqsBtn").addEventListener("click", saveMcqs);
  $("#mcqInput").addEventListener("input", () => {
    mcqEditorDirty = $("#mcqInput").value !== mcqSavedText;
    $("#startMcqBtn").disabled = !$("#mcqInput").value.trim() && !(state.mcqs[activeMcqNoteId] || []).length;
  });
  $("#startMcqBtn").addEventListener("click", startMcqPractice);

  els.previewContent.addEventListener("click", event => {
    const mcqButton = event.target.closest("[data-open-note-mcq]");
    if (mcqButton) { event.preventDefault(); openMcqPage(mcqButton.dataset.openNoteMcq); }
  });
  $("#workspaceTableBody").addEventListener("click", event => {
    const mcqButton = event.target.closest("[data-open-note-mcq]");
    const diagramButton = event.target.closest("[data-open-diagram]");
    if (mcqButton) openMcqPage(mcqButton.dataset.openNoteMcq);
    else if (diagramButton) openNoteDiagram(diagramButton.dataset.openDiagram);
  });
  $("#backToTopics").addEventListener("click", () => {
    // diagrams.net autosaves XML continuously; return to the note register.
    closeDrawioEditor();
  });
  $("#diagramTemplates").addEventListener("click", () => {
    if (drawioReady) drawioPost({ action: "template", callback: false });
    else showToast("The diagram editor is still loading");
  });
  $("#exportDiagramPng").addEventListener("click", () => requestDiagramExport("png"));
  $("#exportDiagramSvg").addEventListener("click", () => requestDiagramExport("svg"));
  $("#exportDiagramXml").addEventListener("click", () => requestDiagramExport("xml"));
  $("#saveDiagram").addEventListener("click", saveAndCloseDiagram);
  els.topicList.addEventListener("click", event => {
    const button = event.target.closest("[data-topic]");
    if (button) {
      showNotesWorkspace();
      setFilter("all", button.dataset.topic);
    }
  });
  els.previewContent.addEventListener("click", event => {
    const mindMapButton = event.target.closest("[data-open-note-mindmap]");
    if (!mindMapButton) return;
    event.preventDefault();
    openNoteDiagram(mindMapButton.dataset.openNoteMindmap);
  });
  els.notesGrid.addEventListener("click", event => {
    const mcqButton = event.target.closest("[data-open-note-mcq]");
    const mindMapButton = event.target.closest("[data-open-note-mindmap]");
    const favoriteButton = event.target.closest("[data-favorite]");
    const editButton = event.target.closest("[data-edit]");
    const card = event.target.closest("[data-open-note]");
    if (mcqButton) { event.preventDefault(); event.stopPropagation(); openMcqPage(mcqButton.dataset.openNoteMcq); return; }
    if (mindMapButton) { event.preventDefault(); event.stopPropagation(); openNoteDiagram(mindMapButton.dataset.openNoteMindmap); return; }
    if (favoriteButton) { event.preventDefault(); event.stopPropagation(); const note = state.notes.find(item => item.id === favoriteButton.dataset.favorite); if (note) { note.favorite = !note.favorite; note.updatedAt = new Date().toISOString(); persist(); render(); } return; }
    if (editButton) { event.preventDefault(); event.stopPropagation(); const note = state.notes.find(item => item.id === editButton.dataset.edit); if (note) openEditor(note); return; }
    if (card) openPreview(card.dataset.openNote);
  });
  els.notesGrid.addEventListener("keydown", event => {
    const card = event.target.closest("[data-open-note]");
    if (card && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openPreview(card.dataset.openNote); }
  });
  els.searchInput.addEventListener("input", renderNotes);
  els.clearSearchBtn.addEventListener("click", () => {
    els.searchInput.value = "";
    els.searchInput.focus();
    renderNotes();
  });
  els.sortSelect.addEventListener("change", renderNotes);
  els.themeToggle.addEventListener("click", () => {
    const theme = document.body.classList.contains("dark-theme") ? "light" : "dark";
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
  });
  $("#exportBtn").addEventListener("click", exportBackup);
  els.importInput.addEventListener("change", () => importBackup(els.importInput.files[0]));
  [els.editorDialog, els.previewDialog, els.topicDialog].forEach(dialog => dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  }));

  applyTheme(localStorage.getItem(THEME_KEY) || "light");
  render();
})();
