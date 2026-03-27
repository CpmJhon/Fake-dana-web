import { 
  initDatabase, 
  getAllAttendance, 
  addAttendance, 
  updateAttendance, 
  deleteAttendance,
  getAttendanceByDateAndName,
  calcDuration 
} from './db.js';
import { generatePDF } from './pdf.js';

let currentAction = null;
let capturedPhotoBase64 = null;
let mediaStream = null;

// DOM Elements
const employeeNameInput = document.getElementById('employeeName');
const checkinBtn = document.getElementById('checkinBtn');
const checkoutBtn = document.getElementById('checkoutBtn');
const cameraSection = document.getElementById('cameraSection');
const video = document.getElementById('video');
const photoPreview = document.getElementById('photoPreview');
const capturePhotoBtn = document.getElementById('capturePhotoBtn');
const closeCameraBtn = document.getElementById('closeCameraBtn');
const cameraBtn = document.getElementById('cameraBtn');
const galleryBtn = document.getElementById('galleryBtn');
const uploadPhotoInput = document.getElementById('uploadPhotoInput');
const attendanceMsg = document.getElementById('attendanceMsg');
const tableBody = document.getElementById('tableBody');
const filterDate = document.getElementById('filterDate');
const clearFilterBtn = document.getElementById('clearFilterBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportFilteredPdfBtn = document.getElementById('exportFilteredPdfBtn');
const darkModeToggle = document.getElementById('darkModeToggle');
const photoInfo = document.getElementById('photoInfo');

// Helper Functions
function updateClock() {
  const now = new Date();
  const waktu = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  document.getElementById('realTimeClock').innerText = waktu;
}

function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function loadAttendanceData() {
  const filterValue = filterDate.value || null;
  const all = await getAllAttendance(filterValue);
  
  if (all.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center">Belum ada data absensi</td></tr>';
    return;
  }
  
  tableBody.innerHTML = '';
  for (const rec of all) {
    const row = tableBody.insertRow();
    row.insertCell(0).innerText = rec.nama;
    row.insertCell(1).innerText = rec.tanggal;
    row.insertCell(2).innerText = rec.jamMasuk || '-';
    row.insertCell(3).innerText = rec.jamPulang || '-';
    
    // Tampilkan durasi yang sudah dihitung
    let durasi = rec.durasi;
    if ((!durasi || durasi === '-') && rec.jamMasuk && rec.jamPulang) {
      durasi = calcDuration(rec.jamMasuk, rec.jamPulang);
    }
    row.insertCell(4).innerText = durasi || '-';
    
    // Foto Masuk
    const fotoMasukCell = row.insertCell(5);
    if (rec.fotoMasuk) {
      const img = document.createElement('img');
      img.src = rec.fotoMasuk;
      img.className = 'thumb-img';
      img.title = 'Foto masuk - klik untuk perbesar';
      img.style.cursor = 'pointer';
      img.onclick = () => {
        const win = window.open();
        win.document.write(`
          <html>
            <head><title>Foto Masuk - ${rec.nama}</title></head>
            <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#000;">
              <img src="${rec.fotoMasuk}" style="max-width:90%; max-height:90vh; object-fit:contain;">
            </body>
          </html>
        `);
      };
      fotoMasukCell.appendChild(img);
    } else fotoMasukCell.innerText = '-';
    
    // Foto Pulang
    const fotoPulangCell = row.insertCell(6);
    if (rec.fotoPulang) {
      const img = document.createElement('img');
      img.src = rec.fotoPulang;
      img.className = 'thumb-img';
      img.title = 'Foto pulang - klik untuk perbesar';
      img.style.cursor = 'pointer';
      img.onclick = () => {
        const win = window.open();
        win.document.write(`
          <html>
            <head><title>Foto Pulang - ${rec.nama}</title></head>
            <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#000;">
              <img src="${rec.fotoPulang}" style="max-width:90%; max-height:90vh; object-fit:contain;">
            </body>
          </html>
        `);
      };
      fotoPulangCell.appendChild(img);
    } else fotoPulangCell.innerText = '-';
    
    // Action buttons
    const actionCell = row.insertCell(7);
    
    const delBtn = document.createElement('button');
    delBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Hapus';
    delBtn.style.background = '#ef4444';
    delBtn.style.padding = '6px 12px';
    delBtn.style.borderRadius = '30px';
    delBtn.style.color = 'white';
    delBtn.style.fontSize = '12px';
    delBtn.style.marginRight = '5px';
    delBtn.style.cursor = 'pointer';
    delBtn.onclick = async () => {
      if (confirm(`Hapus absensi ${rec.nama} tgl ${rec.tanggal}?`)) {
        await deleteAttendance(rec.id);
        loadAttendanceData();
      }
    };
    actionCell.appendChild(delBtn);
    
    const editBtn = document.createElement('button');
    editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
    editBtn.style.marginLeft = '5px';
    editBtn.style.background = '#3b82f6';
    editBtn.style.padding = '6px 12px';
    editBtn.style.borderRadius = '30px';
    editBtn.style.color = 'white';
    editBtn.style.fontSize = '12px';
    editBtn.style.cursor = 'pointer';
    editBtn.onclick = async () => {
      const newName = prompt('Edit nama karyawan:', rec.nama);
      if (newName && newName.trim()) {
        rec.nama = newName.trim();
        await updateAttendance(rec);
        loadAttendanceData();
      }
    };
    actionCell.appendChild(editBtn);
  }
}

// Camera Functions
async function startCamera() {
  if (mediaStream) stopCamera();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: { exact: "environment" } } 
    });
    mediaStream = stream;
    video.srcObject = stream;
    await video.play();
    cameraSection.style.display = 'block';
    photoInfo.innerHTML = '<i class="fas fa-camera"></i> Kamera aktif, ambil foto untuk absensi';
  } catch (err) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      mediaStream = stream;
      video.srcObject = stream;
      cameraSection.style.display = 'block';
      photoInfo.innerHTML = '<i class="fas fa-camera"></i> Kamera aktif, ambil foto untuk absensi';
    } catch(e) {
      alert('Tidak dapat mengakses kamera. Silakan gunakan opsi "Pilih dari Galeri"');
      openGallery();
    }
  }
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  cameraSection.style.display = 'none';
}

