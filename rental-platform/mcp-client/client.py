import asyncio
import httpx
from mcp import ClientSession
from mcp.client.sse import sse_client
from loguru import logger
import os

async def get_auth_token(backend_url, email):
    """
    Simulates an agent authenticating via magic link to get a JWT token.
    In a real production environment, the agent would have a pre-provisioned 
    Service Token or API Key.
    """
    logger.info(f"Authenticating agent {email}...")
    async with httpx.AsyncClient() as client:
        # 1. Request Magic Link (passing 'admin' role for full tool access)
        res = await client.post(
            f"{backend_url}/auth/magic", 
            json={"email": email, "role": "admin"}
        )
        
        # In our deployment environment, the /auth/magic endpoint returns 
        # the token directly when NODE_ENV=test.
        # For production agents, we'd use a permanent service key.
        token_data = res.json()
        if "token" not in token_data:
            raise Exception("Agent auth failed: No token returned. Is the server in test mode?")
        
        # 2. Verify and get session token
        verify_res = await client.post(
            f"{backend_url}/auth/magic/verify", 
            json={"token": token_data["token"]}
        )
        
        session_token = verify_res.json()["token"]
        logger.success("Agent authenticated successfully.")
        return session_token

async def main():
    backend_url = os.getenv("BACKEND_URL", "http://localhost:4000")
    agent_email = os.getenv("AGENT_EMAIL", "agent-007@bestflats.vip")
    
    # 1. Self-Authenticate
    token = await get_auth_token(backend_url, agent_email)
    
    # 2. Connect to the Secure MCP Tunnel
    mcp_endpoint = f"{backend_url}/mcp"
    logger.info(f"Establishing secure tunnel to {mcp_endpoint}")
    
    # We pass the JWT token in the Authorization header
    headers = {"Authorization": f"Bearer {token}"}
    
    async with sse_client(mcp_endpoint, headers=headers) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            logger.info("Secure MCP Tunnel initialized.")
            tools = await session.list_tools()
            logger.info(f"Authorized tools: {[t.name for t in tools.tools]}")
            
            # Example encrypted tool call via tunnel
            result = await session.call_tool(
                "create_apartment",
                {
                    "name": "Secure Agent Residence",
                    "description": "Created via authenticated agent tunnel",
                    "address": "Admin Way, Best Flats",
                    "pricePerNight": 500
                }
            )
            logger.info(f"Agent Task Result: {result}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        logger.error(f"Secure Tunnel failed: {e}")
        # If it failed because of 401, it confirms security is working
