from abc import ABC, abstractmethod
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Optional
from pydantic import BaseModel


class TaxSubmissionResult(BaseModel):
    status: str  # PENDING_REVIEW, MANUALLY_RECORDED, ACCEPTED, REJECTED, NOT_CONFIGURED
    control_number: Optional[str] = None
    qr_code_url: Optional[str] = None
    notes: Optional[str] = None
    acknowledgement_data: Dict[str, Any] = {}


class TaxAuthorityProvider(ABC):
    """
    Abstract Interface for Tax Authority Electronic Invoicing (eTIMS / KRA).
    Decouples core invoicing and ledger business logic from specific KRA VSCU/OSCU protocols.
    """

    @abstractmethod
    async def submit_invoice(
        self,
        invoice_data: Dict[str, Any],
        tenant_data: Dict[str, Any],
    ) -> TaxSubmissionResult:
        """Submits an invoice for tax authority electronic validation."""
        pass

    @abstractmethod
    async def query_status(
        self,
        submission_id: str,
    ) -> TaxSubmissionResult:
        """Queries the status of an in-flight tax authority submission."""
        pass


class NotConfiguredTaxAdapter(TaxAuthorityProvider):
    """Default adapter when eTIMS credentials are not configured."""

    async def submit_invoice(
        self,
        invoice_data: Dict[str, Any],
        tenant_data: Dict[str, Any],
    ) -> TaxSubmissionResult:
        return TaxSubmissionResult(
            status="NOT_CONFIGURED",
            notes="eTIMS integration is not configured. Invoice remains in internal review mode.",
            acknowledgement_data={"configured": False},
        )

    async def query_status(self, submission_id: str) -> TaxSubmissionResult:
        return TaxSubmissionResult(status="NOT_CONFIGURED")


class ManualReviewTaxAdapter(TaxAuthorityProvider):
    """
    Release 1 Compliant Manual Review Adapter.
    Invoices verified by finance staff are marked strictly as MANUALLY_RECORDED.
    NEVER labels an invoice as ACCEPTED by KRA without provider cryptographic verification.
    """

    def __init__(self, recording_ref: str, notes: str, recorded_by_user_id: str):
        self.recording_ref = recording_ref
        self.notes = notes
        self.recorded_by_user_id = recorded_by_user_id

    async def submit_invoice(
        self,
        invoice_data: Dict[str, Any],
        tenant_data: Dict[str, Any],
    ) -> TaxSubmissionResult:
        return TaxSubmissionResult(
            status="MANUALLY_RECORDED",
            control_number=None,  # Strictly None - no fake KRA control numbers
            qr_code_url=None,     # Strictly None
            notes=f"Manually recorded for compliance: {self.notes}",
            acknowledgement_data={
                "manual_mode": True,
                "recorded_ref": self.recording_ref,
                "recorded_by": self.recorded_by_user_id,
                "recorded_at": datetime.now(timezone.utc).isoformat(),
            },
        )

    async def query_status(self, submission_id: str) -> TaxSubmissionResult:
        return TaxSubmissionResult(
            status="MANUALLY_RECORDED",
            notes="Invoice is recorded manually under internal audit compliance.",
        )


class MockLiveKRAAdapter(TaxAuthorityProvider):
    """
    Mock Live KRA Adapter for testing hot-swapping capabilities.
    Returns simulated KRA acceptance without changing any invoice application code.
    """

    async def submit_invoice(
        self,
        invoice_data: Dict[str, Any],
        tenant_data: Dict[str, Any],
    ) -> TaxSubmissionResult:
        invoice_num = invoice_data.get("invoice_number", "001")
        control_num = f"KRA-VSCU-2026-{invoice_num}"
        return TaxSubmissionResult(
            status="ACCEPTED",
            control_number=control_num,
            qr_code_url=f"https://etims.kra.go.ke/verify?num={control_num}",
            notes="Accepted by KRA electronic invoice service.",
            acknowledgement_data={
                "vscu_serial": "VSCU-KENYA-TEST-001",
                "receipt_signature": "MOCK_CRYPTOGRAPHIC_SIGNATURE_999",
            },
        )

    async def query_status(self, submission_id: str) -> TaxSubmissionResult:
        return TaxSubmissionResult(
            status="ACCEPTED",
            control_number=f"KRA-VSCU-VERIFIED-{submission_id}",
        )
