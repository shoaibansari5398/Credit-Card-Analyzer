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
    - Preserves lines that look like transactions (Date + Amount).
    - Aggressively redacts PII (Names, Addresses, Phones) from non-transaction lines GLOBALLY.
    - Masks Credit Card / Account numbers and Emails globally.
    """
    if not text:
        return ""

    # Helper patterns
    # Date: simple roughly DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD
    date_pattern = re.compile(r'\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b')
    # Amount: number with decimal or commas, maybe Dr/Cr suffix
    # We look for something that definitely looks like currency: 1,234.00 or 1234.00
    amount_pattern = re.compile(r'\b[\d,]+\.\d{2}\b')

    # Address keywords (common in Indian statements as per user sample)
    address_keywords = ['ROAD', 'NAGAR', 'MARG', 'COLONY', 'SECTOR', 'PLOT', 'FLAT', 'NEAR', 'OPP', 'BEHIND', 'LANE', 'STREET', 'PO', 'DIST', 'COTTAGE', 'RANGPUR', 'KOTHI', 'RAJ']

    # Explicit PII Header Patterns (e.g., "Name : VALUE", "Address : VALUE")
    name_header_pattern = re.compile(r'(?:^|\s)Name\s*:\s*([A-Z][A-Za-z\s]+)', re.IGNORECASE)
    # Also catch "Name SHOAIB..." without colon (common in statement headers)
    name_no_colon_pattern = re.compile(r'\bName\s+([A-Z][A-Z\s]{3,})', re.IGNORECASE)
    address_header_pattern = re.compile(r'(?:^|\s)Address\s*:\s*(.+)', re.IGNORECASE)


    lines = text.split('\n')
    cleaned_lines = []

    # Precompile address keyword pattern
    if not hasattr(scrub_sensitive_data, 'addr_keyword_pattern'):
        pattern_str = '|'.join(r'\b' + re.escape(kw) + r'\b' for kw in address_keywords)
        scrub_sensitive_data.addr_keyword_pattern = re.compile(pattern_str, re.IGNORECASE)

    # Define number_replacer once outside the loop (performance optimization)
    def number_replacer(match):
        val = match.group(0)
        # Use the same date_pattern to check if this looks like a date
        if date_pattern.match(val):
            return val
        digits = re.sub(r'\D', '', val)
        if len(digits) >= 12:
            return f"[REDACTED_NUM_{digits[-4:]}]"
        return val

    for i, line in enumerate(lines):
        # 1. Global Redactions (always apply)
        # Email
        line = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[REDACTED_EMAIL]', line)

        line = re.sub(r'\b(?:\d[ -]*){13,19}\b', number_replacer, line)

        # 2. Check if Transaction Line
        # A line is a transaction if it has a DATE and an AMOUNT
        has_date = bool(date_pattern.search(line))
        has_amount = bool(amount_pattern.search(line))

        if has_date and has_amount:
            # IT IS A TRANSACTION. Preserve it (after the basic masking above).
            cleaned_lines.append(line)
            continue

        # 3. Non-Transaction Line: Aggressive Scrubbing (GLOBALLY, no line limit)

        # PIN Codes (6 digits)
        line = re.sub(r'\b\d{6}\b', '[REDACTED_PIN]', line)

        # Phone Numbers (10 digits starting with 6-9)
        line = re.sub(r'\b[6-9]\d{9}\b', '[REDACTED_PHONE]', line)

        # --- Explicit Header Patterns ---
        # Redact "Name : <value>"
        line = name_header_pattern.sub(r' Name : [REDACTED_NAME]', line)
        # Redact "Name SHOAIB..." (without colon)
        line = name_no_colon_pattern.sub(r'Name [REDACTED_NAME]', line)
        # Redact "Address : <value>"
        line = address_header_pattern.sub(r' Address : [REDACTED_ADDRESS]', line)


        # --- Address Keywords ---
        upper_line = line.upper()
        is_address_line = bool(scrub_sensitive_data.addr_keyword_pattern.search(upper_line))
        if is_address_line:
            line = "[REDACTED_ADDRESS_LINE]"
            cleaned_lines.append(line)
            continue

        # --- Name-like Line Heuristic (Globally) ---
        upper_words = [w for w in line.split() if w.isupper() and w.isalpha()]
        total_words = [w for w in line.split() if w.strip()]

        safe_headers = ['STATEMENT', 'SUMMARY', 'PAYMENT', 'DATE', 'DETAILS', 'MERCHANT', 'CATEGORY', 'AMOUNT', 'CREDIT', 'DEBIT', 'BALANCE', 'TOTAL', 'DUE', 'TRANSACTIONS', 'DOMESTIC', 'BASE', 'NEUCOINS', 'LIMIT', 'ACCOUNT', 'OPENING', 'PURCHASE', 'FINANCE', 'CHARGES', 'MINIMUM', 'OVERLIMIT', 'BANK', 'CARD', 'GSTIN', 'HSN', 'CODE', 'PAGE', 'EMAIL', 'INFO']
        is_safe_header = any(safe in upper_line for safe in safe_headers)

        if not is_safe_header:
            len_upper = len(upper_words)
            len_total = len(total_words)
            # If 80% of words are uppercase and there are at least 2, it's a name candidate
            if len_total > 0 and len_upper >= 2 and len_upper >= (len_total * 0.8):
                line = "[REDACTED_NAME_CANDIDATE]"

        cleaned_lines.append(line)

    return '\n'.join(cleaned_lines)



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
