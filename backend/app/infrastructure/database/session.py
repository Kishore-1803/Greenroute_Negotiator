from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.infrastructure.config.settings import get_settings

# We use the preference_db_path from settings as the SQLite database
# The original code used `check_same_thread=False` and `PRAGMA journal_mode=WAL;`
# We replicate this setup using SQLAlchemy

def get_engine():
    settings = get_settings()
    db_url = f"sqlite:///{settings.preference_db_path}"
    
    # StaticPool is useful if we want to ensure the same connection is reused in SQLite, 
    # but for concurrency we can just use SingletonThreadPool or default pool with check_same_thread=False
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
        # poolclass=StaticPool, # Uncomment if needed for memory DBs, but this is a file
    )
    return engine

engine = get_engine()

# Configure WAL mode on connect
from sqlalchemy import event


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

from sqlalchemy import text


def migrate_db():
    try:
        with engine.connect() as conn:
            cols = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            email_notnull = any(c[1] == 'email' and c[3] == 1 for c in cols)
            has_phone = any(c[1] == 'phone' for c in cols)
            
            if email_notnull or not has_phone:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS users_migration (
                        id TEXT PRIMARY KEY,
                        email TEXT UNIQUE,
                        phone TEXT UNIQUE,
                        password_hash TEXT NOT NULL,
                        salt TEXT NOT NULL,
                        name TEXT NOT NULL,
                        location TEXT DEFAULT 'Chennai, TN',
                        personality_tag TEXT DEFAULT 'Eco-Smart Daily Commuter',
                        preferred_modes TEXT DEFAULT '["car", "two_wheeler", "cycling"]',
                        avatar_url TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                if has_phone:
                    conn.execute(text("""
                        INSERT OR IGNORE INTO users_migration (id, email, phone, password_hash, salt, name, location, personality_tag, preferred_modes, avatar_url, created_at)
                        SELECT id, email, phone, password_hash, salt, name, location, personality_tag, preferred_modes, avatar_url, created_at FROM users
                    """))
                else:
                    conn.execute(text("""
                        INSERT OR IGNORE INTO users_migration (id, email, password_hash, salt, name, location, personality_tag, preferred_modes, avatar_url, created_at)
                        SELECT id, email, password_hash, salt, name, location, personality_tag, preferred_modes, avatar_url, created_at FROM users
                    """))
                conn.execute(text("DROP TABLE users"))
                conn.execute(text("ALTER TABLE users_migration RENAME TO users"))
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users(email)"))
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_phone ON users(phone)"))
                conn.commit()
    except Exception as e:
        print("Migration error (non-fatal):", e)

# Initialize schema
Base.metadata.create_all(bind=engine)
migrate_db()

def get_db() -> Generator:
    """Dependency to provide a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
