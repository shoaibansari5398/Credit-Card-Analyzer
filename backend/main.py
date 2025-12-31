from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pikepdf
import pdfplumber
import io
import os
import requests
import json
import time
import gc
from dotenv import load_dotenv
from security_utils import mask_transaction_pii

load_dotenv(dotenv_path="../.env")

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": time.time()}

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Groq model - Using Llama 3.3 70B for best quality
GROQ_MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """
You are a specialized data extraction AI.
Analyze the provided text from a Credit Card Statement and extract all transactions.

Return the data as a JSON array where each object has:
- date: ISO 8601 format (YYYY-MM-DD). If year is missing, try to infer from context or use current year.
- merchant: The clean name of the merchant (remove locations/codes like 'UBER *trip 2452').
- amount: The numeric value. Positive for expenses, negative for payments/credits.
- category: Classify into one of: Food, Transport, Shopping, Utilities, Entertainment, Health, Travel, Other.
- isRecurring: Boolean, true if it looks like a subscription.

If the text contains no transactions, return an empty array.
Output ONLY raw JSON. No markdown formatting.
"""


def call_groq(extracted_text: str) -> str | None:
    """Call Groq API with Llama 3.3 70B."""
    if not GROQ_API_KEY:
        return None

    print(f"Calling Groq API with model: {GROQ_MODEL}")
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Here is the bank statement text:\n\n{extracted_text[:30000]}"}
                ],
                "temperature": 0.7,
                "max_tokens": 4096
            },
            timeout=60
        )

        if response.status_code == 200:
            ai_data = response.json()
            return ai_data['choices'][0]['message']['content']
        else:
            print(f"Groq Error {response.status_code}: {response.text}")
            return None

    except Exception as e:
        print(f"Groq Exception: {str(e)}")
        return None


def parse_json_response(content: str) -> list:
    """Extract and parse JSON from AI response."""
    # Extract JSON
    if "```json" in content:
        json_str = content.split("```json")[1].split("```")[0].strip()
    elif "```" in content:
        json_str = content.split("```")[1].split("```")[0].strip()
    else:
        json_str = content

    # Clean potential non-json headers
    if "[" in json_str:
        json_str = "[" + json_str.split("[", 1)[1]
    if "]" in json_str:
        json_str = json_str.rsplit("]", 1)[0] + "]"

    return json.loads(json_str)


@app.post("/analyze")
async def analyze_statement(
    file: UploadFile = File(...),
    password: str = Form(None)
):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Missing GROQ_API_KEY. Please set it in your .env file.")

    try:
        start_time = time.time()

        # 1. Read file into RAM
        file_bytes = await file.read()
        file_stream = io.BytesIO(file_bytes)
        decrypted_stream = io.BytesIO()

        # 2. Decryption & Text Extraction
        is_pdf = file.filename.lower().endswith('.pdf') or file.content_type == 'application/pdf'
        extracted_text = ""

        if is_pdf:
            try:
                pwd = password or ""
                pdf = pikepdf.open(file_stream, password=pwd)
                pdf.save(decrypted_stream)
                pdf.close()
            except pikepdf.PasswordError:
                if password:
                    trimmed = password.strip()
                    try:
                        file_stream.seek(0)
                        pdf = pikepdf.open(file_stream, password=trimmed)
                        pdf.save(decrypted_stream)
                        pdf.close()
                    except pikepdf.PasswordError:
                        upper = trimmed.upper()
                        try:
                            file_stream.seek(0)
                            pdf = pikepdf.open(file_stream, password=upper)
                            pdf.save(decrypted_stream)
                            pdf.close()
                        except pikepdf.PasswordError:
                            raise HTTPException(status_code=400, detail="Incorrect Password")
                else:
                    raise HTTPException(status_code=400, detail="PDF is password protected")

            decrypted_stream.seek(0)
            with pdfplumber.open(decrypted_stream) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        extracted_text += text + "\n"

            if len(extracted_text) < 50:
                raise HTTPException(status_code=400, detail="Could not extract text from PDF. It might be scanned/image-based.")

        else:
            extracted_text = file_bytes.decode('utf-8', errors='ignore')

        # 3. Call Groq API
        content = call_groq(extracted_text)

        if not content:
            raise HTTPException(status_code=500, detail="Groq API failed. Please check your API key and try again.")

        # 4. Parse JSON and apply PII masking
        transactions = parse_json_response(content)
        masked_transactions = mask_transaction_pii(transactions)

        parse_duration = time.time() - start_time
        print(f"PDF parsing completed in {parse_duration:.2f}s")

        return masked_transactions

    except pikepdf.PdfError as e:
        raise HTTPException(status_code=400, detail=f"Invalid PDF: {str(e)}")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        print(f"Server Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'file_bytes' in dir():
            del file_bytes
        if 'file_stream' in dir():
            del file_stream
        if 'decrypted_stream' in dir():
            del decrypted_stream
        if 'extracted_text' in dir():
            del extracted_text
        gc.collect()
