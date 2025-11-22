// ============================================================
// 1. KONFIGURASI UTAMA
// ============================================================
// Link API Google Apps Script milikmu
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyoVVrzB3N0okeJp3Mel5ADwlk0ZIujvfEaXthNqgimjCCrMPoAeKdO1CyVldTy878F5A/exec";

// Variabel Global
let currentUserCode = "";
let currentUserName = "";

// Cek status load
console.log("Script.js v2 (jQuery Version) Loaded!");

// Inisialisasi AOS
try {
    AOS.init({ once: true, offset: 100, duration: 1000 });
} catch (e) { console.warn("AOS init error", e); }


// ============================================================
// 2. LOGIKA BUKA UNDANGAN (PAKAI JQUERY AJAX)
// ============================================================
async function openInvitation() {
    console.log("Tombol diklik...");

    // Cek Library jQuery
    if (typeof $ === 'undefined') {
        alert("Error: jQuery belum terload. Cek koneksi internet.");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    let code = urlParams.get('code');

    // Minta input jika kode kosong
    if (!code) {
        const input = await Swal.fire({
            title: 'Masukkan Kode Undangan',
            text: 'Cek kode di undangan WA (Cth: NVAD21)',
            input: 'text',
            inputPlaceholder: 'Ketik Kode...',
            confirmButtonText: 'Buka Undangan',
            confirmButtonColor: '#b88746',
            allowOutsideClick: false,
            inputValidator: (value) => { if (!value) return 'Wajib diisi!' }
        });

        if (input.isConfirmed) code = input.value;
        else return;
    }

    // Tampilkan Loading
    Swal.fire({
        title: 'Mengecek Data...',
        text: 'Mohon tunggu, sedang menghubungi server...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading() }
    });

    console.log("Mengirim request ke Google Sheet...");

    // --- SOLUSI: Ganti fetch dengan jQuery AJAX ---
    $.ajax({
        url: SCRIPT_URL,
        type: "GET",
        data: { action: "check", code: code },
        dataType: "json",
        crossDomain: true,
        success: function(data) {
            console.log("Respon diterima:", data);
            
            if (data.status === 'success') {
                // BERHASIL
                currentUserCode = code;
                currentUserName = data.nama;

                // Update Tampilan
                $('#guest-name').text(data.nama);
                $('#display-nama').text(data.nama);
                $('#display-grup').text(data.grup);

                Swal.close();

                // Animasi Buka
                $('#cover').addClass('open');
                $('.music-box').addClass('show');
                playMusic();

                $('body').css('overflow-y', 'auto');
                $('body').css('overflow-x', 'hidden');
            } else {
                // KODE SALAH
                Swal.fire({
                    icon: 'error',
                    title: 'Kode Salah',
                    text: 'Kode tidak ditemukan di database.',
                    confirmButtonColor: '#b88746'
                });
            }
        },
        error: function(xhr, status, error) {
            console.error("Error AJAX:", status, error);
            // Kadang Google return redirect 302 dianggap error oleh ajax biasa
            // Tapi biasanya jQuery menghandle ini. Jika masuk sini, berarti koneksi putus/blokir.
            Swal.fire({
                icon: 'error',
                title: 'Gagal Koneksi',
                text: 'Gagal mengambil data. Coba matikan AdBlock atau ganti browser/jaringan.',
                confirmButtonColor: '#b88746'
            });
        }
    });
}


// ============================================================
// 3. LOGIKA KIRIM RSVP (PAKAI JQUERY AJAX)
// ============================================================
function submitRSVP(event) {
    event.preventDefault();
    
    const kehadiran = $('#kehadiran').val();
    const ucapan = $('#ucapan').val();
    const btn = $('#btn-submit-rsvp');
    const originalText = btn.html();

    // Loading State
    btn.html('<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...').prop('disabled', true);

    $.ajax({
        url: SCRIPT_URL,
        type: "POST",
        data: {
            action: 'rsvp',
            code: currentUserCode,
            kehadiran: kehadiran,
            ucapan: ucapan
        },
        dataType: "json",
        success: function(data) {
            if (data.status === 'success') {
                // Berhasil
                $('#rsvp-form-container').hide();
                $('#qr-result-container').show();

                // Generate QR
                const qrContainer = document.getElementById("qrcode");
                qrContainer.innerHTML = "";
                new QRCode(qrContainer, {
                    text: currentUserCode,
                    width: 160, height: 160,
                    colorDark : "#b88746",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });

                Swal.fire({
                    icon: 'success', title: 'Tersimpan!',
                    text: 'Konfirmasi Anda berhasil dikirim.',
                    confirmButtonColor: '#b88746'
                });
            } else {
                alert("Gagal menyimpan data ke Google Sheet.");
                btn.html(originalText).prop('disabled', false);
            }
        },
        error: function(err) {
            console.error(err);
            Swal.fire('Error', 'Gagal mengirim data. Coba lagi.', 'error');
            btn.html(originalText).prop('disabled', false);
        }
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
        audio.play().catch(e => console.log("Autoplay blocked"));
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