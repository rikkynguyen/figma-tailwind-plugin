const selected = new Set();

document.getElementById("tab-export").onclick = () => {
  document.getElementById("export-tab").classList.add("active");
  document.getElementById("import-tab").classList.remove("active");
  document.getElementById("tab-export").classList.add("active");
  document.getElementById("tab-import").classList.remove("active");
};

document.getElementById("tab-import").onclick = () => {
  document.getElementById("export-tab").classList.remove("active");
  document.getElementById("import-tab").classList.add("active");
  document.getElementById("tab-import").classList.add("active");
  document.getElementById("tab-export").classList.remove("active");
};

document.getElementById("export-css").onclick = () => {
  parent.postMessage({
    pluginMessage: {
      type: "export-css",
      selected: Array.from(selected)
    }
  }, "*");
};

document.getElementById("export-json").onclick = () => {
  parent.postMessage({
    pluginMessage: {
      type: "export-json",
      selected: Array.from(selected)
    }
  }, "*");
};

document.getElementById("selectAll").onchange = (e) => {
  const checked = e.target.checked;
  const boxes = document.querySelectorAll("#collections .collection-item input[type=checkbox]");
  boxes.forEach(cb => {
    cb.checked = checked;
    checked ? selected.add(cb.value) : selected.delete(cb.value);
  });
};

function renderCollections(collections, variables) {
  const container = document.getElementById("collections");
  container.innerHTML = "";

  const cardHeader = document.querySelector(".card-header");
  const selectAllToggle = document.getElementById("selectAll").parentElement;
  const actions = document.querySelector(".actions");

  let filteredCollections = collections;

  if (!filteredCollections || filteredCollections.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.style.padding = "1rem";
    emptyMsg.style.textAlign = "center";
    emptyMsg.style.color = "var(--color-muted)";
    emptyMsg.textContent = "No variable collections or variables exist.";
    container.appendChild(emptyMsg);

    if (cardHeader) cardHeader.style.display = "none";
    if (selectAllToggle) selectAllToggle.style.display = "none";
    if (actions) actions.style.display = "none";
  } else {
    if (cardHeader) cardHeader.style.display = "";
    if (selectAllToggle) selectAllToggle.style.display = "";
    if (actions) actions.style.display = "";

    filteredCollections.forEach(col => {
      const wrapper = document.createElement("label");
      wrapper.className = "collection-item";

      const toggleWrapper = document.createElement("span");
      toggleWrapper.className = "toggle-wrapper";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = col.id;
      const slider = document.createElement("span");
      slider.className = "toggle-slider";

      input.onchange = () => {
        input.checked ? selected.add(col.id) : selected.delete(col.id);
        updateSelectAll();
      };

      const label = document.createElement("span");
      label.textContent = col.name;
      wrapper.appendChild(label);

      toggleWrapper.appendChild(input);
      toggleWrapper.appendChild(slider);
      wrapper.appendChild(toggleWrapper);

      container.appendChild(wrapper);
    });
  }

  setTimeout(() => {
    const height = Math.min(document.documentElement.scrollHeight, 650);
    parent.postMessage({
      pluginMessage: {
        type: "resize",
        width: 420,
        height
      }
    }, "*");
  }, 50);
}

function updateSelectAll() {
  const boxes = document.querySelectorAll("#collections .collection-item input[type=checkbox]");
  const allChecked = Array.from(boxes).every(cb => cb.checked);
  document.getElementById("selectAll").checked = allChecked;
}

document.getElementById("toggleTheme").onchange = (e) => {
  const dark = e.target.checked;
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "");
};

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  const isDark = e.matches;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : '');
  document.getElementById('toggleTheme').checked = isDark;
});


window.onload = () => {
  // Set initial theme based on system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const root = document.documentElement;
  root.setAttribute('data-theme', prefersDark ? 'dark' : '');
  document.getElementById('toggleTheme').checked = prefersDark;


  document.getElementById("tab-export").classList.add("active");
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  document.getElementById("toggleTheme").checked = isDark;
  parent.postMessage({
    pluginMessage: {
      type: "get-collections"
    }
  }, "*");
  setTimeout(() => {
    const height = document.documentElement.scrollHeight;
    parent.postMessage({
      pluginMessage: {
        type: "resize",
        width: 420,
        height
      }
    }, "*");
  }, 50);
};
// --- Import Variables Feature ---
const dropArea = document.getElementById("import-drop-area");
const fileInput = document.getElementById("import-file-input");
const feedback = document.getElementById("import-feedback");

const loading = document.getElementById("import-loading");

function showLoading(show) {
  loading.style.display = show ? "block" : "none";
}

function showFeedback(msg, isError = false) {
  showLoading(false);
  feedback.textContent = msg;
  feedback.style.display = "block";
  feedback.style.color = isError ? "#ff4d4f" : "var(--color-accent)";
  setTimeout(() => {
    feedback.style.display = "none";
  }, 4000);
}

dropArea.addEventListener("click", () => fileInput.click());

dropArea.addEventListener("dragover", e => {
  e.preventDefault();
  dropArea.style.background = "rgba(255,255,255,0.08)";
});
dropArea.addEventListener("dragleave", e => {
  e.preventDefault();
  dropArea.style.background = "";
});
dropArea.addEventListener("drop", e => {
  e.preventDefault();
  dropArea.style.background = "";
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    handleImportFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener("change", e => {
  if (fileInput.files && fileInput.files[0]) {
    handleImportFile(fileInput.files[0]);
  }
});

function handleImportFile(file) {
  if (!file.name.endsWith(".json")) {
    showFeedback("Please select a .json file", true);
    return;
  }
  showLoading(true); // <-- Show spinner immediately
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const content = e.target.result;
      // Validate JSON
      JSON.parse(content);
      parent.postMessage({
        pluginMessage: {
          type: "import-json",
          content
        }
      }, "*");
      // Spinner stays on until plugin responds with loading: false
    } catch (err) {
      showLoading(false); // Hide spinner on error
      showFeedback("Invalid JSON file", true);
    }
  };
  reader.readAsText(file);
}

// Listen for import result feedback and refresh-collections from plugin
window.addEventListener("message", event => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  if (msg.type === "collections") {
    renderCollections(msg.collections, msg.variables);
  }

  if (msg.type === "loading") {
    showLoading(msg.loading);
  }

  if (msg.type === "import-feedback") {
    showFeedback(msg.message, msg.error);
  }

  if (msg.type === "refresh-collections") {
    parent.postMessage({
      pluginMessage: {
        type: "get-collections"
      }
    }, "*");
  }

  if (msg.type === "download-css" || msg.type === "download-json") {
    const blob = new Blob([msg.content], {
      type: msg.type === "download-json" ? "application/json" : "text/css"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = msg.type === "download-json" ? "figma.json" : "tailwind-theme.css";
    a.click();
  }
});