from prometheus_client import Counter, Histogram, Gauge

problem_solved = Counter("problems_solved_total", "Total problems marked as solved")
problem_failed = Counter("problems_failed_total", "Total problems with failing test cases")
problem_error = Counter("problems_error_total", "Total problems with runtime errors")
query_duration = Histogram("sql_query_duration_seconds", "Time spent on SQL updates")

batch_created = Counter("batch_created_total", "Total number of batches created")
batch_completed = Counter("batch_completed_total", "Total number of completed batches")
batch_processing = Gauge("batch_processing_count", "Number of batches currently being processed")
