(() => {
  "use strict";

  const STORAGE_KEY = "learnspace-notes-v1";
  const DEFAULT_TOPICS = ["Python", "Git", "Playwright", "API Testing", "AI & ML", "System Design"];
  const $ = (selector) => document.querySelector(selector);
  const els = {
    newNoteBtn: $("#newNoteBtn"), topNewNoteBtn: $("#topNewNoteBtn"), emptyCreateBtn: $("#emptyCreateBtn"),
    notesGrid: $("#notesGrid"), emptyState: $("#emptyState"), emptyTitle: $("#emptyTitle"), emptyMessage: $("#emptyMessage"),
    allCount: $("#allCount"), statNotes: $("#statNotes"), statTopics: $("#statTopics"), statFavorites: $("#statFavorites"),
    topicList: $("#topicList"), pageTitle: $("#pageTitle"), breadcrumbCurrent: $("#breadcrumbCurrent"),
    listHeading: $("#listHeading"), listDescription: $("#listDescription"), searchInput: $("#searchInput"), sortSelect: $("#sortSelect"),
    editorDialog: $("#editorDialog"), noteForm: $("#noteForm"), editorHeading: $("#editorHeading"), noteTitle: $("#noteTitle"),
    noteTopic: $("#noteTopic"), noteTags: $("#noteTags"), noteSummary: $("#noteSummary"), noteBody: $("#noteBody"),
    imageUrl: $("#imageUrl"), imageAlt: $("#imageAlt"), deleteNoteBtn: $("#deleteNoteBtn"), saveStatus: $("#saveStatus"),
    previewDialog: $("#previewDialog"), previewContent: $("#previewContent"), editFromPreviewBtn: $("#editFromPreviewBtn"),
    topicDialog: $("#topicDialog"), topicForm: $("#topicForm"), topicName: $("#topicName"), importInput: $("#importInput")
  };

  let state = loadState();
  let activeFilter = "all";
  let activeTopic = "";
  let editingId = null;
  let previewingId = null;

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
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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
    notes.sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) :
      sort === "created" ? timeValue(b.createdAt) - timeValue(a.createdAt) :
      timeValue(b.updatedAt) - timeValue(a.updatedAt));
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
    }
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
        <div class="note-card-footer"><span>◷ ${escapeHTML(formatDate(note.updatedAt))}</span><span>↗ Open note</span></div>
      </article>`;
    }).join("");
    renderStats();
  }
  function render() { renderTopics(); renderNotes(); }
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
    els.noteBody.value = note?.body || "";
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
      summary: els.noteSummary.value.trim(), body: els.noteBody.value,
      imageUrl: safeImageURL(els.imageUrl.value.trim()), imageAlt: els.imageAlt.value.trim(),
      favorite: existing?.favorite || false, createdAt: existing?.createdAt || now, updatedAt: now
    };
    if (existing) state.notes = state.notes.map(item => item.id === existing.id ? note : item);
    else state.notes.unshift(note);
    persist(); closeEditor(); render();
  }
  function deleteNote(id) {
    const note = state.notes.find(item => item.id === id);
    if (!note || !confirm(`Delete "${note.title}"? This cannot be undone unless you have a backup.`)) return;
    state.notes = state.notes.filter(item => item.id !== id);
    persist(); closeEditor(); els.previewDialog.close(); render();
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
  function openPreview(id) {
    const note = state.notes.find(item => item.id === id);
    if (!note) return;
    previewingId = id;
    const imageURL = safeImageURL(note.imageUrl);
    els.previewContent.innerHTML = `
      <span class="topic-pill">${escapeHTML(note.topic || "Uncategorized")}</span>
      <h1>${escapeHTML(note.title)}</h1>
      <p class="preview-meta">Last edited ${escapeHTML(formatDate(note.updatedAt))} ${note.favorite ? " · ★ Favorite" : ""}</p>
      ${note.summary ? `<p class="preview-summary">${escapeHTML(note.summary)}</p>` : ""}
      ${imageURL ? `<img class="note-image" src="${escapeHTML(imageURL)}" alt="${escapeHTML(note.imageAlt || note.title)}">` : ""}
      <div class="preview-body">${markdownToHTML(note.body)}</div>
      ${(note.tags || []).length ? `<div class="tag-list">${note.tags.map(tag => `<span class="tag">#${escapeHTML(tag)}</span>`).join("")}</div>` : ""}`;
    els.previewDialog.showModal();
  }
  function exportBackup() {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `learnspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
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
          notes: data.notes.filter(note => note && typeof note.title === "string").map(note => ({
            id: String(note.id || makeId()), title: note.title, topic: String(note.topic || data.topics[0] || "Uncategorized"),
            tags: Array.isArray(note.tags) ? note.tags.map(String) : [], summary: String(note.summary || ""),
            body: String(note.body || ""), imageUrl: safeImageURL(String(note.imageUrl || "")), imageAlt: String(note.imageAlt || ""),
            favorite: Boolean(note.favorite), createdAt: note.createdAt || new Date().toISOString(), updatedAt: note.updatedAt || new Date().toISOString()
          }))
        };
        persist(); setFilter("all"); alert("Backup imported successfully.");
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
    state.topics.push(topic); persist(); els.topicDialog.close(); render();
  });
  document.querySelectorAll(".nav-item[data-filter]").forEach(button => button.addEventListener("click", () => setFilter(button.dataset.filter)));
  els.topicList.addEventListener("click", event => {
    const button = event.target.closest("[data-topic]");
    if (button) setFilter("all", button.dataset.topic);
  });
  els.notesGrid.addEventListener("click", event => {
    const favoriteButton = event.target.closest("[data-favorite]");
    const editButton = event.target.closest("[data-edit]");
    const card = event.target.closest("[data-open-note]");
    if (favoriteButton) {
      event.stopPropagation();
      const note = state.notes.find(item => item.id === favoriteButton.dataset.favorite);
      if (note) { note.favorite = !note.favorite; note.updatedAt = new Date().toISOString(); persist(); render(); }
    } else if (editButton) {
      event.stopPropagation();
      const note = state.notes.find(item => item.id === editButton.dataset.edit);
      if (note) openEditor(note);
    } else if (card) openPreview(card.dataset.openNote);
  });
  els.notesGrid.addEventListener("keydown", event => {
    const card = event.target.closest("[data-open-note]");
    if (card && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openPreview(card.dataset.openNote); }
  });
  els.searchInput.addEventListener("input", renderNotes);
  els.sortSelect.addEventListener("change", renderNotes);
  $("#exportBtn").addEventListener("click", exportBackup);
  els.importInput.addEventListener("change", () => importBackup(els.importInput.files[0]));
  [els.editorDialog, els.previewDialog, els.topicDialog].forEach(dialog => dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  }));

  render();
})();

/* ===== SALE POPUP: START ===== */

const salePopup = document.getElementById("salePopup");
const closeSale = document.getElementById("closeSale");

if (salePopup && closeSale) {
  const hideSalePopup = () => { salePopup.style.display = "none"; };

  closeSale.addEventListener("click", hideSalePopup);

  salePopup.addEventListener("click", (event) => {
    if (event.target === salePopup) hideSalePopup();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideSalePopup();
  });
}

/* ===== SALE POPUP: END ===== */
