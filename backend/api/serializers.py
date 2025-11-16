from rest_framework import serializers


class PDFProcessSerializer(serializers.Serializer):
    pdf_file = serializers.FileField(required=True)
    confidence_threshold = serializers.FloatField(default=0.20, min_value=0.0, max_value=1.0)
    iou_threshold = serializers.FloatField(default=0.30, min_value=0.0, max_value=1.0)
    max_detections = serializers.IntegerField(default=100, min_value=1, max_value=1000)

    # Preprocessing options
    use_clahe = serializers.BooleanField(default=False, required=False)
    use_denoise = serializers.BooleanField(default=False, required=False)
    use_threshold = serializers.BooleanField(default=False, required=False)

    def validate_pdf_file(self, value):
        if not value.name.endswith('.pdf'):
            raise serializers.ValidationError("Only PDF files are allowed.")
        if value.size > 50 * 1024 * 1024:  # 50MB limit
            raise serializers.ValidationError("File size must be under 50MB.")
        return value
