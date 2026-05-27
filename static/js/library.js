console.log("✅ library.js загружен (модальное окно выбора режима возвращено)");

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
                        <button onclick="window.showEditModalForId(${text.id}); event.stopImmediatePropagation();"
                                class="text-amber-600 hover:text-amber-700 text-xs px-2 py-1" title="Редактировать">✏️</button>
                        <button onclick="window.deleteText(${text.id}, event)"
                                class="text-red-500 hover:text-red-700 text-xs px-2 py-1" title="Удалить">🗑️</button>
                    </div>
                </div>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error("Ошибка loadLibrary:", e);
    }
};

// ====================== ВЫБОР РЕЖИМА ======================
window.selectTextFromLibrary = function(id) {
    currentSelectedTextId = id;
    console.log(`📋 Выбран текст ID=${id} → показываем окно выбора режима`);

    const modal = document.getElementById('modeSelectorModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.closeModeSelector = function() {
    const modal = document.getElementById('modeSelectorModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

// ====================== ОТКРЫТИЕ В КОНКРЕТНОМ РЕЖИМЕ ======================
window.openInReader = async function() {
    window.closeModeSelector();
    if (!currentSelectedTextId) return;
    await window.loadTextInMode(currentSelectedTextId, 'simple');
};

window.openInParallel = async function() {
    window.closeModeSelector();
    if (!currentSelectedTextId) return;
    await window.loadTextInMode(currentSelectedTextId, 'parallel');
};

window.openInMatch = async function() {
    window.closeModeSelector();
    if (!currentSelectedTextId) return;
    await window.loadTextInMode(currentSelectedTextId, 'match');
};

// ====================== ЗАГРУЗКА ТЕКСТА В РЕЖИМ ======================
window.loadTextInMode = async function(id, mode = 'parallel') {
    console.log(`🔄 loadTextInMode → ID=${id}, режим=${mode}`);
    try {
        const res = await fetch(`/api/library/${id}`);
        if (!res.ok) throw new Error('Не удалось загрузить текст');

        const textData = await res.json();

        window.currentOriginalText = textData.content || '';
        window.currentTranslationText = textData.translation || '';
        window.currentEditId = textData.id;

        await window.showTab(mode);
        console.log(`✅ Текст #${id} открыт в режиме ${mode}`);
    } catch (e) {
        console.error(e);
        alert("Не удалось открыть текст");
    }
};

// ====================== РЕДАКТИРОВАНИЕ (остаётся) ======================
window.showEditModalForId = async function(id) {
    try {
        const res = await fetch(`/api/library/${id}`);
        const text = await res.json();
        window.currentOriginalText = text.content || '';
        window.currentTranslationText = text.translation || '';
        window.currentEditId = text.id;
        currentSelectedTextId = id;
        window.showEditModal();
    } catch(e) {
        alert("Не удалось загрузить текст для редактирования");
    }
};

window.showEditModal = function() { /* ... остаётся как было ... */ };
window.closeEditModal = function() { /* ... */ };
window.saveEditedText = async function() { /* ... */ };
window.refreshCurrentMode = function() { /* ... */ };
window.deleteText = async function(id, event) { /* ... */ };

console.log("✅ library.js — модальное окно выбора режима возвращено");
