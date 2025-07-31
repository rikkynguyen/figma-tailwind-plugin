import './style.scss';

function $(selector: string): HTMLElement | null {
  if (selector.startsWith('#')) {
    return document.getElementById(selector.slice(1));
  } else if (selector.startsWith('.')) {
    return document.querySelector(selector);
  }
  return null;
}

function showPage(id: string) {
  const pages = document.querySelectorAll('[data-page]');
  pages.forEach(p => p.setAttribute('hidden', 'true'));
  const target = document.querySelector(`[data-page="${id}"]`);
  if (target) target.removeAttribute('hidden');
}

function show(el: HTMLElement | null) {
  if (el) el.style.display = "";
}

function hide(el: HTMLElement | null) {
  if (el) el.style.display = "none";
}

function showLoading(isLoading: boolean) {
  const spinner = $("#import-loading");
  if (spinner) spinner.style.display = isLoading ? "block" : "none";
}


function showFeedback(msg: string, isError = false) {
  showLoading(false);
  const feedback = $("#import-feedback");
  if (!feedback) return;
  feedback.textContent = msg;
  feedback.style.display = "block";
  feedback.style.color = isError ? "#ff4d4f" : "var(--color-accent)";
  setTimeout(() => { feedback.style.display = "none"; }, 4000);
}

function handleImportFile(file: File) {
  if (!file.name.endsWith(".json")) {
    showFeedback("Please select a .json file", true);
    return;
  }
  showLoading(true);
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const content = e.target?.result as string;
      JSON.parse(content); // validation
      parent.postMessage({ pluginMessage: { type: "import-json", content } }, "*");
      showLoading(false);
    } catch {
      showLoading(false);
      showFeedback("Invalid JSON file", true);
    }
  };
  reader.readAsText(file);
}

function detectAndApplyTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : '');
  const toggle = <HTMLInputElement>$(`#toggleTheme`);
  if (toggle) toggle.checked = prefersDark;
}

function updateSelectAll() {
  const boxes = document.querySelectorAll("#collections .collection-item input[type=checkbox]");
  const allChecked = Array.from(boxes).every(cb => (cb as HTMLInputElement).checked);
  const selectAll = $("#selectAll") as HTMLInputElement;
  if (selectAll) selectAll.checked = allChecked;
}

function renderCollections(collections: any[], variables: any[]) {
  const container = $("#collections");
  if (!container) return;

  container.innerHTML = "";
  const cardHeader = $(".card-header") as HTMLElement;
  const toggleWrapper = $("#selectAll")?.parentElement;
  const actions = $(".actions") as HTMLElement;

  if (!collections || collections.length === 0) {
    const empty = document.createElement("div");
    empty.style.padding = "1rem";
    empty.style.textAlign = "center";
    empty.style.color = "var(--color-muted)";
    empty.innerText = "No variable collections found.";
    container.appendChild(empty);
    if (cardHeader) cardHeader.style.display = "none";
    if (toggleWrapper) toggleWrapper.style.display = "none";
    if (actions) actions.style.display = "none";
    return;
  }

  if (cardHeader) cardHeader.style.display = "";
  if (toggleWrapper) toggleWrapper.style.display = "";
  if (actions) actions.style.display = "";

  collections.forEach(col => {
    const wrapper = document.createElement("label");
    wrapper.className = "collection-item";

    const label = document.createElement("span");
    label.textContent = col.name;
    wrapper.appendChild(label);

    const toggleWrapper = document.createElement("span");
    toggleWrapper.className = "toggle-wrapper";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = col.id;
    input.onchange = () => {
      input.checked ? selected.add(col.id) : selected.delete(col.id);
      updateSelectAll();
    };

    const slider = document.createElement("span");
    slider.className = "toggle-slider";

    toggleWrapper.appendChild(input);
    toggleWrapper.appendChild(slider);
    wrapper.appendChild(toggleWrapper);

    container.appendChild(wrapper);
  });

  showLoading(false);
}

function setupUI() {
  detectAndApplyTheme();

  const themeToggle = <HTMLInputElement>$(`#toggleTheme`);
  if (themeToggle) {
    themeToggle.onchange = () => {
      document.documentElement.setAttribute('data-theme', themeToggle.checked ? 'dark' : '');
    };
  }

  const importBtn = $("#btn-import");
  if (importBtn) {
    importBtn.onclick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = e => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          showLoading(true);
          readAndSendFile(file); // let it trigger import
        }
      };
      input.click();
    };
  }


  const exportBtn = $("#btn-export");
  if (exportBtn) {
    exportBtn.onclick = () => {
      showLoading(true);
      showPage('export');
      parent.postMessage({ pluginMessage: { type: 'get-collections' } }, '*');
    };
  }

  const generateBtn = $("#btn-generate");
  if (generateBtn) {
    generateBtn.onclick = () => {
      showLoading(true);
      parent.postMessage({ pluginMessage: { type: 'generate-preset' } }, '*');
    };
  }

  const backBtn = $("#btn-back");
  if (backBtn) {
    backBtn.onclick = () => showPage('home');
  }

  const selectAll = $("#selectAll");
  if (selectAll) {
    selectAll.onchange = () => {
      const checkboxes = document.querySelectorAll("#collections .collection-item input[type=checkbox]");
      checkboxes.forEach(cb => (cb as HTMLInputElement).checked = selectAll.checked);
    };
  }

  setupDragDrop();

  window.addEventListener('message', (event) => {
    const msg = event.data.pluginMessage;
    if (!msg) return;

    console.log("Message received from plugin:", msg);

    if (msg.type === "generate-feedback") {
      showLoading(false);
      showFeedback(msg.message || "Done", false);
      showPage('export'); // switch to export view now that new variables are ready
    }
    if (msg.type === "collections") {
      renderCollections(msg.collections, msg.variables);
    }
    if (msg.type === "loading") {
      showLoading(msg.loading);
    }
    if (msg.type === "import-feedback") {
      showLoading(false);
      showFeedback(msg.message || "Import done", msg.error);
      showPage('export');
    }
    if (msg.type === "refresh-collections") {
      parent.postMessage({ pluginMessage: { type: "get-collections" } }, "*");
    }
    if (msg.type === "download-css" || msg.type === "download-json") {
      const blob = new Blob([msg.content], { type: msg.type === "download-json" ? "application/json" : "text/css" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = msg.type === "download-json" ? "figma.json" : "tailwind-theme.css";
      a.click();
    }
  });
}

function setupDragDrop() {
  let dragging = 0;

  const dropOverlay = $(`#drop-overlay`);
  if (!dropOverlay) return;

  window.addEventListener('dragenter', e => {
    e.preventDefault();
    dragging++;
    dropOverlay.style.display = 'flex';
  });

  window.addEventListener('dragleave', e => {
    e.preventDefault();
    dragging--;
    if (dragging <= 0) {
      dropOverlay.style.display = 'none';
    }
  });

  window.addEventListener('dragover', e => e.preventDefault());

  window.addEventListener('drop', e => {
    e.preventDefault();
    dragging = 0;
    dropOverlay.style.display = 'none';

    const file = e.dataTransfer?.files?.[0];
    if (file) handleImportFile(file);
  });
}

function readAndSendFile(file: File) {
  showLoading(true);
  const reader = new FileReader();
  reader.onload = () => {
    parent.postMessage({
      pluginMessage: {
        type: 'import-json',
        content: reader.result,
      }
    }, '*');
  };
  reader.readAsText(file);
}

setupUI();
