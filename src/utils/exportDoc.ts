import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { buildExportFilename } from './calculations';

const MOBILE_EXPORT_WIDTH_PX = 440;
const MOBILE_PDF_WIDTH_MM = 115;
const MOBILE_PDF_MARGIN_MM = 4;
const MOBILE_PDF_MAX_SINGLE_PAGE_HEIGHT_MM = 360;
const MOBILE_PDF_PAGINATED_HEIGHT_MM = 210;

async function captureSheetCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  // Ensure web fonts have loaded before rasterizing
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    // Keep below Tailwind sm (640px) so the slim vertical mobile sheet layout applies,
    // while giving enough viewport room for the 440px sheet without clipping.
    windowWidth: 520,
    onclone: (clonedDoc, clonedEl) => {
      // On desktop, the preview wrapper uses `hidden xl:block` when mobileTab === 'editor'.
      // At windowWidth 520px (< xl), ensure all ancestors remain visible for capture.
      let ancestor = clonedEl.parentElement;
      while (ancestor && ancestor !== clonedDoc.documentElement) {
        const computed = clonedDoc.defaultView?.getComputedStyle(ancestor);
        if (computed?.display === 'none') {
          ancestor.style.display = 'block';
        }
        ancestor = ancestor.parentElement;
      }

      clonedEl.style.display = 'block';
      clonedEl.style.width = `${MOBILE_EXPORT_WIDTH_PX}px`;
      clonedEl.style.maxWidth = `${MOBILE_EXPORT_WIDTH_PX}px`;
      clonedEl.style.margin = '0';
      clonedEl.style.borderRadius = '0px';
      clonedEl.style.boxShadow = 'none';
      clonedEl.style.border = 'none';
    },
  });

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error('No se pudo generar la vista de exportación. Intenta nuevamente.');
  }

  return canvas;
}

/**
 * Exports the invoice/quote sheet element to a crisp, slim mobile-friendly PNG image.
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
 * Exports the invoice/quote sheet element to a slim vertical PDF sized for comfortable phone reading.
 */
export async function exportSheetToPdf(
  element: HTMLElement,
  folio: string,
  clientName: string,
): Promise<string> {
  const canvas = await captureSheetCanvas(element);
  const imgData = canvas.toDataURL('image/png', 1.0);

  const pageWidth = MOBILE_PDF_WIDTH_MM;
  const margin = MOBILE_PDF_MARGIN_MM;
  const usableWidth = pageWidth - margin * 2;
  const imgRatio = canvas.height / canvas.width;
  const renderHeight = usableWidth * imgRatio;

  if (renderHeight <= MOBILE_PDF_MAX_SINGLE_PAGE_HEIGHT_MM) {
    // Sleek continuous slim vertical PDF — fills phone screens cleanly without zoom
    const singlePageHeight = Math.max(150, Math.ceil(renderHeight + margin * 2));
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageWidth, singlePageHeight],
      compress: true,
    });
    pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, renderHeight, undefined, 'FAST');
    const filename = buildExportFilename(folio, clientName, 'pdf');
    pdf.save(filename);
    return filename;
  }

  // Multi-page slim vertical pagination for extra-long menus
  const pageHeight = MOBILE_PDF_PAGINATED_HEIGHT_MM;
  const usableHeight = pageHeight - margin * 2;
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageWidth, pageHeight],
    compress: true,
  });

  let heightLeft = renderHeight;
  let positionY = margin;
  pdf.addImage(imgData, 'PNG', margin, positionY, usableWidth, renderHeight, undefined, 'FAST');
  heightLeft -= usableHeight;

  while (heightLeft > 1) {
    pdf.addPage([pageWidth, pageHeight], 'portrait');
    positionY = margin - (renderHeight - heightLeft);
    pdf.addImage(imgData, 'PNG', margin, positionY, usableWidth, renderHeight, undefined, 'FAST');
    heightLeft -= usableHeight;
  }

  const filename = buildExportFilename(folio, clientName, 'pdf');
  pdf.save(filename);
  return filename;
}
