import { getAllAttendance, calcDuration } from './db.js';

export async function generatePDF(filtered = false, filterDate = null) {
  const { jsPDF } = window.jspdf;
  let data = await getAllAttendance(filterDate);
  
  if (filtered && filterDate) {
    data = data.filter(rec => rec.tanggal === filterDate);
  }
  
  if (data.length === 0) {
    alert('Tidak ada data untuk diexport');
    return;
  }
  
  // Buat PDF dengan ukuran landscape
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('LAPORAN ABSENSI KARYAWAN', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 20, 30);
  if (filtered && filterDate) {
    doc.text(`Filter Tanggal: ${filterDate}`, 20, 36);
  } else {
    doc.text('Semua Data', 20, 36);
  }
  
  let yPosition = 45;
  const startX = 15;
  
  // Header tabel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const headers = ['No', 'Nama', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Durasi'];
  const colWidths = [10, 35, 30, 25, 25, 30];
  
  // Gambar header
  let xPos = startX;
  for (let i = 0; i < headers.length; i++) {
    doc.rect(xPos, yPosition - 5, colWidths[i], 8);
    doc.text(headers[i], xPos + 2, yPosition);
    xPos += colWidths[i];
  }
  
  yPosition += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  // Loop data
  for (let idx = 0; idx < data.length; idx++) {
    const rec = data[idx];
    
    // Cek perlu halaman baru
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
      // Redraw header di halaman baru
      xPos = startX;
      doc.setFont('helvetica', 'bold');
      for (let i = 0; i < headers.length; i++) {
        doc.rect(xPos, yPosition - 5, colWidths[i], 8);
        doc.text(headers[i], xPos + 2, yPosition);
        xPos += colWidths[i];
      }
      yPosition += 5;
      doc.setFont('helvetica', 'normal');
    }
    
    let durasi = rec.durasi;
    if ((!durasi || durasi === '-') && rec.jamMasuk && rec.jamPulang) {
      durasi = calcDuration(rec.jamMasuk, rec.jamPulang);
    }
    
    const rowData = [
      (idx + 1).toString(),
      rec.nama,
      rec.tanggal,
      rec.jamMasuk || '-',
      rec.jamPulang || '-',
      durasi || '-'
    ];
    
    // Draw row
    xPos = startX;
    for (let i = 0; i < rowData.length; i++) {
      doc.rect(xPos, yPosition - 4, colWidths[i], 6);
      doc.text(rowData[i], xPos + 2, yPosition);
      xPos += colWidths[i];
    }
    
    yPosition += 8;
    
    // Tampilkan foto jika ada (di baris terpisah)
    if (rec.fotoMasuk || rec.fotoPulang) {
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`Foto Absensi - ${rec.nama} (${rec.tanggal}):`, startX, yPosition);
      yPosition += 5;
      
      // Tampilkan foto masuk
      if (rec.fotoMasuk) {
        try {
          const imgData = rec.fotoMasuk;
          const imgWidth = 40;
          const imgHeight = 40;
          doc.addImage(imgData, 'JPEG', startX, yPosition, imgWidth, imgHeight);
          doc.text('Foto Masuk', startX + 15, yPosition + imgHeight + 3);
        } catch(e) {
          doc.text('[Foto Masuk]', startX, yPosition + 20);
        }
      }
      
      // Tampilkan foto pulang
      if (rec.fotoPulang) {
        try {
          const imgData = rec.fotoPulang;
          const imgWidth = 40;
          const imgHeight = 40;
          doc.addImage(imgData, 'JPEG', startX + 50, yPosition, imgWidth, imgHeight);
          doc.text('Foto Pulang', startX + 65, yPosition + imgHeight + 3);
        } catch(e) {
          doc.text('[Foto Pulang]', startX + 50, yPosition + 20);
        }
      }
      
      yPosition += 50;
    }
  }
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 30, pageHeight - 10);
  }
  
  doc.save(filtered ? 'laporan_absensi_filter.pdf' : 'laporan_absensi_lengkap.pdf');
}