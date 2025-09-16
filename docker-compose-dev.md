services:
  db:
    image: postgres:15-alpine
    ports:
      - "24324:5432"
    environment:
      - POSTGRES_USER=gem-launch
      - POSTGRES_PASSWORD=gem-launch-db-yourpassword
      - POSTGRES_DB=gem-launch-db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gem-launch -d gem-launch-db"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    ports:
      - "24325:6379"   # 👈 expose Redis on localhost:24325
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data: