from mcp import Client
from loguru import logger

client = Client(
    server_command=["node", "/app/src/index.js"]
)

result = client.call_tool(
    "create_customer",
    {
        "fullName": "Alice Smith",
        "email": "alice@example.com"
    }
)

logger.info(result)
