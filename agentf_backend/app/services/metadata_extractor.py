import pandas as pd
import os
import traceback
from app.agents.state import FileMetadata

def extract_metadata(file_id: str, file_name: str, file_path: str) -> FileMetadata:
    """
    High-performance structural metadata pre-processing engine.
    Implements Defensive Sanitization to strip BOM (Byte Order Mark) and trailing spaces 
    from raw dirty data, guaranteeing KeyError-free schema mapping.
    """
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File {file_path} not found.")

        ext = file_name.split('.')[-1].lower()
        
        # Universal column sanitization to destroy hidden BOM and whitespace
        def sanitize_columns(cols):
            return [str(c).strip().replace('\ufeff', '').replace('ï»¿', '') for c in cols]

        if ext == 'csv':
            # utf-8-sig natively destroys BOM signatures without corrupting real characters
            safe_encoding = "utf-8-sig" 
            shape_rows = 0
            missing_vals = {}
            try:
                for chunk in pd.read_csv(file_path, chunksize=100000, encoding="utf-8-sig", skipinitialspace=True):
                    shape_rows += len(chunk)
                    chunk.columns = sanitize_columns(chunk.columns)
                    chunk_missing = chunk.isnull().sum()
                    for k, v in chunk_missing.items():
                        missing_vals[str(k)] = missing_vals.get(str(k), 0) + int(v)
                df_sample = pd.read_csv(file_path, nrows=5, encoding="utf-8-sig", skipinitialspace=True)
            except UnicodeDecodeError:
                safe_encoding = "latin-1"
                shape_rows = 0
                missing_vals = {}
                for chunk in pd.read_csv(file_path, chunksize=100000, encoding="latin-1", skipinitialspace=True):
                    shape_rows += len(chunk)
                    chunk.columns = sanitize_columns(chunk.columns)
                    chunk_missing = chunk.isnull().sum()
                    for k, v in chunk_missing.items():
                        missing_vals[str(k)] = missing_vals.get(str(k), 0) + int(v)
                df_sample = pd.read_csv(file_path, nrows=5, encoding="latin-1", skipinitialspace=True)
            
            df_sample.columns = sanitize_columns(df_sample.columns)
            shape = [shape_rows, len(df_sample.columns)]
            
        elif ext in ['xlsx', 'xls']:
            df_full = pd.read_excel(file_path)
            df_full.columns = sanitize_columns(df_full.columns)
            df_sample = df_full.head(5)
            shape = [int(df_full.shape[0]), int(df_full.shape[1])]
            missing_vals = {str(k): int(v) for k, v in df_full.isnull().sum().items()}
        else:
            raise ValueError("Unsupported file format. Strictly requires CSV or XLSX.")

        clean_sample_data = df_sample.fillna("").astype(str).to_dict(orient="records")

        return FileMetadata(
            file_id=file_id,
            file_name=file_name,
            file_path=file_path,
            shape=shape,
            columns=df_sample.columns.tolist(),
            dtypes={str(col): str(dtype) for col, dtype in df_sample.dtypes.items()},
            missing_values=missing_vals,
            sample_data=clean_sample_data
        )
    except Exception as e:
        print(f"[METADATA EXTRACTION ERROR] Exception during structural mapping: {str(e)}")
        traceback.print_exc()
        return FileMetadata(
            file_id=file_id,
            file_name=file_name,
            file_path=file_path,
            shape=[0, 0],
            columns=[],
            dtypes={},
            missing_values={},
            sample_data=[]
        )