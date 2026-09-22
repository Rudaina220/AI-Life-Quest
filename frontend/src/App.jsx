import { useEffect, useMemo, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

const STORAGE_KEY = "ai-life-quest-v3";

const initialGame = {
  world: null,
  xp: 0,
  streak: 0,
  completed: [],
  lastCompletionDate: null,
};

function loadGame() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return initialGame;
    }

    const parsed = JSON.parse(saved);

    return {
      ...initialGame,
      ...parsed,
    };
  } catch (error) {
    console.error("Failed to load save:", error);
    return initialGame;
  }
}

function getLevel(xp) {
  return Math.floor(xp / 500) + 1;
}

function App() {
  const [game, setGame] = useState(loadGame);
  const [page, setPage] = useState("dashboard");

  const [showGenerator, setShowGenerator] = useState(
    !game.world
  );

  const [selectedQuest, setSelectedQuest] = useState(null);

  const [loading, setLoading] = useState(false);
  const [adapting, setAdapting] = useState(false);

  const [error, setError] = useState("");

  const world = game.world;

  const level = getLevel(game.xp);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(game)
    );
  }, [game]);

  const completedIds = useMemo(() => {
    return new Set(
      game.completed.map((quest) => quest.id)
    );
  }, [game.completed]);

  async function generateWorld(form) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/world`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not generate your world."
        );
      }

      setGame({
        world: data,
        xp: 0,
        streak: 0,
        completed: [],
        lastCompletionDate: null,
      });

      setShowGenerator(false);
      setPage("dashboard");
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Could not connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  function completeQuest(quest, difficulty) {
    if (completedIds.has(quest.id)) {
      setSelectedQuest(null);
      return;
    }

    const today = new Date()
      .toISOString()
      .slice(0, 10);

    let newStreak = 1;

    if (game.lastCompletionDate) {
      if (game.lastCompletionDate === today) {
        newStreak = game.streak;
      } else {
        const oldDate = new Date(
          `${game.lastCompletionDate}T00:00:00`
        );

        const newDate = new Date(
          `${today}T00:00:00`
        );

        const difference = Math.round(
          (newDate - oldDate) / 86400000
        );

        newStreak =
          difference === 1
            ? game.streak + 1
            : 1;
      }
    }

    setGame((previous) => ({
      ...previous,

      xp:
        previous.xp +
        Number(quest.xp || 0),

      streak: newStreak,

      lastCompletionDate: today,

      completed: [
        ...previous.completed,

        {
          ...quest,

          perceived_difficulty:
            Number(difficulty),

          completed_at:
            new Date().toISOString(),
        },
      ],
    }));

    setSelectedQuest(null);
  }

  async function adaptWorld() {
    if (!world) {
      return;
    }

    if (game.completed.length === 0) {
      setError(
        "Complete at least one quest before adapting the campaign."
      );
      return;
    }

    setAdapting(true);
    setError("");

    try {
      const recent =
        game.completed.slice(-6);

      const averageDifficulty =
        recent.reduce(
          (total, quest) =>
            total +
            Number(
              quest.perceived_difficulty || 3
            ),
          0
        ) / recent.length;

      const response = await fetch(
        `${API_URL}/api/adapt`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            goal: world.goal,

            world,

            completed_quests: recent,

            performance: {
              player_level: level,
              total_xp: game.xp,
              streak: game.streak,
              completed_count:
                game.completed.length,

              average_perceived_difficulty:
                averageDifficulty,
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Could not adapt your campaign."
        );
      }

      setGame((previous) => ({
        ...previous,

        world: {
          ...previous.world,

          difficulty:
            data.new_difficulty ||
            previous.world.difficulty,

          game_master_message:
            data.reason ||
            previous.world.game_master_message,

          main_quests: [
            ...(previous.world.main_quests || []),
            ...(data.next_quests || []),
          ],

          bosses: data.boss_unlock
            ? [
                ...(previous.world.bosses || []),
                data.boss_unlock,
              ]
            : previous.world.bosses,
        },
      }));
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setAdapting(false);
    }
  }

  function resetGame() {
    localStorage.removeItem(STORAGE_KEY);

    setGame(initialGame);

    setPage("dashboard");

    setShowGenerator(true);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-icon">
              ✦
            </div>

            <div>
              <h2>AI LIFE QUEST</h2>
              <span>Adaptive Goal RPG</span>
            </div>
          </div>

          <nav>
            <NavButton
              active={page === "dashboard"}
              onClick={() => setPage("dashboard")}
              icon="⌂"
              label="Command Center"
            />

            <NavButton
              active={page === "quests"}
              onClick={() => setPage("quests")}
              icon="▤"
              label="Quest Log"
            />

            <NavButton
              active={page === "skills"}
              onClick={() => setPage("skills")}
              icon="◆"
              label="Skill Tree"
            />

            <NavButton
              active={page === "bosses"}
              onClick={() => setPage("bosses")}
              icon="⚔"
              label="Boss Arena"
            />

            <NavButton
              active={page === "map"}
              onClick={() => setPage("map")}
              icon="◎"
              label="World Map"
            />

            <NavButton
              active={page === "settings"}
              onClick={() => setPage("settings")}
              icon="⚙"
              label="Settings"
            />
          </nav>
        </div>

        <div className="sidebar-bottom">
          {world && (
            <div className="player-mini">
              <div className="level-circle">
                {level}
              </div>

              <div>
                <strong>
                  {world.player_class}
                </strong>

                <span>
                  Level {level} ·{" "}
                  {game.streak} streak
                </span>
              </div>
            </div>
          )}

          <button
            className="new-world-button"
            onClick={() =>
              setShowGenerator(true)
            }
          >
            + New Campaign
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <span className="eyebrow">
              ACTIVE CAMPAIGN
            </span>

            <h1>
              {world
                ? world.world_title
                : "AI Life Quest"}
            </h1>
          </div>

          {world && (
            <div className="header-stats">
              <StatSmall
                title="STREAK"
                value={game.streak}
              />

              <StatSmall
                title="XP"
                value={game.xp}
              />

              <div className="level-badge">
                LV {level}
              </div>
            </div>
          )}
        </header>

        {error && (
          <div className="error-box">
            <span>{error}</span>

            <button
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}

        {!world ? (
          <Welcome
            onStart={() =>
              setShowGenerator(true)
            }
          />
        ) : (
          <>
            {page === "dashboard" && (
              <Dashboard
                world={world}
                game={game}
                level={level}
                completedIds={completedIds}
                setSelectedQuest={
                  setSelectedQuest
                }
                adaptWorld={adaptWorld}
                adapting={adapting}
              />
            )}

            {page === "quests" && (
              <QuestPage
                world={world}
                completedIds={completedIds}
                setSelectedQuest={
                  setSelectedQuest
                }
              />
            )}

            {page === "skills" && (
              <SkillsPage
                world={world}
                completed={
                  game.completed
                }
              />
            )}

            {page === "bosses" && (
              <BossPage
                world={world}
                level={level}
                completedIds={
                  completedIds
                }
                setSelectedQuest={
                  setSelectedQuest
                }
              />
            )}

            {page === "map" && (
              <MapPage
                world={world}
                completedIds={
                  completedIds
                }
              />
            )}

            {page === "settings" && (
              <SettingsPage
                resetGame={resetGame}
              />
            )}
          </>
        )}
      </main>

      {showGenerator && (
        <WorldGenerator
          loading={loading}
          canClose={Boolean(world)}
          close={() =>
            setShowGenerator(false)
          }
          generateWorld={generateWorld}
        />
      )}

      {selectedQuest && (
        <CompletionModal
          quest={selectedQuest}
          close={() =>
            setSelectedQuest(null)
          }
          completeQuest={
            completeQuest
          }
        />
      )}
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
}) {
  return (
    <button
      className={`nav-button ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      <span className="nav-icon">
        {icon}
      </span>

      {label}
    </button>
  );
}

