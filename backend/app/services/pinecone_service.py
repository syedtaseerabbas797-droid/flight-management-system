import os
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec

def ingest_policies_to_pinecone():
    """
    Ingests policies.md into Pinecone using Langchain.
    Bypasses n8n natively in Python.
    """
    pinecone_api_key = os.getenv("PINECONE_API_KEY")
    google_api_key = os.getenv("GOOGLE_API_KEY")
    index_name = os.getenv("PINECONE_INDEX_NAME", "airline-policies")
    
    if not pinecone_api_key or not google_api_key:
        print("Missing API Keys. Please provide PINECONE_API_KEY and GOOGLE_API_KEY.")
        return

    pc = Pinecone(api_key=pinecone_api_key)
    
    # Create index if it doesn't exist
    existing_indexes = [index_info["name"] for index_info in pc.list_indexes()]
    if index_name not in existing_indexes:
        pc.create_index(
            name=index_name,
            dimension=768, # Google GenAI embeddings dimension
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )
        
    loader = TextLoader("policies.md")
    docs = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    splits = text_splitter.split_documents(docs)
    
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    
    PineconeVectorStore.from_documents(
        splits, 
        embeddings, 
        index_name=index_name
    )
    print("Successfully ingested policies into Pinecone index via LangChain.")

if __name__ == "__main__":
    ingest_policies_to_pinecone()
