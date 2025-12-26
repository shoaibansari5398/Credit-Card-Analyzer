from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pikepdf
import pdfplumber
import io
import os
import requests
import json
import time
from dotenv import load_dotenv

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

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

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

# Extensive list of free/cheap models to rotate through
MODELS = [
    "deepseek/deepseek-r1-distill-llama-70b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen-2.5-72b-instruct:free",
    "google/gemini-2.0-flash-exp:free",
    "google/gemini-2.0-pro-exp-02-05:free",
    "microsoft/phi-3-medium-128k-instruct:free"
]

@app.post("/analyze")
async def analyze_statement(
    file: UploadFile = File(...),
    password: str = Form(None)
):
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="Missing Server API Key")

    try:
        # 1. Read file into RAM
        file_bytes = await file.read()
        file_stream = io.BytesIO(file_bytes)
        decrypted_stream = io.BytesIO()

        # 2. Decryption (pikepdf) & Text Extraction
        is_pdf = file.filename.lower().endswith('.pdf') or file.content_type == 'application/pdf'
        extracted_text = ""

        if is_pdf:
            # Decrypt
            try:
                # Ensure password is a string, even if None
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

            # Extract Text (pdfplumber)
            decrypted_stream.seek(0)
            with pdfplumber.open(decrypted_stream) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        extracted_text += text + "\n"

            if len(extracted_text) < 50:
                 raise HTTPException(status_code=400, detail="Could not extract text from PDF. It might be scanned/image-based.")

        else:
            # For non-PDFs provided as text/csv?
            # Currently frontend only sends PDFs usually, but we can try generic decode
            extracted_text = file_bytes.decode('utf-8', errors='ignore')

        # 3. Call OpenRouter with Retry/Fallback
        last_error = None

        for model in MODELS:
            print(f"Attempting analysis with model: {model}")
            retries = 2
            for attempt in range(retries):
                try:
                    response = requests.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                            "Content-Type": "application/json",
                            "HTTP-Referer": "http://localhost:3000",
                        },
                        json={
                            "model": model,
                            "messages": [
                                {
                                    "role": "system",
                                    "content": SYSTEM_PROMPT
                                },
                                {
                                    "role": "user",
                                    "content": f"Here is the bank statement text:\n\n{extracted_text[:30000]}" # Truncate to avoid context limits
                                }
                            ]
                        },
                        timeout=60 # Extended timeout for slower models
                    )

                    if response.status_code == 200:
                        ai_data = response.json()
                        content = ai_data['choices'][0]['message']['content']

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

                    elif response.status_code == 429:
                        print(f"Rate limited on {model}. Waiting...")
                        time.sleep(2)
                        last_error = f"Rate Limited: {response.text}"
                        continue
                    else:
                        print(f"Error {response.status_code} on {model}: {response.text}")
                        last_error = f"OpenRouter Error: {response.text}"
                        break

                except Exception as e:
                    print(f"Exception on {model}: {str(e)}")
                    last_error = str(e)
                    break

            print(f"Failed to get response from {model}. Trying next...")

        raise HTTPException(status_code=429, detail=f"All models failed. Last error: {last_error}")

    except pikepdf.PdfError as e:
         raise HTTPException(status_code=400, detail=f"Invalid PDF: {str(e)}")
    except Exception as e:
        print(f"Server Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
