// ============================================================
// 1. KONFIGURASI UTAMA
// ============================================================
// Link API Google Apps Script milikmu
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwPjUX6mXxEEdrCo31UbxXO42uXiMsyeBHhSIVR-7M4ln_a7ZOaY3UQXvoHmJtEu5bB/exec";

// Variabel Global (untuk menyimpan data sementara)
let currentUserCode = "";
let currentUserName = "";

// Inisialisasi Animasi AOS
AOS.init({ once: true, offset: 100, duration: 1000 });


// ============================================================
// 2. LOGIKA BUKA UNDANGAN (LOGIN)
// ============================================================
async function openInvitation() {
    // Ambil kode dari URL (misal: ?code=NVAD21)
    const urlParams = new URLSearchParams(window.location.search);
    let code = urlParams.get('code');

    // Jika kode tidak ada di link, minta input manual
    if (!code) {
        const input = await Swal.fire({
            title: 'Masukkan Kode Undangan',
            text: 'Cek kode di undangan WA (Cth: NVAD21)',
            input: 'text',
            inputPlaceholder: 'Ketik Kode...',
            confirmButtonText: 'Buka Undangan',
            confirmButtonColor: '#b88746',
            allowOutsideClick: false,
            inputValidator: (value) => {
                if (!value) return 'Kode harus diisi!'
            }
        });

        if (input.isConfirmed) {
            code = input.value;
        } else {
            return;
        }
    }

    // Tampilkan Loading
    Swal.fire({
        title: 'Memverifikasi Data...',
        text: 'Mohon tunggu sebentar',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading() }
    });

    try {
        // Panggil Google Script
        const response = await fetch(`${SCRIPT_URL}?action=check&code=${code}`);
        
        // Cek jika response bukan JSON (biasanya karena error permission script)
        const textResponse = await response.text();
        let data;
        try {
            data = JSON.parse(textResponse);
        } catch (err) {
            throw new Error("Gagal membaca data. Pastikan Deployment Script diset ke 'Anyone'.");
        }

        if (data.status === 'success') {
            // BERHASIL LOGIN
            currentUserCode = code;
            currentUserName = data.nama;
            
            // 1. Update Nama di Cover
            document.getElementById('guest-name').innerText = data.nama;
            
            // 2. Update Nama di Form RSVP
            document.getElementById('display-nama').innerText = data.nama;
            document.getElementById('display-grup').innerText = data.grup;

            Swal.close(); // Tutup loading

            // 3. Jalankan Animasi Buka Undangan
            const cover = document.getElementById('cover');
            const musicBox = document.querySelector('.music-box');
            
            cover.classList.add('open');
            musicBox.classList.add('show');
            playMusic();
            
            // Buka Scroll
            document.body.style.overflowY = 'auto';
            document.body.style.overflowX = 'hidden';

        } else {
            // KODE TIDAK DITEMUKAN
            Swal.fire({
                icon: 'error',
                title: 'Kode Salah',
                text: `Kode '${code}' tidak ditemukan di buku tamu.`,
                confirmButtonColor: '#b88746'
            });
        }
    } catch (error) {
        console.error("Error:", error);
        Swal.fire({
            icon: 'error',
            title: 'Kesalahan Sistem',
            text: error.message || 'Gagal terhubung ke server.',
            confirmButtonColor: '#b88746'
        });
    }
}


// ============================================================
// 3. LOGIKA KIRIM RSVP & GENERATE QR
// ============================================================
function submitRSVP(event) {
    event.preventDefault();
    
    const kehadiran = document.getElementById('kehadiran').value;
    const ucapan = document.getElementById('ucapan').value;
    const btn = document.getElementById('btn-submit-rsvp');

    // Ubah tombol jadi loading
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    // Siapkan data form
    const formData = new FormData();
    formData.append('action', 'rsvp');
    formData.append('code', currentUserCode);
    formData.append('kehadiran', kehadiran);
    formData.append('ucapan', ucapan);

    // Kirim ke Google Sheet
    fetch(SCRIPT_URL, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if(data.status === 'success') {
            // BERHASIL SIMPAN
            // 1. Sembunyikan Form
            document.getElementById('rsvp-form-container').style.display = 'none';
            // 2. Tampilkan QR Container
            document.getElementById('qr-result-container').style.display = 'block';

            // 3. Generate QR Code
            const qrContainer = document.getElementById("qrcode");
            qrContainer.innerHTML = ""; // Bersihkan QR lama jika ada
            
            new QRCode(qrContainer, {
                text: currentUserCode, // Isi QR adalah Kode Tamu
                width: 160,
                height: 160,
                colorDark : "#b88746",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });

            Swal.fire({
                icon: 'success',
                title: 'Tersimpan!',
                text: 'Terima kasih atas konfirmasi kehadiran Anda.',
                confirmButtonColor: '#b88746'
            });
        } else {
            throw new Error('Gagal menyimpan ke database.');
        }
    })
    .catch(err => {
        console.error(err);
        Swal.fire('Error', 'Gagal mengirim data. Coba lagi.', 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
    });
}


// ============================================================
// 4. DOWNLOAD QR CODE
// ============================================================
function downloadQR() {
    const qrCanvas = document.querySelector('#qrcode canvas');
    
    if(qrCanvas) {
        // Ubah canvas menjadi gambar PNG
        const imgUrl = qrCanvas.toDataURL("image/png");
        
        // Buat link download palsu
        const link = document.createElement('a');
        link.href = imgUrl;
        
        // Bersihkan nama file agar aman
        const safeName = currentUserName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `QR_Wedding_${safeName}.png`;
        
        // Klik otomatis
        link.click();
    } else {
        // Fallback untuk browser lama (jika render pakai img tag)
        const qrImg = document.querySelector('#qrcode img');
        if(qrImg) {
            const link = document.createElement('a');
            link.href = qrImg.src;
            link.download = `QR_Wedding_${currentUserName}.png`;
            link.click();
        }
    }
}


// ============================================================
// 5. FITUR TAMBAHAN (Musik & Salin Rek)
// ============================================================

// --- Music Player ---
const audio = document.getElementById('bg-music');
const diskIcon = document.getElementById('disk-icon');
let isPlaying = false;

function playMusic() {
    // Autoplay policy browser kadang memblokir, kita tangkap errornya
    audio.play().catch(() => {
        console.log("Autoplay audio diblokir browser sebelum interaksi user.");
    });
    isPlaying = true;
    diskIcon.classList.remove('paused-disk');
}

function toggleMusic() {
    if (isPlaying) {
        audio.pause();
        diskIcon.classList.add('paused-disk');
    } else {
        audio.play();
        diskIcon.classList.remove('paused-disk');
    }
    isPlaying = !isPlaying;
}

// --- Salin Rekening ---
function salinRek() {
    // Ganti nomor rekening asli di sini
    navigator.clipboard.writeText("1234567890");
    
    Swal.fire({
        icon: 'success',
        title: 'Disalin',
        showConfirmButton: false,
        timer: 1000,
        confirmButtonColor: '#b88746'
    });
}