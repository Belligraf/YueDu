.PHONY: install run dev db-init migrate clean start help

# Установка зависимостей через uv (рекомендуется)
install:
	@echo "📦 Устанавливаю зависимости через uv..."
	uv pip install --system -r pyproject.toml || uv sync
	@echo "✅ Зависимости установлены!"

# Простой запуск через run.py (как в оригинале)
run: db-init
	@echo "🚀 Запускаю приложение..."
	python run.py

# Запуск с горячей перезагрузкой (удобно для разработки)
dev: db-init
	@echo "🌸 Запускаю в dev-режиме с reload..."
	uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Инициализация БД из словаря (копирует dictionary.db.ex если нужно)
db-init:
	@mkdir -p data
	@if [ ! -f data/dictionary.db ]; then \
		if [ -f data/dictionary.db.ex ]; then \
			echo "📚 Копирую данные из словаря (dictionary.db.ex → dictionary.db)..."; \
			cp data/dictionary.db.ex data/dictionary.db; \
			echo "✅ Данные из словаря успешно загружены в БД! ✨"; \
		else \
			echo "ℹ️  Файл dictionary.db.ex не найден, будет создана пустая БД"; \
		fi \
	fi

# Применение миграций Alembic
migrate: db-init
	@echo "🗄️  Применяю миграции Alembic..."
	alembic upgrade head
	@echo "✅ Миграции применены!"

# Очистка
clean:
	@echo "🧹 Очищаю временные файлы..."
	rm -rf __pycache__ .pytest_cache data/dictionary.db
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Очистка завершена!"

# Полный запуск одной командой (установка + данные + миграции + запуск)
start: install db-init migrate dev

# Помощь
help:
	@echo ""
	@echo "✨ Makefile для YueDu (локальный запуск без Docker) ✨"
	@echo ""
	@echo "  make install   - установить зависимости (uv)"
	@echo "  make run       - запустить приложение (через run.py)"
	@echo "  make dev       - запустить с hot-reload (uvicorn --reload)"
	@echo "  make db-init   - скопировать данные из словаря в БД"
	@echo "  make migrate   - применить миграции Alembic"
	@echo "  make start     - ПОЛНЫЙ ЗАПУСК ОДНОЙ КОМАНДОЙ (рекомендуется)"
	@echo "  make clean     - удалить временные файлы и БД"
	@echo "  make help      - показать эту справку"
	@echo ""