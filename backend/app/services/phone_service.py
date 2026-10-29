import phonenumbers
from phonenumbers import NumberParseException

class PhoneNumberService:
    @staticmethod
    def normalize_and_validate(raw_phone: str, default_region: str = "IN") -> str:
        """
        Parses, validates, and normalizes phone number to strict E.164.
        Throws ValueError on invalid or malformed numbers.
        """
        if not raw_phone or not isinstance(raw_phone, str):
            raise ValueError("Phone number must be provided")

        cleaned = raw_phone.strip()
        try:
            # If the user supplied a '+' prefix, phonenumbers handles international parsing
            parsed = phonenumbers.parse(cleaned, default_region if not cleaned.startswith("+") else None)
        except NumberParseException as e:
            raise ValueError(f"Invalid phone number format: {e._msg}")

        if not phonenumbers.is_valid_number(parsed):
            raise ValueError("Phone number is not a valid recognized telephone number")

        # Format to canonical E.164 (+<country_code><national_number>)
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
