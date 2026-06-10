import subprocess
import sys
import tempfile
import os

def get_sandbox_policy() -> dict:
    return {
        "network_access": False,
        "timeout_seconds": 30,
        "memory_limit_mb": 512
    }

def execute_sandbox_code(script_content: str) -> dict:
    policy = get_sandbox_policy()
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_file:
        temp_file.write(script_content)
        temp_script_path = temp_file.name

    try:
        result = subprocess.run(
            [sys.executable, temp_script_path],
            capture_output=True,
            text=True,
            timeout=policy["timeout_seconds"]
        )
        if result.returncode == 0:
            return {"status": "success", "output": result.stdout}
        else:
            return {"status": "error", "traceback": result.stderr}
    except subprocess.TimeoutExpired:
        return {"status": "error", "traceback": "Execution timeout exceeded"}
    finally:
        if os.path.exists(temp_script_path):
            os.remove(temp_script_path)
