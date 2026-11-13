"""Add tuma parent-child onboarding, settlement details, collections, and webhook events

Revision ID: 0003_add_tuma_parent_child
Revises: 0002_add_api_keys
Create Date: 2026-11-13 17:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0003_add_tuma_parent_child'
down_revision: Union[str, None] = '0002_add_api_keys'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. tuma_child_accounts
    op.create_table(
        'tuma_child_accounts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('tuma_business_id', sa.String(100), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='awaiting_settlement'),
        sa.Column('api_key_encrypted', sa.Text(), nullable=True),
        sa.Column('key_version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('bank_id', sa.String(50), nullable=True),
        sa.Column('bank_name', sa.String(100), nullable=True),
        sa.Column('account_masked', sa.String(30), nullable=True),
        sa.Column('webhook_token', sa.String(64), nullable=False, unique=True),
        sa.Column('last_error_code', sa.String(50), nullable=True),
        sa.Column('last_error_message', sa.Text(), nullable=True),
        sa.Column('activated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_tuma_child_tenant_status', 'tuma_child_accounts', ['tenant_id', 'status'])
    op.create_index('ix_tuma_child_business_id', 'tuma_child_accounts', ['tuma_business_id'])
    op.create_index('ix_tuma_child_webhook_token', 'tuma_child_accounts', ['webhook_token'])

    # 2. tenant_settlement_details
    op.create_table(
        'tenant_settlement_details',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('destination_type', sa.String(20), nullable=False, server_default='BANK'),
        sa.Column('bank_id', sa.String(50), nullable=False),
        sa.Column('bank_name', sa.String(100), nullable=False),
        sa.Column('account_number_encrypted', sa.Text(), nullable=False),
        sa.Column('account_masked', sa.String(30), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='VERIFIED'),
        sa.Column('updated_by', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_settlement_tenant_status', 'tenant_settlement_details', ['tenant_id', 'status'])

    # 3. tuma_provisioning_jobs
    op.create_table(
        'tuma_provisioning_jobs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('idempotency_key', sa.String(100), nullable=False, unique=True),
        sa.Column('step', sa.String(50), nullable=False, server_default='VALIDATE'),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('next_retry_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, server_default='PENDING'),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_provisioning_tenant_status', 'tuma_provisioning_jobs', ['tenant_id', 'status'])
    op.create_index('ix_provisioning_idempotency', 'tuma_provisioning_jobs', ['idempotency_key'])

    # 4. tuma_payment_requests
    op.create_table(
        'tuma_payment_requests',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('checkout_request_id', sa.String(100), nullable=False, unique=True),
        sa.Column('merchant_request_id', sa.String(100), nullable=True),
        sa.Column('amount', sa.Numeric(18, 2), nullable=False),
        sa.Column('phone_masked', sa.String(20), nullable=False),
        sa.Column('reference', sa.String(100), nullable=False),
        sa.Column('invoice_id', sa.String(36), sa.ForeignKey('invoices.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, server_default='INITIATED'),
        sa.Column('result_code', sa.Integer(), nullable=True),
        sa.Column('result_desc', sa.String(255), nullable=True),
        sa.Column('mpesa_receipt', sa.String(100), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_payment_req_tenant_status', 'tuma_payment_requests', ['tenant_id', 'status'])
    op.create_index('ix_payment_req_checkout', 'tuma_payment_requests', ['checkout_request_id'])
    op.create_index('ix_payment_req_receipt', 'tuma_payment_requests', ['mpesa_receipt'])

    # 5. tuma_webhook_events
    op.create_table(
        'tuma_webhook_events',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=True),
        sa.Column('dedupe_key', sa.String(100), nullable=False, unique=True),
        sa.Column('raw_payload', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, server_default='RECEIVED'),
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_tuma_webhooks_tenant_status', 'tuma_webhook_events', ['tenant_id', 'status'])
    op.create_index('ix_tuma_webhooks_dedupe', 'tuma_webhook_events', ['dedupe_key'])

    # 6. collections
    op.create_table(
        'collections',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_transaction_id', sa.String(100), nullable=False),
        sa.Column('channel', sa.String(30), nullable=False, server_default='TUMA_STK'),
        sa.Column('amount', sa.Numeric(18, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='KES'),
        sa.Column('payer_masked', sa.String(50), nullable=True),
        sa.Column('reference', sa.String(100), nullable=False),
        sa.Column('status', sa.String(30), nullable=False, server_default='CLEARED'),
        sa.Column('matched_invoice_id', sa.String(36), sa.ForeignKey('invoices.id', ondelete='SET NULL'), nullable=True),
        sa.Column('match_confidence', sa.Numeric(5, 2), nullable=True),
        sa.Column('ledger_entry_id', sa.String(36), sa.ForeignKey('journal_entries.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('tenant_id', 'source_transaction_id', name='uq_collections_tenant_source_tx'),
    )
    op.create_index('ix_collections_tenant_status', 'collections', ['tenant_id', 'status'])
    op.create_index('ix_collections_reference', 'collections', ['reference'])

    # 7. integration_events
    op.create_table(
        'integration_events',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='SET NULL'), nullable=True),
        sa.Column('actor_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('actor_email', sa.String(255), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_integration_events_tenant_action', 'integration_events', ['tenant_id', 'action'])


def downgrade() -> None:
    op.drop_table('integration_events')
    op.drop_table('collections')
    op.drop_table('tuma_webhook_events')
    op.drop_table('tuma_payment_requests')
    op.drop_table('tuma_provisioning_jobs')
    op.drop_table('tenant_settlement_details')
    op.drop_table('tuma_child_accounts')
