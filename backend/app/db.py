from databases import Database
from sqlalchemy import (
    create_engine, MetaData, Table, Column,
    Integer, String, Text, DateTime, ARRAY, ForeignKey
)
import sqlalchemy.dialects.postgresql as pg
import datetime


DATABASE_URL = "postgresql://dsa_ta:dsa_ta@postgres:5432/dsa_ta_db"

database = Database(DATABASE_URL)
metadata = MetaData()

# Table: problems
problems = Table(
    "problems",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String, unique=True, nullable=False),
    Column("description", Text, nullable=False),
    Column("test_cases", Text, nullable=False),
    Column("tags", ARRAY(String)),
    Column("status", String, default="Pending"),
    Column("last_updated", DateTime, default=datetime.datetime.utcnow),
    Column("model_name", String), 
)

# Table: problem_batches
problem_batches = Table(
    "problem_batches",
    metadata,
    Column("batch_id", pg.UUID(as_uuid=True), primary_key=True),
    Column("submitted_at", DateTime, default=datetime.datetime.utcnow),
    Column("status", String, default="Processing")
)

# Table: batch_problems
batch_problems = Table(
    "batch_problems",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("batch_id", pg.UUID(as_uuid=True), ForeignKey("problem_batches.batch_id")),
    Column("name", String),
    Column("status", String, default="Pending"),
    Column("error", Text)
)