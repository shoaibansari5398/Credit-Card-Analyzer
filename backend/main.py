from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import pikepdf
import pdfplumber
import io
import os
import requests
import json
import time
import gc
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pydantic import BaseModel, EmailStr, ValidationError
from dotenv import load_dotenv
from security_utils import mask_transaction_pii, scrub_sensitive_data

# Rate limiting
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    limiter = Limiter(key_func=get_remote_address)
    RATE_LIMIT_ENABLED = True
except ImportError:
    # slowapi not installed - rate limiting disabled
    limiter = None
    RATE_LIMIT_ENABLED = False
    print("Warning: slowapi not installed. Rate limiting is disabled. Install with: pip install slowapi")

# Sanitize helper
def sanitize_text(text: str) -> str:
    """Remove potentially problematic characters from text to prevent injection."""
    if not text:
        return ""
    return text.replace('\r', '').replace('\n', ' ').replace('\x00', '').strip()

load_dotenv(dotenv_path="../.env")

app = FastAPI()

# Add rate limiter to app state if available
if RATE_LIMIT_ENABLED and limiter:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
# Configure CORS
try:
    # Default to localhost if not set
    default_origins = '["http://localhost:5173", "http://localhost:3000"]'
    origins_str = os.getenv("ALLOWED_ORIGINS", default_origins)

    if origins_str.strip().startswith("["):
        ALLOWED_ORIGINS = json.loads(origins_str)
    else:
        ALLOWED_ORIGINS = [origin.strip() for origin in origins_str.split(",") if origin.strip()]
except Exception as e:
    print(f"Error parsing ALLOWED_ORIGINS: {e}")
    ALLOWED_ORIGINS = ["http://localhost:5173", "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

def get_cors_origin(request) -> str:
    """Get appropriate CORS origin from request, validated against allowed origins."""
    origin = request.headers.get("origin", "")
    if origin in ALLOWED_ORIGINS:
        return origin
    # Fallback to first allowed origin for non-browser requests
    return ALLOWED_ORIGINS[0] if ALLOWED_ORIGINS else ""

# Global Exception Handlers to ensure CORS headers are always present
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    # Log full error internally, but don't expose to client
    print(f"Global Exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."},
        headers={"Access-Control-Allow-Origin": get_cors_origin(request)}
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={"Access-Control-Allow-Origin": get_cors_origin(request)}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid request data. Please check your input."},
        headers={"Access-Control-Allow-Origin": get_cors_origin(request)}
    )

