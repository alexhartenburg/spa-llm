
interface FileValidation {
    isValid: boolean;
    message: string;
}
interface FileUploadStatus {
    isUploaded: boolean;
    fileValidation: FileValidation;
    message: string;
}

const uploadPdf = async (file: File): Promise<FileUploadStatus> => {
    let uploadStatus ={
        isUploaded: true,
        fileValidation: {
            isValid: true,
            message: '',
        },
        message: '',
    }
    return uploadStatus;
}

const validatePdfUpload = async (file: File): Promise<FileValidation> => {
    let fileValidation ={
        isValid: true,
        message: '',
    }
    return fileValidation;
}

export default uploadPdf;