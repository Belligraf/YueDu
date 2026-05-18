from sqlalchemy import Column, Integer, String, Text, ForeignKey, UniqueConstraint, Float, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


# ==================== АССОЦИАТИВНАЯ ТАБЛИЦА ====================
class WordTranslationAssociation(Base):
    __tablename__ = "word_translation_association"

    word_id = Column(Integer, ForeignKey("words.id", ondelete="CASCADE"), primary_key=True)
    translation_id = Column(Integer, ForeignKey("translations.id", ondelete="CASCADE"), primary_key=True)

    __table_args__ = (
        UniqueConstraint("word_id", "translation_id", name="uq_word_translation"),
    )


# ==================== ОСНОВНЫЕ МОДЕЛИ ====================

class Dictionary(Base):
    __tablename__ = "dictionary"
    id = Column(Integer, primary_key=True, index=True)
    word = Column(String, index=True, nullable=False)
    pinyin = Column(String)
    translation = Column(Text)
    examples = Column(Text)


class UserText(Base):
    __tablename__ = "user_texts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=True)  # оставили nullable=True
    content = Column(Text, nullable=True)  # оставили nullable=True
    translation = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    segments = relationship("TextSegment", back_populates="text", cascade="all, delete-orphan")
    words = relationship("Word", back_populates="text", cascade="all, delete-orphan")
    translations = relationship("Translation", back_populates="text", cascade="all, delete-orphan")


class Word(Base):
    __tablename__ = "words"
    id = Column(Integer, primary_key=True, index=True)
    text_id = Column(Integer, ForeignKey('user_texts.id', ondelete='CASCADE'))
    word = Column(String, nullable=False)
    position = Column(Integer)
    part_of_speech = Column(String(50), nullable=True)

    text = relationship("UserText", back_populates="words")
    translations = relationship(
        "Translation",
        secondary="word_translation_association",
        back_populates="words"
    )


class Translation(Base):
    __tablename__ = "translations"
    id = Column(Integer, primary_key=True, index=True)
    text_id = Column(Integer, ForeignKey('user_texts.id', ondelete='CASCADE'))
    phrase = Column(String, nullable=False)
    position = Column(Integer)
    part_of_speech = Column(String(50), nullable=True)

    text = relationship("UserText", back_populates="translations")
    words = relationship(
        "Word",
        secondary="word_translation_association",
        back_populates="translations"
    )


# ==================== НОВЫЕ ТАБЛИЦЫ ====================

class HSKWord(Base):
    __tablename__ = "hsk_words"
    id = Column(Integer, primary_key=True, index=True)
    word = Column(String, unique=True, nullable=False, index=True)
    level = Column(Integer, nullable=False)  # 1-6
    pinyin = Column(String)
    translation = Column(Text)


class TextSegment(Base):
    __tablename__ = "text_segments"
    id = Column(Integer, primary_key=True, index=True)
    text_id = Column(Integer, ForeignKey('user_texts.id', ondelete='CASCADE'), nullable=False)

    position = Column(Integer, nullable=False)
    original_word = Column(String, nullable=False)
    pinyin = Column(String)
    part_of_speech = Column(String(50))
    hsk_level = Column(Integer)
    confidence = Column(Float, default=1.0)

    text = relationship("UserText", back_populates="segments")