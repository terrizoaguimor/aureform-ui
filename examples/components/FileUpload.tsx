"use client";

import { useState } from "react";
import { FileUpload, type UploadLabels } from "@/components/ui/file-upload";

const uploadLabels: UploadLabels = {
  title: "Add project files",
  description: "Drop PNG, JPEG or PDF files here. Maximum 10 MB per file.",
  browse: "Browse project files",
  remove: "Remove file",
  tooLarge: "File exceeds the 10 MB limit.",
  invalidType: "Choose a PNG, JPEG or PDF file.",
};

export default function FileUploadExample() {
  const [files, setFiles] = useState<File[]>([]);

  return (
    <div className="grid max-w-xl gap-3">
      <FileUpload
        files={files}
        onFilesChange={setFiles}
        accept="image/png,image/jpeg,application/pdf"
        maxBytes={10 * 1024 * 1024}
        labels={uploadLabels}
      />
      <p className="text-xs text-muted-foreground">
        {files.length} files selected locally. Nothing is uploaded.
      </p>
    </div>
  );
}