function capturePhotoFromVideo() {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  capturedPhotoBase64 = dataUrl;
  photoPreview.src = dataUrl;
  photoInfo.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981"></i> Foto berhasil diambil!';
  stopCamera();
  return dataUrl;
}

function openGallery() {
  uploadPhotoInput.click();
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  // Validasi tipe file
  if (!file.type.match('image.*')) {
    alert('Harap pilih file gambar (JPEG, PNG, dll)');
    return;
  }
  
  // Validasi ukuran file (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('Ukuran file terlalu besar! Maksimal 5MB');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (ev) => {
    capturedPhotoBase64 = ev.target.result;
    photoPreview.src = capturedPhotoBase64;
    photoInfo.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981"></i> Foto berhasil diupload!';
    cameraSection.style.display = 'none';
    stopCamera();
    finalizeAttendance();
  };
  reader.onerror = () => {
    alert('Gagal membaca file');
  };
  reader.readAsDataURL(file);
}

function resetAfterPhoto() {
  capturedPhotoBase64 = null;
  photoPreview.src = '';
  photoInfo.innerHTML = '';
  cameraSection.style.display = 'none';
  if (mediaStream) stopCamera();
}

async function finalizeAttendance() {
  if (!capturedPhotoBase64) {
    alert('Foto belum diambil! Silakan ambil foto terlebih dahulu.');
    return;
  }
  
  const nama = employeeNameInput.value.trim();
  const tanggal = getCurrentDate();
  const jamSekarang = getCurrentTime();
  
  if (currentAction === 'checkin') {
    const existing = await getAttendanceByDateAndName(tanggal, nama);
    if (existing && existing.jamMasuk) {
      alert(`Anda sudah absen masuk hari ini pada jam ${existing.jamMasuk}`);
      resetAfterPhoto();
      return;
    }
    
    const newRecord = {
      nama: nama,
      tanggal: tanggal,
      jamMasuk: jamSekarang,
      jamPulang: null,
      durasi: '-',
      fotoMasuk: capturedPhotoBase64,
      fotoPulang: null
    };
    await addAttendance(newRecord);
    attendanceMsg.innerHTML = `<i class="fas fa-check-circle"></i> ✅ Absen masuk sukses pada ${jamSekarang}`;
    attendanceMsg.style.color = '#10b981';
    setTimeout(() => {
      attendanceMsg.innerHTML = '';
    }, 3000);
    employeeNameInput.value = '';
    loadAttendanceData();
    resetAfterPhoto();
  } 
  else if (currentAction === 'checkout') {
    const recordMasuk = await getAttendanceByDateAndName(tanggal, nama);
    if (!recordMasuk || !recordMasuk.jamMasuk) {
      alert(`Tidak ditemukan absen masuk untuk ${nama} hari ini. Silakan lakukan absen masuk terlebih dahulu.`);
      resetAfterPhoto();
      return;
    }
    if (recordMasuk.jamPulang) {
      alert('Anda sudah melakukan absen pulang hari ini!');
      resetAfterPhoto();
      return;
    }
    
    recordMasuk.jamPulang = jamSekarang;
    recordMasuk.fotoPulang = capturedPhotoBase64;
    const durasi = calcDuration(recordMasuk.jamMasuk, jamSekarang);
    recordMasuk.durasi = durasi;
    await updateAttendance(recordMasuk);
    attendanceMsg.innerHTML = `<i class="fas fa-check-circle"></i> ✅ Absen pulang sukses! Durasi: ${durasi}`;
    attendanceMsg.style.color = '#10b981';
    setTimeout(() => {
      attendanceMsg.innerHTML = '';
    }, 3000);
    employeeNameInput.value = '';
    loadAttendanceData();
    resetAfterPhoto();
  }
  
  currentAction = null;
}

