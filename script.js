// ============================================================
// KONFIGURASI UTAMA
// ============================================================
// HAPUS TEKS DI BAWAH, GANTI DENGAN LINK YANG KAMU COPY DARI TAHAP 3
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwPjUX6mXxEEdrCo31UbxXO42uXiMsyeBHhSIVR-7M4ln_a7ZOaY3UQXvoHmJtEu5bB/exec"; 

// CONTOH YANG BENAR (Tanda kutip harus ada):
// const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx...panjang.../exec";


// Variabel Global
let currentUserCode = "";
let currentUserName = "";

// 1. INISIALISASI
AOS.init({ once: true, offset: 100, duration: 1000 });

// 2. LOGIKA BUKA UNDANGAN (CEK KE GOOGLE SHEET)
async function openInvitation() {
    // Ambil kode dari URL (misal: website.com/?code=TAMU01)
    const urlParams = new URLSearchParams(window.location.search);
    let code = urlParams.get('code');

    // Jika tidak ada kode di link, minta input manual
    if (!code) {
        const input = await Swal.fire({
            title: 'Masukkan Kode Undangan',
            text: 'Lihat kode di undangan yang Anda terima (Cth: TAMU01)',
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

    // Loading...
    Swal.fire({
        title: 'Mengecek Data...',
        text: 'Mohon tunggu sebentar',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading() }
    });

    try {
        // Kirim request ke Google Sheet
        const response = await fetch(`${SCRIPT_URL}?action=check&code=${code}`);
        const data = await response.json();

        if (data.status === 'success') {
            // BERHASIL LOGIN
            currentUserCode = code;
            currentUserName = data.nama;
            
            // Isi nama tamu di Cover
            document.getElementById('guest-name').innerText = data.nama;
            
            // Isi nama tamu di Form RSVP
            document.getElementById('display-nama').innerText = data.nama;
            document.getElementById('display-grup').innerText = data.grup;

            Swal.close(); // Tutup loading

            // Jalankan Animasi Buka
            const cover = document.getElementById('cover');
            const musicBox = document.querySelector('.music-box');
            cover.classList.add('open');
            musicBox.classList.add('show');
            playMusic();
            
            document.body.style.overflowY = 'auto';
            document.body.style.overflowX = 'hidden';

        } else {
            // KODE TIDAK DITEMUKAN
            Swal.fire({
                icon: 'error',
                title: 'Kode Salah',
                text: 'Kode tidak ada di buku tamu kami.',
                confirmButtonColor: '#b88746'
            });
        }
    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: 'error',
            title: 'Gagal Koneksi',
            text: 'Pastikan sinyal internet lancar.',
            confirmButtonColor: '#b88746'
        });
    }
}

// 3. LOGIKA KIRIM RSVP & DAPATKAN QR
function submitRSVP(event) {
    event.preventDefault();
    
    const kehadiran = document.getElementById('kehadiran').value;
    const ucapan = document.getElementById('ucapan').value;
    const btn = document.getElementById('btn-submit-rsvp');

    // Tombol jadi loading
    const textAsli = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    // Siapkan data
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
            // BERHASIL
            document.getElementById('rsvp-form-container').style.display = 'none';
            document.getElementById('qr-result-container').style.display = 'block';

            // Generate QR Code
            const qrContainer = document.getElementById("qrcode");
            qrContainer.innerHTML = "";
            new QRCode(qrContainer, {
                text: currentUserCode, // Isi QR = Kode Tamu
                width: 160, height: 160,
                colorDark : "#b88746",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });

            Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: 'Ucapan & Konfirmasi tersimpan!',
                confirmButtonColor: '#b88746'
            });
        } else {
            throw new Error('Gagal simpan');
        }
    })
    .catch(err => {
        Swal.fire('Error', 'Gagal menyimpan data.', 'error');
        btn.disabled = false;
        btn.innerHTML = textAsli;
    });
}

// 4. DOWNLOAD QR
function downloadQR() {
    const qrCanvas = document.querySelector('#qrcode canvas');
    if(qrCanvas) {
        const imgUrl = qrCanvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.href = imgUrl;
        // Nama file saat didownload
        const safeName = currentUserName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `QR_Wedding_${safeName}.png`;
        link.click();
    }
}

// 5. FITUR LAIN (Musik, Salin Rek)
const audio = document.getElementById('bg-music');
const diskIcon = document.getElementById('disk-icon');
let isPlaying = false;

function playMusic() {
    audio.play().catch(() => console.log("Autoplay blocked"));
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

function salinRek() {
    navigator.clipboard.writeText("1234567890");
    Swal.fire({
        icon: 'success', title: 'Disalin', 
        showConfirmButton: false, timer: 1000, 
        confirmButtonColor: '#c5a059'
    });
}