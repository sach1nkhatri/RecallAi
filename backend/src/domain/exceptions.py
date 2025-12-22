"""Domain exceptions"""


class DomainException(Exception):
    """Base exception for domain layer"""
    pass


class ValidationError(DomainException):
    """Raised when validation fails"""
    pass


class FileProcessingError(DomainException):
    """Raised when file processing fails"""
    pass

