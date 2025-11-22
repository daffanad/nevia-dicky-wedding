// ============================================================
// 1. KONFIGURASI UTAMA
// ============================================================
// Link API Google Apps Script milikmu (SUDAH SAYA MASUKKAN LINK KAMU)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwPjUX6mXxEEdrCo31UbxXO42uXiMsyeBHhSIVR-7M4ln_a7ZOaY3UQXvoHmJtEu5bB/exec";

// Cek apakah script berjalan saat halaman dimuat
console.log("Script.js berhasil dimuat!"); 

// Variabel Global
let currentUserCode = "";
let currentUserName = "";

// Inisialisasi Animasi AOS (Dibungkus try-catch agar aman)
try {
    AOS.init({ once: true, offset: 100, duration: 1000 });
} catch (e) {
    console.warn("AOS Animation error:", e);
}


// ============================================================
// 2. LOGIKA BUKA UNDANGAN
// ============================================================
async function openInvitation() {
    console.log("Tombol Buka Undangan Di-klik"); // Debugging

    // Cek apakah SweetAlert (Swal) sudah terload
    if (typeof Swal === 'undefined') {
        alert("Error: Library SweetAlert belum terload. Cek koneksi internet Anda.");
        return;
    }

    // Ambil kode dari URL
    const urlParams = new URLSearchParams(window.location.search);
    let code = urlParams.get('code');

    // Jika kode tidak ada, minta input manual
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
                if (!value) return 'Kode harus diisi!';
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
        title: 'Memverifikasi...',
        text: 'Mohon tunggu sebentar',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading() }
    });

    try {
        console.log("Menghubungi Server:", SCRIPT_URL);
        
        const response = await fetch(`${SCRIPT_URL}?action=check&code=${code}`);
        const data = await response.json(); // Langsung parse JSON

        if (data.status === 'success') {
            console.log("Login Berhasil:", data);
            
            // Simpan data
            currentUserCode = code;
            currentUserName = data.nama;
            
            // Update Teks di Website
            document.getElementById('guest-name').innerText = data.nama;
            document.getElementById('display-nama').innerText = data.nama;
            document.getElementById('display-grup').innerText = data.grup;

            Swal.close(); // Tutup loading

            // Jalankan Animasi Buka
            const cover = document.getElementById('cover');
            const musicBox = document.querySelector('.music-box');
            
            cover.classList.add('open');
            musicBox.classList.add('show');
            playMusic();
            
            // Buka Scroll
            document.body.style.overflowY = 'auto';
            document.body.style.overflowX = 'hidden';

        } else {
            // GAGAL
            Swal.fire({
                icon: 'error',
                title: 'Kode Tidak Ditemukan',
                text: `Kode '${code}' salah atau tidak terdaftar.`,
                confirmButtonColor: '#b88746'
            });
        }
    } catch (error) {
        console.error("Error Fetching:", error);
        Swal.fire({
            icon: 'error',
            title: 'Gagal Terhubung',
            text: 'Terjadi kesalahan koneksi ke server Google. Coba refresh halaman.',
            confirmButtonColor: '#b88746'
        });
    }
}


// ============================================================
// 3. LOGIKA KIRIM RSVP
// ============================================================
function submitRSVP(event) {
    event.preventDefault();
    
    const kehadiran = document.getElementById('kehadiran').value;
    const ucapan = document.getElementById('ucapan').value;
    const btn = document.getElementById('btn-submit-rsvp');

    // Loading State
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    const formData = new FormData();
    formData.append('action', 'rsvp');
    formData.append('code', currentUserCode);
    formData.append('kehadiran', kehadiran);
    formData.append('ucapan', ucapan);

    fetch(SCRIPT_URL, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if(data.status === 'success') {
            // Berhasil
            document.getElementById('rsvp-form-container').style.display = 'none';
            document.getElementById('qr-result-container').style.display = 'block';

            // Generate QR
            const qrContainer = document.getElementById("qrcode");
            qrContainer.innerHTML = "";
            
            // Cek Library QR
            if(typeof QRCode !== 'undefined') {
                new QRCode(qrContainer, {
                    text: currentUserCode,
                    width: 160, height: 160,
                    colorDark : "#b88746",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });
            } else {
                qrContainer.innerHTML = "QR Code Library Error";
            }

            Swal.fire({
                icon: 'success', title: 'Tersimpan!',
                text: 'Terima kasih atas konfirmasinya.',
                confirmButtonColor: '#b88746'
            });
        } else {
            throw new Error('Gagal menyimpan.');
        }
    })
    .catch(err => {
        console.error(err);
        Swal.fire('Error', 'Gagal mengirim data.', 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
    });
}


// ============================================================
// 4. DOWNLOAD QR
// ============================================================
function downloadQR() {
    const qrCanvas = document.querySelector('#qrcode canvas');
    if(qrCanvas) {
        const imgUrl = qrCanvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.href = imgUrl;
        const safeName = currentUserName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `QR_Wedding_${safeName}.png`;
        link.click();
    } else {
        // Fallback
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
// 5. FITUR LAIN
// ============================================================
const audio = document.getElementById('bg-music');
const diskIcon = document.getElementById('disk-icon');
let isPlaying = false;

function playMusic() {
    if(audio) {
        audio.play().catch(e => console.log("Autoplay blocked:", e));
        isPlaying = true;
        if(diskIcon) diskIcon.classList.remove('paused-disk');
    }
}

function toggleMusic() {
    if(audio) {
        if (isPlaying) {
            audio.pause();
            if(diskIcon) diskIcon.classList.add('paused-disk');
        } else {
            audio.play();
            if(diskIcon) diskIcon.classList.remove('paused-disk');
        }
        isPlaying = !isPlaying;
    }
}

function salinRek() {
    navigator.clipboard.writeText("1234567890");
    Swal.fire({
        icon: 'success', title: 'Disalin', 
        showConfirmButton: false, timer: 1000, 
        confirmButtonColor: '#c5a059'
    });
}