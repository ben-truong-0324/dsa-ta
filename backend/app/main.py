from fastapi import FastAPI, Request, HTTPException, Body, BackgroundTasks
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import List

import nbformat, os, random
from nbformat.v4 import new_notebook, new_code_cell, new_markdown_cell
from nbclient import NotebookClient
from nbclient.exceptions import CellExecutionError 

from sqlalchemy import and_
from prometheus_fastapi_instrumentator import Instrumentator

from db import database, problems, problem_batches, batch_problems
from metrics import problem_solved, problem_failed, problem_error, query_duration, \
                    batch_created, batch_completed, batch_processing
from llm import generate_from_ollama

app = FastAPI()

@app.on_event("startup")
async def startup():
    await database.connect()
    Instrumentator().instrument(app).expose(app)

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


async def get_problem_by_name(name: str):
    query = problems.select().where(problems.c.name == name)
    return await database.fetch_one(query)

async def list_all_problems():
    query = problems.select()
    return await database.fetch_all(query)

async def update_problem_status(name: str, new_status: str):
    query = problems.update().where(problems.c.name == name).values(status=new_status)
    return await database.execute(query)

async def delete_problem(name: str):
    query = problems.delete().where(problems.c.name == name)
    return await database.execute(query)

NOTEBOOK_DIR = "/mnt/notebooks/"  # Shared persistent volume with Jupyter

@app.get("/notebook")
async def to_notebook(problem: str):
    problem_data = await get_problem_by_name(problem)
    if not problem_data:
        raise HTTPException(status_code=404, detail="Problem not found")

    nb = nbformat.v4.new_notebook(cells=[
        new_markdown_cell(f"# {problem_data['name']}\n\n{problem_data['description']}"),
        new_code_cell("# Write your solution here"),
        new_code_cell(problem_data['test_cases']),
    ])

    path = os.path.join(NOTEBOOK_DIR, f"{problem}.ipynb")
    with open(path, "w") as f:
        nbformat.write(nb, f)

    return RedirectResponse(f"http://jupyter.dsata.svc.cluster.local:8888/lab/tree/{problem}.ipynb")

class SolveStatusResponse(BaseModel):
    problem: str
    status: str  # e.g. "Solved", "Unfinished", "Error"
    detail: str = None

@app.get("/solve-status", response_model=SolveStatusResponse)
async def solve_status(problem: str):
    path = os.path.join(NOTEBOOK_DIR, f"{problem}.ipynb")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Notebook not found")

    try:
        nb = nbformat.read(open(path), as_version=4)
        client = NotebookClient(nb, timeout=20, kernel_name="python3")
        client.execute()

        # Update DB status to Solved
        with query_duration.time():
            query = problems.update().where(problems.c.name == problem).values(status="Solved")
            await database.execute(query)
        problem_solved.inc()

        return {"problem": problem, "status": "Solved"}
    except CellExecutionError as e:
        problem_failed.inc()
        return {"problem": problem, "status": "Unfinished", "detail": str(e)}
    except Exception as e:
        problem_error.inc()
        return {"problem": problem, "status": "Error", "detail": str(e)}
    
@app.get("/problems")
async def list_problems():
    query = problems.select()
    result = await database.fetch_all(query)
    return [dict(row) for row in result]

class NewProblem(BaseModel):
    name: str
    description: str
    test_cases: str
    tags: List[str]

@app.post("/problems")
async def add_problem(problem: NewProblem):
    query = problems.insert().values(
        name=problem.name,
        description=problem.description,
        test_cases=problem.test_cases,
        tags=problem.tags,
        status="Pending"
    )
    await database.execute(query)
    return {"message": "Problem added"}



async def process_batch_async(batch_id: str):
    
    query = batch_problems.select().where(batch_problems.c.batch_id == batch_id)
    items = await database.fetch_all(query)


    for row in items:
        name = row["name"]
        try:
            # Check if problem already exists globally
            exists = await database.fetch_one(
                    problems.select().where(
                        and_(
                            problems.c.name == name,
                            problems.c.model_name == model_name
                        )
                    )
                )
            if exists:
                await database.execute(
                    batch_problems.update().where(
                        and_(
                            batch_problems.c.batch_id == batch_id,
                            batch_problems.c.name == name
                        )
                    ).values(status="Skipped")
                )
                continue

            description, test_case, tags, model_name = await generate_from_ollama(name)
            await database.execute(problems.insert().values(
                name=name,
                description=description,
                test_cases=test_case,
                tags=tags,
                status="Pending",
                model_name=model_name
            ))

            await database.execute(
                batch_problems.update().where(
                    and_(
                        batch_problems.c.batch_id == batch_id,
                        batch_problems.c.name == name
                    )
                ).values(status="Inserted")
            )
        except Exception as e:
            await database.execute(
                batch_problems.update().where(
                    and_(
                        batch_problems.c.batch_id == batch_id,
                        batch_problems.c.name == name
                    )
                ).values(status="Error", error=str(e))
            )

    # Mark batch as complete
    await database.execute(
        problem_batches.update().where(
            problem_batches.c.batch_id == batch_id
        ).values(status="Completed")
    )
    batch_completed.inc()
    batch_processing.dec()

@app.post("/process-problems-batch")
async def start_problem_batch(background_tasks: BackgroundTasks, input_text: str = Body(..., media_type="text/plain")):
    batch_id = str(uuid.uuid4())
    batch_created.inc()
    batch_processing.inc()
    lines = [line.strip() for line in input_text.splitlines() if line.strip()]

    # Insert batch
    await database.execute(problem_batches.insert().values(batch_id=batch_id))

    # Insert all problems as pending
    for name in lines:
        await database.execute(batch_problems.insert().values(batch_id=batch_id, name=name))

    # Start background task to process
    background_tasks.add_task(process_batch_async, batch_id)

    return {"batch_id": batch_id, "status": "processing"}

@app.get("/batch-status/{batch_id}")
async def get_batch_status(batch_id: str):
    query = batch_problems.select().where(batch_problems.c.batch_id == batch_id)
    rows = await database.fetch_all(query)

    return {
        "batch_id": batch_id,
        "problems": [dict(r) for r in rows]
    }

# from fastapi import FastAPI, File, UploadFile
# from fastapi.middleware.cors import CORSMiddleware
# from kafka import KafkaConsumer, KafkaProducer
# import threading
# from app.kafka_worker import kafka_listener
# app = FastAPI(title="dsata API")

# # Allow requests from Flask frontend
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # or ["http://frontend-service"] in prod
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# @app.get("/")
# def read_root():
#     return {"message": "dsata backend is live"}

# @app.post("/evaluate")
# def evaluate():
#     # Read image, do AI magic
#     return {"result": "yes good"}

# @app.on_event("startup")
# def startup_event():
#     print("🚀 Starting FastAPI + Kafka listener...")
#     thread = threading.Thread(target=kafka_listener)
#     thread.daemon = True
#     thread.start()