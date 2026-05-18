Table user_texts {
  id integer [pk, increment]
  title varchar(255)
  content text
  translation text
  created_at timestamp [default: `now()`]
}

Table words {
  id integer [pk, increment]
  text_id integer
  word varchar(100) [not null]
  position integer
  part_of_speech varchar(50)
}

Table translations {
  id integer [pk, increment]
  text_id integer
  phrase varchar(255) [not null]
  position integer
  part_of_speech varchar(50)
}

Table word_translation_association {
  word_id integer [pk]
  translation_id integer [pk]
}

Table dictionary {
  id integer [pk, increment]
  word varchar(100) [unique]
  pinyin varchar(100)
  translation text
  examples text
}

// === Рекомендуемые таблицы ===

Table hsk_words {
  id integer [pk, increment]
  word varchar(100) [unique, not null]
  level integer [note: '1-6']
  pinyin varchar(100)
  translation text
}

Table text_segments {
  id integer [pk, increment]
  text_id integer
  position integer
  original_word varchar(100)
  pinyin varchar(100)
  part_of_speech varchar(50)
  hsk_level integer
  confidence float [note: 'для авто-сопоставления']
}

Ref: words.text_id > user_texts.id [delete: cascade]
Ref: translations.text_id > user_texts.id [delete: cascade]
Ref: word_translation_association.word_id > words.id [delete: cascade]
Ref: word_translation_association.translation_id > translations.id [delete: cascade]
Ref: text_segments.text_id > user_texts.id [delete: cascade]