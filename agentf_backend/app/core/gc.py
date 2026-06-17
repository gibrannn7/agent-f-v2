import os
import shutil
import asyncio

async def async_purge_session_directory(temp_dir: str):
    """
    Asynchronously purges the session temporary directory to ensure all 
    background processes have released file handles and memory.
    Ensures zero-knowledge/zero-retention compliance.
    """
    await asyncio.sleep(5)
    try:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
    except FileNotFoundError:
        pass
    except Exception as e:
        print(f"[GC ERROR] Failed to purge volatile storage at {temp_dir}: {str(e)}")
