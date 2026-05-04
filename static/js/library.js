console.log("✅ library.js загружен");

// ========== БИБЛИОТЕКА ТЕКСТОВ ==========
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
      div.className = `library-item p-3 border rounded-lg cursor-pointer mb-2 transition-colors ${window.currentEditId === text.id ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'}`;
      div.onclick = () => window.loadText(text.id);
      div.innerHTML = `
        <div class="font-bold text-sm truncate">📄 ${window.escapeHtml(text.title)}</div>
        <div class="text-xs text-gray-500 mt-1 truncate">${window.escapeHtml(text.content.slice(0, 60))}</div>
        <div class="text-xs text-gray-400 mt-1">ID: ${text.id}</div>
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

    // Заполняем поля в простом режиме
    const inputText = document.getElementById('inputText');
    const inputTranslation = document.getElementById('inputTranslation');

    if (inputText) inputText.value = window.currentOriginalText;
    if (inputTranslation) inputTranslation.value = window.currentTranslationText;

    // Загружаем сопоставления
    await window.loadMatches();

    // Переключаем на параллельный режим и рендерим
    await window.showTab('parallel');

    console.log(`✅ Загружен текст: ${text.title}`);
  } catch (e) {
    console.error("Ошибка loadText:", e);
    alert('Ошибка загрузки текста: ' + e.message);
  }
};

// Сохранить текст + сопоставления
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

    await window.saveMatchesToServer();

    alert("✅ Текст и сопоставления сохранены!");
    window.loadLibrary();
  } catch (e) {
    console.error(e);
    alert("❌ Ошибка: " + e.message);
  }
};