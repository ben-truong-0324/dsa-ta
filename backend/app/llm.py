import httpx
from typing import Tuple, List

PROMPTS = {
    "generate_problem_details": """
Given this problem name: "{name}"
Generate the following:
1. A LeetCode-style description
2. A sample test case in Python (input + expected output)
3. A list of tags such as Array, Linked List, DP, etc.

Format your response exactly as:
Description:
...

Test case:
...

Tags:
tag1, tag2, tag3
""".strip()
}
MODEL_NAME = "tinyllama"
async def generate_from_ollama(problem_name: str, model=MODEL_NAME) -> Tuple[str, str, List[str]]:
    prompt =PROMPTS["generate_problem_details"].format(name=problem_name)

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                "ollama.dsata.svc.cluster.local:11434/api/generate",
                json={"prompt": prompt, "model": MODEL_NAME}  # or whatever your model is
            )
            response.raise_for_status()
            output = response.json().get("response", "")

            # Extract the three parts
            desc = test_case = ""
            tags = []
            if "Test case:" in output and "Tags:" in output:
                desc, rest = output.split("Test case:", 1)
                test_case, tags_raw = rest.split("Tags:", 1)
                tags = [tag.strip() for tag in tags_raw.strip().split(",") if tag.strip()]
            else:
                return "Failed to parse description", "# LLM failed", []

            return desc.strip(), test_case.strip(), tags, model

    except Exception as e:
        print(f"LLM error: {e}")
        return "LLM failed to generate description", "# Test case failed", []
