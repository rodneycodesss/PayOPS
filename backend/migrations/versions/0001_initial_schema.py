"""Initial schema migration: All core PayOps tables

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-11-07 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Tenants
    op.create_table(
        'tenants',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('trading_name', sa.String(255), nullable=True),
        sa.Column('kra_pin', sa.String(20), nullable=True),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('currency', sa.String(3), nullable=False, server_default='KES'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_tenants_kra_pin', 'tenants', ['kra_pin'])

    # 2. Branches
    op.create_table(
        'branches',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('is_headquarters', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('tenant_id', 'code', name='uq_branches_tenant_code'),
    )
    op.create_index('ix_branches_tenant_id', 'branches', ['tenant_id'])

    # 3. Users
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('mfa_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('mfa_secret', sa.String(64), nullable=True),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('tenant_id', 'email', name='uq_users_tenant_email'),
    )
    op.create_index('ix_users_tenant_id', 'users', ['tenant_id'])

    # 4. Roles & Permissions
    op.create_table(
        'roles',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('tenant_id', 'name', name='uq_roles_tenant_name'),
    )
    op.create_index('ix_roles_tenant_id', 'roles', ['tenant_id'])

    op.create_table(
        'permissions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('code', sa.String(100), nullable=False, unique=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('module', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_permissions_code', 'permissions', ['code'])
    op.create_index('ix_permissions_module', 'permissions', ['module'])

    op.create_table(
        'role_permissions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('role_id', sa.String(36), sa.ForeignKey('roles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('permission_id', sa.String(36), sa.ForeignKey('permissions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('role_id', 'permission_id', name='uq_role_permissions_role_perm'),
    )

    op.create_table(
        'user_roles',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role_id', sa.String(36), sa.ForeignKey('roles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('user_id', 'role_id', name='uq_user_roles_user_role'),
    )

    # 5. Refresh Tokens
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(64), nullable=False, unique=True),
        sa.Column('jti', sa.String(36), nullable=False),
        sa.Column('family_id', sa.String(36), nullable=False),
        sa.Column('is_revoked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('replaced_by', sa.String(36), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_refresh_tokens_family_revoked', 'refresh_tokens', ['family_id', 'is_revoked'])

    # 6. Audit Logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='SET NULL'), nullable=True),
        sa.Column('actor_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('actor_email', sa.String(255), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('resource_type', sa.String(100), nullable=False),
        sa.Column('resource_id', sa.String(100), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_audit_logs_tenant_action', 'audit_logs', ['tenant_id', 'action'])
    op.create_index('ix_audit_logs_tenant_created', 'audit_logs', ['tenant_id', 'created_at'])

    # 7. Idempotency Records
    op.create_table(
        'idempotency_records',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('idempotency_key', sa.String(255), nullable=False),
        sa.Column('resource_type', sa.String(100), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='PENDING'),
        sa.Column('response_code', sa.Integer(), nullable=True),
        sa.Column('response_body', sa.JSON(), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('tenant_id', 'idempotency_key', name='uq_idempotency_tenant_key'),
    )

    # 8. Webhook Events
    op.create_table(
        'webhook_events',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='SET NULL'), nullable=True),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('event_type', sa.String(100), nullable=False),
        sa.Column('headers', sa.JSON(), nullable=True),
        sa.Column('payload', sa.JSON(), nullable=True),
        sa.Column('raw_payload', sa.Text(), nullable=False),
        sa.Column('processed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('processing_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_webhook_events_provider_processed', 'webhook_events', ['provider', 'processed'])

    # 9. Customers
    op.create_table(
        'customers',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('kra_pin', sa.String(20), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('credit_balance', sa.Numeric(18, 2), nullable=False, server_default='0.00'),
        sa.Column('currency', sa.String(3), nullable=False, server_default='KES'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('tenant_id', 'email', name='uq_customers_tenant_email'),
    )

    # 10. Products
    op.create_table(
        'products',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('sku', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('unit_price', sa.Numeric(18, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='KES'),
        sa.Column('tax_category', sa.String(50), nullable=False, server_default='STANDARD'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('tenant_id', 'sku', name='uq_products_tenant_sku'),
    )

    # 11. Invoices & Items & Credit Notes
    op.create_table(
        'invoices',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('branch_id', sa.String(36), sa.ForeignKey('branches.id', ondelete='SET NULL'), nullable=True),
        sa.Column('customer_id', sa.String(36), sa.ForeignKey('customers.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('invoice_number', sa.String(100), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='DRAFT'),
        sa.Column('issue_date', sa.Date(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('subtotal', sa.Numeric(18, 2), nullable=False, server_default='0.00'),
        sa.Column('tax_amount', sa.Numeric(18, 2), nullable=False, server_default='0.00'),
        sa.Column('total_amount', sa.Numeric(18, 2), nullable=False, server_default='0.00'),
        sa.Column('paid_amount', sa.Numeric(18, 2), nullable=False, server_default='0.00'),
        sa.Column('balance_due', sa.Numeric(18, 2), nullable=False, server_default='0.00'),
        sa.Column('currency', sa.String(3), nullable=False, server_default='KES'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('etims_status', sa.String(50), nullable=False, server_default='NOT_SUBMITTED'),
        sa.Column('etims_control_number', sa.String(100), nullable=True),
        sa.Column('etims_qr_code_url', sa.Text(), nullable=True),
        sa.Column('etims_submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('manual_recording_ref', sa.String(100), nullable=True),
        sa.Column('manual_recorded_by', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('manual_recorded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('manual_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('tenant_id', 'invoice_number', name='uq_invoices_tenant_number'),
    )
    op.create_index('ix_invoices_tenant_status', 'invoices', ['tenant_id', 'status'])
    op.create_index('ix_invoices_tenant_due', 'invoices', ['tenant_id', 'due_date'])

    op.create_table(
        'invoice_items',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('invoice_id', sa.String(36), sa.ForeignKey('invoices.id', ondelete='CASCADE'), nullable=False),
        sa.Column('product_id', sa.String(36), sa.ForeignKey('products.id', ondelete='SET NULL'), nullable=True),
        sa.Column('description', sa.String(255), nullable=False),
        sa.Column('quantity', sa.Numeric(18, 4), nullable=False, server_default='1.0000'),
        sa.Column('unit_price', sa.Numeric(18, 2), nullable=False),
        sa.Column('tax_rate', sa.Numeric(5, 2), nullable=False, server_default='16.00'),
        sa.Column('tax_amount', sa.Numeric(18, 2), nullable=False, server_default='0.00'),
        sa.Column('total_amount', sa.Numeric(18, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'credit_notes',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('invoice_id', sa.String(36), sa.ForeignKey('invoices.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('credit_note_number', sa.String(100), nullable=False),
        sa.Column('reason', sa.String(255), nullable=False),
        sa.Column('subtotal', sa.Numeric(18, 2), nullable=False),
        sa.Column('tax_amount', sa.Numeric(18, 2), nullable=False),
        sa.Column('total_amount', sa.Numeric(18, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='KES'),
        sa.Column('status', sa.String(50), nullable=False, server_default='ISSUED'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('tenant_id', 'credit_note_number', name='uq_credit_notes_tenant_number'),
    )

    # 12. Payment Providers & Payments & Allocations
    op.create_table(
        'payment_providers',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider_type', sa.String(50), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('identifier', sa.String(100), nullable=False),
        sa.Column('encrypted_credentials', sa.Text(), nullable=True),
        sa.Column('is_sandbox', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('verification_status', sa.String(50), nullable=False, server_default='implemented_unverified'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('tenant_id', 'provider_type', 'identifier', name='uq_payment_providers_tenant_ident'),
    )

    op.create_table(
        'payments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('customer_id', sa.String(36), sa.ForeignKey('customers.id', ondelete='SET NULL'), nullable=True),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('provider_reference', sa.String(100), nullable=False),
        sa.Column('checkout_request_id', sa.String(100), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='INITIATED'),
        sa.Column('amount', sa.Numeric(18, 2), nullable=False),
        sa.Column('allocated_amount', sa.Numeric(18, 2), nullable=False, server_default='0.00'),
        sa.Column('unallocated_amount', sa.Numeric(18, 2), nullable=False, server_default='0.00'),
        sa.Column('currency', sa.String(3), nullable=False, server_default='KES'),
        sa.Column('sender_phone', sa.String(50), nullable=True),
        sa.Column('sender_name', sa.String(255), nullable=True),
        sa.Column('account_reference', sa.String(100), nullable=True),
        sa.Column('payment_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('webhook_event_id', sa.String(36), sa.ForeignKey('webhook_events.id', ondelete='SET NULL'), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('tenant_id', 'provider', 'provider_reference', name='uq_payments_tenant_provider_ref'),
    )
    op.create_index('ix_payments_tenant_status', 'payments', ['tenant_id', 'status'])
    op.create_index('ix_payments_tenant_date', 'payments', ['tenant_id', 'payment_date'])

    op.create_table(
        'payment_allocations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('payment_id', sa.String(36), sa.ForeignKey('payments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('invoice_id', sa.String(36), sa.ForeignKey('invoices.id', ondelete='CASCADE'), nullable=False),
        sa.Column('allocated_amount', sa.Numeric(18, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='KES'),
        sa.Column('status', sa.String(50), nullable=False, server_default='ACTIVE'),
        sa.Column('reversal_reference', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_allocations_payment_invoice', 'payment_allocations', ['payment_id', 'invoice_id'])

    # 13. Banking
    op.create_table(
        'bank_accounts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('bank_name', sa.String(100), nullable=False),
        sa.Column('account_number', sa.String(100), nullable=False),
        sa.Column('account_name', sa.String(255), nullable=False),
        sa.Column('branch', sa.String(100), nullable=True),
        sa.Column('currency', sa.String(3), nullable=False, server_default='KES'),
        sa.Column('current_balance', sa.Numeric(18, 2), nullable=False, server_default='0.00'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('tenant_id', 'account_number', name='uq_bank_accounts_tenant_number'),
    )

    op.create_table(
        'bank_transactions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('bank_account_id', sa.String(36), sa.ForeignKey('bank_accounts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('transaction_date', sa.Date(), nullable=False),
        sa.Column('reference', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('transaction_type', sa.String(10), nullable=False),
        sa.Column('amount', sa.Numeric(18, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='KES'),
        sa.Column('balance_after', sa.Numeric(18, 2), nullable=True),
        sa.Column('row_hash', sa.String(64), nullable=False),
        sa.Column('raw_row_data', sa.Text(), nullable=True),
        sa.Column('is_reconciled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('matched_payment_id', sa.String(36), sa.ForeignKey('payments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('tenant_id', 'row_hash', name='uq_bank_transactions_tenant_row_hash'),
    )
    op.create_index('ix_bank_tx_tenant_date', 'bank_transactions', ['tenant_id', 'transaction_date'])

    # 14. Reconciliation
    op.create_table(
        'reconciliation_runs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('run_type', sa.String(50), nullable=False, server_default='AUTOMATIC'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_candidates', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('matched_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('exception_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(50), nullable=False, server_default='PENDING'),
        sa.Column('summary_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'reconciliation_matches',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('run_id', sa.String(36), sa.ForeignKey('reconciliation_runs.id', ondelete='SET NULL'), nullable=True),
        sa.Column('payment_id', sa.String(36), sa.ForeignKey('payments.id', ondelete='CASCADE'), nullable=True),
        sa.Column('invoice_id', sa.String(36), sa.ForeignKey('invoices.id', ondelete='CASCADE'), nullable=True),
        sa.Column('bank_transaction_id', sa.String(36), sa.ForeignKey('bank_transactions.id', ondelete='CASCADE'), nullable=True),
        sa.Column('rule_applied', sa.String(100), nullable=False),
        sa.Column('confidence', sa.String(20), nullable=False, server_default='HIGH'),
        sa.Column('matched_amount', sa.Numeric(18, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='KES'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'reconciliation_exceptions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('run_id', sa.String(36), sa.ForeignKey('reconciliation_runs.id', ondelete='SET NULL'), nullable=True),
        sa.Column('payment_id', sa.String(36), sa.ForeignKey('payments.id', ondelete='CASCADE'), nullable=True),
        sa.Column('bank_transaction_id', sa.String(36), sa.ForeignKey('bank_transactions.id', ondelete='CASCADE'), nullable=True),
        sa.Column('reason', sa.String(100), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='OPEN'),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('resolved_by', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_rec_exceptions_tenant_status', 'reconciliation_exceptions', ['tenant_id', 'status'])

    # 15. Accounting & Ledger
    op.create_table(
        'chart_of_accounts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('account_type', sa.String(50), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='KES'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('tenant_id', 'code', name='uq_coa_tenant_code'),
    )

    op.create_table(
        'journal_entries',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('entry_number', sa.String(100), nullable=False),
        sa.Column('entry_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='DRAFT'),
        sa.Column('narration', sa.Text(), nullable=False),
        sa.Column('reference_type', sa.String(50), nullable=False),
        sa.Column('reference_id', sa.String(100), nullable=True),
        sa.Column('is_reversal', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('reversed_entry_id', sa.String(36), sa.ForeignKey('journal_entries.id', ondelete='SET NULL'), nullable=True),
        sa.Column('posted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('posted_by', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('tenant_id', 'entry_number', name='uq_journal_tenant_entry_number'),
    )
    op.create_index('ix_journal_tenant_date', 'journal_entries', ['tenant_id', 'entry_date'])

    op.create_table(
        'ledger_entries',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('journal_entry_id', sa.String(36), sa.ForeignKey('journal_entries.id', ondelete='CASCADE'), nullable=False),
        sa.Column('account_id', sa.String(36), sa.ForeignKey('chart_of_accounts.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('entry_type', sa.String(10), nullable=False),
        sa.Column('amount', sa.Numeric(18, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='KES'),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_ledger_tenant_account', 'ledger_entries', ['tenant_id', 'account_id'])

    # 16. Tax Configurations & Submissions
    op.create_table(
        'tax_configurations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('rate', sa.Numeric(5, 2), nullable=False),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'tax_submissions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('invoice_id', sa.String(36), sa.ForeignKey('invoices.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False, server_default='ETIMS_MANUAL'),
        sa.Column('status', sa.String(50), nullable=False, server_default='PENDING'),
        sa.Column('control_number', sa.String(100), nullable=True),
        sa.Column('qr_code_url', sa.Text(), nullable=True),
        sa.Column('raw_request', sa.JSON(), nullable=True),
        sa.Column('raw_response', sa.JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_tax_submissions_invoice', 'tax_submissions', ['invoice_id', 'status'])

    # 17. Notifications & Automations
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('channel', sa.String(20), nullable=False),
        sa.Column('recipient', sa.String(255), nullable=False),
        sa.Column('subject', sa.String(255), nullable=True),
        sa.Column('message_body', sa.Text(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='PENDING'),
        sa.Column('error_details', sa.Text(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'automation_jobs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('job_type', sa.String(100), nullable=False),
        sa.Column('trigger_source', sa.String(50), nullable=False, server_default='N8N'),
        sa.Column('status', sa.String(50), nullable=False, server_default='QUEUED'),
        sa.Column('parameters', sa.JSON(), nullable=True),
        sa.Column('result_summary', sa.JSON(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    # Drop tables in reverse foreign-key dependency order
    op.drop_table('automation_jobs')
    op.drop_table('notifications')
    op.drop_table('tax_submissions')
    op.drop_table('tax_configurations')
    op.drop_table('ledger_entries')
    op.drop_table('journal_entries')
    op.drop_table('chart_of_accounts')
    op.drop_table('reconciliation_exceptions')
    op.drop_table('reconciliation_matches')
    op.drop_table('reconciliation_runs')
    op.drop_table('bank_transactions')
    op.drop_table('bank_accounts')
    op.drop_table('payment_allocations')
    op.drop_table('payments')
    op.drop_table('payment_providers')
    op.drop_table('credit_notes')
    op.drop_table('invoice_items')
    op.drop_table('invoices')
    op.drop_table('products')
    op.drop_table('customers')
    op.drop_table('webhook_events')
    op.drop_table('idempotency_records')
    op.drop_table('audit_logs')
    op.drop_table('refresh_tokens')
    op.drop_table('user_roles')
    op.drop_table('role_permissions')
    op.drop_table('permissions')
    op.drop_table('roles')
    op.drop_table('users')
    op.drop_table('branches')
    op.drop_table('tenants')
