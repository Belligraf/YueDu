from sqlalchemy import Column, Integer, String, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
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
    title = Column(String)
    content = Column(Text)
    translation = Column(Text)


class Word(Base):
    __tablename__ = "words"

    id = Column(Integer, primary_key=True, index=True)
    text_id = Column(Integer, ForeignKey('user_texts.id', ondelete='CASCADE'))
    word = Column(String, nullable=False)
    position = Column(Integer)
    part_of_speech = Column(String(50), nullable=True)

    text = relationship("UserText", backref="words")
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

    text = relationship("UserText", backref="translations")
    words = relationship(
        "Word",
        secondary="word_translation_association",
        back_populates="translations"
    )