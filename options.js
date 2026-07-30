const DEFAULT_COOKIE_NAMES = ['__machineid__', 'secid'];
const DEFAULT_OPEN_MODE = 'sameTab';

const tbody = document.getElementById('rows');
const addBtn = document.getElementById('add');
const openModeSelect = document.getElementById('open-mode');

let names = [];

async function load() {
  const { cookieNames, openMode } = await chrome.storage.sync.get({
    cookieNames: DEFAULT_COOKIE_NAMES,
    openMode: DEFAULT_OPEN_MODE
  });
  names = cookieNames.slice();
  openModeSelect.value = openMode;
  render();
}

async function save() {
  await chrome.storage.sync.set({ cookieNames: names });
}

function render() {
  tbody.textContent = '';
  if (names.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 2;
    td.className = 'empty';
    td.textContent = 'No cookies configured.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  names.forEach((name, i) => tbody.appendChild(buildRow(name, i)));
}

function buildRow(name, index) {
  const tr = document.createElement('tr');

  const nameTd = document.createElement('td');
  nameTd.className = 'name-cell';
  nameTd.textContent = name;
  nameTd.addEventListener('dblclick', () => edit(nameTd, index));

  const actionsTd = document.createElement('td');
  actionsTd.className = 'actions-cell';
  const remove = document.createElement('button');
  remove.className = 'remove';
  remove.type = 'button';
  remove.textContent = '×';
  remove.title = 'Remove';
  remove.addEventListener('click', () => {
    names.splice(index, 1);
    save();
    render();
  });
  actionsTd.appendChild(remove);

  tr.appendChild(nameTd);
  tr.appendChild(actionsTd);
  return tr;
}

// Replace a name cell with an input. `index === null` means a fresh blank row:
// committing empty discards it rather than saving an empty entry.
function edit(cell, index) {
  const original = index === null ? '' : names[index];
  const input = document.createElement('input');
  input.type = 'text';
  input.value = original;

  cell.textContent = '';
  cell.appendChild(input);
  input.focus();
  input.select();

  let done = false;

  function commit() {
    if (done) return;
    done = true;
    const value = input.value.trim();

    // Reject empty and duplicates: revert to prior value, or discard a new row.
    const duplicate = value && names.some((n, i) => n === value && i !== index);
    if (!value || duplicate) {
      if (index === null) {
        render();          // discard the blank new row
      } else {
        render();          // revert to the stored value
      }
      return;
    }

    if (index === null) {
      names.push(value);
    } else {
      names[index] = value;
    }
    save();
    render();
  }

  function cancel() {
    if (done) return;
    done = true;
    render();
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  input.addEventListener('blur', commit);
}

addBtn.addEventListener('click', () => {
  // Append a blank row already in edit mode.
  const tr = document.createElement('tr');
  const nameTd = document.createElement('td');
  nameTd.className = 'name-cell';
  const actionsTd = document.createElement('td');
  actionsTd.className = 'actions-cell';
  tr.appendChild(nameTd);
  tr.appendChild(actionsTd);

  // If the table was showing the empty-state row, clear it first.
  if (names.length === 0) tbody.textContent = '';
  tbody.appendChild(tr);
  edit(nameTd, null);
});

// Autosave the open-mode dropdown on change — no Save button, matching the table.
openModeSelect.addEventListener('change', () => {
  chrome.storage.sync.set({ openMode: openModeSelect.value });
});

load();
