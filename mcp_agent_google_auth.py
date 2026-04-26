import asyncio
import google.auth
import google.auth.transport.requests
from google.oauth2 import id_token
from mcp import ClientSession
from mcp.client.sse import sse_client
from loguru import logger
import os

async def get_google_id_token(target_audience):
    """
    Retrieves a Google ID Token (OIDC) for the agent.
    If running on GCP (Cloud Run, VM), it uses the metadata server.
    If running locally, it uses your local 'gcloud auth application-default login' identity.
    """
    logger.info("Retrieving Google ID Token...")
    # Get credentials from the environment (ADC)
    auth_req = google.auth.transport.requests.Request()
    credentials, project = google.auth.default()
    
    # Refresh credentials to ensure we have a valid token
    credentials.refresh(auth_req)
    
    # We specifically need an ID Token for the backend to verify
    # target_audience must match the GOOGLE_CLIENT_ID in the backend .env
    token = credentials.id_token
    
    if not token:
        # Fallback for local development environments
        from google.auth import jwt
        logger.warning("Falling back to local identity fetch...")
        # Note: In production, the service account handles this automatically
        raise Exception("Could not find ID Token. Please run: gcloud auth application-default login")

    logger.success("Google Identity retrieved.")
    return token

async def connect_to_bestflats_tunnel():
    backend_url = os.getenv("BACKEND_URL", "https://api.bestflats.vip")
    google_client_id = os.getenv("GOOGLE_CLIENT_ID", "your-id.apps.googleusercontent.com")
    
    try:
        # 1. Get the Identity Token from Google
        token = await get_google_id_token(google_client_id)
        
        # 2. Establish Secure SSE Tunnel
        mcp_endpoint = f"{backend_url}/mcp"
        logger.info(f"Establishing secure Google-authenticated tunnel to {mcp_endpoint}")
        
        # Pass the Google ID Token in the Authorization header
        headers = {"Authorization": f"Bearer {token}"}
        
        async with sse_client(mcp_endpoint, headers=headers) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                
                logger.info("Verified Agent Tunnel Active.")
                tools = await session.list_tools()
                logger.info(f"Authorized tools: {[t.name for t in tools.tools]}")
                
                # Perform an authorized task
                result = await session.call_tool("list_apartments", {})
                logger.info(f"API Response: {result}")

    except Exception as e:
        logger.error(f"Google Auth Tunnel failed: {e}")

if __name__ == "__main__":
    asyncio.run(connect_to_bestflats_tunnel())
