from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser  
from langchain_core.runnables import RunnablePassthrough, RunnableBranch
import tempfile
from langchain_core.documents import Document

# Load environment variables
load_dotenv()

app = FastAPI(title="PDF Summarizer API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SummaryRequest(BaseModel):
    summary_type: str = "summarize"  # or "elaborate" or "learn"
    max_tokens: Optional[int] = 1000

class TextSummaryRequest(BaseModel):
    text: str
    summary_type: str = "summarize"  # or "elaborate" or "learn"
    max_tokens: Optional[int] = 1000

# Custom prompt for mathematical content - Summarize
MATH_SUMMARIZE_PROMPT = """
You are an expert in mathematics and statistics. Please summarize the following text, 
paying special attention to mathematical formulas and concepts.

IMPORTANT FORMATTING INSTRUCTIONS:
1. Format ALL mathematical expressions using Markdown-compatible LaTeX syntax:
   - For inline formulas, use single dollar signs: $E=mc^2$
   - For display/block formulas, use double dollar signs: $$\\sum_{{i=1}}^{{n}} i = \\frac{{n(n+1)}}{{2}}$$
2. Ensure all special LaTeX characters are properly escaped (e.g., use \\alpha for α, \\beta for β)
3. Maintain line breaks for clarity in longer equations
4. For matrices, use the proper LaTeX environment: $$\\begin{{matrix}} a & b \\\\ c & d \\end{{matrix}}$$

Text: {text}

Summarize:
"""

# Custom prompt for mathematical content - Elaborate
MATH_ELABORATE_PROMPT = """
You are an expert in mathematics and statistics. Please elaborate on the following text, 
providing more details and context while maintaining accuracy.

IMPORTANT FORMATTING INSTRUCTIONS:
1. Format ALL mathematical expressions using Markdown-compatible LaTeX syntax:
   - For inline formulas, use single dollar signs: $E=mc^2$
   - For display/block formulas, use double dollar signs: $$\\sum_{{i=1}}^{{n}} i = \\frac{{n(n+1)}}{{2}}$$
2. Ensure all special LaTeX characters are properly escaped (e.g., use \\alpha for α, \\beta for β)
3. Maintain line breaks for clarity in longer equations
4. For matrices, use the proper LaTeX environment: $$\\begin{{matrix}} a & b \\\\ c & d \\end{{matrix}}$$

Text: {text}

Elaborate:
"""

# Custom prompt for mathematical content - Learning mode
MATH_LEARN_PROMPT = """
You are a world-class mathematics and statistics educator. Your task is to explain the following content 
in a way that helps someone learn the topic deeply. Assume the reader is a student who wants to 
truly understand the concepts, not just memorize formulas.

For each concept, you should:
1. Explain the intuition behind it in plain language
2. Show the formal definition with proper notation
3. Provide a simple example that illustrates the concept
4. Connect it to other related concepts when relevant
5. Highlight common misconceptions or pitfalls

IMPORTANT FORMATTING INSTRUCTIONS:
1. Format ALL mathematical expressions using Markdown-compatible LaTeX syntax:
   - For inline formulas, use single dollar signs: $E=mc^2$
   - For display/block formulas, use double dollar signs: $$\\sum_{{i=1}}^{{n}} i = \\frac{{n(n+1)}}{{2}}$$
2. Ensure all special LaTeX characters are properly escaped (e.g., use \\alpha for α, \\beta for β)
3. Maintain line breaks for clarity in longer equations
4. For matrices, use the proper LaTeX environment: $$\\begin{{matrix}} a & b \\\\ c & d \\end{{matrix}}$$
5. Use markdown headings (##) to organize the content into clear sections

Text: {text}

Explanation:
"""

def process_pdf(file_path: str) -> str:
    """Process PDF file and return extracted text."""
    loader = PyPDFLoader(file_path)
    pages = loader.load()
    text = " ".join([page.page_content for page in pages])
    return text

def split_text(text: str) -> List[Document]:
    """Split text into chunks for processing."""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=2000,
        chunk_overlap=200,
        length_function=len,
    )
    return text_splitter.create_documents([text])

def get_llm():
    """Get the language model."""
    return ChatOpenAI(temperature=0, model_name="gpt-4")

def get_conditional_chain():
    """Get a conditional chain that branches based on the action."""
    llm = get_llm()
    
    # Create prompts
    summarize_prompt = ChatPromptTemplate.from_template(MATH_SUMMARIZE_PROMPT)
    elaborate_prompt = ChatPromptTemplate.from_template(MATH_ELABORATE_PROMPT)
    learn_prompt = ChatPromptTemplate.from_template(MATH_LEARN_PROMPT)
    
    # Create the individual chains
    summarize_chain = summarize_prompt | llm | StrOutputParser()
    elaborate_chain = elaborate_prompt | llm | StrOutputParser()
    learn_chain = learn_prompt | llm | StrOutputParser()
    
    # Create a branch that selects the appropriate chain based on the action
    branch = RunnableBranch(
        (lambda x: x["action"] == "summarize", summarize_chain),
        (lambda x: x["action"] == "elaborate", elaborate_chain),
        (lambda x: x["action"] == "learn", learn_chain),
        # Default case
        summarize_chain
    )
    
    return branch

def process_documents(docs: List[Document], action: str) -> str:
    """Process documents and generate summary/elaboration/learning materials."""
    # Combine documents into a single text
    full_text = " ".join([doc.page_content for doc in docs])
    
    # Get the conditional chain
    chain = get_conditional_chain()
    
    # Process text with the appropriate chain
    return chain.invoke({
        "text": full_text,
        "action": action
    })

def process_text(text: str, action: str) -> str:
    """Process text directly and generate summary/elaboration/learning materials."""
    # Split text into chunks
    docs = split_text(text)
    
    # Process documents
    return process_documents(docs, action)

@app.post("/summarize")
async def summarize_pdf(
    file: UploadFile = File(...),
    summary_type: str = "summarize"
):
    """Endpoint to summarize, elaborate, or explain PDF content."""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Validate summary_type
    if summary_type not in ["summarize", "elaborate", "learn"]:
        summary_type = "summarize"  # Default to summarize if invalid
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Process PDF
        text = process_pdf(temp_file_path)
        docs = split_text(text)
        
        # Process documents with the selected action
        result = process_documents(
            docs, 
            summary_type
        )
        
        # Clean up
        os.unlink(temp_file_path)
        
        return {
            "status": "success",
            "result": result
        }
        
    except Exception as e:
        import traceback
        error_message = f"Error: {str(e)}\n{traceback.format_exc()}"
        print(error_message)
        raise HTTPException(status_code=500, detail=error_message)

@app.post("/summarize-text")
async def summarize_text(request: TextSummaryRequest):
    """Endpoint to summarize, elaborate, or explain text content directly."""
    # Validate summary_type
    if request.summary_type not in ["summarize", "elaborate", "learn"]:
        summary_type = "summarize"  # Default to summarize if invalid
    else:
        summary_type = request.summary_type
        
    try:
        # Process text with the selected action
        result = process_text(
            request.text,
            summary_type
        )
        
        return {
            "status": "success",
            "result": result
        }
        
    except Exception as e:
        import traceback
        error_message = f"Error: {str(e)}\n{traceback.format_exc()}"
        print(error_message)
        raise HTTPException(status_code=500, detail=error_message)

@app.get("/")
async def root():
    return {"message": "PDF Summarizer API is running"} 