import pytest
from security_utils import scrub_sensitive_data

def test_scrub_emails():
    text = "Contact me at user@example.com for info."
    scrubbed = scrub_sensitive_data(text)
    assert "[REDACTED_EMAIL]" in scrubbed
    assert "user@example.com" not in scrubbed

def test_scrub_credit_cards():
    # 16 digit
    text = "Card: 4111 2222 3333 4444"
    scrubbed = scrub_sensitive_data(text)
    assert "[REDACTED_NUM_4444]" in scrubbed
    assert "4111 2222 3333 4444" not in scrubbed

def test_preserve_dates():
    # Should NOT scrub dates
    text = "Date: 2024-01-30"
    scrubbed = scrub_sensitive_data(text)
    assert "2024-01-30" in scrubbed

def test_short_numbers_preserved():
    text = "Amount: 1234.56"
    scrubbed = scrub_sensitive_data(text)
    assert "1234.56" in scrubbed
