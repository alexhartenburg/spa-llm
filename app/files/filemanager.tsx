import React from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/supabase/functions/_lib/database';
import { Input } from '@/components/ui/input';
import { FileCard } from './filecard';
import { toast } from '@/components/ui/use-toast';
import { InputLabel, MenuItem } from "@mui/material";
import Select, { SelectChangeEvent } from '@mui/material/Select';
import hashFile from './hashfile';

type Props = {
    documents: any[] | undefined;
    refetchDocuments: Function;
    contextBuckets: string[];
    selectedDoc: any;
    selectDoc: Function;
    selectedContext: any;
    setSelectedContext: Function;
}

export const FileManager: React.FC<Props> = ({documents, refetchDocuments, contextBuckets, selectedDoc, selectDoc, selectedContext, setSelectedContext}) => {
    const supabase = createClientComponentClient<Database>();

    const standardizePdfFilename = (filename: string): string => {
        const sanitizedFilename = filename.split('.pdf')[0].split('.PDF')[0].split('.Pdf')[0].split('.pDf')[0].split('.pdF')[0].split('.pDF')[0].split('.PdF')[0].split('.PDf')[0]
        return `${sanitizedFilename}.pdf`
    }

    const handleContextChange = (event: SelectChangeEvent) => {
        setSelectedContext(event.target.value as string);
        if(selectedDoc.id === null){
        }else if(selectedDoc.context_buckets === null && event.target.value !== "No Bucket"){
            selectDoc({id: null, context_buckets:null})
        }else if(!selectedDoc.context_buckets.includes(event.target.value)){
            selectDoc({id: null, context_buckets:null})
        }
      };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if(selectedFile.type !== "application/pdf"){
                e.target.value = ''; 
                toast({
                    variant: 'destructive',
                    description:
                    'That selected file type is unsupported. Please select a PDF file.',
                });
            }else{
                const selectedFilename = standardizePdfFilename(selectedFile.name)
                const hash = await hashFile(selectedFile)
                const { data: fetchHashData, error: fetchHashError} = await supabase
                    .from('documents')
                    .select()
                    .eq('original_file_hash', hash)
                if (fetchHashError) {
                    toast({
                    variant: 'destructive',
                    description: 'Failed to query documents for this hash.',
                    });
                }
                const { data: fetchFilenameData, error: fetchFilenameError} = await supabase
                    .from('documents')
                    .select()
                    .eq('name', selectedFilename)
                if (fetchFilenameError) {
                    toast({
                    variant: 'destructive',
                    description: 'Failed to query documents for this filename.',
                    });
                }
                if(!fetchHashData || !fetchFilenameData){
                    console.error("No data returned from the query.")
                }else if(fetchHashData.length > 0){
                    console.error("A document with this hash already exists in the database.", hash)
                    toast({
                        variant: 'destructive',
                        description: 'This document already exists on the platform.',
                    });
                }else if(fetchFilenameData.length > 0){
                    console.error("A document with this name already exists in the database.", hash)
                    toast({
                        variant: 'destructive',
                        description: 'A document with this name already exists on the platform.',
                    });
                }else{
                    const { error: uploadFileError} = await supabase.storage
                        .from('original_files')
                        .upload(
                            `${crypto.randomUUID()}/${selectedFilename}`,
                            selectedFile
                        );
                    if (uploadFileError) {
                        toast({
                            variant: 'destructive',
                            description:
                            'There was an error uploading the file. Please try again.',
                        });
                        return;
                    }
                    else{
                        const { data: dataNewFile, error: errorNewFile} = await supabase
                            .from('documents')
                            .select('id')
                            .eq('name', selectedFilename)
                        if (errorNewFile) {
                            toast({
                            variant: 'destructive',
                            description: 'Failed to find the docement entry related to the uploaded PDF file.',
                            });
                        }
                        if(!dataNewFile){
                            console.error('No data returned from the query. Document entry does not exist for uploaded PDF')
                        }else if(dataNewFile.length > 1){
                            console.error('Multiple documents were returned from the query.')
                        }else if(dataNewFile.length === 0) {
                            console.error('No documents were returned from the query.')
                        }else{
                            const { error: errorUpdateHash } = await supabase
                                .from('documents')
                                .update({original_file_hash: hash})
                                .eq('id', dataNewFile[0].id)
                            refetchDocuments()
                            if (errorUpdateHash) {
                                toast({
                                variant: 'destructive',
                                description: 'Failed to update document context. Please try again.',
                                });
                            }else{
                                refetchDocuments()
                            }
                        }                    
                    }
                }
            }
        }
        refetchDocuments()
        e.target.value = '';
    }
    
    return(
        <div className="max-w-6xl w-1/5 flex flex-col gap-8 grow-0 items-stretch">
            <div className="flex flex-col justify-center items-center border-b">
                <Input
                    type="file"
                    name="file"
                    className="cursor-pointer w-full max-w-xs"
                    onChange={(e) => {
                        handleFileChange(e)
                    }}
                />
            </div>
            <div className="w-full">
                <InputLabel id="context-bucket-label">
                    Context Bucket
                </InputLabel>
                <Select
                    fullWidth
                    labelId="context-bucket-label"
                    value={selectedContext}
                    onChange={handleContextChange}
                >
                    {contextBuckets.map((bucket, i) => <MenuItem value={bucket} key={i}>{bucket}</MenuItem>)}
                </Select>
            </div>
            {documents && (
            <div className="w-full">
                {
                    selectedContext === "No Bucket" ?
                    documents.filter(document=>document.context_buckets.length === 0)
                    .map((document, i) => (
                        <FileCard document={document} refetchDocuments={refetchDocuments} selectedDoc={selectedDoc} selectDoc={selectDoc} key={i} />
                    ))
                    :
                    documents.filter(document=>document.context_buckets.includes(selectedContext))
                    .map((document, i) => (
                        <FileCard document={document} refetchDocuments={refetchDocuments} selectedDoc={selectedDoc} selectDoc={selectDoc} key={i} />
                    ))
                }
            </div>
            )}
        </div>
    )
}