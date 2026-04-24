import asyncio
from mcp import ClientSession
from mcp.client.sse import sse_client
from loguru import logger
import os

async def main():
    backend_url = os.getenv("BACKEND_URL", "http://backend:4000")
    mcp_endpoint = f"{backend_url}/mcp"
    
    logger.info(f"Connecting to MCP at {mcp_endpoint}")
    
    async with sse_client(mcp_endpoint) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            logger.info("Session initialized. Listing tools...")
            tools = await session.list_tools()
            logger.info(f"Available tools: {[t.name for t in tools.tools]}")
            
            # Example call
            result = await session.call_tool(
                "create_apartment",
                {
                    "name": "Suresnes Premium Stay",
                    "description": "Modern apartment near Paris",
                    "address": "Rue Honoré d'Estienne d'Orves, Suresnes, France",
                    "pricePerNight": 150
                }
            )
            logger.info(f"Result: {result}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        logger.error(f"Client failed: {e}")
