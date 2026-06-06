console.log("✅ library.js — ПОЛНАЯ ВЕРСИЯ ВОССТАНОВЛЕНА");

let currentSelectedTextId = null;

// ====================== ЗАГРУЗКА БИБЛИОТЕКИ ======================
window.loadLibrary = async function() {
    console.log("🟡 Загрузка библиотеки...");
    try {
        const res = await fetch('/api/library/');
        if (!res.ok) return;
        const texts = await res.json();
        const list = document.getElementById('libraryList');
        if (!list) return;
        list.innerHTML = texts.length ? '' : '<div class="text-gray-500 text-center p-4">📭 Пусто</div>';
        texts.forEach(text => {
            const div = document.createElement('div');
            div.className = `library-item p-3 border rounded-lg mb-2 transition-colors ${window.currentEditId === text.id ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'}`;
            div.innerHTML = `
                <div class="flex justify-between items-start gap-2">
                    <div class="flex-1 cursor-pointer" onclick="window.selectTextFromLibrary(${text.id})">
                        <div class="font-bold text-sm">📄 ${window.escapeHtml(text.title || 'Без названия')}</div>
                        <div class="text-xs text-gray-500 mt-1 line-clamp-2">${window.escapeHtml((text.content || '').slice(0, 85))}</div>
                    </div>
                    <div class="flex flex-col gap-1">
                        <button onclick="window.showEditModalForId(${text.id}); event.stopImmediatePropagation();" class="text-amber-600 hover:text-amber-700 text-xs px-2 py-1">✏️</button>
                        <button onclick="window.deleteText(${text.id}, event)" class="text-red-500 hover:text-red-700 text-xs px-2 py-1">🗑️</button>
                    </div>
                </div>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error("Ошибка loadLibrary:", e);
    }
};

// ====================== ТОГГЛ ПАНЕЛИ БИБЛИОТЕКИ ======================
window.toggleLibraryPanel = function() {
    const panel = document.getElementById('library-panel-container');
    if (panel) panel.style.right = panel.style.right === '0px' ? '-288px' : '0px';
};

// ====================== ВЫБОР И ЗАГРУЗКА ======================
window.selectTextFromLibrary = function(id) { currentSelectedTextId = id; document.getElementById('modeSelectorModal').classList.remove('hidden'); };
window.closeModeSelector = () => document.getElementById('modeSelectorModal').classList.add('hidden');
window.openInReader = async () => { window.closeModeSelector(); if(currentSelectedTextId) await window.loadTextInMode(currentSelectedTextId, 'simple'); };
window.openInParallel = async () => { window.closeModeSelector(); if(currentSelectedTextId) await window.loadTextInMode(currentSelectedTextId, 'parallel'); };
window.openInMatch = async () => { window.closeModeSelector(); if(currentSelectedTextId) await window.loadTextInMode(currentSelectedTextId, 'match'); };

window.loadTextInMode = async function(id, mode) {
    const res = await fetch(`/api/library/${id}`);
    const data = await res.json();
    window.currentOriginalText = data.content || '';
    window.currentTranslationText = data.translation || '';
    window.currentEditId = data.id;
    await window.showTab(mode);
};

// ====================== РЕДАКТИРОВАНИЕ (рабочая версия) ======================
window.showEditModalForId = async function(id) {
    const res = await fetch(`/api/library/${id}`);
    const text = await res.json();
    window.currentOriginalText = text.content || '';
    window.currentTranslationText = text.translation || '';
    window.currentEditId = text.id;
    window.showEditModal();
};

window.showEditModal = function() {
    const modal = document.getElementById('editTextModal');
    if (!modal) return alert("Модальное окно не найдено");
    document.getElementById('edit-original').value = window.currentOriginalText || '';
    document.getElementById('edit-translation').value = window.currentTranslationText || '';
    document.getElementById('edit-modal-id').textContent = window.currentEditId ? `#${window.currentEditId}` : 'новый';
    modal.classList.remove('hidden'); modal.classList.add('flex');
};

window.closeEditModal = function() {
    const modal = document.getElementById('editTextModal');
    modal.classList.add('hidden'); modal.classList.remove('flex');
};

window.saveEditedText = async function() {
    const content = document.getElementById('edit-original').value;
    const translation = document.getElementById('edit-translation').value;
    const title = "Отредактированный текст";
    const res = await fetch(window.currentEditId ? `/api/library/${window.currentEditId}` : '/api/library', {
        method: window.currentEditId ? 'PUT' : 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({title, content, translation})
    });
    if (res.ok) {
        alert("✅ Сохранено!");
        window.closeEditModal();
        window.loadLibrary();
        window.formatAllText();
    }
};

window.deleteText = async function(id, event) {
    if (event) event.stopImmediatePropagation();
    if (confirm("Удалить?")) {
        await fetch(`/api/library/${id}`, {method: 'DELETE'});
        window.loadLibrary();
    }
};

console.log("✅ library.js полностью восстановлен + редактирование работает");