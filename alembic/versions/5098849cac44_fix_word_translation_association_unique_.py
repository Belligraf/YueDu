"""fix word_translation_association unique constraint

Revision ID: 8de4f412fd43
Revises: e07ba785f4bc
Create Date: 2026-05-14 01:25:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = '8de4f412fd43'
down_revision = 'e07ba785f4bc'
branch_labels = None
depends_on = None


def upgrade():
    """Пересоздаём таблицу связей правильно для SQLite"""
    op.drop_table('word_translation_association')

    op.create_table(
        'word_translation_association',
        sa.Column('word_id', sa.Integer(), nullable=False),
        sa.Column('translation_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['word_id'], ['words.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['translation_id'], ['translations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('word_id', 'translation_id'),
        sa.UniqueConstraint('word_id', 'translation_id', name='uq_word_translation')
    )


def downgrade():
    op.drop_table('word_translation_association')