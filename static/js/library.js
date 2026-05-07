console.log("✅ library.js загружен");

window.loadLibrary = async function() {
    console.log("🟡 Загрузка библиотеки");

    try {
        const res = await fetch('/api/library/');
        if (!res.ok) return;

        const texts = await res.json();
        const list = document.getElementById('libraryList');
        if (!list) return;

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
                    <div class="flex-1 cursor-pointer" style="word-break: break-word;" onclick="window.loadText(${text.id})">
                        <div class="font-bold text-sm">📄 ${window.escapeHtml(text.title)}</div>
                        <div class="text-xs text-gray-500 mt-1">${window.escapeHtml(text.content.slice(0, 80))}</div>
                    </div>
                    <button onclick="window.deleteText(${text.id}, event)" class="text-red-500 hover:text-red-700 flex-shrink-0" title="Удалить">🗑️</button>
                </div>
            `;
            list.appendChild(div);
        });

        console.log(`✅ Загружено ${texts.length} текстов`);
    } catch (e) {
        console.error("Ошибка loadLibrary:", e);
    }
};

window.loadText = async function(id) {
    console.log(`🟡 Загрузка текста ID: ${id}`);

    try {
        const res = await fetch(`/api/library/${id}`);
        if (!res.ok) throw new Error('Ошибка загрузки');

        const text = await res.json();

        window.currentOriginalText = text.content;
        window.currentTranslationText = text.translation || '';
        window.currentEditId = text.id;

        // Заполняем поля
        const inputText = document.getElementById('inputText');
        const inputTranslation = document.getElementById('inputTranslation');
        if (inputText) inputText.value = window.currentOriginalText;
        if (inputTranslation) inputTranslation.value = window.currentTranslationText;

        // ✅ ПРАВИЛЬНОЕ ИМЯ ФУНКЦИИ
        if (window.loadMatchesFromDB) {
            await window.loadMatchesFromDB();
        } else {
            console.warn("loadMatchesFromDB не найдена, пытаемся использовать loadMatches");
            if (window.loadMatches) await window.loadMatches();
        }

        // Переключаем на параллельный режим
        if (window.showTab) {
            await window.showTab('parallel');
        }

        console.log(`✅ Загружен текст: ${text.title}`);
    } catch (e) {
        console.error("Ошибка loadText:", e);
        alert('Ошибка загрузки текста: ' + e.message);
    }
};

window.saveToLibrary = async function() {
    if (!window.currentOriginalText) {
        alert("Нет текста для сохранения");
        return;
    }

    const title = prompt("Название:", new Date().toLocaleString());
    if (!title) return;

    try {
        const res = await fetch('/api/library/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                content: window.currentOriginalText,
                translation: window.currentTranslationText
            })
        });

        if (!res.ok) throw new Error("Ошибка сохранения");

        const saved = await res.json();
        window.currentEditId = saved.id;

        if (window.saveMatchesToServer) {
            await window.saveMatchesToServer();
        }

        alert("✅ Текст сохранен!");
        window.loadLibrary();
    } catch (e) {
        console.error(e);
        alert("❌ Ошибка: " + e.message);
    }
};

window.deleteText = async function(id, event) {
    event.stopPropagation(); // чтобы не вызывать загрузку текста
    if (!confirm('Удалить этот текст? Все связи и части речи будут потеряны.')) return;
    try {
        const response = await fetch(`/api/library/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert('Текст удалён');
            window.loadLibrary(); // обновить список
            if (window.currentEditId === id) {
                // если удалён открытый текст, очистить поля
                window.currentOriginalText = '';
                window.currentTranslationText = '';
                window.currentEditId = null;
                document.getElementById('inputText').value = '';
                document.getElementById('inputTranslation').value = '';
                const origDiv = document.getElementById('original-text');
                const transDiv = document.getElementById('translation-text');
                if (origDiv) origDiv.innerHTML = '';
                if (transDiv) transDiv.innerHTML = '';
            }
        } else {
            alert('Ошибка удаления');
        }
    } catch(e) { console.error(e); }
};