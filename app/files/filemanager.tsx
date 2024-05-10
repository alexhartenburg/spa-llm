import React from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/supabase/functions/_lib/database';
import { Input } from '@/components/ui/input';
import { FileCard } from './filecard';
import { toast } from '@/components/ui/use-toast';
import { InputLabel, MenuItem } from "@mui/material";
import Select, { SelectChangeEvent } from '@mui/material/Select';
import submitPdf from "./submitpdf";

type Props = {
    documents: any[] | undefined;
    refetchDocuments: Function;
    contextBuckets: string[];
    selectedDoc: any;
    selectDoc: Function;
    selectedContext: any;
    setSelectedContext: Function;
    setText: Function;
}

export const FileManager: React.FC<Props> = ({documents, refetchDocuments, contextBuckets, selectedDoc, selectDoc, selectedContext, setSelectedContext, setText}) => {
    const supabase = createClientComponentClient<Database>();

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
                const fileUploadStatus = await submitPdf(selectedFile)
                console.log(fileUploadStatus)
                refetchDocuments()
            }
        }
        refetchDocuments()
        e.target.value = '';
    }
    const testClick = async () => {
        const response = await supabase.functions.invoke('parse-pdf',{
            body: {path: '58a24035-790e-4e3c-8f77-0a8f32878dc0/PO-CEO-16 (07) Paid Time Off Policy 01-2023.pdf'}
        })
        setText(response.data.text)
    }
    const testClickClear = () => {
        setText([])
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
            <div style={{width: "100%", display: "flex", justifyContent: "space-between"}}>
                <button onClick={testClick}>Test</button>
                <button onClick={testClickClear}>Clear</button>
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