function startAttendanceProcess(action) {
  const nama = employeeNameInput.value.trim();
  if (!nama) {
    alert('Nama karyawan harus diisi!');
    return;
  }
  
  currentAction = action;
  capturedPhotoBase64 = null;
  photoPreview.src = '';
  photoInfo.innerHTML = '';
  
  // Tampilkan dialog pilihan
  const useCamera = confirm(`Apakah ingin menggunakan kamera?\n\n- OK: Buka kamera\n- Cancel: Pilih dari galeri`);
  
  if (useCamera) {
    startCamera();
  } else {
    openGallery();
  }
}

// Event Listeners
checkinBtn.addEventListener('click', () => startAttendanceProcess('checkin'));
checkoutBtn.addEventListener('click', () => startAttendanceProcess('checkout'));

cameraBtn.addEventListener('click', () => {
  if (!currentAction) {
    alert('Pilih tombol Absen Masuk atau Pulang terlebih dahulu!');
    return;
  }
  startCamera();
});

galleryBtn.addEventListener('click', () => {
  if (!currentAction) {
    alert('Pilih tombol Absen Masuk atau Pulang terlebih dahulu!');
    return;
  }
  openGallery();
});

capturePhotoBtn.addEventListener('click', () => {
  if (video.srcObject) {
    capturePhotoFromVideo();
    finalizeAttendance();
  }
});

closeCameraBtn.addEventListener('click', () => {
  stopCamera();
  resetAfterPhoto();
});

uploadPhotoInput.addEventListener('change', handleFileUpload);

filterDate.addEventListener('change', () => loadAttendanceData());
clearFilterBtn.addEventListener('click', () => {
  filterDate.value = '';
  loadAttendanceData();
});
exportPdfBtn.addEventListener('click', () => generatePDF(false, null));
exportFilteredPdfBtn.addEventListener('click', () => generatePDF(true, filterDate.value || null));

// Dark Mode
function initDarkMode() {
  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) document.body.classList.add('dark');
  darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', document.body.classList.contains('dark'));
  });
}

// Initialize App
async function init() {
  await initDatabase();
  initDarkMode();
  updateClock();
  setInterval(updateClock, 1000);
  await loadAttendanceData();
}

init();