// ============================================================
// 1. KONFIGURASI UTAMA
// ============================================================
// Link API Google Apps Script (PASTIKAN LINK INI BENAR)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzVoCsD2369Rii6kM15c1wYIVfev-9a2ysKe-oQM00R7R7bhV6ihT4dSCTYoGiM-tWYkw/exec";

// Variabel Global
let currentUserCode = "";
let currentUserName = "";
let isDataLoaded = false; // Penanda apakah data sudah sukses diambil

// Cek status load console
console.log("Script Final Loaded!");

// Inisialisasi AOS
try {
    AOS.init({ once: true, offset: 100, duration: 1000 });
} catch (e) { console.warn("AOS init error", e); }


// ============================================================
// 2. AUTO FETCH (JALAN OTOMATIS SAAT WEBSITE DIBUKA)
// ============================================================
$(document).ready(function() {
    // Ambil kode dari URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    // Jika ada kode di URL, langsung tanya Google Siapa dia?
    if (code) {
        // Ubah teks sementara jadi Loading...
        $('#guest-name').html('<i class="fa-solid fa-spinner fa-spin"></i> Memuat Nama...');

        $.ajax({
            url: SCRIPT_URL,
            type: "GET",
            data: { action: "check", code: code },
            dataType: "json",
            crossDomain: true,
            success: function(data) {
                if (data.status === 'success') {
                    console.log("Auto Fetch Berhasil:", data);
                    
                    // 1. Simpan ke variabel global
                    currentUserCode = code;
                    currentUserName = data.nama;
                    isDataLoaded = true; // Tandai sukses

                    // 2. GANTI NAMA DI COVER
                    $('#guest-name').text(data.nama);

                    // 3. Isi data untuk RSVP nanti
                    $('#display-nama').text(data.nama);
                    $('#display-grup').text(data.grup);
                } else {
                    // Jika kode salah
                    $('#guest-name').text("Tamu Spesial");
                    console.log("Kode tidak ditemukan di database");
                }
            },
            error: function(err) {
                console.error("Gagal Auto Fetch:", err);
                $('#guest-name').text("Tamu Undangan");
            }
        });
    }
});


// ============================================================
// 3. LOGIKA TOMBOL BUKA UNDANGAN
// ============================================================
async function openInvitation() {
    console.log("Tombol diklik...");

    // SKENARIO A: Data sudah berhasil diambil otomatis tadi (Auto Fetch)
    if (isDataLoaded) {
        bukaPintu(); // Langsung buka tanpa loading
        return;
    }

    // SKENARIO B: Data belum ada (Mungkin buka tanpa link kode, atau internet lemot tadi)
    // Maka kita lakukan cara manual seperti sebelumnya
    
    const urlParams = new URLSearchParams(window.location.search);
    let code = urlParams.get('code');

    // Jika kode tidak ada di URL, minta input manual
    if (!code) {
        const input = await Swal.fire({
            title: 'Masukkan Kode',
            input: 'text',
            inputPlaceholder: 'Cth: NVAD21',
            confirmButtonText: 'Buka',
            confirmButtonColor: '#b88746',
            allowOutsideClick: false,
            inputValidator: (value) => { if (!value) return 'Wajib diisi!' }
        });
        if (input.isConfirmed) code = input.value;
        else return;
    }

    // Fetch Manual dengan Loading Screen
    Swal.fire({
        title: 'Memverifikasi...',
        didOpen: () => { Swal.showLoading() }
    });

    $.ajax({
        url: SCRIPT_URL,
        type: "GET",
        data: { action: "check", code: code },
        dataType: "json",
        success: function(data) {
            Swal.close();
            if (data.status === 'success') {
                // Update Data
                currentUserCode = code;
                currentUserName = data.nama;
                
                $('#guest-name').text(data.nama);
                $('#display-nama').text(data.nama);
                $('#display-grup').text(data.grup);
                
                bukaPintu(); // Jalankan animasi
            } else {
                Swal.fire('Error', 'Kode tidak ditemukan.', 'error');
            }
        },
        error: function() {
            Swal.fire('Error', 'Gagal koneksi.', 'error');
        }
    });
}

// Fungsi animasi buka (biar rapi dipisah)
function bukaPintu() {
    $('#cover').addClass('open');
    $('.music-box').addClass('show');
    playMusic();
    $('body').css('overflow-y', 'auto');
    $('body').css('overflow-x', 'hidden');
}


// ============================================================
// 4. LOGIKA KIRIM RSVP
// ============================================================
function submitRSVP(event) {
    event.preventDefault();
    
    const kehadiran = $('#kehadiran').val();
    const ucapan = $('#ucapan').val();
    const btn = $('#btn-submit-rsvp');
    const originalText = btn.html();

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
                $('#rsvp-form-container').hide();
                $('#qr-result-container').show();

                // Generate QR
                const qrContainer = document.getElementById("qrcode");
                qrContainer.innerHTML = "";
                if(typeof QRCode !== 'undefined') {
                    new QRCode(qrContainer, {
                        text: currentUserCode,
                        width: 160, height: 160,
                        colorDark : "#b88746",
                        colorLight : "#ffffff",
                        correctLevel : QRCode.CorrectLevel.H
                    });
                }
                Swal.fire({ icon: 'success', title: 'Tersimpan!', confirmButtonColor: '#b88746' });
            } else {
                alert("Gagal simpan.");
                btn.html(originalText).prop('disabled', false);
            }
        },
        error: function() {
            Swal.fire('Error', 'Gagal kirim.', 'error');
            btn.html(originalText).prop('disabled', false);
        }
    });
}


// ============================================================
// 5. FITUR LAIN (QR DOWNLOAD, MUSIK, SALIN REK)
// ============================================================
function downloadQR() {
    const qrCanvas = document.querySelector('#qrcode canvas');
    if(qrCanvas) {
        const link = document.createElement('a');
        link.href = qrCanvas.toDataURL("image/png");
        link.download = `QR_Wedding_${currentUserName}.png`;
        link.click();
    } else {
        // Fallback img
        const qrImg = document.querySelector('#qrcode img');
        if(qrImg) {
            const link = document.createElement('a');
            link.href = qrImg.src;
            link.download = `QR_Wedding_${currentUserName}.png`;
            link.click();
        }
    }
}

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