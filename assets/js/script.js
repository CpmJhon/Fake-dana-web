// DOM Elements
const input = document.getElementById('nominalInput');
const generateBtn = document.getElementById('generateBtn');
const resultSection = document.getElementById('resultSection');
const resultImage = document.getElementById('resultImage');
const errorMsg = document.getElementById('errorMsg');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');

let currentBlob = null;

// Format Rupiah dengan titik
function formatRupiah(angka) {
    let numberString = angka.replace(/[^,\d]/g, '').toString();
    let split = numberString.split(',');
    let sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    let ribuan = split[0].substr(sisa).match(/\d{3}/gi);
    
    if (ribuan) {
        let separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }
    
    rupiah = split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;
    return rupiah;
}

// Event: Input formatting
input.addEventListener('input', function(e) {
    let value = this.value.replace(/\./g, '');
    if (value && !isNaN(value) && value.length > 0) {
        this.value = formatRupiah(value);
    } else {
        this.value = '';
    }
});

// Event: Enter key
input.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        handleGenerate();
    }
});

// Event: Focus - hide error
input.addEventListener('focus', function() {
    hideError();
});

// Show error message
function showError(message) {
    errorMsg.textContent = message;
    errorMsg.classList.add('show');
}

// Hide error message
function hideError() {
    errorMsg.classList.remove('show');
}

// Handle Generate button
async function handleGenerate() {
    // Get raw number without dots
    const rawNumber = input.value.replace(/\./g, '');
    
    hideError();

    // Validation
    if (!rawNumber || rawNumber.length === 0 || isNaN(rawNumber) || Number(rawNumber) <= 0) {
        showError('⚠ Masukkan nominal yang valid');
        input.focus();
        return;
    }

    // Loading state
    generateBtn.classList.add('loading');
    generateBtn.disabled = true;
    resultSection.classList.remove('show');

    try {
        // Call API endpoint (sesuai dengan struktur asli Anda)
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ angka: rawNumber })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Gagal generate gambar');
        }

        // Get blob from response
        const blob = await response.blob();
        currentBlob = blob;
        
        // Display image
        const imageUrl = URL.createObjectURL(blob);
        resultImage.src = imageUrl;
        resultSection.classList.add('show');
        
    } catch (error) {
        showError('⚠ ' + error.message);
        console.error('Generate error:', error);
    } finally {
        // Remove loading state
        generateBtn.classList.remove('loading');
        generateBtn.disabled = false;
    }
}

// Handle Download button
function handleDownload() {
    if (!currentBlob) return;
    
    const url = URL.createObjectURL(currentBlob);
    const a = document.createElement('a');
    a.href = url;
    
    // Filename based on nominal
    const nominal = input.value.replace(/\./g, '') || 'dana';
    a.download = `dana-${nominal}.png`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Cleanup
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
}

// Handle Reset button
function handleReset() {
    input.value = '';
    resultSection.classList.remove('show');
    
    // Cleanup blob URL
    if (resultImage.src && resultImage.src.startsWith('blob:')) {
        URL.revokeObjectURL(resultImage.src);
    }
    
    resultImage.src = '';
    currentBlob = null;
    hideError();
    input.focus();
}

// Event listeners
generateBtn.addEventListener('click', handleGenerate);
downloadBtn.addEventListener('click', handleDownload);
resetBtn.addEventListener('click', handleReset);

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (currentBlob) {
        URL.revokeObjectURL(resultImage.src);
    }
});