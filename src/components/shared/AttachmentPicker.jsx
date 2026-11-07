import { useRef } from "react";
import { FileArchive, FileImage, FileSpreadsheet, FileText, Trash2, Upload } from "lucide-react";
import { formatFileSize } from "../../utils/format";
export function AttachmentPicker({ file, onChange, disabled = false }) {
  const inputRef = useRef(null);
  const remove = () => {
    if (inputRef.current) inputRef.current.value = "";
    onChange(null);
  };
  return (
    <div className="span-two attachment-picker">
      <label
        className={`file-drop ${file ? "has-file" : ""} ${disabled ? "disabled" : ""}`}
      >
        {!file && <Upload className="file-upload-icon" />}
        <span>
          <strong>{file?.name || "Adicionar documento anexo"}</strong>
          <small>
            {file
              ? `${formatFileSize(file.size)} · ${getAttachmentType(file).label}`
              : "PDF, DOCX, XLSX, JPEG ou PNG · até 10 MB"}
          </small>
        </span>
        {file && <span className={`file-type-icon ${getAttachmentType(file).className}`} aria-label={`Tipo de arquivo: ${getAttachmentType(file).label}`}>
          {getAttachmentType(file).icon}
        </span>}
        <input
          ref={inputRef}
          type="file"
          disabled={disabled}
          accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
          onChange={(event) => onChange(event.target.files?.[0] || null)}
        />
      </label>
      {file && (
        <button
          type="button"
          className="selected-file-remove"
          disabled={disabled}
          onClick={remove}
        >
          <Trash2 />
          Remover anexo selecionado
        </button>
      )}
    </div>
  );
}

function getAttachmentType(file) {
  const name = file?.name?.toLowerCase() || "";
  const mime = file?.type?.toLowerCase() || "";
  if (mime.includes("pdf") || name.endsWith(".pdf")) return { label: "PDF", className: "file-type-pdf", icon: <FileText /> };
  if (mime.includes("spreadsheet") || mime.includes("excel") || /\.(xlsx?|csv)$/.test(name)) return { label: "Planilha Excel", className: "file-type-spreadsheet", icon: <FileSpreadsheet /> };
  if (mime.includes("word") || mime.includes("document") || /\.(docx?|odt)$/.test(name)) return { label: "Documento", className: "file-type-document", icon: <FileText /> };
  if (mime.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/.test(name)) return { label: "Imagem", className: "file-type-image", icon: <FileImage /> };
  return { label: "Arquivo", className: "file-type-file", icon: <FileArchive /> };
}

