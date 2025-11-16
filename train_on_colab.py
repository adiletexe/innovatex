!pip install ultralytics --quiet

import torch
from ultralytics import YOLO
from pathlib import Path
import os
import zipfile
from datetime import datetime
import shutil
from google.colab import drive
drive.mount('/content/drive')

MERGED_ZIP = '/content/drive/MyDrive/merged_dataset.zip'
MERGED_DIR = Path('/content/merged_dataset')

os.makedirs('/content/colab_tmp', exist_ok=True)

if not MERGED_DIR.exists():
    with zipfile.ZipFile(MERGED_ZIP, 'r') as zip_ref:
        zip_ref.extractall('/content')

data_yaml = MERGED_DIR / 'data.yaml'

train_count = len(list((MERGED_DIR / "train" / "images").glob("*.jpg")))
valid_count = len(list((MERGED_DIR / "valid" / "images").glob("*.jpg")))
test_count  = len(list((MERGED_DIR / "test" / "images").glob("*.jpg")))

print(f"Train: {train_count}, Valid: {valid_count}, Test: {test_count}, Total: {train_count + valid_count + test_count}, Classes: signature, stamp, qr_code")

if torch.cuda.is_available():
    gpu_name = torch.cuda.get_device_name(0)
    gpu_mem = torch.cuda.get_device_properties(0).total_memory / 1024**3
    device = 0
    recommended_batch = 32 if gpu_mem >= 15 else 16
else:
    device = 'cpu'
    recommended_batch = 8

model_path = "yolo11n.pt"
model = YOLO(model_path)

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
exp_name = f"yolo11n_combined_colab_{timestamp}"

results = model.train(
    data=str(data_yaml),
    epochs=50,
    imgsz=768,
    batch=recommended_batch,
    device=device,
    workers=2,
    patience=5,
    save=True,
    save_period=5,
    val=True,
    plots=True,
    verbose=True,
    project="runs/detect",
    name=exp_name,
    exist_ok=True,
    pretrained=True,
    optimizer='AdamW',
    lr0=0.01,
    lrf=0.01,
    momentum=0.937,
    weight_decay=0.0005,
    warmup_epochs=3.0,
    warmup_momentum=0.8,
    warmup_bias_lr=0.1,
    box=7.5,
    cls=0.5,
    dfl=1.5,
    hsv_h=0.01,
    hsv_s=0.5,
    hsv_v=0.3,
    degrees=0.0,
    translate=0.05,
    scale=0.3,
    shear=0.0,
    perspective=0.0,
    flipud=0.0,
    fliplr=0.3,
    mosaic=0.0,
    mixup=0.0,
    copy_paste=0.0,
    close_mosaic=0,
    erasing=0.0,
    auto_augment=None,
)

results_dir = Path("runs/detect") / exp_name
best_model = results_dir / "weights" / "best.pt"
best_out   = Path('/content/drive/MyDrive/colab_data') / f"best_combined_model_{timestamp}.pt"
os.makedirs(best_out.parent, exist_ok=True)
shutil.copy2(best_model, best_out)

from google.colab import files
files.download(best_out)