# Root endpoint for easy connectivity check
@app.get("/")
async def root():
    return {"message": "Credit Card Analyzer API is running", "docs": "/docs"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": time.time()}

# Email Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", SMTP_USERNAME)
RECIPIENT_EMAIL = os.getenv("RECIPIENT_EMAIL", SMTP_USERNAME)

class ContactRequest(BaseModel):
    category: str
    name: str
    email: str # Staying with str to avoid missing dependency issues, relying on sanitization
    description: str

@app.post("/contact")
@limiter.limit("5/minute") if RATE_LIMIT_ENABLED else lambda f: f
async def contact_support(request: ContactRequest, req: Request):
    print(f"Received contact request: {request}")

    # Sanitize inputs
    safe_category = sanitize_text(request.category)
    safe_name = sanitize_text(request.name)
    safe_email = sanitize_text(request.email)
    # Description needs to allow newlines for the body, but should be careful?
    # Actually, for the body it is fine, but we should ensure no header injection via body if that's even possible (unlikely in MIMEText).
    # But CodeRabbit suggested removing \r.
    safe_description = request.description.replace('\r', '')

    # 1. Check if SMTP is configured
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print("SMTP credentials not found. simulating email send.")
        # REDACTED LOGGING
        print(f"Would send email to {RECIPIENT_EMAIL} from {safe_email} about {safe_category}")
        return {"status": "success", "message": "Support request received (Simulation)"}

    # 2. Construct Email
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = RECIPIENT_EMAIL
        msg['Subject'] = f"New Support Request: {safe_category}"
        msg['Reply-To'] = safe_email

        body = f"""
        New Contact Request
        ------------------
        Category: {safe_category}
        Name: {safe_name}
        Email: {safe_email}

        Description:
        {safe_description}
        """
        msg.attach(MIMEText(body, 'plain'))

        # 3. Send Email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)

        print("Email sent successfully")
        return {"status": "success", "message": "Support request sent successfully"}

    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        # Valid request but failed transmission - return error or handled success?
        # Let's return error so frontend knows
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Gemini model - Using Gemini 2.0 Flash for fast, quality responses
GEMINI_MODEL = "gemini-2.0-flash"

# Transaction categories - must match frontend/config/constants.ts
TRANSACTION_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Utilities', 'Entertainment', 'Health', 'Travel', 'Other']

SYSTEM_PROMPT = f"""
You are a specialized data extraction AI.
Analyze the provided text from a Credit Card Statement and extract all transactions.

Return the data as a JSON array where each object has:
- date: ISO 8601 format (YYYY-MM-DD). If year is missing, try to infer from context or use current year.
- merchant: The clean name of the merchant (remove locations/codes like 'UBER *trip 2452').
- amount: The numeric value. Positive for expenses, negative for payments/credits.
- category: Classify into one of: {', '.join(TRANSACTION_CATEGORIES)}.
- isRecurring: Boolean, true if it looks like a subscription.

If the text contains no transactions, return an empty array.
Output ONLY raw JSON. No markdown formatting.
"""


def call_gemini(extracted_text: str) -> str | None:
    """Call Gemini API for transaction extraction."""
    if not GEMINI_API_KEY:
        return None

    print(f"Calling Gemini API with model: {GEMINI_MODEL}")

    # Warn if text will be truncated
    if len(extracted_text) > 30000:
        print(f"Warning: Text truncated from {len(extracted_text)} to 30000 characters. Some transactions may be missed.")

    try:
        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}",
            headers={
                "Content-Type": "application/json",
            },
            json={
                "contents": [
                    {
                        "parts": [
                            {"text": f"{SYSTEM_PROMPT}\n\nHere is the bank statement text:\n\n{extracted_text[:30000]}"}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 4096
                }
            },
            timeout=60
        )

        if response.status_code == 200:
            ai_data = response.json()
            try:
                return ai_data['candidates'][0]['content']['parts'][0]['text']
            except (KeyError, IndexError, TypeError) as e:
                print(f"Gemini response parsing error: {str(e)}")
                print(f"Response structure: {ai_data}")
                return None
        else:
            print(f"Gemini Error {response.status_code}: {response.text}")
            return None

    except Exception as e:
        print(f"Gemini Exception: {str(e)}")
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
@limiter.limit("10/minute") if RATE_LIMIT_ENABLED else lambda f: f
async def analyze_statement(
    req: Request,
    file: UploadFile = File(...),
    password: str = Form(None)
):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Missing GEMINI_API_KEY. Please set it in your .env file.")

    try:
        start_time = time.time()

        # 0. Validate File Size (Max 10MB) - Prevent DoS
        MAX_FILE_SIZE = 10 * 1024 * 1024 # 10MB
        if file.size and file.size > MAX_FILE_SIZE:
             raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")

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

        # 3. Pre-Process & Scrub PII
        scrubbed_text = scrub_sensitive_data(extracted_text)

        # 4. Call Gemini API
        content = call_gemini(scrubbed_text)

        if not content:
            raise HTTPException(status_code=500, detail="Gemini API failed. Please check your API key and try again.")

        # 4. Parse JSON and apply PII masking
        transactions = parse_json_response(content)
        masked_transactions = mask_transaction_pii(transactions)

        parse_duration = time.time() - start_time
        print(f"PDF parsing completed in {parse_duration:.2f}s")

        return masked_transactions

    except pikepdf.PdfError as e:
        print(f"PDF Error: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid or corrupted PDF file.")
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process the document. Please try again.")
    except HTTPException:
        # Let HTTPExceptions pass through (e.g., password errors, file size)
        raise
    except Exception as e:
        print(f"Server Error: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")
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


# ============ Chat API (Gemini Proxy) ============

CHAT_SYSTEM_INSTRUCTION = """You are a helpful financial assistant that analyzes credit card transaction data.
You have access to the user's transaction history and can answer questions about their spending patterns.

When answering questions:
1. Be concise and direct
2. Use specific numbers and percentages when relevant
3. Reference actual merchants and categories from the data
4. Format currency with the appropriate symbol
5. Use markdown for better readability

If the user asks something you cannot determine from the data, politely explain what information is available."""


class ChatRequest(BaseModel):
    message: str
    transactionContext: str
    conversationHistory: list = []


@app.post("/api/chat")
@limiter.limit("30/minute") if RATE_LIMIT_ENABLED else lambda f: f
async def chat_endpoint(request: ChatRequest, req: Request):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Missing GEMINI_API_KEY")

    # Limit context size to prevent API errors and excessive costs
    MAX_CONTEXT_SIZE = 50000  # characters
    if len(request.transactionContext) > MAX_CONTEXT_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Transaction context too large. Maximum {MAX_CONTEXT_SIZE} characters."
        )

    if len(request.message) > 2000:
        raise HTTPException(status_code=400, detail="Message too long. Maximum 2000 characters.")

    try:
        # Build conversation context
        history_text = "\n\n".join([
            f"{'User' if m.get('role') == 'user' else 'Assistant'}: {m.get('content', '')}"
            for m in request.conversationHistory[-10:]
        ])

        prompt = f"""{CHAT_SYSTEM_INSTRUCTION}

Here is the user's transaction data for context:
{request.transactionContext}

Previous conversation:
{history_text}

User's current question: {request.message}

Please respond helpfully based on the transaction data above."""

        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.7, "maxOutputTokens": 1024}
            },
            timeout=60
        )

        if response.status_code == 200:
            ai_data = response.json()
            try:
                return {"response": ai_data['candidates'][0]['content']['parts'][0]['text']}
            except (KeyError, IndexError, TypeError) as e:
                print(f"Gemini Chat parsing error: {str(e)}")
                raise HTTPException(status_code=500, detail="Invalid AI response format")
        else:
            print(f"Gemini Chat Error: {response.text}")
            raise HTTPException(status_code=500, detail="AI service error")

    except Exception as e:
        print(f"Chat Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Insights API (Gemini Proxy) ============

INSIGHTS_SYSTEM_INSTRUCTION = """You are a savvy financial analyst. Your goal is to provide a brief, high-impact "Financial Story" based on credit card data.
Focus on 3 things:
1. Spending Velocity (Are they accelerating spend?).
2. Anomaly Detection (Any weird large purchases?).
3. One actionable tip to save money based on their top category.
Keep the tone professional but conversational. Limit response to 150 words. Format with Markdown."""


class InsightsRequest(BaseModel):
    stats: dict
    topTransactions: list


@app.post("/api/insights")
@limiter.limit("20/minute") if RATE_LIMIT_ENABLED else lambda f: f
async def insights_endpoint(request: InsightsRequest, req: Request):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Missing GEMINI_API_KEY")

    # Validate topTransactions size
    if len(request.topTransactions) > 100:
        raise HTTPException(
            status_code=400,
            detail="Too many transactions. Maximum 100 allowed."
        )

    # Validate stats structure
    required_keys = ['totalSpend', 'burnRate', 'topCategory', 'largestTx']
    if not all(key in request.stats for key in required_keys):
        raise HTTPException(
            status_code=400,
            detail=f"Missing required stats fields: {required_keys}"
        )

    try:
        stats = request.stats
        top_tx = request.topTransactions

        prompt_data = f"""
Total Spend: {stats.get('totalSpend', 0):.2f}
Daily Burn Rate: {stats.get('burnRate', 0):.2f}
Top Category: {stats.get('topCategory', {}).get('name', 'Unknown')} ({stats.get('topCategory', {}).get('percentage', 0):.1f}%)
Largest Transaction: {stats.get('largestTx', {}).get('merchant', 'Unknown')} for {stats.get('largestTx', {}).get('amount', 0)}

Recent Large Transactions:
{chr(10).join([f"- {t.get('date')}: {t.get('merchant')} ({t.get('amount')}) [{t.get('category')}]" for t in top_tx[:5]])}
"""

        prompt = f"{INSIGHTS_SYSTEM_INSTRUCTION}\n\nAnalyze these spending metrics:\n{prompt_data}"

        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.7, "maxOutputTokens": 512}
            },
            timeout=60
        )

        if response.status_code == 200:
            ai_data = response.json()
            try:
                return {"insights": ai_data['candidates'][0]['content']['parts'][0]['text']}
            except (KeyError, IndexError, TypeError) as e:
                print(f"Gemini Insights parsing error: {str(e)}")
                raise HTTPException(status_code=500, detail="Invalid AI response format")
        else:
            print(f"Gemini Insights Error: {response.text}")
            raise HTTPException(status_code=500, detail="AI service error")

    except Exception as e:
        print(f"Insights Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
