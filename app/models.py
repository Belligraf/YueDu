from sqlalchemy import Column, Integer, String, Text, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.database import Base

# Таблица связи многие ко многим между словами и переводами
word_translation_association = Table(
    'word_translation_association',
    Base.metadata,
    Column('word_id', Integer, ForeignKey('words.id')),
    Column('translation_id', Integer, ForeignKey('translations.id'))
)


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
    title = Column(String)
    content = Column(Text)
    translation = Column(Text)


class Word(Base):
    __tablename__ = "words"

    id = Column(Integer, primary_key=True, index=True)
    text_id = Column(Integer, ForeignKey('user_texts.id', ondelete='CASCADE'))
    word = Column(String, nullable=False)
    position = Column(Integer)  # Позиция в тексте

    # Связь с текстом
    text = relationship("UserText", backref="words")

    # Связь многие ко многим с переводами
    translations = relationship("Translation", secondary=word_translation_association, back_populates="words")
    part_of_speech = Column(String(50), nullable=True)

# Новая модель для хранения фраз перевода
class Translation(Base):
    __tablename__ = "translations"

    id = Column(Integer, primary_key=True, index=True)
    text_id = Column(Integer, ForeignKey('user_texts.id', ondelete='CASCADE'))
    phrase = Column(String, nullable=False)
    position = Column(Integer)  # Позиция в переводе

    # Связь с текстом
    text = relationship("UserText", backref="translations")

    # Связь многие ко многим со словами
    words = relationship("Word", secondary=word_translation_association, back_populates="translations")
    part_of_speech = Column(String(50), nullable=True)
