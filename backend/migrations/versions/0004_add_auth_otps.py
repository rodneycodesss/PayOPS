"""Add auth_otps table for registration OTP and login 2FA verification

Revision ID: 0004_add_auth_otps
Revises: 0003_add_tuma_parent_child
Create Date: 2026-11-18 01:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0004_add_auth_otps'
down_revision: Union[str, None] = '0003_add_tuma_parent_child'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'auth_otps',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('identifier', sa.String(255), nullable=False),
        sa.Column('purpose', sa.String(50), nullable=False),
        sa.Column('code_hash', sa.String(64), nullable=False),
        sa.Column('payload_json', sa.Text(), nullable=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_attempts', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_auth_otps_identifier', 'auth_otps', ['identifier'])
    op.create_index('ix_auth_otps_purpose', 'auth_otps', ['purpose'])
    op.create_index('ix_auth_otps_user_id', 'auth_otps', ['user_id'])
    op.create_index('ix_auth_otps_tenant_id', 'auth_otps', ['tenant_id'])
    op.create_index('ix_auth_otps_expires_at', 'auth_otps', ['expires_at'])
    op.create_index('ix_auth_otps_is_used', 'auth_otps', ['is_used'])
    op.create_index('ix_auth_otps_identifier_purpose', 'auth_otps', ['identifier', 'purpose'])
    op.create_index('ix_auth_otps_active', 'auth_otps', ['identifier', 'purpose', 'is_used'])


def downgrade() -> None:
    op.drop_index('ix_auth_otps_active', table_name='auth_otps')
    op.drop_index('ix_auth_otps_identifier_purpose', table_name='auth_otps')
    op.drop_index('ix_auth_otps_is_used', table_name='auth_otps')
    op.drop_index('ix_auth_otps_expires_at', table_name='auth_otps')
    op.drop_index('ix_auth_otps_tenant_id', table_name='auth_otps')
    op.drop_index('ix_auth_otps_user_id', table_name='auth_otps')
    op.drop_index('ix_auth_otps_purpose', table_name='auth_otps')
    op.drop_index('ix_auth_otps_identifier', table_name='auth_otps')
    op.drop_table('auth_otps')
