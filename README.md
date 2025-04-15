# Advanced PDF Summarizer

A robust PDF summarizer backend built with FastAPI, LangChain, and OpenAI. This application specializes in summarizing and elaborating educational content, particularly in mathematics and statistics, with proper mathematical formatting.

## Features

- PDF file processing and text extraction
- Mathematical content summarization and elaboration
- LaTeX syntax support for mathematical expressions
- FastAPI backend with CORS support
- Configurable summarization parameters

## Prerequisites

- Python 3.8+
- OpenAI API key

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file based on `.env.example` and add your OpenAI API key
4. Run the application:
   ```bash
   uvicorn main:app --reload
   ```

## API Usage

### Summarize PDF

Send a POST request to `/summarize` with:
- PDF file in the request body
- Optional parameters:
  - `summary_type`: "summarize" or "elaborate" (default: "summarize")
  - `max_tokens`: Maximum tokens for the summary (default: 1000)

Example using curl:
```bash
curl -X POST "http://localhost:8000/summarize" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@your_file.pdf" \
     -F "summary_type=summarize"
```

## Response Format

```json
{
    "status": "success",
    "result": "Summarized content with mathematical expressions in LaTeX format"
}
```

## Error Handling

The API returns appropriate HTTP status codes and error messages for:
- Invalid file types (non-PDF)
- Missing or invalid API keys
- Processing errors 