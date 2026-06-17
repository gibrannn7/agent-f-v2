import subprocess
import sys
import tempfile
import os

def execute_sandbox_code(script_content: str) -> dict:
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as temp_file:
        temp_file.write(script_content)
        temp_script_path = temp_file.name

    env = os.environ.copy()
    env["MPLBACKEND"] = "Agg"
    env["PYTHONIOENCODING"] = "utf-8"

    try:
        result = subprocess.run(
            [sys.executable, temp_script_path],
            capture_output=True,
            text=True,
            timeout=60,
            env=env
        )
        if result.returncode == 0:
            return {"status": "success", "output": result.stdout}
        else:
            return {"status": "error", "traceback": result.stderr}
    except subprocess.TimeoutExpired:
        return {"status": "error", "traceback": "Execution timeout exceeded 60 seconds. Strict execution limits enforced."}
    finally:
        if os.path.exists(temp_script_path):
            try:
                os.remove(temp_script_path)
            except OSError:
                pass