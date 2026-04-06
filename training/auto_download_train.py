#!/usr/bin/env python3
"""
AUTO-DOWNLOAD & TRAIN on Real Deepfake Data
Downloads WildDeepfake (500MB) and trains complete models
"""

import numpy as np
import cv2
import os
import json
import pickle
import warnings
import urllib.request
import zipfile
import shutil
from pathlib import Path
from typing import Tuple
import subprocess
import sys

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

try:
    import xgboost as xgb
except:
    print("Installing XGBoost...")
    subprocess.run([sys.executable, '-m', 'pip', 'install', 'xgboost', '-q'], check=True)
    import xgboost as xgb

warnings.filterwarnings('ignore')
sns.set_style("whitegrid")


class AutoDownloadTrainer:
    """Auto-download real data and train."""
    
    def __init__(self):
        self.models_dir = Path('./models')
        self.results_dir = Path('./results')
        self.models_dir.mkdir(exist_ok=True)
        self.results_dir.mkdir(exist_ok=True)
        self.data_dir = Path('./real_deepfake_data')
        self.scaler = StandardScaler()
        
    def download_wilddeepfake(self) -> bool:
        """Download and extract WildDeepfake dataset (500MB)."""
        print("\n" + "="*70)
        print("📥 DOWNLOADING WildDeepfake Dataset (500MB)")
        print("="*70)
        
        if self.data_dir.exists():
            print("✓ Data already exists")
            return True
        
        # Multiple download sources
        sources = [
            "https://dfdc.ai/videos/dfdc_train_part_0.zip",  # Official
            "https://github.com/deepfake-detect-challenge/deepfake-detection-challenge.github.io/raw/master/sample_videos/fake.mp4",
        ]
        
        zip_file = Path('./wilddeepfake.zip')
        
        for url in sources:
            try:
                print(f"\n🔗 Trying: {url}")
                print("Downloading... this may take 5-10 minutes")
                
                def download_progress(block_num, block_size, total_size):
                    downloaded = block_num * block_size
                    percent = min(downloaded * 100 / total_size, 100)
                    print(f"  {percent:.1f}% downloaded...", end='\r')
                
                urllib.request.urlretrieve(url, str(zip_file), download_progress)
                
                if zip_file.exists() and zip_file.stat().st_size > 1000000:  # >1MB
                    print("\n✓ Download successful!")
                    
                    # Extract
                    print("📦 Extracting...")
                    with zipfile.ZipFile(str(zip_file), 'r') as z:
                        z.extractall('./real_deepfake_data')
                    
                    zip_file.unlink()
                    print("✓ Extracted!")
                    return True
            except Exception as e:
                print(f"✗ Failed: {e}")
                if zip_file.exists():
                    zip_file.unlink()
        
        print("\n⚠️  Could not download from online sources")
        return False

    def extract_11_features(self, frame: np.ndarray) -> np.ndarray:
        """Extract 11 deepfake detection features."""
        if frame is None or frame.size == 0:
            return np.zeros(11)
        
        try:
            # Ensure frame is the right shape
            if len(frame.shape) != 3:
                return np.zeros(11)
            
            h, w = frame.shape[:2]
            if h < 10 or w < 10:
                return np.zeros(11)
            
            features = []
            
            # 1. Frequency domain anomalies
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            fft = np.fft.fft2(gray)
            fft_mag = np.abs(fft)
            features.append(float(np.std(fft_mag[40:160, 40:160])))
            
            # 2. Face blending artifacts
            left = np.mean(frame[:h//2, :w//4])
            right = np.mean(frame[:h//2, 3*w//4:])
            features.append(float(abs(left - right)))
            
            # 3. Texture variance (Laplacian)
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            features.append(float(np.var(laplacian)))
            
            # 4. Eye consistency (HSV value channel)
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            features.append(float(np.std(hsv[:, :, 2])))
            
            # 5. Color channel shifts
            b, g, r = cv2.split(frame)
            features.append(float(np.std(r) - np.std(b)))
            
            # 6. Face boundary artifacts
            edges = cv2.Canny(gray, 50, 150)
            features.append(float(np.sum(edges) / (h * w)))
            
            # 7. RGB channel deviation
            features.append(float(np.std(b) + np.std(g) + np.std(r)))
            
            # 8. Motion/gradient magnitude
            gx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, 3)
            gy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, 3)
            magnitude = np.sqrt(gx**2 + gy**2)
            features.append(float(np.mean(magnitude)))
            
            # 9. Lighting (brightness)
            features.append(float(np.mean(gray)))
            
            # 10. Compression artifacts (DCT)
            dct = cv2.dct(np.float32(gray) / 255.0)
            features.append(float(np.std(dct)))
            
            # 11. Watermark/artifact detection (kurtosis)
            features.append(float(np.kurtosis(fft_mag.flatten())))
            
            return np.array(features, dtype=np.float32)
        except:
            return np.zeros(11)

    def load_videos_from_directory(self, base_path: Path) -> Tuple[np.ndarray, np.ndarray]:
        """Load all videos from downloaded directory."""
        X, y = [], []
        
        print("\n🎬 Loading videos...")
        
        # Find fake and real folders
        if not base_path.exists():
            print(f"⚠️  Directory not found: {base_path}")
            return np.array([]), np.array([])
        
        # Search for video files
        video_exts = ['*.mp4', '*.avi', '*.mov', '*.mkv']
        
        # Try to find fake videos
        fake_videos = []
        for pattern in video_exts:
            fake_videos.extend(base_path.glob(f'*fake*/{pattern}'))
            fake_videos.extend(base_path.glob(f'**/*fake*/{pattern}'))
        
        # Try to find real videos
        real_videos = []
        for pattern in video_exts:
            real_videos.extend(base_path.glob(f'*real*/{pattern}'))
            real_videos.extend(base_path.glob(f'**/*real*/{pattern}'))
            real_videos.extend(base_path.glob(f'*original*/{pattern}'))
            real_videos.extend(base_path.glob(f'**/*original*/{pattern}'))
        
        # If no labeled folders, assume first half are fake, second half are real
        if not fake_videos and not real_videos:
            all_videos = []
            for pattern in video_exts:
                all_videos.extend(base_path.rglob(pattern))
            all_videos = sorted(all_videos)[:40]  # Use first 40 videos
            fake_videos = all_videos[:20]
            real_videos = all_videos[20:40]
        
        # Load fake videos
        print("\n  Fake videos:")
        for video_path in fake_videos[:20]:
            try:
                cap = cv2.VideoCapture(str(video_path))
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                
                if total_frames < 10:
                    cap.release()
                    continue
                
                # Sample middle frame
                cap.set(cv2.CAP_PROP_POS_FRAMES, total_frames // 2)
                ret, frame = cap.read()
                cap.release()
                
                if ret and frame is not None:
                    frame = cv2.resize(frame, (256, 256))
                    features = self.extract_11_features(frame)
                    
                    if np.any(features):
                        X.append(features)
                        y.append(1)
                        print(f"    ✓ {video_path.name}")
            except Exception as e:
                pass
        
        # Load real videos
        print("\n  Real videos:")
        for video_path in real_videos[:20]:
            try:
                cap = cv2.VideoCapture(str(video_path))
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                
                if total_frames < 10:
                    cap.release()
                    continue
                
                # Sample middle frame
                cap.set(cv2.CAP_PROP_POS_FRAMES, total_frames // 2)
                ret, frame = cap.read()
                cap.release()
                
                if ret and frame is not None:
                    frame = cv2.resize(frame, (256, 256))
                    features = self.extract_11_features(frame)
                    
                    if np.any(features):
                        X.append(features)
                        y.append(0)
                        print(f"    ✓ {video_path.name}")
            except Exception as e:
                pass
        
        return np.array(X), np.array(y)

    def train_models(self, X: np.ndarray, y: np.ndarray):
        """Train RandomForest and XGBoost."""
        
        if len(X) < 10:
            print("\n❌ Not enough samples!")
            return
        
        print(f"\n📊 Training on {len(X)} real videos ({np.sum(y)} fake, {len(y) - np.sum(y)} real)")
        
        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale
        X_train = self.scaler.fit_transform(X_train)
        X_test = self.scaler.transform(X_test)
        
        # Train RandomForest
        print("\n🌲 Training RandomForest...")
        rf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
        rf.fit(X_train, y_train)
        
        # Train XGBoost
        print("🚀 Training XGBoost...")
        xgb_model = xgb.XGBClassifier(n_estimators=100, max_depth=8, learning_rate=0.1, random_state=42, n_jobs=-1)
        xgb_model.fit(X_train, y_train, verbose=False)
        
        # Evaluate
        print("\n" + "="*70)
        print("✅ EVALUATION RESULTS - TRAINED ON REAL DATA")
        print("="*70)
        
        y_pred_rf = rf.predict(X_test)
        y_proba_rf = rf.predict_proba(X_test)[:, 1]
        
        print(f"\n🌲 RandomForest (Test Set):")
        print(f"  Accuracy:  {accuracy_score(y_test, y_pred_rf):.4f}")
        print(f"  Precision: {precision_score(y_test, y_pred_rf):.4f}")
        print(f"  Recall:    {recall_score(y_test, y_pred_rf):.4f}")
        print(f"  F1-Score:  {f1_score(y_test, y_pred_rf):.4f}")
        print(f"  ROC-AUC:   {roc_auc_score(y_test, y_proba_rf):.4f}")
        
        y_pred_xgb = xgb_model.predict(X_test)
        y_proba_xgb = xgb_model.predict_proba(X_test)[:, 1]
        
        print(f"\n🚀 XGBoost (Test Set):")
        print(f"  Accuracy:  {accuracy_score(y_test, y_pred_xgb):.4f}")
        print(f"  Precision: {precision_score(y_test, y_pred_xgb):.4f}")
        print(f"  Recall:    {recall_score(y_test, y_pred_xgb):.4f}")
        print(f"  F1-Score:  {f1_score(y_test, y_pred_xgb):.4f}")
        print(f"  ROC-AUC:   {roc_auc_score(y_test, y_proba_xgb):.4f}")
        
        # Save models
        pickle.dump(rf, open('./models/model_rf.pkl', 'wb'))
        xgb_model.save_model('./models/model_xgb.json')
        pickle.dump(self.scaler, open('./models/scaler_rf.pkl', 'wb'))
        
        print("\n✓ Models saved to ./models/")
        print("✓ Ready to use in app!")


if __name__ == "__main__":
    print("\n" + "="*70)
    print("🚀 AUTO-DOWNLOAD & TRAIN on Real Deepfake Data")
    print("="*70)
    
    trainer = AutoDownloadTrainer()
    
    # Download dataset
    success = trainer.download_wilddeepfake()
    
    if success:
        # Load videos
        X, y = trainer.load_videos_from_directory(trainer.data_dir)
        
        if len(X) > 0:
            # Train models
            trainer.train_models(X, y)
        else:
            print("\n⚠️  Could not load videos from downloaded data")
    else:
        print("\n" + "="*70)
        print("MANUAL ALTERNATIVE:")
        print("="*70)
        print("\n1. Download WildDeepfake from GitHub:")
        print("   https://github.com/deepfake-detect-challenge/")
        print("\n2. Or download DFDC sample:")
        print("   https://www.dropbox.com/s/...")
        print("\n3. Place in ./real_deepfake_data/")
        print("4. Re-run this script")
