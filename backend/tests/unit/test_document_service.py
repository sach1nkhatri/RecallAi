"""Unit tests for Document Service"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
from src.application.services.document_service import DocumentService
from src.domain.models import DocumentGeneration


class TestDocumentService:
    """Test DocumentService class"""
    
    @pytest.fixture
    def document_service(self):
        """Create DocumentService instance with mocked dependencies"""
        mock_llm = Mock()
        mock_pdf = Mock()
        service = DocumentService(mock_llm, mock_pdf)
        return service
    
    def test_generate_document_from_files(self, document_service):
        """Test generating documentation from files"""
        raw_content = 'def hello(): pass\ndef world(): pass'
        
        document_service.llm_client.generate_documentation.return_value = '# Test Documentation'
        document_service.pdf_generator.generate_from_markdown.return_value = None
        
        generation = DocumentGeneration(
            raw_content=raw_content,
            content_type='code',
            file_count=2
        )
        
        result = document_service.generate_document(generation)
        
        assert result.markdown_content is not None
        assert result.markdown_content == '# Test Documentation'
        document_service.llm_client.generate_documentation.assert_called_once()
    
    def test_handles_empty_files(self, document_service):
        """Test handling empty file contents"""
        generation = DocumentGeneration(
            raw_content='',
            content_type='code',
            file_count=0
        )
        
        # Should raise ValidationError for empty content
        with pytest.raises(ValueError):
            document_service.generate_document(generation)

