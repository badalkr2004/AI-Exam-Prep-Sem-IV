from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser  
from langchain_core.runnables import RunnablePassthrough, RunnableBranch
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
import tempfile
from langchain_core.documents import Document
import uuid
from datetime import datetime
import json
import os.path
from langchain_chroma import Chroma
from langchain_core.vectorstores import VectorStore
import chromadb
import shutil
from elevenlabs import ElevenLabs, Voice
import io
import base64
import requests

# Load environment variables
load_dotenv()

# Add to main.py at the top after load_dotenv()
import os
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("Missing OPENAI_API_KEY environment variable")

app = FastAPI(title="Exam Preparation & Learning Tool API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://examprep.bitbrains.fun","http://localhost:5173"],  # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class SummaryRequest(BaseModel):
    summary_type: str = "summarize"  # or "elaborate" or "learn"
    max_tokens: Optional[int] = 1000

class TextSummaryRequest(BaseModel):
    text: str
    summary_type: str = "summarize"  # or "elaborate" or "learn"
    max_tokens: Optional[int] = 1000

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant" or "system"
    content: str
    
class ChatSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "New Chat"
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    messages: List[ChatMessage] = []
    domain: Optional[str] = None
    
class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    use_context: bool = True
    context_docs: Optional[List[str]] = None
    domain: Optional[str] = None

class ChatResponse(BaseModel):
    session_id: str
    response: str
    title: Optional[str] = None
    
class SessionListResponse(BaseModel):
    sessions: List[Dict[str, Any]]

