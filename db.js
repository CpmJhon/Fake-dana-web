import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8.0.0/build/index.js';

let db = null;

export async function initDatabase() {
  db = await openDB('AttendanceDB', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('attendance')) {
        const store = db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by_date', 'tanggal');
        store.createIndex('by_name', 'nama');
      }
    }
  });
  return db;
}

export function getDB() {
  return db;
}

export async function getAllAttendance(filterDate = null) {
  if (!db) await initDatabase();
  let all = await db.getAll('attendance');
  if (filterDate) {
    all = all.filter(record => record.tanggal === filterDate);
  }
  // Update durasi untuk setiap record sebelum ditampilkan
  for (let record of all) {
    if (record.jamMasuk && record.jamPulang) {
      record.durasi = calcDuration(record.jamMasuk, record.jamPulang);
    } else {
      record.durasi = '-';
    }
  }
  return all;
}

export async function addAttendance(record) {
  if (!db) await initDatabase();
  return await db.add('attendance', record);
}

export async function updateAttendance(record) {
  if (!db) await initDatabase();
  // Hitung ulang durasi sebelum update
  if (record.jamMasuk && record.jamPulang) {
    record.durasi = calcDuration(record.jamMasuk, record.jamPulang);
  }
  return await db.put('attendance', record);
}

export async function deleteAttendance(id) {
  if (!db) await initDatabase();
  return await db.delete('attendance', id);
}

export async function getAttendanceByDateAndName(tanggal, nama) {
  if (!db) await initDatabase();
  const all = await db.getAllFromIndex('attendance', 'by_date', tanggal);
  return all.find(rec => rec.nama === nama);
}

export function calcDuration(startTime, endTime) {
  if (!startTime || !endTime) return '-';
  
  try {
    // Fungsi untuk mengkonversi waktu string ke menit
    const timeToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      
      // Format: "HH:MM:SS" atau "HH:MM"
      const parts = timeStr.split(':');
      let hours = parseInt(parts[0], 10);
      let minutes = parseInt(parts[1], 10);
      let seconds = parts[2] ? parseInt(parts[2], 10) : 0;
      
      // Validasi
      if (isNaN(hours)) hours = 0;
      if (isNaN(minutes)) minutes = 0;
      if (isNaN(seconds)) seconds = 0;
      
      return (hours * 60) + minutes + (seconds / 60);
    };
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    let diffMinutes = endMinutes - startMinutes;
    
    // Jika melewati tengah malam
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60;
    }
    
    const hours = Math.floor(diffMinutes);
    const minutes = Math.floor((diffMinutes - hours) * 60);
    
    return `${hours} jam ${minutes} menit`;
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 'Error';
  }
}