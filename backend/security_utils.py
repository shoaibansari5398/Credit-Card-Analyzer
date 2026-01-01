"""
Security utilities for the Credit Card Analyzer.
Provides PII redaction and data sanitization functions.
"""

import re
from typing import List, Dict, Any


def mask_account_numbers(text: str) -> str:
    """
    Mask credit card and account numbers, keeping only last 4 digits.

    Patterns matched:
    - 16-digit card numbers (with or without separators)
    - 12-16 digit account numbers

    Example: "4111-1111-1111-1234" -> "XXXX-XXXX-XXXX-1234"
    """
    # Pattern for 16-digit card numbers with separators
    pattern_with_sep = r'\b(\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?)(\d{4})\b'
    text = re.sub(pattern_with_sep, r'XXXX-XXXX-XXXX-\2', text)

    # Pattern for continuous 12-16 digit numbers
    pattern_continuous = r'\b(\d{8,12})(\d{4})\b'
    text = re.sub(pattern_continuous, r'XXXX-XXXX-\2', text)

    return text


def scrub_sensitive_data(text: str) -> str:
    """
    Scrub PII from raw text before sending to AI.
    - Replaces 12-16 digit numbers (cards/accounts) with [REDACTED_NUMBER]
    - Replaces emails with [REDACTED_EMAIL]
    """
    if not text:
        return ""

    # 1. Email Addresses
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    text = re.sub(email_pattern, '[REDACTED_EMAIL]', text)

    # 2. Credit Card / Account Numbers (13-19 digits, allowing for spaces/dashes)
    # Be careful not to match dates like 2024-01-01 (which has 8 digits)
    # We target longer sequences.
    cc_pattern = r'\b(?:\d[ -]*){13,19}\b'

    def param_replacer(match):
        original = match.group(0)
        # Check if it looks like a date (ISO)
        if re.match(r'^\d{4}-\d{2}-\d{2}$', original):
            return original
        # If it's just a long number, redact it
        digits = re.sub(r'\D', '', original)
        if len(digits) >= 12:
            return f"[REDACTED_NUM_{digits[-4:]}]"
        return original

    text = re.sub(cc_pattern, param_replacer, text)

    return text


def mask_transaction_pii(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Apply PII masking to a list of transaction dictionaries.
    Masks account numbers in merchant names and any other string fields.
    """
    masked_transactions = []

    for tx in transactions:
        masked_tx = tx.copy()

        # Mask merchant name
        if 'merchant' in masked_tx and isinstance(masked_tx['merchant'], str):
            masked_tx['merchant'] = mask_account_numbers(masked_tx['merchant'])

        # Mask any notes or description fields if present
        for field in ['notes', 'description', 'memo']:
            if field in masked_tx and isinstance(masked_tx[field], str):
                masked_tx[field] = mask_account_numbers(masked_tx[field])

        masked_transactions.append(masked_tx)

    return masked_transactions
