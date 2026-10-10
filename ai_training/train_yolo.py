"""
RoadPulse — YOLO Fine-Tuning Pipeline for Road Damage Detection (RDD2022 / Roboflow)
Run this script inside Google Colab with T4 GPU enabled.
"""

import os
from ultralytics import YOLO

def main():
    print("=== RoadPulse YOLO11 Fine-Tuning Pipeline ===")
    
    # 1. Load Pretrained YOLO model
    print("Loading pretrained YOLO11 weights...")
    model = YOLO("yolo11n.pt")

    # 2. Dataset YAML configuration path
    # Update data_yaml to point to your unzipped dataset data.yaml file in Colab
    data_yaml = "/content/dataset/data.yaml"

    if not os.path.exists(data_yaml):
        print(f"Warning: Dataset file not found at {data_yaml}.")
        print("Please download RDD2022 or Roboflow Pothole dataset and update path.")
        return

    # 3. Fine-tune transfer learning
    print("Starting fine-tuning on road damage dataset...")
    results = model.train(
        data=data_yaml,
        epochs=50,
        imgsz=640,
        batch=16,
        project="roadpulse_training",
        name="road_damage_yolo11",
        save=True
    )

    # 4. Evaluate metrics
    print("Evaluating model performance on test set...")
    metrics = model.val(data=data_yaml, split="test")
    print(f"mAP@50: {metrics.box.map50:.4f}")
    print(f"Precision: {metrics.box.mp:.4f}")
    print(f"Recall: {metrics.box.mr:.4f}")

    # 5. Export best weights to ONNX or PyTorch
    best_weights_path = "roadpulse_training/road_damage_yolo11/weights/best.pt"
    print(f"Training complete. Best model saved at: {best_weights_path}")

if __name__ == "__main__":
    main()
