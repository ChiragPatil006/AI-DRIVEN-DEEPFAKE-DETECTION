#!/usr/bin/env python3
"""Quick WildDeepfake setup for hackathon"""

import zipfile
import os
from pathlib import Path

def setup_wilddeepfake():
    """Extract WildDeepfake if zip exists."""
    zip_path = Path("./wilddeepfake.zip")
    extract_dir = Path("./wilddeepfake_data")
    
    if zip_path.exists():
        print("📦 Found wilddeepfake.zip! Extracting...\n")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
        print(f"✓ Extracted to {extract_dir}\n")
        
        # Count videos
        videos = list(extract_dir.glob("**/*.mp4")) + list(extract_dir.glob("**/*.avi"))
        print(f"✓ Found {len(videos)} deepfake videos!\n")
        return True
    else:
        print("⏳ wilddeepfake.zip not found. Still downloading? Run again in a moment.\n")
        return False

if __name__ == "__main__":
    setup_wilddeepfake()
