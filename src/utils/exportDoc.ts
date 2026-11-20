import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { buildExportFilename } from './calculations';

async function captureSheetCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  // Ensure web fonts have loaded before rasterizing
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  return html2canvas(element, {
    scale: 2.5,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: 1024,
    onclone: (_doc, clonedEl) => {
      clonedEl.style.width = '780px';
      clonedEl.style.maxWidth = '780px';
      clonedEl.style.borderRadius = '0px';
      clonedEl.style.boxShadow = 'none';
    },
  });
}

/**
 * Exports the invoice/quote sheet element to a crisp high-resolution PNG image.
 */
export async function exportSheetToPng(
  element: HTMLElement,
  folio: string,
  clientName: string,
): Promise<string> {
  const canvas = await captureSheetCanvas(element);
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const filename = buildExportFilename(folio, clientName, 'png');

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return filename;
}

/**
 * Exports the invoice/quote sheet element to a clean A4 portrait PDF document.
 */
export async function exportSheetToPdf(
  element: HTMLElement,
  folio: string,
  clientName: string,
): Promise<string> {
  const canvas = await captureSheetCanvas(element);
  const imgData = canvas.toDataURL('image/png', 1.0);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  const imgRatio = canvas.height / canvas.width;
  let renderWidth = usableWidth;
  let renderHeight = renderWidth * imgRatio;

  if (renderHeight <= usableHeight) {
    pdf.addImage(imgData, 'PNG', margin, margin, renderWidth, renderHeight, undefined, 'FAST');
  } else {
    // Multi-page vertical pagination for long itemized quotes
    let heightLeft = renderHeight;
    let positionY = margin;
    pdf.addImage(imgData, 'PNG', margin, positionY, renderWidth, renderHeight, undefined, 'FAST');
    heightLeft -= usableHeight;

    while (heightLeft > 1) {
      pdf.addPage();
      positionY = margin - (renderHeight - heightLeft);
      pdf.addImage(imgData, 'PNG', margin, positionY, renderWidth, renderHeight, undefined, 'FAST');
      heightLeft -= usableHeight;
    }
  }

  const filename = buildExportFilename(folio, clientName, 'pdf');
  pdf.save(filename);
  return filename;
}