function StatSmall({
  title,
  value,
}) {
  return (
    <div className="stat-small">
      <strong>{value}</strong>

      <span>{title}</span>
    </div>
  );
}

function Welcome({ onStart }) {
  return (
    <section className="welcome">
      <div className="portal">
        ✦
      </div>

      <span className="eyebrow">
        AI-POWERED LIFE RPG
      </span>

      <h2>
        Your goal becomes your world.
      </h2>

      <p>
        Transform long-term ambitions
        into quests, skill trees, XP,
        boss challenges and adaptive
        difficulty.
      </p>

      <button
        className="primary-button"
        onClick={onStart}
      >
        ✦ Create My Campaign
      </button>
    </section>
  );
}

function Dashboard({
  world,
  game,
  level,
  completedIds,
  setSelectedQuest,
  adaptWorld,
  adapting,
}) {
  const quests =
    world.main_quests || [];

  const available =
    quests.filter(
      (quest) =>
        !completedIds.has(quest.id)
    );

  const completedMain =
    quests.filter((quest) =>
      completedIds.has(quest.id)
    ).length;

  const progress =
    quests.length === 0
      ? 0
      : Math.round(
          (completedMain /
            quests.length) *
            100
        );

  return (
    <div className="dashboard">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            CURRENT MISSION
          </span>

          <h2>{world.goal}</h2>

          <p>
            {world.world_subtitle}
          </p>

          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={adaptWorld}
              disabled={adapting}
            >
              {adapting
                ? "Adapting..."
                : "✦ Adapt My Next Quests"}
            </button>

            <span className="difficulty">
              Difficulty{" "}
              {world.difficulty || 1}
            </span>
          </div>
        </div>

        <div className="hero-orb">
          <div>◎</div>
        </div>
      </section>

      <section className="stats">
        <BigStat
          value={game.xp}
          label="XP Earned"
          subtitle={`Level ${level}`}
        />

        <BigStat
          value={game.streak}
          label="Day Streak"
          subtitle="Consistency"
        />

        <BigStat
          value={`${progress}%`}
          label="Quest Progress"
          subtitle={`${completedMain}/${quests.length}`}
        />

        <BigStat
          value={
            world.difficulty || 1
          }
          label="World Tier"
          subtitle="Adaptive"
        />
      </section>

      <section className="panel quest-panel">
        <SectionHeader
          eyebrow="NEXT OBJECTIVES"
          title="Main Questline"
        />

        <div className="quest-list">
          {available
            .slice(0, 5)
            .map((quest, index) => (
              <QuestRow
                key={quest.id}
                quest={quest}
                index={index}
                click={() =>
                  setSelectedQuest(
                    quest
                  )
                }
              />
            ))}

          {available.length === 0 && (
            <div className="empty-row">
              ✓ Current questline
              cleared. Adapt the world
              to continue.
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <SectionHeader
          eyebrow="AI GAME MASTER"
          title="Adaptive Intel"
        />

        <div className="game-master-message">
          <span>✦</span>

          <p>
            {world.game_master_message}
          </p>
        </div>

        <InfoRow
          label="Weekly XP Target"
          value={
            world.recommended_weekly_xp ||
            500
          }
        />

        <InfoRow
          label="Completed"
          value={
            game.completed.length
          }
        />

        <InfoRow
          label="Level"
          value={level}
        />
      </section>
    </div>
  );
}

function BigStat({
  value,
  label,
  subtitle,
}) {
  return (
    <div className="big-stat">
      <div className="stat-glyph">
        ◆
      </div>

      <div>
        <strong>{value}</strong>

        <span>{label}</span>

        <small>
          {subtitle}
        </small>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
}) {
  return (
    <div className="section-header">
      <span className="eyebrow">
        {eyebrow}
      </span>

      <h3>{title}</h3>
    </div>
  );
}

function QuestRow({
  quest,
  index,
  click,
}) {
  return (
    <article className="quest-row">
      <div className="quest-index">
        {String(index + 1).padStart(
          2,
          "0"
        )}
      </div>

      <div>
        <div className="quest-title">
          <h4>{quest.title}</h4>

          <span>
            +{quest.xp} XP
          </span>
        </div>

        <p>
          {quest.description}
        </p>

        <div className="quest-meta">
          <span>
            Difficulty{" "}
            {quest.difficulty}
          </span>

          {quest.estimated_hours && (
            <span>
              {quest.estimated_hours}h
            </span>
          )}

          {quest.proof && (
            <span>
              Proof: {quest.proof}
            </span>
          )}
        </div>
      </div>

      <button onClick={click}>
        →
      </button>
    </article>
  );
}

function InfoRow({
  label,
  value,
}) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function QuestPage({
  world,
  completedIds,
  setSelectedQuest,
}) {
  return (
    <Page
      eyebrow="ALL OBJECTIVES"
      title="Quest Log"
    >
      <div className="quest-columns">
        <div>
          <h3 className="column-heading">
            Main Quests
          </h3>

          {(world.main_quests || []).map(
            (quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                completed={completedIds.has(
                  quest.id
                )}
                complete={() =>
                  setSelectedQuest(
                    quest
                  )
                }
              />
            )
          )}
        </div>

        <div>
          <h3 className="column-heading">
            Side Quests
          </h3>

          {(world.side_quests || []).map(
            (quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                completed={completedIds.has(
                  quest.id
                )}
                complete={() =>
                  setSelectedQuest(
                    quest
                  )
                }
              />
            )
          )}
        </div>
      </div>
    </Page>
  );
}

function QuestCard({
  quest,
  completed,
  complete,
}) {
  return (
    <article
      className={`quest-card ${
        completed
          ? "completed"
          : ""
      }`}
    >
      <div className="quest-card-top">
        <div className="quest-symbol">
          {completed ? "✓" : "◆"}
        </div>

        <span>
          +{quest.xp} XP
        </span>
      </div>

      <h3>{quest.title}</h3>

      <p>
        {quest.description}
      </p>

      {quest.proof && (
        <div className="proof">
          <strong>
            Proof Required
          </strong>

          {quest.proof}
        </div>
      )}

      <div className="quest-card-footer">
        <span>
          Difficulty{" "}
          {quest.difficulty}
        </span>

        <button
          disabled={completed}
          onClick={complete}
        >
          {completed
            ? "Completed"
            : "Complete"}
        </button>
      </div>
    </article>
  );
}

function SkillsPage({
  world,
  completed,
}) {
  function getSkillLevel(
    skillId
  ) {
    return Math.min(
      5,

      completed.filter(
        (quest) =>
          quest.skills &&
          quest.skills.includes(
            skillId
          )
      ).length
    );
  }

  return (
    <Page
      eyebrow="ABILITY GRAPH"
      title="Skill Tree"
    >
      <div className="skills-grid">
        {(world.skills || []).map(
          (skill) => {
            const current =
              getSkillLevel(
                skill.id
              );

            return (
              <article
                className="skill-card"
                key={skill.id}
              >
                <div className="skill-symbol">
                  ◆
                </div>

                <h3>
                  {skill.name}
                </h3>

                <p>
                  {skill.description}
                </p>

                <div className="skill-bars">
                  {Array.from({
                    length:
                      skill.max_level ||
                      5,
                  }).map(
                    (_, index) => (
                      <div
                        key={index}
                        className={
                          index <
                          current
                            ? "filled"
                            : ""
                        }
                      />
                    )
                  )}
                </div>

                <small>
                  Mastery {current}/
                  {skill.max_level ||
                    5}
                </small>
              </article>
            );
          }
        )}
      </div>
    </Page>
  );
}

function BossPage({
  world,
  level,
  completedIds,
  setSelectedQuest,
}) {
  return (
    <Page
      eyebrow="MAJOR CHALLENGES"
      title="Boss Arena"
    >
      <div className="boss-list">
        {(world.bosses || []).map(
          (boss) => {
            const locked =
              level <
              Number(
                boss.recommended_level ||
                  1
              );

            const completed =
              completedIds.has(
                boss.id
              );

            return (
              <article
                key={boss.id}
                className={`boss-card ${
                  locked
                    ? "locked"
                    : ""
                }`}
              >
                <div className="boss-art">
                  ⚔
                </div>

                <div className="boss-info">
                  <span className="eyebrow">
                    {locked
                      ? `UNLOCK LEVEL ${boss.recommended_level}`
                      : "BOSS AVAILABLE"}
                  </span>

                  <h2>
                    {boss.title}
                  </h2>

                  <p>
                    {boss.description}
                  </p>

                  <div className="proof">
                    <strong>
                      Victory Condition
                    </strong>

                    {
                      boss.victory_condition
                    }
                  </div>

                  <div className="boss-footer">
                    <span>
                      +{boss.xp} XP
                    </span>

                    <button
                      disabled={
                        locked ||
                        completed
                      }
                      onClick={() =>
                        setSelectedQuest(
                          boss
                        )
                      }
                    >
                      {completed
                        ? "Defeated"
                        : locked
                        ? "Locked"
                        : "Fight Boss"}
                    </button>
                  </div>
                </div>
              </article>
            );
          }
        )}
      </div>
    </Page>
  );
}

function MapPage({
  world,
  completedIds,
}) {
  return (
    <Page
      eyebrow="CAMPAIGN PATH"
      title="World Map"
    >
      <div className="world-map">
        {(world.main_quests || []).map(
          (quest, index) => (
            <div
              className="map-stage"
              key={quest.id}
            >
              <div
                className={`map-marker ${
                  completedIds.has(
                    quest.id
                  )
                    ? "done"
                    : ""
                }`}
              >
                {completedIds.has(
                  quest.id
                )
                  ? "✓"
                  : index + 1}
              </div>

              <div className="map-card">
                <span>
                  STAGE {index + 1}
                </span>

                <h3>
                  {quest.title}
                </h3>

                <p>
                  {quest.description}
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </Page>
  );
}

function SettingsPage({
  resetGame,
}) {
  return (
    <Page
      eyebrow="CAMPAIGN CONTROL"
      title="Settings"
    >
      <div className="danger-zone">
        <h3>
          Reset Campaign
        </h3>

        <p>
          Delete your current world,
          completed quests, XP and
          streak.
        </p>

        <button
          onClick={resetGame}
        >
          Reset Everything
        </button>
      </div>
    </Page>
  );
}

function Page({
  eyebrow,
  title,
  children,
}) {
  return (
    <section className="page">
      <div className="page-title">
        <span className="eyebrow">
          {eyebrow}
        </span>

        <h2>{title}</h2>
      </div>

      {children}
    </section>
  );
}

function WorldGenerator({
  loading,
  canClose,
  close,
  generateWorld,
}) {
  const [form, setForm] =
    useState({
      goal: "Become an AI Engineer",

      current_level:
        "Beginner with Python basics",

      hours_per_week: 10,

      deadline: "",

      interests:
        "AI agents, computer vision, real projects",
    });

  function update(event) {
    setForm({
      ...form,

      [event.target.name]:
        event.target.value,
    });
  }

  function submit(event) {
    event.preventDefault();

    generateWorld({
      ...form,

      hours_per_week:
        Number(
          form.hours_per_week
        ),
    });
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-title">
          <div>
            <span className="eyebrow">
              WORLD FORGE
            </span>

            <h2>
              Create your campaign
            </h2>
          </div>

          {canClose && (
            <button
              onClick={close}
              className="close"
            >
              ×
            </button>
          )}
        </div>

        <form onSubmit={submit}>
          <label>
            Long-term Goal

            <textarea
              name="goal"
              required
              value={form.goal}
              onChange={update}
            />
          </label>

          <div className="form-row">
            <label>
              Current Level

              <input
                name="current_level"
                value={
                  form.current_level
                }
                onChange={update}
              />
            </label>

            <label>
              Hours Per Week

              <input
                type="number"
                min="1"
                max="80"
                name="hours_per_week"
                value={
                  form.hours_per_week
                }
                onChange={update}
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Deadline

              <input
                name="deadline"
                placeholder="6 months"
                value={
                  form.deadline
                }
                onChange={update}
              />
            </label>

            <label>
              Interests

              <input
                name="interests"
                value={
                  form.interests
                }
                onChange={update}
              />
            </label>
          </div>

          <button
            className="primary-button generate"
            disabled={loading}
          >
            {loading
              ? "Generating World..."
              : "✦ Generate Campaign"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CompletionModal({
  quest,
  close,
  completeQuest,
}) {
  const [rating, setRating] =
    useState(3);

  const labels = [
    "Easy",
    "Light",
    "Balanced",
    "Hard",
    "Brutal",
  ];

  return (
    <div className="modal-overlay">
      <div className="modal completion-modal">
        <div className="completion-icon">
          ★
        </div>

        <span className="eyebrow">
          QUEST CLEAR
        </span>

        <h2>{quest.title}</h2>

        <p>
          How difficult was this
          challenge for you? This
          feedback controls the adaptive
          difficulty system.
        </p>

        <div className="ratings">
          {[1, 2, 3, 4, 5].map(
            (number) => (
              <button
                type="button"
                key={number}
                className={
                  rating === number
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setRating(number)
                }
              >
                <strong>
                  {number}
                </strong>

                <span>
                  {
                    labels[
                      number - 1
                    ]
                  }
                </span>
              </button>
            )
          )}
        </div>

        <div className="modal-buttons">
          <button
            className="secondary-button"
            onClick={close}
          >
            Not Yet
          </button>

          <button
            className="primary-button"
            onClick={() =>
              completeQuest(
                quest,
                rating
              )
            }
          >
            ✓ Complete +{quest.xp} XP
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;