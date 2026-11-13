"""
Deprecated: Daraja client has been replaced by the Tuma API Payment Gateway (https://api.tuma.co.ke).
This compatibility module aliases DarajaClient to TumaClient.
"""
from app.integrations.tuma.client import TumaClient as DarajaClient

__all__ = ["DarajaClient"]
