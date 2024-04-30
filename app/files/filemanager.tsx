import React, { useState } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/supabase/functions/_lib/database';
import { Input } from '@/components/ui/input';
import { FileCard } from './filecard';
import { toast } from '@/components/ui/use-toast';
import { InputLabel, MenuItem } from "@mui/material";
import Select, { SelectChangeEvent } from '@mui/material/Select';

type Props = {
    documents: any[] | undefined;
    refetchDocuments: Function;
    contextBuckets: string[];
}

export const FileManager: React.FC<Props> = ({documents, refetchDocuments, contextBuckets}) => {
    const supabase = createClientComponentClient<Database>();

    const [selectedContext, setSelectedContext] = useState("My Files")

    const handleContextChange = (event: SelectChangeEvent) => {
        setSelectedContext(event.target.value as string);
      };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const { error } = await supabase.storage
            .from('original_files')
            .upload(
                `${crypto.randomUUID()}/${selectedFile.name}`,
                selectedFile
            );
            if (error) {
            toast({
                variant: 'destructive',
                description:
                'There was an error uploading the file. Please try again.',
            });
            return;
            }
            refetchDocuments()
        }
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
                {documents.map((document, i) => (
                <FileCard document={document} refetchDocuments={refetchDocuments} key={i} />
                ))}
            </div>
            )}
        </div>
    )
}