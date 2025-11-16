from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from pathlib import Path
import os
import uuid
from .serializers import PDFProcessSerializer
from .pdf_processor import PDFProcessor


class ProcessPDFView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.processor = None

    def get_processor(self):
        """Lazy load the processor to avoid loading model on import."""
        if self.processor is None:
            model_path = settings.MODEL_PATH
            self.processor = PDFProcessor(model_path)
        return self.processor

    def post(self, request, *args, **kwargs):
        print("\n" + "="*80)
        print("🚀 PDF PROCESSING REQUEST RECEIVED")
        print("="*80)

        serializer = PDFProcessSerializer(data=request.data)

        if not serializer.is_valid():
            print("❌ Validation failed:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        pdf_file = serializer.validated_data['pdf_file']
        conf_threshold = serializer.validated_data.get('confidence_threshold', 0.20)
        iou_threshold = serializer.validated_data.get('iou_threshold', 0.30)
        max_detections = serializer.validated_data.get('max_detections', 100)

        # Preprocessing options
        use_clahe = serializer.validated_data.get('use_clahe', False)
        use_denoise = serializer.validated_data.get('use_denoise', False)
        use_threshold = serializer.validated_data.get('use_threshold', False)

        print(f"📄 File: {pdf_file.name}, Size: {pdf_file.size} bytes")
        print(f"⚙️  Thresholds: conf={conf_threshold}, iou={iou_threshold}, max_det={max_detections}")
        print(f"✨ Preprocessing: CLAHE={use_clahe}, Denoise={use_denoise}, Threshold={use_threshold}")

        try:
            # Generate unique filenames
            unique_id = uuid.uuid4().hex
            input_filename = f"input_{unique_id}.pdf"
            output_filename = f"output_{unique_id}.pdf"
            preprocessing_viz_filename = f"preprocessing_{unique_id}.pdf"

            # Save input file
            input_path = default_storage.save(
                f"uploads/{input_filename}",
                ContentFile(pdf_file.read())
            )
            input_full_path = Path(settings.MEDIA_ROOT) / input_path

            # Process PDF
            output_full_path = Path(settings.MEDIA_ROOT) / "outputs" / output_filename
            output_full_path.parent.mkdir(parents=True, exist_ok=True)

            # Preprocessing visualization path
            preprocessing_viz_path = None
            if use_clahe or use_denoise or use_threshold:
                preprocessing_viz_path = Path(settings.MEDIA_ROOT) / "outputs" / preprocessing_viz_filename

            # Read input PDF bytes
            with open(input_full_path, 'rb') as f:
                pdf_bytes = f.read()

            # Get processor and process PDF
            print("🔄 Loading YOLO model...")
            processor = self.get_processor()
            print("✅ Model loaded successfully")

            print("🔄 Processing PDF...")
            report = processor.process_pdf(
                pdf_bytes,
                output_full_path,
                pdf_filename=pdf_file.name,
                conf_threshold=conf_threshold,
                iou_threshold=iou_threshold,
                max_detections=max_detections,
                use_clahe=use_clahe,
                use_denoise=use_denoise,
                use_threshold=use_threshold,
                preprocessing_viz_path=preprocessing_viz_path
            )
            print("✅ PDF processed successfully")

            # Generate URLs for files
            input_url = request.build_absolute_uri(
                settings.MEDIA_URL + input_path.replace('\\', '/')
            )
            output_url = request.build_absolute_uri(
                settings.MEDIA_URL + f"outputs/{output_filename}"
            )

            response_data = {
                'success': True,
                'input_pdf_url': input_url,
                'output_pdf_url': output_url,
                'report': report
            }

            # Add preprocessing visualization URL if available
            if preprocessing_viz_path and preprocessing_viz_path.exists():
                preprocessing_viz_url = request.build_absolute_uri(
                    settings.MEDIA_URL + f"outputs/{preprocessing_viz_filename}"
                )
                response_data['preprocessing_viz_url'] = preprocessing_viz_url

            print("✅ Returning response to client")
            print(f"📊 Total detections: {report.get('total_detections', 0)}")
            print("="*80 + "\n")

            return Response(response_data, status=status.HTTP_200_OK)

        except FileNotFoundError as e:
            print(f"❌ Model file not found: {str(e)}")
            print("="*80 + "\n")
            return Response(
                {'error': f'Model file not found: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            print(f"❌ Error processing PDF: {str(e)}")
            import traceback
            traceback.print_exc()
            print("="*80 + "\n")
            return Response(
                {'error': f'Error processing PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
