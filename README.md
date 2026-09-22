# AI Life Quest

AI Life Quest is an AI-powered RPG-style goal planner.

The user enters a long-term goal such as:

`Become an AI Engineer`

The system uses Groq as the LLM to generate a personalized game world with:

- Main quests
- Side quests
- XP rewards
- Levels
- Skill tree
- Boss challenges
- Streaks
- Adaptive difficulty

The main idea is that the app does not only track completed tasks. After completing a quest, the user rates how difficult it felt, and the AI uses this feedback to generate harder or easier future challenges.

## Tech Stack

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend
- Python
- FastAPI
- Groq API
- Uvicorn

## Project Structure

```text
AI-Life-Quest/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── styles.css
    ├── public/
    ├── index.html
    ├── package.json
    └── .env