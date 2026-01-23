from mcp import Client
from loguru import logger

client = Client(
    server_command=["node", "-e", "import('file:///app/backend/src/index.js').then(module => module.startMcpServerForAgent())"],
    # server_command=["node", "/app/src/index.js", "--mcp"],
    headers={"Authorization": "Bearer admin-token"}
)

result = client.call_tool(
    "create_apartment",
    {
        "name": "Comfortable and Convenient Stay in the Heart of Suresnes",
        "description": "Located in the charming town of Suresnes, just outside Paris, this modern one-bedroom apartment offers a cozy living space with a comfortable lounge, fully equipped kitchen, and in-unit washing machine. Enjoy free Wi-Fi and a private bathroom everything you need for a relaxing stay.",
        "smallDescription": "Prime Location Near Paris the apartment is ideally located close to top Parisian landmarks, including the Palais des Congrès (6 km), and Eiffel Tower (7 km).",
        "address": "Rue Honoré d'Estienne d'Orves, Suresnes, 92150, France",
        "lat": 48.87297687408006,
        "lon": 2.2262012958526616,
        "photos": ["appartement/chambre.avif", "appartement/cuisine.avif", "appartement/douche.avif", "appartement/salon.avif"],
        "pricePerNight": 120,
        "depositAmount": 500
    }
)

logger.info(result)
