// components/PdfExportButton.tsx
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function PdfExportButton() {
  const handleExport = async () => {
    const input = document.getElementById("result-summary");
    if (!input) return;

    const canvas = await html2canvas(input);
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const width = 210;
    const height = (canvas.height * width) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save("診断結果.pdf");
  };

  return (
    <button
      onClick={handleExport}
      className="bg-blue-700 text-white px-4 py-2 rounded"
    >
      結果をPDFで保存
    </button>
  );
}

