-- db/init.sql
CREATE TABLE IF NOT EXISTS problems (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  test_cases TEXT NOT NULL,
  tags TEXT[],
  status TEXT DEFAULT 'Pending',
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  model_name TEXT
);


CREATE TABLE IF NOT EXISTS problem_batches (
  batch_id UUID PRIMARY KEY,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'Processing'
);

CREATE TABLE IF NOT EXISTS batch_problems (
  id SERIAL PRIMARY KEY,
  batch_id UUID REFERENCES problem_batches(batch_id),
  name TEXT,
  status TEXT DEFAULT 'Pending',
  error TEXT
);