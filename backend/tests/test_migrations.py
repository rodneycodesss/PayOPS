import os
import pytest
from alembic.config import Config
from alembic import command
from sqlalchemy import create_engine, inspect

from app.core.config import settings


def test_alembic_migrations_empty_database_and_downgrade(tmp_path):
    """
    Phase 1 Exit Criteria:
    Verifies that Alembic migrations run cleanly on an empty database and can downgrade cleanly.
    """
    db_file = tmp_path / "test_migration.db"
    sync_url = f"sqlite:///{db_file}"

    alembic_ini_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "alembic.ini"
    )
    alembic_cfg = Config(alembic_ini_path)
    alembic_cfg.set_main_option("sqlalchemy.url", sync_url)
    migrations_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "migrations"
    )
    alembic_cfg.set_main_option("script_location", migrations_dir)

    # 1. Run upgrade head on fresh database
    command.upgrade(alembic_cfg, "head")

    engine = create_engine(sync_url)
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    # Verify key tables exist
    required_tables = [
        "tenants", "branches", "users", "roles", "permissions", "user_roles",
        "refresh_tokens", "audit_logs", "idempotency_records", "webhook_events",
        "customers", "products", "invoices", "invoice_items", "credit_notes",
        "payments", "payment_allocations", "payment_providers", "bank_accounts",
        "bank_transactions", "reconciliation_runs", "reconciliation_matches",
        "reconciliation_exceptions", "chart_of_accounts", "journal_entries",
        "ledger_entries", "tax_configurations", "tax_submissions", "notifications",
        "automation_jobs"
    ]
    for table in required_tables:
        assert table in tables, f"Expected table '{table}' missing after migration upgrade"

    # 2. Run downgrade base
    command.downgrade(alembic_cfg, "base")

    inspector_after = inspect(engine)
    remaining_tables = [t for t in inspector_after.get_table_names() if t != "alembic_version"]
    assert len(remaining_tables) == 0, f"Expected 0 tables after downgrade, found {remaining_tables}"
