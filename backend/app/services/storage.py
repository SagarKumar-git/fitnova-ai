import os
import uuid
from abc import ABC, abstractmethod

class StorageProvider(ABC):
    @abstractmethod
    def save_file(self, file_bytes: bytes, filename: str, subfolder: str) -> str:
        """Saves a file and returns its URL/path representation."""
        pass

    @abstractmethod
    def delete_file(self, file_path: str) -> bool:
        """Deletes a file given its URL/path representation."""
        pass

class LocalStorageProvider(StorageProvider):
    def __init__(self, base_dir: str = None):
        if base_dir is None:
            # Point to backend/app/static
            base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
        self.base_dir = base_dir

    def save_file(self, file_bytes: bytes, filename: str, subfolder: str) -> str:
        # Normalize slashes in subfolder path for filesystem
        subfolder_fs = subfolder.replace("/", os.sep).replace("\\", os.sep)
        target_dir = os.path.join(self.base_dir, subfolder_fs)
        os.makedirs(target_dir, exist_ok=True)
        
        # Generate a unique name to prevent naming collisions
        ext = os.path.splitext(filename)[1]
        unique_name = f"{uuid.uuid4()}{ext}"
        full_path = os.path.join(target_dir, unique_name)
        
        with open(full_path, "wb") as f:
            f.write(file_bytes)
            
        # Return web-accessible URL path: /static/uploads/YYYY/MM/unique_name.ext
        # Use forward slashes for URLs regardless of OS
        url_path = "/" + os.path.join("static", subfolder_fs, unique_name).replace("\\", "/")
        return url_path

    def delete_file(self, file_path: str) -> bool:
        # file_path is /static/uploads/YYYY/MM/unique_name.ext
        if not file_path or not file_path.startswith("/static/"):
            return False
            
        relative_path = file_path.lstrip("/")
        # Remove 'static/' prefix since self.base_dir points to 'static'
        if relative_path.startswith("static/"):
            relative_path = relative_path[len("static/"):]
            
        # Normalize relative path for OS
        relative_path_fs = relative_path.replace("/", os.sep).replace("\\", os.sep)
        physical_path = os.path.join(self.base_dir, relative_path_fs)
        
        if os.path.exists(physical_path):
            try:
                os.remove(physical_path)
                return True
            except OSError:
                return False
        return False
