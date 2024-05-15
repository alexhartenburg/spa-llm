import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/supabase/functions/_lib/database';

interface FileValidation {
    isValid: boolean;
    message: string;
}
interface FileHashUpdateStatus {
    isUpdated: boolean;
    message: string;
}
interface FileUploadStatus {
    isUploaded: boolean;
    fileValidation: FileValidation | null;
    fileHashUpdateStatus: FileHashUpdateStatus | null;
    documentId: number | null;
    message: string | null;
}

const submitPdf = async (file: File): Promise<FileUploadStatus> => {
    const supabase = createClientComponentClient<Database>();
    let uploadStatus: FileUploadStatus={
        isUploaded: false,
        fileValidation: null,
        fileHashUpdateStatus: null,
        documentId: null,
        message: null,
    }

    // Validate file by checking for matching filenames and file hashes in the original_files storage bucket
    const formData = new FormData();
    formData.append('file', file);
    const response = await supabase.functions.invoke('hash-file', {
        body: formData
    })
    if(response.error){
        uploadStatus.message = 'File hashing failed.'
        uploadStatus.isUploaded = false
    }else{
        const hash = response.data
        const { data, error } = await supabase.functions.invoke('validate-pdf-upload',{
            body: {fileName: file.name, hash: hash}
        })
        uploadStatus.fileValidation = data
        
        // If the verification succeeded, upload the docuement to the storage bucket
        if(!uploadStatus.fileValidation?.isValid){
            uploadStatus.message = 'File verification failed.'
            uploadStatus.isUploaded = false
        }else{
            uploadStatus = await uploadFile(file, uploadStatus)
            if(uploadStatus.documentId){
                await parsePDF(uploadStatus.documentId)
            }
        }

        // If the upload was successful and returned a valid document id, update the documents table entry with the has of the original file
        if(!uploadStatus.documentId){

        }else{
            uploadStatus.fileHashUpdateStatus = await updateFileHash(uploadStatus.documentId, hash)
        }
    }
    
    return uploadStatus;
}





const uploadFile = async (file: File, uploadStatus: FileUploadStatus): Promise<FileUploadStatus> => {
    const supabase = createClientComponentClient<Database>();
    const selectedFilename = standardizePdfFilename(file.name)
    const fileNameWithPath = `${crypto.randomUUID()}/${selectedFilename}`;
    const { error: uploadFileError} = await supabase.storage
        .from('files')
        .upload(
            fileNameWithPath,
            file
        );
    if (uploadFileError) {
        uploadStatus.message = 'There was an error uploading the file. Please try again.'
        uploadStatus.isUploaded = false
    }else{
        const { data: dataNewFile, error: errorNewFile} = await supabase
            .from('documents')
            .select('id')
            .eq('name', selectedFilename)
        if (errorNewFile) {
            uploadStatus.message = 'Failed to find the docement entry related to the uploaded PDF file.'
            uploadStatus.isUploaded = false
        }
        if(!dataNewFile){
            uploadStatus.message = 'No data returned from the query. Document entry does not exist for uploaded PDF'
            uploadStatus.isUploaded = false
        }else if(dataNewFile.length > 1){
            uploadStatus.message = 'Multiple documents were returned from the query.'
            uploadStatus.isUploaded = false
        }else if(dataNewFile.length === 0) {
            uploadStatus.message = 'No documents were returned from the query.'
            uploadStatus.isUploaded = false
        }else{
            uploadStatus.documentId = dataNewFile[0].id
        }                    
    }
    return uploadStatus
}





const updateFileHash = async (fileId: number, hash: string): Promise<FileHashUpdateStatus> => {
    const supabase = createClientComponentClient<Database>();
    let fileHashUpdateStatus ={
        isUpdated: true,
        message: '',
    }
    const { error: errorUpdateHash } = await supabase
        .from('documents')
        .update({file_hash: hash})
        .eq('id', fileId)
    if (errorUpdateHash) {
        fileHashUpdateStatus.message = 'Failed to update document hash. Please try again.'
        fileHashUpdateStatus.isUpdated = false
    }else{
        fileHashUpdateStatus.message = 'File hash successfully updated.'
    }
    return fileHashUpdateStatus
}

const parsePDF = async (document_id: number): Promise<void> => {
    const supabase = createClientComponentClient<Database>();
    const response = await supabase.functions.invoke('parse-pdf',{
        body: {document_id: document_id}
    })
    // setText(response.data.text)
    const processResponse = await supabase.functions.invoke('process',{
        body: {text: response.data.text, document_id: document_id}
    })
}



const standardizePdfFilename = (filename: string): string => {
    const sanitizedFilename = filename.split('.pdf')[0].split('.PDF')[0].split('.Pdf')[0].split('.pDf')[0].split('.pdF')[0].split('.pDF')[0].split('.PdF')[0].split('.PDf')[0]
    return `${sanitizedFilename}.pdf`
}





export default submitPdf;