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
```

## How to Run

### 1. Run the Backend

Open a terminal:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` folder:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
```

Start the backend:

```bash
uvicorn main:app --reload
```

The backend will run at:

```text
http://localhost:8000
```

You can test it at:

```text
http://localhost:8000/health
```

### 2. Run the Frontend

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the `frontend` folder:

```env
VITE_API_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## How It Works

1. The user enters a long-term goal.
2. Groq generates an RPG-style campaign.
3. The user completes quests and earns XP.
4. The user rates how difficult each quest was.
5. The AI analyzes the user's progress.
6. New quests are generated with adaptive difficulty.

## Example

Goal:

```text
Become an AI Engineer
```

The AI may generate quests such as:

```text
Learn Python fundamentals
Build a machine learning model
Create a FastAPI backend
Build an AI agent
Deploy an AI application
```

Boss challenges combine multiple skills into larger real-world projects.

## Main Idea

AI Life Quest turns self-development into a game while using AI to continuously adjust the learning path based on the user's demonstrated progress.
