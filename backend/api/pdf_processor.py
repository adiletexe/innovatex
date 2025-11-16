"""
PDF Processing with YOLO model
Adapted from process_pdfs_light.py
"""
from pathlib import Path
import fitz  # PyMuPDF
from ultralytics import YOLO
from ultralytics.engine.results import Boxes
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from typing import Dict, List, Tuple
import numpy as np
import torch

# Optional: OpenCV for preprocessing
try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False
    print("Warning: opencv-python not installed. Preprocessing features will be disabled.")


class PDFProcessor:
    def __init__(self, model_path: Path):
        self.model = self._load_model(model_path)
        self.class_names = self.model.names

    def _load_model(self, model_path: Path) -> YOLO:
        if not model_path.exists():
            raise FileNotFoundError(f"Model not found: {model_path}")
        model = YOLO(str(model_path))
        return model

    def page_to_pil(self, page: fitz.Page, scale: float = 2.0) -> Image.Image:
        """Convert a PDF page to a PIL image with a scaling factor."""
        matrix = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        mode = "RGB" if pix.n < 4 else "RGBA"
        img = Image.frombytes(mode, [pix.width, pix.height], pix.samples)
        if mode == "RGBA":
            img = img.convert("RGB")
        return img

    def preprocess_image(
        self,
        image: Image.Image,
        use_clahe: bool = False,
        use_denoise: bool = False,
        use_threshold: bool = False
    ) -> Tuple[Image.Image, Dict]:
        """
        Apply preprocessing to enhance signatures, stamps, and QR codes detection.

        Returns:
            Tuple of (processed_image, preprocessing_info_dict)
        """
        preprocessing_info = {
            'applied': [],
            'original_size': image.size
        }

        # Check if OpenCV is available
        if not HAS_OPENCV:
            preprocessing_info['applied'].append('Preprocessing unavailable (OpenCV not installed)')
            return image, preprocessing_info

        # If no preprocessing requested, return original
        if not (use_clahe or use_denoise or use_threshold):
            return image, preprocessing_info

        try:
            # Convert PIL to OpenCV format
            img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        except Exception as e:
            print(f"Error converting image to OpenCV format: {e}")
            preprocessing_info['applied'].append(f'Error: {str(e)}')
            return image, preprocessing_info

        try:
            # Store original for comparison
            original_cv = img_cv.copy()

            # 1. CLAHE - Contrast Limited Adaptive Histogram Equalization
            # Усиливает контраст подписей, печатей и QR-кодов
            if use_clahe:
                print("  🔄 Applying CLAHE...")
                # Convert to LAB color space
                lab = cv2.cvtColor(img_cv, cv2.COLOR_BGR2LAB)
                l, a, b = cv2.split(lab)

                # Apply CLAHE to L channel - very fast operation
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                l_clahe = clahe.apply(l)

                # Merge channels
                lab_clahe = cv2.merge([l_clahe, a, b])
                img_cv = cv2.cvtColor(lab_clahe, cv2.COLOR_LAB2BGR)
                print("  ✅ CLAHE completed")

                preprocessing_info['applied'].append('CLAHE (contrast enhancement)')

            # 2. Denoising - убирает шумы от сканера, пятна, помехи
            if use_denoise:
                print("  🔄 Applying fast denoising...")
                # MUCH faster bilateral filter - preserves edges while removing noise
                # Takes ~0.1-0.5 seconds instead of 30-60 seconds!
                img_cv = cv2.bilateralFilter(
                    img_cv,
                    d=5,  # Diameter of pixel neighborhood (smaller = faster)
                    sigmaColor=75,  # Filter color in color space
                    sigmaSpace=75   # Filter in coordinate space
                )
                print("  ✅ Denoising completed")
                preprocessing_info['applied'].append('Denoising (bilateral filter - fast)')

            # 3. Adaptive Thresholding / Binarization
            # Помогает QR-кодам быть лучше детектируемыми
            if use_threshold:
                print("  🔄 Applying adaptive thresholding...")
                # Convert to grayscale
                gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)

                # Apply adaptive thresholding - very fast
                binary = cv2.adaptiveThreshold(
                    gray,
                    255,
                    cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                    cv2.THRESH_BINARY,
                    11,  # Block size
                    2    # Constant subtracted from mean
                )

                # Convert back to BGR for consistency
                img_cv = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)
                print("  ✅ Thresholding completed")

                preprocessing_info['applied'].append('Thresholding (binarization)')

            # Add sharpening if any preprocessing was applied
            if len(preprocessing_info['applied']) > 0:
                print("  🔄 Applying sharpening...")
                # Sharpen to enhance edges - very fast
                kernel_sharpening = np.array([
                    [-1, -1, -1],
                    [-1,  9, -1],
                    [-1, -1, -1]
                ])
                img_cv = cv2.filter2D(img_cv, -1, kernel_sharpening)
                print("  ✅ Sharpening completed")
                preprocessing_info['applied'].append('Sharpening')

            # Convert back to PIL RGB
            img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
            processed_image = Image.fromarray(img_rgb)

            preprocessing_info['techniques_count'] = len(preprocessing_info['applied'])

            return processed_image, preprocessing_info

        except Exception as e:
            print(f"Error during preprocessing: {e}")
            import traceback
            traceback.print_exc()
            preprocessing_info['applied'].append(f'Error during preprocessing: {str(e)}')
            return image, preprocessing_info

    def draw_detections(self, image: Image.Image, detections, class_names) -> Tuple[Image.Image, int]:
        """Draw bounding boxes on image and return annotated image and detection count."""
        draw = ImageDraw.Draw(image)
        width, height = image.size

        try:
            font = ImageFont.truetype("arial.ttf", size=max(14, width // 100))
        except IOError:
            font = ImageFont.load_default()

        # Color mapping: signature=red, stamp=green, qr_code=blue
        colors = {
            0: (255, 0, 0),    # Red for signature
            1: (0, 255, 0),    # Green for stamp
            2: (0, 0, 255),    # Blue for qr_code
        }

        total_detections = 0

        for det in detections:
            boxes = det.boxes
            if boxes is None or len(boxes) == 0:
                continue

            for i in range(len(boxes)):
                xyxy = boxes.xyxy[i].cpu().numpy().tolist()
                cls_id = int(boxes.cls[i].cpu().numpy())
                conf = float(boxes.conf[i].cpu().numpy())
                label = class_names.get(cls_id, f"class_{cls_id}")
                color = colors.get(cls_id, (255, 255, 0))  # Default yellow

                x1, y1, x2, y2 = xyxy

                # Ensure coordinates are within image bounds
                x1 = max(0, min(x1, width))
                y1 = max(0, min(y1, height))
                x2 = max(0, min(x2, width))
                y2 = max(0, min(y2, height))

                # Draw bounding box with thicker line
                draw.rectangle([x1, y1, x2, y2], outline=color, width=6)

                # Draw label background and text
                text = f"{label} {conf:.2f}"
                text_size = draw.textbbox((0, 0), text, font=font)
                text_width = text_size[2] - text_size[0]
                text_height = text_size[3] - text_size[1]

                # Ensure label doesn't go off screen
                label_y = max(text_height + 4, y1 - text_height - 4)
                text_bg = [x1, label_y - text_height - 4, x1 + text_width + 8, label_y]
                draw.rectangle(text_bg, fill=color)
                draw.text((x1 + 4, label_y - text_height - 2), text, fill="white", font=font)

                total_detections += 1

        return image, total_detections

    def pil_to_pdf_page(self, image: Image.Image, target_doc: fitz.Document):
        """Insert the PIL image as a new page in the target PDF document."""
        img_bytes = BytesIO()
        image.save(img_bytes, format="PNG")
        img_bytes.seek(0)

        page = target_doc.new_page(width=image.width, height=image.height)
        page.insert_image(page.rect, stream=img_bytes.read())

    def _extract_bottom_right_corner(self, image: Image.Image, corner_size: float = 0.10) -> Tuple[Image.Image, Tuple[int, int]]:
        """
        Extract bottom-right corner of the image.
        Returns (corner_image, (x_offset, y_offset)) tuple.
        
        Args:
            image: PIL Image
            corner_size: Fraction of image size to use for corner (default 0.10 = 10%)
        """
        width, height = image.size
        corner_width = int(width * corner_size)
        corner_height = int(height * corner_size)
        
        # Calculate bottom-right corner coordinates
        x_offset = width - corner_width
        y_offset = height - corner_height
        
        # Crop bottom-right corner
        corner_image = image.crop((x_offset, y_offset, width, height))
        
        return corner_image, (x_offset, y_offset)

    def _adjust_detection_coordinates(self, results, x_offset: int, y_offset: int):
        """Adjust detection coordinates by adding offsets."""
        if results[0].boxes is None or len(results[0].boxes) == 0:
            return results

        # Clone the data tensor to avoid inplace update error outside InferenceMode
        # data format: [x1, y1, x2, y2, conf, cls] or [x1, y1, x2, y2, track_id, conf, cls]
        data = results[0].boxes.data.clone()
        
        # Adjust bounding box coordinates (first 4 columns)
        data[:, 0] += x_offset  # x1
        data[:, 1] += y_offset  # y1
        data[:, 2] += x_offset  # x2
        data[:, 3] += y_offset  # y2
        
        # Create new Boxes object with adjusted coordinates
        orig_shape = results[0].orig_shape
        new_boxes = Boxes(data, orig_shape)
        
        results[0].boxes = new_boxes

        return results

    def _filter_detections_by_class(self, results, allowed_classes: List[int]):
        """Filter YOLO results to only include specific classes."""
        if results[0].boxes is None or len(results[0].boxes) == 0:
            return results

        # Get class IDs
        classes = results[0].boxes.cls.cpu().numpy()

        # Create mask for allowed classes
        mask = np.isin(classes, allowed_classes)

        # Filter boxes
        if mask.sum() == 0:
            # No boxes match the filter, return empty result
            results[0].boxes = None
        else:
            # Filter all box attributes by creating new Boxes object
            # Use data tensor directly to preserve format (6 or 7 columns)
            mask_tensor = torch.tensor(mask, device=results[0].boxes.data.device, dtype=torch.bool)
            filtered_data = results[0].boxes.data[mask_tensor]
            
            # Create new Boxes object with filtered data
            orig_shape = results[0].orig_shape
            new_boxes = Boxes(filtered_data, orig_shape)
            
            results[0].boxes = new_boxes

        return results

    def _merge_detections(self, results1, results2):
        """Merge two detection results."""
        # If either is empty, return the other
        if results1[0].boxes is None or len(results1[0].boxes) == 0:
            return results2
        if results2[0].boxes is None or len(results2[0].boxes) == 0:
            return results1

        # Merge data tensors directly to preserve format (6 or 7 columns)
        # data format: [x1, y1, x2, y2, conf, cls] or [x1, y1, x2, y2, track_id, conf, cls]
        merged_data = torch.cat([results1[0].boxes.data, results2[0].boxes.data], dim=0)

        # Create new Boxes object with merged data
        orig_shape = results1[0].orig_shape
        new_boxes = Boxes(merged_data, orig_shape)
        
        results1[0].boxes = new_boxes

        return results1

    def _detect_on_bottom_right_corner(
        self,
        image: Image.Image,
        conf_threshold: float,
        iou_threshold: float,
        max_detections: int,
        corner_size: float = 0.10
    ):
        """
        Run QR code detection on bottom-right corner of the image.
        Returns results with coordinates adjusted to full image space.
        """
        print(f"  🔲 Extracting bottom-right corner for QR detection...")
        corner_image, (x_offset, y_offset) = self._extract_bottom_right_corner(image, corner_size)
        print(f"  📐 Corner size: {corner_image.size}, offset: ({x_offset}, {y_offset})")

        # Run detection on corner (only QR codes - class 2)
        print(f"  🤖 Detecting QR codes in bottom-right corner...")
        corner_results = self.model.predict(
            corner_image,
            conf=conf_threshold,
            iou=iou_threshold,
            max_det=max_detections,
            verbose=False
        )

        # Filter for QR codes (2) only
        corner_results = self._filter_detections_by_class(corner_results, [2])

        # Adjust coordinates to full image space
        if corner_results[0].boxes is not None and len(corner_results[0].boxes) > 0:
            corner_results = self._adjust_detection_coordinates(corner_results, x_offset, y_offset)
            print(f"  ✅ Found {len(corner_results[0].boxes)} QR code(s) in corner")
        else:
            print(f"  ℹ️  No QR codes found in corner")

        return corner_results

    def process_pdf(
        self,
        pdf_bytes: bytes,
        output_path: Path,
        pdf_filename: str = "document.pdf",
        conf_threshold: float = 0.5,
        iou_threshold: float = 0.45,
        max_detections: int = 100,
        use_clahe: bool = False,
        use_denoise: bool = False,
        use_threshold: bool = False,
        preprocessing_viz_path: Path = None
    ) -> Dict:
        """
        Process a PDF and return statistics.

        If denoising or thresholding is enabled:
        - First pass: detect all objects (signatures, stamps, QR codes) on original image
        - Second pass: detect QR codes in bottom-right corner on preprocessed image (with denoising/thresholding)
        - Merge results from both passes

        Returns:
            dict with processing statistics
        """
        # Open source PDF from bytes
        source_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        output_doc = fitz.open()

        total_pages = len(source_doc)
        total_detections = 0
        detections_per_class = {}
        page_stats = []
        preprocessing_applied = []
        
        # Structure for annotations output (matching selected_annotations.json format)
        annotations_output = {}
        annotation_counter = 1  # Global counter for annotation IDs

        # Check if we need two-pass detection for QR codes
        two_pass_mode = use_denoise or use_threshold

        # Create visualization document if preprocessing is used
        preprocessing_viz_doc = None
        if (use_clahe or use_denoise or use_threshold) and preprocessing_viz_path:
            preprocessing_viz_doc = fitz.open()

        for page_number in range(total_pages):
            print(f"📄 Processing page {page_number + 1}/{total_pages}...")
            page = source_doc[page_number]
            # Get original page size (before scaling)
            original_page_rect = page.rect
            original_page_width = original_page_rect.width
            original_page_height = original_page_rect.height
            
            original_image = self.page_to_pil(page, scale=2.0)

            # TWO-PASS MODE: Detect all objects first, then QR codes in corner with preprocessing
            if two_pass_mode:
                print(f"  🔄 Two-pass detection mode activated")

                # PASS 1: Detect all objects (signatures, stamps, QR codes) on ORIGINAL image
                print(f"  🤖 Pass 1: Detecting all objects (signatures, stamps, QR codes)...")
                results_pass1 = self.model.predict(
                    original_image,
                    conf=conf_threshold,
                    iou=iou_threshold,
                    max_det=max_detections,
                    verbose=False
                )
                print(f"  ✅ Pass 1 completed")

                # PASS 2: Detect QR codes in bottom-right corner on PREPROCESSED image
                print(f"  ✨ Applying preprocessing for QR code detection...")
                processed_image, preprocess_info = self.preprocess_image(
                    original_image,
                    use_clahe=use_clahe,
                    use_denoise=use_denoise,
                    use_threshold=use_threshold
                )

                # Save preprocessing info
                if page_number == 0:
                    preprocessing_applied = preprocess_info['applied']

                # Create visualization comparison (original vs processed)
                if preprocessing_viz_doc is not None:
                    self._create_preprocessing_comparison(
                        original_image,
                        processed_image,
                        preprocess_info,
                        preprocessing_viz_doc,
                        page_number + 1
                    )

                print(f"  🤖 Pass 2: Detecting QR codes in bottom-right corner...")
                results_pass2 = self._detect_on_bottom_right_corner(
                    processed_image,
                    conf_threshold,
                    iou_threshold,
                    max_detections
                )
                print(f"  ✅ Pass 2 completed")

                # Merge results from both passes
                print(f"  🔀 Merging detections from both passes...")
                results = self._merge_detections(results_pass1, results_pass2)
                print(f"  ✅ Merge completed")

            # SINGLE-PASS MODE: Standard detection (with or without CLAHE only)
            else:
                # Apply preprocessing if requested (CLAHE only in this case)
                if use_clahe:
                    print(f"  ✨ Applying preprocessing...")
                    processed_image, preprocess_info = self.preprocess_image(
                        original_image,
                        use_clahe=use_clahe,
                        use_denoise=False,
                        use_threshold=False
                    )

                    # Save preprocessing info
                    if page_number == 0:
                        preprocessing_applied = preprocess_info['applied']

                    # Create visualization comparison (original vs processed)
                    if preprocessing_viz_doc is not None:
                        self._create_preprocessing_comparison(
                            original_image,
                            processed_image,
                            preprocess_info,
                            preprocessing_viz_doc,
                            page_number + 1
                        )

                    image_to_detect = processed_image
                else:
                    image_to_detect = original_image

                # Run YOLO prediction
                print(f"  🤖 Running YOLO detection...")
                results = self.model.predict(
                    image_to_detect,
                    conf=conf_threshold,
                    iou=iou_threshold,
                    max_det=max_detections,
                    verbose=False
                )
                print(f"  ✅ Detection completed")

            # Count detections and build annotations structure
            page_detections = 0
            page_classes = {}
            page_annotations = []
            
            # Scale factor used for image conversion
            scale_factor = 2.0

            if results[0].boxes is not None:
                boxes = results[0].boxes
                page_detections = len(boxes)
                classes = boxes.cls.cpu().numpy()
                confidences = boxes.conf.cpu().numpy()
                xyxy_coords = boxes.xyxy.cpu().numpy()

                # Category mapping: 0 -> signature, 1 -> stamp, 2 -> qr
                category_map = {0: "signature", 1: "stamp", 2: "qr"}

                for i in range(page_detections):
                    cls_id = int(classes[i])
                    cls_name = self.class_names.get(cls_id, f"class_{cls_id}")
                    category = category_map.get(cls_id, f"class_{cls_id}")
                    
                    # Convert from xyxy (x1, y1, x2, y2) to (x, y, width, height)
                    # Scale coordinates back to original PDF size (divide by scale_factor)
                    x1, y1, x2, y2 = xyxy_coords[i]
                    x = float(x1) / scale_factor
                    y = float(y1) / scale_factor
                    width = float(x2 - x1) / scale_factor
                    height = float(y2 - y1) / scale_factor
                    area = width * height
                    
                    # Create annotation ID
                    annotation_id = f"annotation_{annotation_counter}"
                    annotation_counter += 1
                    
                    # Create annotation object
                    annotation_obj = {
                        annotation_id: {
                            "category": category,
                            "bbox": {
                                "x": round(x, 2),
                                "y": round(y, 2),
                                "width": round(width, 2),
                                "height": round(height, 2)
                            },
                            "area": round(area, 3)
                        }
                    }
                    page_annotations.append(annotation_obj)
                    
                    page_classes[cls_name] = page_classes.get(cls_name, 0) + 1
                    detections_per_class[cls_name] = detections_per_class.get(cls_name, 0) + 1

            # Store page annotations in output structure
            # Use original PDF page size (not scaled image size)
            page_key = f"page_{page_number + 1}"
            annotations_output[page_key] = {
                "annotations": page_annotations,
                "page_size": {
                    "width": int(original_page_width),
                    "height": int(original_page_height)
                }
            }

            # Draw detections on ORIGINAL image (not processed) for better visualization
            annotated_image, _ = self.draw_detections(original_image, results, self.class_names)
            self.pil_to_pdf_page(annotated_image, output_doc)

            total_detections += page_detections
            page_stats.append({
                'page': page_number + 1,
                'detections': page_detections,
                'classes': page_classes
            })

        # Save output PDF
        output_doc.save(output_path)
        output_doc.close()
        source_doc.close()

        # Save preprocessing visualization
        if preprocessing_viz_doc is not None:
            preprocessing_viz_doc.save(preprocessing_viz_path)
            preprocessing_viz_doc.close()

        # Build final output structure matching selected_annotations.json format
        final_output = {
            pdf_filename: annotations_output
        }
        
        # Also include metadata for backward compatibility
        return {
            'annotations': final_output,  # Main output in selected_annotations.json format
            'total_pages': total_pages,
            'total_detections': total_detections,
            'detections_per_class': detections_per_class,
            'page_stats': page_stats,
            'model_classes': self.class_names,
            'preprocessing': {
                'enabled': use_clahe or use_denoise or use_threshold,
                'two_pass_mode': two_pass_mode,
                'techniques': preprocessing_applied
            },
            'thresholds': {
                'confidence': conf_threshold,
                'iou': iou_threshold,
                'max_detections': max_detections
            }
        }

    def _create_preprocessing_comparison(
        self,
        original: Image.Image,
        processed: Image.Image,
        info: Dict,
        target_doc: fitz.Document,
        page_num: int
    ):
        """Create a side-by-side comparison of original and preprocessed images."""
        from PIL import ImageDraw, ImageFont

        # Calculate dimensions
        width = original.width
        height = original.height

        # Create new image with double width for side-by-side
        comparison = Image.new('RGB', (width * 2 + 60, height + 100), 'white')

        # Paste images
        comparison.paste(original, (30, 80))
        comparison.paste(processed, (width + 30, 80))

        # Draw labels
        draw = ImageDraw.Draw(comparison)
        try:
            title_font = ImageFont.truetype("arial.ttf", 30)
            label_font = ImageFont.truetype("arial.ttf", 20)
        except IOError:
            title_font = ImageFont.load_default()
            label_font = ImageFont.load_default()

        # Title
        title = f"Page {page_num} - Preprocessing Comparison"
        draw.text((30, 20), title, fill='black', font=title_font)

        # Labels
        draw.text((30, 50), "ORIGINAL", fill='blue', font=label_font)
        draw.text((width + 30, 50), "PROCESSED", fill='green', font=label_font)

        # Applied techniques
        techniques_text = "Applied: " + ", ".join(info['applied'])
        draw.text((30, height + 85), techniques_text, fill='red', font=label_font)

        # Add to document
        self.pil_to_pdf_page(comparison, target_doc)
