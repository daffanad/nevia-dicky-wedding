// ============================================================
// 1. KONFIGURASI UTAMA
// ============================================================
// Link API Google Apps Script (UPDATED)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxS_jfzZ_WTl5ikqrW0QYIPs4D5JKW1bM4xnsNbepR5VeIFJBhWad4oxNIAclaXAkDaFg/exec";

// Variabel Global
let currentUserCode = "";
let currentUserName = "";
let isDataLoaded = false; // Penanda data sukses diambil

// Variabel Scanner
let html5QrcodeScanner;
let isCameraOn = false;

// Cek status load
console.log("Script Full Version Loaded!");

// Inisialisasi AOS
try {
    AOS.init({ once: true, offset: 100, duration: 1000 });
} catch (e) { console.warn("AOS init error", e); }


// ============================================================
// 2. AUTO FETCH (JALAN OTOMATIS SAAT WEBSITE DIBUKA)
// ============================================================
$(document).ready(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        $('#guest-name').html('<i class="fa-solid fa-spinner fa-spin"></i> Memuat...');

        $.ajax({
            url: SCRIPT_URL,
            type: "GET",
            data: { action: "check", code: code },
            dataType: "json",
            crossDomain: true,
            success: function(data) {
                if (data.status === 'success') {
                    console.log("Auto Fetch Berhasil:", data);
                    
                    currentUserCode = code;
                    currentUserName = data.nama;
                    isDataLoaded = true; 

                    // Update UI
                    $('#guest-name').text(data.nama);
                    $('#display-nama').text(data.nama);
                    $('#display-grup').text(data.grup);

                    // PENTING: Munculkan menu Scan karena sudah login
                    $('#scan-section').show(); 

                } else {
                    $('#guest-name').text("Tamu Spesial");
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
    // SKENARIO A: Data sudah ada (dari Auto Fetch)
    if (isDataLoaded) {
        bukaPintu();
        return;
    }

    // SKENARIO B: Data belum ada, ambil manual
    const urlParams = new URLSearchParams(window.location.search);
    let code = urlParams.get('code');

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
                currentUserCode = code;
                currentUserName = data.nama;
                
                $('#guest-name').text(data.nama);
                $('#display-nama').text(data.nama);
                $('#display-grup').text(data.grup);
                
                // Munculkan menu Scan
                $('#scan-section').show();

                bukaPintu(); 
            } else {
                Swal.fire('Error', 'Kode tidak ditemukan.', 'error');
            }
        },
        error: function() {
            Swal.fire('Error', 'Gagal koneksi.', 'error');
        }
    });
}

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
// 5. FITUR SELF CHECK-IN (SCANNER KAMERA)
// ============================================================
function toggleCamera() {
    const btn = document.getElementById('btn-scan-toggle');
    
    if (isCameraOn) {
        // Matikan Kamera
        if(html5QrcodeScanner) {
            html5QrcodeScanner.stop().then(() => {
                $('#reader').hide();
                btn.innerHTML = '<i class="fa-solid fa-camera me-2"></i> Buka Kamera Scan';
                btn.classList.remove('btn-danger');
                btn.classList.add('btn-gold');
                isCameraOn = false;
            }).catch(err => console.error("Stop failed", err));
        }
    } else {
        // Nyalakan Kamera
        $('#reader').show();
        btn.innerHTML = '<i class="fa-solid fa-stop me-2"></i> Stop Kamera';
        btn.classList.remove('btn-gold');
        btn.classList.add('btn-danger');
        isCameraOn = true;

        html5QrcodeScanner = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        // Scan menggunakan kamera belakang (environment)
        html5QrcodeScanner.start({ facingMode: "environment" }, config, onScanSuccess)
        .catch(err => {
            console.error("Camera start failed", err);
            Swal.fire('Izin Kamera Ditolak', 'Mohon izinkan akses kamera di browser Anda.', 'warning');
            toggleCamera(); // Reset tombol
        });
    }
}

function onScanSuccess(decodedText, decodedResult) {
    console.log(`Scan Result: ${decodedText}`);

    // Cek apakah QR Code adalah QR Pintu
    if (decodedText === "DOOR_CHECKIN" || decodedText === "DOOR_CHECKOUT") {
        
        // Matikan kamera otomatis setelah scan berhasil
        toggleCamera();
        
        let statusType = (decodedText === "DOOR_CHECKIN") ? "Checked In" : "Checked Out";
        let pesanAlert = (decodedText === "DOOR_CHECKIN") ? "Selamat Datang!" : "Hati-hati di jalan!";

        Swal.fire({
            title: 'Memproses...',
            text: 'Mengupdate status kehadiran...',
            didOpen: () => Swal.showLoading()
        });

        // Kirim update ke Google Sheet
        $.ajax({
            url: SCRIPT_URL,
            type: "POST",
            data: {
                action: 'update_status',
                code: currentUserCode, 
                status_type: statusType
            },
            dataType: "json",
            success: function(data) {
                if(data.status === 'success') {
                    Swal.fire({
                        icon: 'success',
                        title: pesanAlert,
                        text: `Status: ${data.message}`,
                        confirmButtonColor: '#b88746'
                    });
                    $('#scan-result').text(`Status Terakhir: ${data.message}`);
                    $('#scan-result').removeClass('bg-light').addClass('bg-success text-white');
                } else {
                    Swal.fire('Gagal', 'Gagal update status.', 'error');
                }
            },
            error: function() {
                Swal.fire('Error', 'Gagal koneksi server.', 'error');
            }
        });

    } else {
        // Jika scan QR sembarangan (bukan QR Pintu)
        // Kita beri feedback getar/suara kecil (opsional) atau alert
        // Disini kita abaikan atau beri alert kecil agar user tahu itu bukan QR pintu
        // Swal.fire({ title: 'QR Tidak Dikenali', text: 'Scan QR Pintu Masuk/Keluar', timer: 1000, showConfirmButton: false });
    }
}


// ============================================================
// 6. UTILITY (Download QR, Music, Copy)
// ============================================================
function downloadQR() {
    const qrCanvas = document.querySelector('#qrcode canvas');
    if(qrCanvas) {
        const link = document.createElement('a');
        link.href = qrCanvas.toDataURL("image/png");
        link.download = `QR_Wedding_${currentUserName}.png`;
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