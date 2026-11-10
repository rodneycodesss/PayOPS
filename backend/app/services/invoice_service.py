import io
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from app.models.invoices import Invoice, InvoiceItem, CreditNote
from app.models.customers import Customer
from app.models.tenants import Tenant
from app.models.tax import TaxSubmission
from app.schemas.invoices import InvoiceCreate, CreditNoteCreate
from app.integrations.etims.provider import TaxAuthorityProvider, TaxSubmissionResult
from app.services.posting_service import PostingService
from app.services.audit_service import AuditService


class InvoiceService:
    """
    Manages customer invoicing, VAT computation, PDF generation via ReportLab,
    credit notes, and decoupled eTIMS tax compliance submissions.
    """

    @classmethod
    async def get_next_invoice_number(cls, db: AsyncSession, tenant_id: str) -> str:
        """Generates tenant-scoped sequential invoice number e.g. INV-2026-00001."""
        current_year = date.today().year
        stmt = (
            select(func.count(Invoice.id))
            .where(
                Invoice.tenant_id == tenant_id,
                Invoice.invoice_number.like(f"INV-{current_year}-%"),
            )
        )
        res = await db.execute(stmt)
        count = res.scalar() or 0
        return f"INV-{current_year}-{count + 1:05d}"

    @classmethod
    async def get_next_credit_note_number(cls, db: AsyncSession, tenant_id: str) -> str:
        """Generates tenant-scoped sequential credit note number e.g. CN-2026-00001."""
        current_year = date.today().year
        stmt = (
            select(func.count(CreditNote.id))
            .where(
                CreditNote.tenant_id == tenant_id,
                CreditNote.credit_note_number.like(f"CN-{current_year}-%"),
            )
        )
        res = await db.execute(stmt)
        count = res.scalar() or 0
        return f"CN-{current_year}-{count + 1:05d}"

    @classmethod
    async def create_invoice_draft(
        cls,
        db: AsyncSession,
        tenant_id: str,
        data: InvoiceCreate,
    ) -> Invoice:
        """Creates an invoice in DRAFT status with computed line items and VAT."""
        # 1. Verify customer belongs to tenant
        cust_stmt = (
            select(Customer)
            .where(Customer.id == data.customer_id, Customer.tenant_id == tenant_id)
        )
        customer = (await db.execute(cust_stmt)).scalar_one_or_none()
        if not customer:
            raise ValueError(f"Customer {data.customer_id} not found")

        # 2. Generate invoice number
        invoice_number = await cls.get_next_invoice_number(db, tenant_id)

        # 3. Compute items and taxes
        subtotal = Decimal("0.00")
        tax_amount = Decimal("0.00")
        items_to_create = []

        for item_in in data.items:
            qty = Decimal(str(item_in.quantity))
            unit_p = Decimal(str(item_in.unit_price))
            item_sub = (qty * unit_p).quantize(Decimal("0.01"))
            tax_rate = Decimal(str(item_in.tax_rate))
            item_tax = (item_sub * (tax_rate / Decimal("100.00"))).quantize(Decimal("0.01"))
            item_tot = item_sub + item_tax

            subtotal += item_sub
            tax_amount += item_tax

            items_to_create.append(
                InvoiceItem(
                    description=item_in.description,
                    quantity=qty,
                    unit_price=unit_p,
                    tax_rate=tax_rate,
                    tax_amount=item_tax,
                    total_amount=item_tot,
                )
            )

        total_amount = subtotal + tax_amount

        invoice = Invoice(
            tenant_id=tenant_id,
            customer_id=customer.id,
            invoice_number=invoice_number,
            status="DRAFT",
            issue_date=data.issue_date,
            due_date=data.due_date,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total_amount,
            paid_amount=Decimal("0.00"),
            balance_due=total_amount,
            currency="KES",
            notes=data.notes,
            etims_status="NOT_SUBMITTED",
            items=items_to_create,
        )
        db.add(invoice)
        await db.commit()
        stmt = select(Invoice).where(Invoice.id == invoice.id).options(selectinload(Invoice.items))
        return (await db.execute(stmt)).scalar_one()

    @classmethod
    async def issue_invoice(
        cls,
        db: AsyncSession,
        tenant_id: str,
        invoice_id: str,
        user_id: Optional[str] = None,
    ) -> Invoice:
        """
        Transitions invoice from DRAFT to ISSUED_INTERNAL and automatically
        posts double-entry ledger entries.
        """
        stmt = (
            select(Invoice)
            .where(Invoice.id == invoice_id, Invoice.tenant_id == tenant_id)
            .options(selectinload(Invoice.items))
        )
        invoice = (await db.execute(stmt)).scalar_one_or_none()
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        if invoice.status != "DRAFT":
            return invoice

        invoice.status = "ISSUED_INTERNAL"

        # Automated posting to General Ledger
        await PostingService.post_invoice_issuance(
            db=db,
            tenant_id=tenant_id,
            invoice=invoice,
            user_id=user_id,
        )

        await db.commit()
        stmt = select(Invoice).where(Invoice.id == invoice.id).options(selectinload(Invoice.items))
        return (await db.execute(stmt)).scalar_one()

    @classmethod
    async def submit_to_tax_authority(
        cls,
        db: AsyncSession,
        tenant_id: str,
        invoice_id: str,
        provider: TaxAuthorityProvider,
        user_id: Optional[str] = None,
    ) -> Tuple[Invoice, TaxSubmissionResult]:
        """
        Submits an invoice to the configured TaxAuthorityProvider.
        Decoupled interface: Swapping adapters in tests or production requires zero invoice code change.
        """
        stmt = (
            select(Invoice)
            .where(Invoice.id == invoice_id, Invoice.tenant_id == tenant_id)
            .options(selectinload(Invoice.items))
        )
        invoice = (await db.execute(stmt)).scalar_one_or_none()
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        tenant_stmt = select(Tenant).where(Tenant.id == tenant_id)
        tenant = (await db.execute(tenant_stmt)).scalar_one()

        invoice_dict = {
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "issue_date": invoice.issue_date.isoformat(),
            "subtotal": str(invoice.subtotal),
            "tax_amount": str(invoice.tax_amount),
            "total_amount": str(invoice.total_amount),
            "currency": invoice.currency,
        }
        tenant_dict = {
            "tenant_id": tenant.id,
            "name": tenant.name,
            "kra_pin": tenant.kra_pin,
        }

        # Execute submission via provider adapter
        result = await provider.submit_invoice(invoice_dict, tenant_dict)

        # Update invoice according to returned result
        invoice.etims_status = result.status
        now_utc = datetime.now(timezone.utc)

        if result.status == "MANUALLY_RECORDED":
            ack = result.acknowledgement_data
            invoice.manual_recording_ref = ack.get("recorded_ref")
            invoice.manual_recorded_by = user_id
            invoice.manual_recorded_at = now_utc
            invoice.manual_notes = result.notes
        elif result.status == "ACCEPTED":
            invoice.etims_control_number = result.control_number
            invoice.etims_qr_code_url = result.qr_code_url
            invoice.etims_submitted_at = now_utc

        # Record in TaxSubmission table
        submission = TaxSubmission(
            tenant_id=tenant_id,
            invoice_id=invoice.id,
            provider=provider.__class__.__name__,
            status=result.status,
            control_number=result.control_number,
            qr_code_url=result.qr_code_url,
            raw_request=invoice_dict,
            raw_response=result.acknowledgement_data,
            submitted_at=now_utc,
        )
        db.add(submission)

        # Audit log
        await AuditService.log_event(
            db=db,
            action="TAX_SUBMISSION_PROCESSED",
            resource_type="invoice",
            resource_id=invoice.id,
            tenant_id=tenant_id,
            actor_email=user_id or "system",
            details={
                "provider": provider.__class__.__name__,
                "status": result.status,
                "control_number": result.control_number,
            },
        )

        await db.commit()
        stmt = select(Invoice).where(Invoice.id == invoice.id).options(selectinload(Invoice.items))
        return (await db.execute(stmt)).scalar_one(), result

    @classmethod
    async def create_credit_note(
        cls,
        db: AsyncSession,
        tenant_id: str,
        invoice_id: str,
        data: CreditNoteCreate,
        user_id: Optional[str] = None,
    ) -> CreditNote:
        """Issues a credit note against an existing invoice."""
        stmt = (
            select(Invoice)
            .where(Invoice.id == invoice_id, Invoice.tenant_id == tenant_id)
        )
        invoice = (await db.execute(stmt)).scalar_one_or_none()
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        if data.amount > invoice.total_amount:
            raise ValueError(f"Credit note amount (KES {data.amount}) cannot exceed invoice total (KES {invoice.total_amount})")

        cn_number = await cls.get_next_credit_note_number(db, tenant_id)

        # Apportion tax (standard 16% VAT portion)
        subtotal_ratio = invoice.subtotal / invoice.total_amount
        cn_subtotal = (data.amount * subtotal_ratio).quantize(Decimal("0.01"))
        cn_tax = data.amount - cn_subtotal

        credit_note = CreditNote(
            tenant_id=tenant_id,
            invoice_id=invoice.id,
            credit_note_number=cn_number,
            reason=data.reason,
            subtotal=cn_subtotal,
            tax_amount=cn_tax,
            total_amount=data.amount,
            currency="KES",
            status="ISSUED",
        )
        db.add(credit_note)

        # Adjust invoice balance due
        if invoice.balance_due >= data.amount:
            invoice.balance_due -= data.amount
        else:
            remaining_credit = data.amount - invoice.balance_due
            invoice.balance_due = Decimal("0.00")
            # Allocate remainder to customer credit balance
            cust_stmt = select(Customer).where(Customer.id == invoice.customer_id)
            customer = (await db.execute(cust_stmt)).scalar_one_or_none()
            if customer:
                customer.credit_balance += remaining_credit

        await db.commit()
        await db.refresh(credit_note)
        return credit_note

    @classmethod
    async def generate_invoice_pdf(
        cls,
        db: AsyncSession,
        tenant_id: str,
        invoice_id: str,
    ) -> bytes:
        """
        Renders a publication-grade branded Tax Invoice PDF using ReportLab
        with Rodstar Deep Navy styling, line items, and VAT breakdown.
        """
        stmt = (
            select(Invoice)
            .where(Invoice.id == invoice_id, Invoice.tenant_id == tenant_id)
            .options(selectinload(Invoice.items))
        )
        invoice = (await db.execute(stmt)).scalar_one_or_none()
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        cust_stmt = select(Customer).where(Customer.id == invoice.customer_id)
        customer = (await db.execute(cust_stmt)).scalar_one()

        tenant_stmt = select(Tenant).where(Tenant.id == tenant_id)
        tenant = (await db.execute(tenant_stmt)).scalar_one()

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        styles = getSampleStyleSheet()
        primary_color = colors.HexColor("#0B192C")
        accent_color = colors.HexColor("#10B981")
        dark_text = colors.HexColor("#0F172A")
        slate_gray = colors.HexColor("#64748B")

        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=22,
            leading=26,
            textColor=primary_color,
            fontName="Helvetica-Bold",
        )

        h2_style = ParagraphStyle(
            "H2Style",
            parent=styles["Heading2"],
            fontSize=11,
            leading=14,
            textColor=primary_color,
            fontName="Helvetica-Bold",
        )

        body_style = ParagraphStyle(
            "BodyDark",
            parent=styles["Normal"],
            fontSize=9,
            leading=13,
            textColor=dark_text,
            fontName="Helvetica",
        )

        elements = []

        # Header Block: Company Details & Tax Invoice Title
        header_data = [
            [
                Paragraph(f"<b>{tenant.name}</b><br/>{tenant.address or 'Nairobi, Kenya'}<br/>KRA PIN: {tenant.kra_pin or 'P051234567Z'}<br/>Email: {tenant.email}", body_style),
                Paragraph(f"<font color='#0B192C' size=16><b>TAX INVOICE</b></font><br/><b>Invoice #:</b> {invoice.invoice_number}<br/><b>Issue Date:</b> {invoice.issue_date}<br/><b>Due Date:</b> {invoice.due_date}", body_style),
            ]
        ]
        header_table = Table(header_data, colWidths=[280, 240])
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 15))

        # Bill To Block
        bill_to_data = [
            [
                Paragraph(f"<b>BILL TO:</b><br/><b>{customer.name}</b><br/>Email: {customer.email or 'N/A'}<br/>Phone: {customer.phone or 'N/A'}<br/>KRA PIN: {customer.kra_pin or 'Unregistered'}", body_style),
                Paragraph(f"<b>PAYMENT STATUS:</b> {invoice.status}<br/><b>eTIMS STATUS:</b> {invoice.etims_status}<br/><b>CURRENCY:</b> KES", body_style),
            ]
        ]
        bill_to_table = Table(bill_to_data, colWidths=[280, 240])
        bill_to_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(bill_to_table)
        elements.append(Spacer(1, 15))

        # Line Items Table
        items_data = [["Item Description", "Qty", "Unit Price (KES)", "VAT Rate", "Total (KES)"]]
        for item in invoice.items:
            items_data.append([
                Paragraph(item.description, body_style),
                f"{item.quantity:.2f}",
                f"{item.unit_price:,.2f}",
                f"{item.tax_rate:.0f}%",
                f"{item.total_amount:,.2f}",
            ])

        items_table = Table(items_data, colWidths=[220, 50, 90, 60, 100])
        items_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), primary_color),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 12))

        # Totals Summary
        totals_data = [
            ["Subtotal (Excl. VAT):", f"KES {invoice.subtotal:,.2f}"],
            ["VAT Output Tax (16%):", f"KES {invoice.tax_amount:,.2f}"],
            ["Total Amount Due:", f"KES {invoice.total_amount:,.2f}"],
            ["Paid Amount:", f"KES {invoice.paid_amount:,.2f}"],
            ["Balance Due:", f"KES {invoice.balance_due:,.2f}"],
        ]
        totals_table = Table(totals_data, colWidths=[380, 140])
        totals_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("LINEBELOW", (0, 2), (-1, 2), 1, primary_color),
            ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
            ("FONTNAME", (0, 4), (-1, 4), "Helvetica-Bold"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(totals_table)
        elements.append(Spacer(1, 20))

        # Compliance / eTIMS Notice Footer
        compliance_text = "<b>KRA eTIMS Notice:</b> "
        if invoice.etims_status == "ACCEPTED" and invoice.etims_control_number:
            compliance_text += f"Officially validated by KRA eTIMS. Control Number: {invoice.etims_control_number}."
        elif invoice.etims_status == "MANUALLY_RECORDED":
            compliance_text += f"Manually recorded for compliance review. Reference: {invoice.manual_recording_ref or 'Verified Internally'}."
        else:
            compliance_text += "Tax invoice generated under standard internal financial controls."

        elements.append(Paragraph(compliance_text, body_style))

        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
