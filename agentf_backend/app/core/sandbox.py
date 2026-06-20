import asyncio
import re
import queue
from typing import Dict, Any, Optional
from jupyter_client import KernelManager

class JupyterSandboxManager:
    """
    Enterprise-Grade Jupyter Kernel Manager for persistent, isolated stateful execution.
    Designed for real-time mathematical auditing and continuous data processing.
    """

    def __init__(self, kernel_name: str = "python3"):
        self.kernel_manager = KernelManager(kernel_name=kernel_name)
        self.kernel_manager.start_kernel()
        self.client = self.kernel_manager.client()
        self.client.start_channels()
        # Validate the kernel is fully operational before accepting instructions
        self.client.wait_for_ready(timeout=10)

    def _enforce_flat_procedural(self, code: str) -> str:
        """
        Validates and strictly enforces flat procedural execution geometry.
        Rejects any code that attempts to encapsulate execution inside 'main()'
        or the '__main__' entry point to prevent scope isolation and deadlock conditions.
        """
        # Scan for main() function definitions
        if re.search(r"^\s*def\s+main\s*\(", code, re.MULTILINE):
            raise ValueError(
                "Execution constraint violation: The 'main()' function wrapper is strictly prohibited. "
                "Code must be flat procedural to maintain state transparency across the kernel."
            )
        
        # Scan for '__name__ == __main__' block
        if re.search(r"__name__\s*==\s*[\"']__main__[\"']", code):
            raise ValueError(
                "Execution constraint violation: The '__name__ == \"__main__\"' block is strictly prohibited. "
                "Code must be flat procedural."
            )

        return code

    def _parse_stderr_to_structured_error(self, traceback_list: list) -> Dict[str, Any]:
        """
        Parses raw traceback strings into a structured JSON dictionary for deterministic self-healing loops.
        Extracts error type, target line number, and raw message.
        """
        full_traceback = "\n".join(traceback_list)
        
        error_type = "RuntimeError"
        target_line = None
        message = full_traceback

        # Regex to extract standard Python traceback details for line numbers
        line_match = re.search(r"line\s+(\d+)", full_traceback, re.IGNORECASE)
        if line_match:
            target_line = int(line_match.group(1))

        # Looking for the actual exception type and message at the end of the traceback
        # e.g., "ValueError: some message" or "NameError: name 'x' is not defined"
        error_match = re.search(r"^([A-Za-z0-9_]+Error|Exception):\s+(.*)$", full_traceback, re.MULTILINE)
        if error_match:
            error_type = error_match.group(1)
            message = error_match.group(2).strip()

        return {
            "error_type": error_type,
            "target_line": target_line,
            "message": message,
            "raw_traceback": full_traceback
        }

    async def execute_cell(self, code: str, timeout: int = 60) -> Dict[str, Any]:
        """
        Asynchronously executes a single cell of code within the persistent kernel state.
        Captures stdout, stderr, and base64 encoded graphical payloads independently.
        """
        try:
            validated_code = self._enforce_flat_procedural(code)
        except ValueError as e:
            return {
                "status": "error",
                "stdout": "",
                "stderr": {
                    "error_type": "ConstraintViolation",
                    "target_line": None,
                    "message": str(e),
                    "raw_traceback": str(e)
                },
                "payloads": []
            }

        msg_id = self.client.execute(validated_code)
        
        stdout_data = []
        stderr_data = []
        payloads = []
        
        status = "pending"
        loop = asyncio.get_event_loop()
        start_time = loop.time()

        while True:
            current_time = loop.time()
            if current_time - start_time > timeout:
                self.kernel_manager.interrupt_kernel()
                status = "timeout"
                stderr_data.append(f"Execution exceeded the {timeout}-second timeout threshold and was interrupted.")
                break

            try:
                # Non-blocking fetch to maintain async loop fluidity
                msg = self.client.get_iopub_msg(timeout=0)
            except queue.Empty:
                await asyncio.sleep(0.05)
                continue

            msg_type = msg['header']['msg_type']
            parent_id = msg['parent_header'].get('msg_id')

            if parent_id != msg_id:
                continue

            content = msg['content']

            if msg_type == 'stream':
                if content.get('name') == 'stdout':
                    stdout_data.append(content['text'])
                elif content.get('name') == 'stderr':
                    stderr_data.append(content['text'])
                    
            elif msg_type == 'execute_result' or msg_type == 'display_data':
                data = content.get('data', {})
                # Capture graphical payloads (e.g., matplotlib figures encoded in base64)
                if 'image/png' in data:
                    payloads.append({
                        "type": "image/png",
                        "data": data['image/png']
                    })
                # Capture standard text representations
                if 'text/plain' in data and msg_type == 'execute_result':
                    stdout_data.append(data['text/plain'])
                    
            elif msg_type == 'error':
                status = "error"
                traceback_list = content.get('traceback', [])
                # Jupyter traceback often contains ANSI escape codes; stripping them for structured logging
                clean_traceback = [re.sub(r'\x1b\[.*?m', '', line) for line in traceback_list]
                stderr_data.extend(clean_traceback)
                
            elif msg_type == 'status':
                if content.get('execution_state') == 'idle':
                    if status == "pending":
                        status = "success"
                    break

        result = {
            "status": status,
            "stdout": "".join(stdout_data),
            "payloads": payloads
        }

        if status == "error" or status == "timeout":
            result["stderr"] = self._parse_stderr_to_structured_error(stderr_data)
        else:
            result["stderr"] = None

        return result

    def shutdown(self):
        """
        Gracefully terminates the persistent kernel session and associated communication channels.
        """
        self.client.stop_channels()
        self.kernel_manager.shutdown_kernel(now=False)