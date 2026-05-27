console.log("✅ library.js загружен (исправленная версия с редактированием)");

let currentSelectedTextId = null;   // ← важно для модального окна выбора режима

window.loadLibrary = async function() {
    console.log("🟡 Загрузка библиотеки...");

    try {
        const res = await fetch('/api/library/');
        if (!res.ok) {
            console.error("❌ Ошибка загрузки библиотеки, статус:", res.status);
            return;
        }

        const texts = await res.json();
        console.log(`📚 Получено ${texts.length} текстов из БД`);

        const list = document.getElementById('libraryList');
        if (!list) {
            console.error("❌ #libraryList не найден");
            return;
        }

        if (!texts.length) {
            list.innerHTML = '<div class="text-gray-500 text-center p-4">📭 Пусто</div>';
            return;
        }

        list.innerHTML = '';

        texts.forEach(text => {
            const div = document.createElement('div');
            div.className = `library-item p-3 border rounded-lg mb-2 transition-colors ${window.currentEditId === text.id ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'}`;
            div.innerHTML = `
                <div class="flex justify-between items-start gap-2">
                    <div class="flex-1 cursor-pointer" onclick="window.loadTextInMode(${text.id})">
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

        console.log("✅ Библиотека успешно отображена");
    } catch (e) {
        console.error("💥 Критическая ошибка в loadLibrary:", e);
    }
};

// ====================== ЕДИНАЯ ЗАГРУЗКА ТЕКСТА ======================
window.loadTextInMode = async function(id, preferredMode = 'parallel') {
    console.log(`🔄 loadTextInMode → ID=${id}, режим=${preferredMode}`);

    try {
        const res = await fetch(`/api/library/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const textData = await res.json();

        window.currentOriginalText = textData.content || '';
        window.currentTranslationText = textData.translation || '';
        window.currentEditId = textData.id;

        currentSelectedTextId = id; // для совместимости с модальным окном

        await window.showTab(preferredMode);

        console.log(`✅ Текст #${id} успешно загружен`);
    } catch (e) {
        console.error("Ошибка loadTextInMode:", e);
        alert("Не удалось загрузить текст: " + e.message);
    }
};

// ====================== РЕДАКТИРОВАНИЕ ======================
window.showEditModalForId = async function(id) {
    if (!id) return;

    try {
        const res = await fetch(`/api/library/${id}`);
        const text = await res.json();

        window.currentOriginalText = text.content || '';
        window.currentTranslationText = text.translation || '';
        window.currentEditId = text.id;
        currentSelectedTextId = id;

        window.showEditModal();
    } catch(e) {
        console.error(e);
        alert("Не удалось загрузить текст для редактирования");
    }
};

window.showEditModal = function() {
    const modal = document.getElementById('editTextModal');
    if (!modal) return console.error("❌ editTextModal не найден");

    document.getElementById('edit-title').value = 'Текст ' + (window.currentEditId || '');
    document.getElementById('edit-original').value = window.currentOriginalText || '';
    document.getElementById('edit-translation').value = window.currentTranslationText || '';
    document.getElementById('edit-modal-id').textContent = `ID: ${window.currentEditId || '—'}`;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeEditModal = function() {
    const modal = document.getElementById('editTextModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.saveEditedText = async function() {
    if (!window.currentEditId) return alert("Нет ID текста");

    const title = document.getElementById('edit-title').value.trim() || 'Без названия';
    const content = document.getElementById('edit-original').value.trim();
    const translation = document.getElementById('edit-translation').value.trim();

    if (!content) return alert("Оригинальный текст не может быть пустым");

    try {
        const res = await fetch(`/api/library/${window.currentEditId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, translation })
        });

        if (!res.ok) throw new Error("Ошибка сервера");

        const updated = await res.json();
        console.log("✅ Текст обновлён:", updated);

        window.currentOriginalText = content;
        window.currentTranslationText = translation;

        alert("✅ Изменения сохранены!");
        window.closeEditModal();
        window.refreshCurrentMode();
        window.loadLibrary(); // обновляем список
    } catch (e) {
        console.error(e);
        alert("❌ Ошибка сохранения: " + e.message);
    }
};

// ====================== ВСПОМОГАТЕЛЬНЫЕ ======================
window.refreshCurrentMode = function() {
    console.log("🔄 refreshCurrentMode");
    const tabName = document.querySelector('.tab-active')?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
    if (!tabName) return;

    if (tabName === 'parallel' && typeof window.initParallelMode === 'function') {
        window.initParallelMode();
    } else if (tabName === 'match' && typeof window.loadMatchView === 'function') {
        window.loadMatchView();
    } else if (tabName === 'simple' && typeof window.processTextForReader === 'function') {
        window.processTextForReader();
    }
};

// Обратная совместимость
window.loadText = window.loadTextInMode;
window.openInReader = () => window.loadTextInMode(currentSelectedTextId || window.currentEditId, 'simple');
window.openInParallel = () => window.loadTextInMode(currentSelectedTextId || window.currentEditId, 'parallel');
window.openInMatch = () => window.loadTextInMode(currentSelectedTextId || window.currentEditId, 'match');

window.deleteText = async function(id, event) {
    event.stopImmediatePropagation();
    if (!confirm('Удалить этот текст и все его связи?')) return;

    try {
        await fetch(`/api/library/${id}`, { method: 'DELETE' });
        alert('✅ Текст удалён');
        window.loadLibrary();
        if (window.currentEditId === id) {
            window.currentEditId = null;
            window.currentOriginalText = '';
            window.currentTranslationText = '';
        }
    } catch(e) {
        console.error(e);
        alert('Ошибка удаления');
    }
};

// ====================== ЗАДВИГАЕМАЯ ПАНЕЛЬ БИБЛИОТЕКИ ======================
window.libraryPanelOpen = true;

window.toggleLibraryPanel = function() {
    window.libraryPanelOpen = !window.libraryPanelOpen;

    const container = document.getElementById('library-panel-container');
    if (!container) return;

    if (window.libraryPanelOpen) {
        container.style.transform = 'translateX(0)';
    } else {
        container.style.transform = 'translateX(100%)';
    }

    console.log("📚 Панель библиотеки:", window.libraryPanelOpen ? "открыта" : "закрыта");
};

// Автоматически открывать панель при загрузке
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const container = document.getElementById('library-panel-container');
        if (container) {
            container.style.transform = 'translateX(0)';
        }
    }, 300);
});

console.log("✅ library.js (исправленная) полностью готов");