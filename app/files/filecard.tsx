import React from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/supabase/functions/_lib/database';
import { toast } from '@/components/ui/use-toast';
import IconButton from "@mui/material/IconButton";
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

type Props = {
  document: any;
  refetchDocuments: Function;
  selectedDoc: any;
  selectDoc: Function;
}

export const FileCard: React.FC<Props> = ({document, refetchDocuments, selectedDoc, selectDoc}) => {
  const supabase = createClientComponentClient<Database>();

  return(
      <div style={document.name === selectedDoc.name ? {border:"1px solid black", borderRadius:"5px"} : {border: "none"}}>
        <div style={{width: "100%", display: "flex", justifyContent: "space-between"}}>
          <IconButton 
            onClick={async () => {
              if (!document.storage_object_path) {
                toast({
                  variant: 'destructive',
                  description: 'Failed to download file, please try again.',
                });
                return;
              }

              const { data, error } = await supabase.storage
                .from('original_files')
                .createSignedUrl(document.storage_object_path, 60);

              if (error) {
                toast({
                  variant: 'destructive',
                  description: 'Failed to download file. Please try again.',
                });
                return;
              }

              window.location.href = data.signedUrl;
            }}
          >
            <CloudDownloadIcon />
          </IconButton>
          <IconButton 
            onClick={async () => {
              if (!document.storage_object_path) {
                toast({
                  variant: 'destructive',
                  description: 'Failed to delete file, please try again.',
                });
                return;
              }
              if(confirm("Are you sure you want to delete this file?")) {
                const { data, error } = await supabase.storage
                  .from('original_files')
                  .remove([document.storage_object_path])
                if (error) {
                  toast({
                    variant: 'destructive',
                    description: 'Failed to delete file. Please try again.',
                  });
                  return;
                }
                refetchDocuments();
              }else return;
            }}
          >
            <DeleteForeverIcon />
          </IconButton>
        </div>
        <div
          className="flex flex-col gap-2 justify-center items-center border rounded-md p-4 sm:p-6 text-center overflow-hidden cursor-pointer hover:bg-slate-100"
          onClick={() => selectDoc(document)}
        >
          <svg
            width="50px"
            height="50px"
            version="1.1"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="m82 31.199c0.10156-0.60156-0.10156-1.1992-0.60156-1.6992l-24-24c-0.39844-0.39844-1-0.5-1.5977-0.5h-0.19922-31c-3.6016 0-6.6016 3-6.6016 6.6992v76.5c0 3.6992 3 6.6992 6.6016 6.6992h50.801c3.6992 0 6.6016-3 6.6016-6.6992l-0.003906-56.699v-0.30078zm-48-7.1992h10c1.1016 0 2 0.89844 2 2s-0.89844 2-2 2h-10c-1.1016 0-2-0.89844-2-2s0.89844-2 2-2zm32 52h-32c-1.1016 0-2-0.89844-2-2s0.89844-2 2-2h32c1.1016 0 2 0.89844 2 2s-0.89844 2-2 2zm0-16h-32c-1.1016 0-2-0.89844-2-2s0.89844-2 2-2h32c1.1016 0 2 0.89844 2 2s-0.89844 2-2 2zm0-16h-32c-1.1016 0-2-0.89844-2-2s0.89844-2 2-2h32c1.1016 0 2 0.89844 2 2s-0.89844 2-2 2zm-8-15v-17.199l17.199 17.199z" />
          </svg>

          {document.name}
        </div>
      </div>
  )
}