# New data models for exam preparation tool
class ExamPaper(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subject: str
    year: Optional[str] = None
    document_id: str  # Reference to the document in vector DB
    file_path: str
    uploaded_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    metadata: Dict[str, Any] = {}
    
class MindMapNode(BaseModel):
    id: str
    label: str
    description: Optional[str] = None
    children: List[str] = []
    
class MindMap(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    root_node_id: str
    nodes: Dict[str, MindMapNode] = {}
    subject: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    
class LearningModule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subject: str
    content: str
    related_questions: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    
class Podcast(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subject: str
    audio_path: Optional[str] = None
    transcript: str
    duration_seconds: Optional[int] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class ExamPaperListResponse(BaseModel):
    papers: List[ExamPaper]

class MindMapRequest(BaseModel):
    subject: str
    topic: Optional[str] = None
    
class AnalysisRequest(BaseModel):
    subject: str
    topic: Optional[str] = None
    
class PodcastRequest(BaseModel):
    subject: str
    topic: Optional[str] = None
    duration_minutes: Optional[int] = 10

# Constants and directory structure
CHAT_SESSIONS_DIR = "chat_sessions"
VECTOR_DB_DIR = "vectorstore"
EXAM_PAPERS_DIR = "exam_papers"
MINDMAPS_DIR = "mindmaps"
LEARNING_MODULES_DIR = "learning_modules"
PODCASTS_DIR = "podcasts"
PODCAST_AUDIO_DIR = "podcasts/audio"

# Create necessary directories
for directory in [CHAT_SESSIONS_DIR, VECTOR_DB_DIR, EXAM_PAPERS_DIR, 
                 MINDMAPS_DIR, LEARNING_MODULES_DIR, PODCASTS_DIR, PODCAST_AUDIO_DIR]:
    os.makedirs(directory, exist_ok=True)

# Mount the podcast audio directory to make files accessible via HTTP
app.mount("/podcasts/audio", StaticFiles(directory=PODCAST_AUDIO_DIR), name="podcast_audio")

# Custom prompt for mathematical content - Summarize
MATH_SUMMARIZE_PROMPT = """
You are an expert in mathematics and statistics. Please summarize the following text, 
paying special attention to mathematical formulas and concepts.

IMPORTANT FORMATTING INSTRUCTIONS:
1. Format ALL mathematical expressions using Markdown-compatible LaTeX syntax:
   - For inline formulas, use single dollar signs: $E=mc^2$
   - For display/block formulas, use double dollar signs: $$\\sum_{{i=1}}^{{n}} i = \\frac{{n(n+1)}}{{2}}$$
2. Ensure all special LaTeX characters are properly escaped with double backslashes (e.g., use \\\\alpha for α, \\\\beta for β)
3. Always use double braces for LaTeX subscripts and superscripts: $x_{{i}}$ not $x_i$
4. Use proper LaTeX spacing commands like \\\\quad and \\\\, for spacing
5. For cases and conditions, use \\\\begin{{cases}} ... \\\\end{{cases}} with explicit newlines
6. For matrices, use the proper LaTeX environment: $$\\\\begin{{matrix}} a & b \\\\\\ c & d \\\\end{{matrix}}$$
7. Verify that all LaTeX expressions are properly balanced with matching delimiters

Text: {text}

Summarize:
"""

# Vector database and embedding functions
def get_embeddings_model():
    return OpenAIEmbeddings()

def get_or_create_vectorstore() -> VectorStore:
    """Get or create the vector store for semantic search."""
    try:
        embeddings = OpenAIEmbeddings()
        # Check if vectorstore exists
        if os.path.exists(VECTOR_DB_DIR) and len(os.listdir(VECTOR_DB_DIR)) > 0:
            return Chroma(persist_directory=VECTOR_DB_DIR, embedding_function=embeddings)
        
        # Create a new vectorstore
        vectorstore = Chroma.from_documents(
            documents=[Document(page_content="Initial document to create the database")],
            embedding=embeddings,
            persist_directory=VECTOR_DB_DIR
        )
        return vectorstore
    except Exception as e:
        print(f"Vector store error: {e}")
        # Return None or fallback solution
        return None

def add_to_vectorstore(text: str, metadata: Dict[str, Any] = None):
    """Add text to the vector store for future retrieval."""
    if not text.strip():
        return
    
    try:    
        vectorstore = get_or_create_vectorstore()
        if not vectorstore:
            return
            
        # Split text into chunks for better retrieval
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=100,
            length_function=len,
        )
        
        # Add metadata if none provided
        if metadata is None:
            metadata = {"source": "chat", "timestamp": datetime.now().isoformat()}
            
        chunks = text_splitter.create_documents(
            [text], 
            metadatas=[metadata] * (len(text) // 900 + 1)  # Estimate chunks
        )
        
        # Add to vector store
        vectorstore.add_documents(chunks)
    except Exception as e:
        print(f"Error adding to vector store: {e}")

def search_vectorstore(query: str, k: int = 3) -> List[Document]:
    """Search the vector store for relevant documents."""
    try:
        vectorstore = get_or_create_vectorstore()
        if vectorstore:
            return vectorstore.similarity_search(query, k=k)
        return []
    except Exception as e:
        print(f"Search error: {e}")
        return []

# PDF and text processing functions
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

# Chat session management functions
def get_session_path(session_id: str) -> str:
    """Get the path to the session file."""
    return os.path.join(CHAT_SESSIONS_DIR, f"{session_id}.json")

def load_session(session_id: str) -> Optional[ChatSession]:
    """Load a chat session from disk."""
    session_path = get_session_path(session_id)
    
    if not os.path.exists(session_path):
        return None
        
    try:
        with open(session_path, "r") as f:
            data = json.load(f)
            return ChatSession(**data)
    except:
        return None

def save_session(session: ChatSession):
    """Save a chat session to disk."""
    session_path = get_session_path(session.id)
    
    with open(session_path, "w") as f:
        f.write(json.dumps(session.dict(), indent=2))

def get_all_sessions() -> List[ChatSession]:
    """Get all chat sessions."""
    sessions = []
    
    if not os.path.exists(CHAT_SESSIONS_DIR):
        return sessions
        
    for filename in os.listdir(CHAT_SESSIONS_DIR):
        if filename.endswith(".json"):
            session_id = filename.split(".")[0]
            session = load_session(session_id)
            if session:
                sessions.append(session)
                
    return sessions

def create_session(first_message: str = None) -> ChatSession:
    """Create a new chat session."""
    session = ChatSession()
    
    if first_message:
        session.messages.append(ChatMessage(role="user", content=first_message))
        
    save_session(session)
    return session

def update_session_title(session: ChatSession) -> str:
    """Generate or update the session title based on the first message."""
    if len(session.messages) < 2 or session.title != "New Chat":
        return session.title
        
    first_message = next((msg.content for msg in session.messages if msg.role == "user"), "New Chat")
    
    # Generate a title using the LLM
    llm = get_llm()
    title_prompt = ChatPromptTemplate.from_messages([
        ("system", "Generate a short, concise title (maximum 6 words) for a conversation that starts with this message. Return ONLY the title with no additional text, quotes, or punctuation."),
        ("user", first_message[:100] + ("..." if len(first_message) > 100 else ""))
    ])
    
    title_chain = title_prompt | llm | StrOutputParser()
    title = title_chain.invoke({})
    
    # Clean up the title
    title = title.strip().strip('"').strip("'")
    if len(title) > 50:
        title = title[:47] + "..."
        
    session.title = title
    return title

def select_relevant_context(query: str, use_context: bool = True, context_docs: List[str] = None) -> str:
    """Select relevant context from the vector store or provided context."""
    if not use_context:
        return ""
        
    if context_docs and len(context_docs) > 0:
        return "\n\n".join(context_docs)
        
    # Search for relevant context in the vector store
    relevant_docs = search_vectorstore(query, k=3)
    
    if not relevant_docs:
        return ""
        
    return "\n\n".join([doc.page_content for doc in relevant_docs])

def format_messages_for_prompt(messages: List[ChatMessage]) -> List[Dict[str, str]]:
    """Format messages for the prompt."""
    # Start with the system prompt
    formatted_messages = [SystemMessage(content=CHAT_SYSTEM_PROMPT)]
    
    # Add user and assistant messages
    for msg in messages:
        if msg.role == "user":
            formatted_messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            formatted_messages.append(AIMessage(content=msg.content))
    
    return formatted_messages

def generate_chat_response(session: ChatSession, query: str, use_context: bool = True, context_docs: List[str] = None) -> str:
    """Generate a response for the chat."""
    # Get relevant context
    context = select_relevant_context(query, use_context, context_docs)
    
    # Create the messages for the prompt
    messages = format_messages_for_prompt(session.messages)
    
    # Add context to the query if available
    query_with_context = query
    if context:
        query_with_context = f"Context information:\n{context}\n\nQuestion: {query}\n\nAnswer the question using the context information when relevant. If the context doesn't contain relevant information, answer based on your knowledge."
    
    # Add the current query
    messages.append(HumanMessage(content=query_with_context))
    
    # Generate the response
    llm = get_llm()
    response = llm.invoke(messages)
    
    return response.content

# New functions for exam papers processing
def save_exam_paper(paper: ExamPaper):
    """Save exam paper metadata to JSON file."""
    file_path = os.path.join(EXAM_PAPERS_DIR, f"{paper.id}.json")
    with open(file_path, "w") as f:
        f.write(json.dumps(paper.dict(), indent=2))
        
def load_exam_paper(paper_id: str) -> Optional[ExamPaper]:
    """Load exam paper metadata from JSON file."""
    file_path = os.path.join(EXAM_PAPERS_DIR, f"{paper_id}.json")
    if not os.path.exists(file_path):
        return None
        
    with open(file_path, "r") as f:
        return ExamPaper(**json.loads(f.read()))
        
def get_all_exam_papers() -> List[ExamPaper]:
    """Get all exam papers metadata."""
    papers = []
    for filename in os.listdir(EXAM_PAPERS_DIR):
        if filename.endswith(".json"):
            paper_id = filename.replace(".json", "")
            paper = load_exam_paper(paper_id)
            if paper:
                papers.append(paper)
    return papers

def process_exam_paper(file_path: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Process an exam paper PDF and extract metadata and content."""
    # Load PDF
    try:
        loader = PyPDFLoader(file_path)
        pages = loader.load()
        
        # Extract text
        full_text = "\n\n".join([page.page_content for page in pages])
        
        # Use LLM to analyze the exam paper
        llm = get_llm()
        prompt = ChatPromptTemplate.from_template(EXAM_PAPER_PROCESSING_PROMPT)
        chain = prompt | llm | StrOutputParser()
        
        analysis = chain.invoke({"text": full_text[:10000]})  # Limit text size for analysis
        
        # Add metadata
        metadata["analysis"] = analysis
        metadata["page_count"] = len(pages)
        
        # Split text and add to vector store
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=100,
            length_function=len,
        )
        
        chunks = text_splitter.split_documents(pages)
        
        # Add document to vector store
        vectorstore = get_or_create_vectorstore()
        
        # Create a unique document ID
        doc_id = str(uuid.uuid4())
        
        # Add chunks to vector store with paper metadata
        for chunk in chunks:
            chunk_metadata = {
                "source": "exam_paper",
                "paper_id": metadata.get("id", ""),
                "subject": metadata.get("subject", ""),
                "year": metadata.get("year", ""),
                "document_id": doc_id,
                "page_num": chunk.metadata.get("page", 0)
            }
            chunk.metadata.update(chunk_metadata)
        
        if vectorstore:
            vectorstore.add_documents(chunks)
        
        metadata["document_id"] = doc_id
        return metadata
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

def save_mindmap(mindmap: MindMap):
    """Save mindmap to JSON file."""
    file_path = os.path.join(MINDMAPS_DIR, f"{mindmap.id}.json")
    with open(file_path, "w") as f:
        f.write(json.dumps(mindmap.dict(), indent=2))
        
def load_mindmap(mindmap_id: str) -> Optional[MindMap]:
    """Load mindmap from JSON file."""
    file_path = os.path.join(MINDMAPS_DIR, f"{mindmap_id}.json")
    if not os.path.exists(file_path):
        return None
        
    with open(file_path, "r") as f:
        return MindMap(**json.loads(f.read()))
        
def get_all_mindmaps() -> List[MindMap]:
    """Get all mindmaps."""
    mindmaps = []
    for filename in os.listdir(MINDMAPS_DIR):
        if filename.endswith(".json"):
            mindmap_id = filename.replace(".json", "")
            mindmap = load_mindmap(mindmap_id)
            if mindmap:
                mindmaps.append(mindmap)
    return mindmaps

def generate_mindmap(subject: str, topic: Optional[str] = None) -> MindMap:
    """Generate a mindmap for a subject and optional topic."""
    try:
        # Get relevant context from vector store
        search_query = f"{subject} {topic if topic else ''}"
        context_docs = search_vectorstore(search_query, k=5)
        context = "\n\n".join([doc.page_content for doc in context_docs])
        
        # Generate mindmap using LLM
        llm = get_llm()
        topic_clause = f" focusing on {topic}" if topic else ""
        
        try:
            # Build the prompt directly without using templates
            prompt_content = f"""
You are an expert educational content designer specializing in creating structured mind maps.
Your task is to generate a comprehensive mind map structure for the subject '{subject}'{topic_clause}.

The mind map should:
1. Have a clear hierarchical structure
2. Cover the key concepts and their relationships
3. Be educational and follow a logical learning progression
4. Include important subtopics, formulas, and principles

If provided, use this additional context information to enhance the mind map:
{context}

Return the mind map as a nested JSON object with the following structure:
{{
  "root_node": {{
    "id": "unique_id_string",
    "label": "Main Topic",
    "description": "Brief description of the topic"
  }},
  "nodes": {{
    "unique_id_string": {{
      "id": "unique_id_string",
      "label": "Node Label",
      "description": "Node description",
      "children": ["child_id_1", "child_id_2"]
    }},
    "child_id_1": {{
      "id": "child_id_1",
      "label": "Child Node 1",
      "description": "Description",
      "children": []
    }}
  }}
}}

Make sure each node has a unique ID and that parent-child relationships are properly defined.
Take into account that this will be used by students preparing for exams, so it should be comprehensive but focused on exam-relevant material.
"""
            
            # Use a direct approach with HumanMessage
            messages = [HumanMessage(content=prompt_content)]
            
            # Create parser to handle the JSON output
            class MindMapOutputParser(JsonOutputParser):
                def parse(self, text):
                    # Extract json part and handle all types of code blocks
                    try:
                        print("Parsing response from LLM...")
                        # Basic JSON extraction using string manipulation
                        if "```json" in text:
                            text = text.split("```json")[1].split("```")[0].strip()
                        elif "```" in text:
                            text = text.split("```")[1].split("```")[0].strip()
                        elif "{" in text and "}" in text:
                            # Extract just the JSON object if it's embedded in other text
                            start_index = text.find("{")
                            end_index = text.rfind("}") + 1
                            if start_index >= 0 and end_index > start_index:
                                text = text[start_index:end_index]
                        
                        try:
                            print("Attempting to parse JSON...")
                            parsed_data = json.loads(text)
                            # Validate required fields are present
                            if "root_node" not in parsed_data:
                                print(f"Missing 'root_node' in response. Response keys: {list(parsed_data.keys())}")
                                raise ValueError("Missing 'root_node' in response")
                            if "nodes" not in parsed_data:
                                print(f"Missing 'nodes' in response. Response keys: {list(parsed_data.keys())}")
                                raise ValueError("Missing 'nodes' in response")
                            return parsed_data
                        except json.JSONDecodeError as json_err:
                            print(f"JSON parsing error: {str(json_err)}\nText: {text[:500]}...")
                            raise ValueError(f"Invalid JSON format: {str(json_err)}")
                    except Exception as e:
                        # More robust error handling with detailed logging
                        print(f"Error parsing mindmap output: {str(e)}")
                        print(f"Raw text received (first 1000 chars): {text[:1000]}")
                        # Try one more direct parsing approach as last resort
                        try:
                            # Try to find and extract just the JSON part more aggressively
                            import re
                            json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
                            matches = re.findall(json_pattern, text)
                            if matches:
                                for potential_json in matches:
                                    try:
                                        result = json.loads(potential_json)
                                        if "root_node" in result and "nodes" in result:
                                            return result
                                    except:
                                        continue
                            # If all else fails, try direct parsing
                            return json.loads(text)
                        except Exception as direct_error:
                            error_msg = f"Failed to parse mindmap output: {str(direct_error)}"
                            print(error_msg)
                            print(f"Text received: {text[:500]}...")
                            raise ValueError(error_msg)
            
            # Directly invoke the LLM with the messages
            print(f"Sending request to LLM for subject: {subject}, topic: {topic if topic else 'None'}")
            result = llm.invoke(messages)
            parser = MindMapOutputParser()
            mind_map_data = parser.parse(result.content)
            
            # Extract root node and nodes
            root_node = mind_map_data.get("root_node", {})
            if not root_node:
                raise ValueError("Root node is empty in the generated mind map")
                
            nodes = mind_map_data.get("nodes", {})
            if not nodes:
                raise ValueError("No nodes found in the generated mind map")
            
            # Create MindMap object
            mindmap = MindMap(
                title=f"{subject}{' - ' + topic if topic else ''} Mind Map",
                root_node_id=root_node.get("id", ""),
                nodes={**{root_node.get("id", ""): MindMapNode(**root_node)}, **{k: MindMapNode(**v) for k, v in nodes.items()}},
                subject=subject
            )
            
            # Save mindmap
            save_mindmap(mindmap)
            return mindmap
            
        except Exception as e:
            print(f"Error in mind map generation: {str(e)}")
            import traceback
            traceback_str = traceback.format_exc()
            print(f"Traceback: {traceback_str}")
            raise HTTPException(status_code=500, detail=f"Error generating mindmap: {str(e)}\n{traceback_str}")
    
    except Exception as outer_e:
        import traceback
        error_details = f"Error generating mindmap: {str(outer_e)}\n{traceback.format_exc()}"
        print(error_details)
        raise HTTPException(status_code=500, detail=error_details)

def save_learning_module(module: LearningModule):
    """Save learning module to JSON file."""
    file_path = os.path.join(LEARNING_MODULES_DIR, f"{module.id}.json")
    with open(file_path, "w") as f:
        f.write(json.dumps(module.dict(), indent=2))
        
def load_learning_module(module_id: str) -> Optional[LearningModule]:
    """Load learning module from JSON file."""
    file_path = os.path.join(LEARNING_MODULES_DIR, f"{module_id}.json")
    if not os.path.exists(file_path):
        return None
        
    with open(file_path, "r") as f:
        return LearningModule(**json.loads(f.read()))
        
def get_all_learning_modules() -> List[LearningModule]:
    """Get all learning modules."""
    modules = []
    for filename in os.listdir(LEARNING_MODULES_DIR):
        if filename.endswith(".json"):
            module_id = filename.replace(".json", "")
            module = load_learning_module(module_id)
            if module:
                modules.append(module)
    return modules

def generate_learning_module(subject: str, topic: Optional[str] = None) -> LearningModule:
    """Generate a learning module for a subject and optional topic."""
    try:
        # Get relevant context from vector store
        search_query = f"{subject} {topic if topic else ''}"
        context_docs = search_vectorstore(search_query, k=8)
        context = "\n\n".join([doc.page_content for doc in context_docs])
        
        # Identify related questions
        related_questions = []
        for doc in context_docs:
            if "source" in doc.metadata and doc.metadata["source"] == "exam_paper":
                related_questions.append(doc.page_content)
        
        # Generate learning module using LLM
        llm = get_llm()
        topic_clause = f" focusing on {topic}" if topic else ""
        
        # Use direct prompt formatting instead of ChatPromptTemplate
        prompt_content = f"""
You are an expert in educational content development. Create a comprehensive learning module for students studying {subject}{topic_clause}.

Your learning module should include:
1. An introduction to the topic
2. Key concepts clearly explained
3. Theoretical foundation with proper mathematical notation
4. Practical examples and applications
5. Common exam questions and how to approach them
6. Tips for exam preparation

IMPORTANT FORMATTING INSTRUCTIONS:
1. Format ALL mathematical expressions using Markdown-compatible LaTeX syntax:
   - For inline formulas, use single dollar signs: $E=mc^2$
   - For display/block formulas, use double dollar signs: $$\\sum_{{i=1}}^{{n}} i = \\frac{{n(n+1)}}{{2}}$$
2. Ensure all special LaTeX characters are properly escaped with double backslashes
3. Always use double braces for LaTeX subscripts and superscripts: $x_{{i}}$ not $x_i$
4. Use markdown headings (##, ###) to organize the content into clear sections

Based on the examination context and the following relevant information:

{context}

Create a comprehensive learning module:
"""
        
        # Use direct approach with HumanMessage
        messages = [HumanMessage(content=prompt_content)]
        result = llm.invoke(messages)
        content = result.content
        
        # Create LearningModule object
        module = LearningModule(
            title=f"{subject}{' - ' + topic if topic else ''} Learning Module",
            subject=subject,
            content=content,
            related_questions=related_questions[:5]  # Limit to 5 most relevant questions
        )
        
        # Save module
        save_learning_module(module)
        return module
        
    except Exception as e:
        import traceback
        error_details = f"Error generating learning module: {str(e)}\n{traceback.format_exc()}"
        print(error_details)
        raise HTTPException(status_code=500, detail=error_details)

def save_podcast(podcast: Podcast):
    """Save podcast to JSON file."""
    file_path = os.path.join(PODCASTS_DIR, f"{podcast.id}.json")
    with open(file_path, "w") as f:
        f.write(json.dumps(podcast.dict(), indent=2))
        
def load_podcast(podcast_id: str) -> Optional[Podcast]:
    """Load podcast from JSON file."""
    file_path = os.path.join(PODCASTS_DIR, f"{podcast_id}.json")
    if not os.path.exists(file_path):
        return None
        
    with open(file_path, "r") as f:
        return Podcast(**json.loads(f.read()))
        
def get_all_podcasts() -> List[Podcast]:
    """Get all podcasts."""
    podcasts = []
    for filename in os.listdir(PODCASTS_DIR):
        if filename.endswith(".json"):
            podcast_id = filename.replace(".json", "")
            podcast = load_podcast(podcast_id)
            if podcast:
                podcasts.append(podcast)
    return podcasts

def generate_podcast_script(subject: str, topic: Optional[str] = None, duration_minutes: int = 10) -> Podcast:
    """Generate a podcast script for a subject and optional topic, and convert to audio."""
    try:
        # Get relevant context from vector store
        search_query = f"{subject} {topic if topic else ''}"
        context_docs = search_vectorstore(search_query, k=5)
        context = "\n\n".join([doc.page_content for doc in context_docs])
        
        # Generate podcast script using LLM
        llm = get_llm()
        topic_clause = f" focusing on {topic}" if topic else ""
        
        # Use direct prompt formatting instead of ChatPromptTemplate
        prompt_content = f"""
You are an educational podcast creator. Write a script for a {duration_minutes}-minute podcast episode about {subject}{topic_clause}.

The podcast should:
1. Have a clear introduction that hooks the listener
2. Present key concepts in a logical progression
3. Explain complex ideas in conversational, accessible language
4. Include verbal cues for transitions between topics
5. End with a summary and key takeaways

Remember this is an audio format, so:
- Avoid references to visual elements
- Use verbal descriptions for equations (e.g., "the square root of x plus y" instead of "√(x+y)")
- Use signposting and transitions to guide the listener
- Maintain a friendly, engaging tone throughout

Based on the following relevant information:

{context}

Create a podcast script:
"""
        
        # Use direct approach with HumanMessage
        messages = [HumanMessage(content=prompt_content)]
        result = llm.invoke(messages)
        transcript = result.content
        
        # Create Podcast object with a unique ID
        podcast_id = str(uuid.uuid4())
        podcast = Podcast(
            id=podcast_id,
            title=f"{subject}{' - ' + topic if topic else ''} Podcast",
            subject=subject,
            transcript=transcript,
            duration_seconds=duration_minutes * 60  # Estimate
        )
        
        # Generate audio from transcript using ElevenLabs
        try:
            # Get ElevenLabs API key from environment variable
            eleven_api_key = os.getenv("ELEVENLABS_API_KEY")
            if not eleven_api_key:
                print("Warning: ELEVENLABS_API_KEY not found. Skipping audio generation.")
            else:
                # Initialize ElevenLabs client
                client = ElevenLabs(api_key=eleven_api_key)
                
                # Create audio file path
                audio_filename = f"{podcast_id}.mp3"
                audio_path = os.path.join(PODCAST_AUDIO_DIR, audio_filename)
                
                try:
                    # First attempt - streaming approach
                    print(f"Calling ElevenLabs API to generate audio for podcast: {podcast_id}")
                    audio = client.text_to_speech.convert(
                        voice_id="FGY2WhTYpPnrIDTdsKH5",  # Default voice ID
                        output_format="mp3_44100_128",
                        text=transcript,
                        model_id="eleven_multilingual_v2",
                        # stream=True  # Use streaming mode to handle large responses
                    )
                    
                    # Debug audio response type
                    print(f"ElevenLabs response type: {type(audio)}")
                    print(f"Saving audio to: {audio_path}")
                    
                    # Handle the response whether it's a generator (stream) or bytes
                    with open(audio_path, "wb") as f:
                        if hasattr(audio, '__iter__') and not isinstance(audio, bytes):
                            # If it's a generator/iterator, read chunks and write them
                            chunk_count = 0
                            total_bytes = 0
                            for chunk in audio:
                                chunk_size = len(chunk)
                                total_bytes += chunk_size
                                f.write(chunk)
                                chunk_count += 1
                            print(f"Wrote {chunk_count} chunks, total of {total_bytes} bytes")
                        else:
                            # If it's bytes, write directly
                            f.write(audio)
                            print(f"Wrote {len(audio)} bytes directly")
                    
                    print(f"Audio file saved successfully: {audio_filename}")
                    
                except Exception as streaming_error:
                    # Fallback - direct file generation
                    print(f"Streaming approach failed: {str(streaming_error)}")
                    print("Trying alternative approach...")
                    
                    # Try a direct approach with file output
                    try:
                        # Different method that generates and directly saves the file
                        
                        # ElevenLabs API endpoint for text-to-speech
                        url = f"https://api.elevenlabs.io/v1/text-to-speech/FGY2WhTYpPnrIDTdsKH5"
                        
                        headers = {
                            "Accept": "audio/mpeg",
                            "Content-Type": "application/json",
                            "xi-api-key": eleven_api_key
                        }
                        
                        data = {
                            "text": transcript,
                            "model_id": "eleven_multilingual_v2",
                            "voice_settings": {
                                "stability": 0.5,
                                "similarity_boost": 0.5
                            }
                        }
                        
                        print("Making direct request to ElevenLabs API...")
                        response = requests.post(url, json=data, headers=headers)
                        
                        if response.status_code == 200:
                            # Save the audio file
                            with open(audio_path, "wb") as f:
                                f.write(response.content)
                            print(f"Direct request successful. Audio saved to {audio_path}")
                        else:
                            print(f"Direct request failed: {response.status_code} - {response.text}")
                            raise Exception(f"Direct API request failed: {response.status_code}")
                    
                    except Exception as direct_error:
                        print(f"Both approaches failed. Error: {str(direct_error)}")
                        raise Exception(f"Failed to generate audio: {str(streaming_error)} AND {str(direct_error)}")
                
                # Update podcast with audio path
                podcast.audio_path = f"/podcasts/audio/{audio_filename}"
                
                # Get audio duration if possible
                # This would require a library like pydub to get actual duration
                # For now, we'll keep the estimate based on words
                
        except Exception as audio_error:
            print(f"Error generating audio: {str(audio_error)}")
            # Continue without audio, just using the transcript
        
        # Save podcast metadata
        save_podcast(podcast)
        return podcast
        
    except Exception as e:
        import traceback
        error_details = f"Error generating podcast: {str(e)}\n{traceback.format_exc()}"
        print(error_details)
        raise HTTPException(status_code=500, detail=error_details)

# FastAPI endpoints
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
        
        # Add the text to the vector store for future reference
        add_to_vectorstore(text, metadata={"source": "pdf", "filename": file.filename})
        
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
        # Add the text to the vector store for future reference
        add_to_vectorstore(request.text, metadata={"source": "text_input"})
        
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

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Process a chat message and return a response."""
    try:
        session = None
        
        # Try to load existing session
        if request.session_id:
            session = load_session(request.session_id)
        
        # Create new session if none exists
        if not session:
            session = create_session()
            if request.domain:
                session.domain = request.domain
        
        # Add user message to session
        session.messages.append(ChatMessage(role="user", content=request.message))
        
        # Generate response
        response = generate_chat_response(
            session=session,
            query=request.message,
            use_context=request.use_context,
            context_docs=request.context_docs
        )
        
        # Add assistant response to session
        session.messages.append(ChatMessage(role="assistant", content=response))
        
        # Update session title if this is the first user message
        if len(session.messages) == 2:  # First user message + first assistant response
            session.title = update_session_title(session)
        
        # Save the updated session
        save_session(session)
        
        # Return the response
        return ChatResponse(
            session_id=session.id,
            response=response,
            title=session.title
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@app.get("/chat/sessions", response_model=SessionListResponse)
async def list_sessions():
    """List all chat sessions."""
    try:
        sessions = get_all_sessions()
        return SessionListResponse(
            sessions=[{
                "id": session.id,
                "title": session.title,
                "created_at": session.created_at,
                "message_count": len(session.messages)
            } for session in sessions]
        )
    except Exception as e:
        import traceback
        error_message = f"Error: {str(e)}\n{traceback.format_exc()}"
        print(error_message)
        raise HTTPException(status_code=500, detail=error_message)

@app.get("/chat/session/{session_id}")
async def get_session(session_id: str):
    """Get a specific chat session."""
    session = load_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return session.dict()

@app.delete("/chat/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a chat session."""
    session_path = get_session_path(session_id)
    
    if not os.path.exists(session_path):
        raise HTTPException(status_code=404, detail="Session not found")
        
    try:
        os.remove(session_path)
        return {"status": "success", "message": "Session deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting session: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Exam Preparation & Learning Tool API is running"}

# New routes for exam preparation features
@app.post("/exam/upload", response_model=ExamPaper)
async def upload_exam_paper(
    file: UploadFile = File(...),
    title: str = Form(...),
    subject: str = Form(...),
    year: Optional[str] = Form(None)
):
    """Upload and process an exam paper."""
    try:
        # Validate file
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        # Check content type
        if not file.content_type or 'application/pdf' not in file.content_type:
            print(f"Warning: Content type is not PDF: {file.content_type}")
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            # Write content to temp file
            content = await file.read()
            
            # Check if file is empty
            if len(content) == 0:
                raise HTTPException(status_code=400, detail="PDF file is empty")
                
            # Check minimum size (20 bytes is arbitrary but helps catch obviously invalid files)
            if len(content) < 20:
                raise HTTPException(status_code=400, detail="PDF file is too small and likely invalid")
                
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            # Verify it's a valid PDF by trying to load it
            loader = PyPDFLoader(tmp_path)
            # This will raise an error if the file is not a valid PDF
            _ = loader.load()
        except Exception as pdf_error:
            # Clean up temp file
            os.unlink(tmp_path)
            raise HTTPException(status_code=400, detail=f"Invalid PDF file: {str(pdf_error)}")
        
        # Generate a unique ID for the paper
        paper_id = str(uuid.uuid4())
        
        # Define file storage path
        file_dir = os.path.join(EXAM_PAPERS_DIR, paper_id)
        os.makedirs(file_dir, exist_ok=True)
        
        file_path = os.path.join(file_dir, file.filename)
        
        # Copy file to storage location
        shutil.copy(tmp_path, file_path)
        
        # Clean up the temp file
        os.unlink(tmp_path)
        
        # Create metadata
        metadata = {
            "id": paper_id,
            "title": title,
            "subject": subject,
            "year": year,
            "file_path": file_path,
            "filename": file.filename
        }
        
        # Process the exam paper
        processed_metadata = process_exam_paper(file_path, metadata)
        
        # Create and save the ExamPaper object
        exam_paper = ExamPaper(**processed_metadata)
        save_exam_paper(exam_paper)
        
        return exam_paper
        
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        import traceback
        error_details = f"Error uploading exam paper: {str(e)}\n{traceback.format_exc()}"
        print(error_details)
        raise HTTPException(status_code=500, detail=error_details)

@app.get("/exam/papers", response_model=ExamPaperListResponse)
async def list_exam_papers():
    """Get all exam papers."""
    papers = get_all_exam_papers()
    return {"papers": papers}

@app.get("/exam/paper/{paper_id}", response_model=ExamPaper)
async def get_exam_paper(paper_id: str):
    """Get a specific exam paper."""
    paper = load_exam_paper(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Exam paper not found")
    return paper

@app.post("/mindmap/generate", response_model=MindMap)
async def create_mindmap(request: MindMapRequest):
    """Generate a mind map for a subject."""
    try:
        if not request.subject:
            raise HTTPException(status_code=400, detail="Subject is required")
            
        print(f"Processing mindmap generation request for subject: {request.subject}, topic: {request.topic if request.topic else 'None'}")
        
        try:
            mindmap = generate_mindmap(request.subject, request.topic)
            return mindmap
        except Exception as specific_error:
            # If the error is coming from the mindmap generation function, it should already be
            # properly formatted as an HTTPException, so we can just raise it
            if isinstance(specific_error, HTTPException):
                raise specific_error
            # Otherwise, format a new error message
            import traceback
            error_detail = f"Error in mindmap generation: {str(specific_error)}\n{traceback.format_exc()}"
            print(error_detail)
            raise HTTPException(status_code=500, detail=error_detail)
            
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        import traceback
        error_details = f"Error processing mindmap request: {str(e)}\n{traceback.format_exc()}"
        print(error_details)
        raise HTTPException(status_code=500, detail=error_details)

@app.get("/mindmap/{mindmap_id}", response_model=MindMap)
async def get_mindmap(mindmap_id: str):
    """Get a specific mindmap."""
    mindmap = load_mindmap(mindmap_id)
    if not mindmap:
        raise HTTPException(status_code=404, detail="Mindmap not found")
    return mindmap

@app.get("/mindmaps", response_model=List[MindMap])
async def list_mindmaps():
    """Get all mindmaps."""
    return get_all_mindmaps()

@app.post("/analysis/generate", response_model=LearningModule)
async def create_learning_module(request: AnalysisRequest):
    """Generate a learning module for a subject."""
    module = generate_learning_module(request.subject, request.topic)
    return module

@app.get("/analysis/{module_id}", response_model=LearningModule)
async def get_learning_module(module_id: str):
    """Get a specific learning module."""
    module = load_learning_module(module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Learning module not found")
    return module

@app.get("/analyses", response_model=List[LearningModule])
async def list_learning_modules():
    """Get all learning modules."""
    return get_all_learning_modules()

@app.post("/podcast/generate", response_model=Podcast)
async def create_podcast(request: PodcastRequest):
    """Generate a podcast for a subject."""
    podcast = generate_podcast_script(request.subject, request.topic, request.duration_minutes or 10)
    return podcast

@app.get("/podcast/{podcast_id}", response_model=Podcast)
async def get_podcast(podcast_id: str):
    """Get a specific podcast."""
    podcast = load_podcast(podcast_id)
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    return podcast

@app.get("/podcasts", response_model=List[Podcast])
async def list_podcasts():
    """Get all podcasts."""
    return get_all_podcasts() 