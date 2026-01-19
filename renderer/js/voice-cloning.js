// ==========================================
// VOICE CLONING - ELECTRON APP
// ==========================================

let selectedLanguage = 'Auto';
let selectedGender = 'male';
let selectedFile = null;
let previewUrl = null;

// Default preview texts for each language
const defaultPreviewTexts = {
    "Auto": "Xin chao, hay nhap van ban bat ky va toi se tu dong nhan dien ngon ngu cua ban.",
    "English": "Hello, I'm delighted to assist you with our voice services. Choose a voice that resonates with you, and let's begin our creative audio journey together",
    "Vietnamese": "Xin chao, toi rat vui duoc ho tro ban voi cac dich vu giong noi cua chung toi. Hay chon mot giong noi phu hop voi ban va cung bat dau hanh trinh am thanh sang tao cua chung ta",
    "Chinese": "Nin hao, hen gaoxing neng wei nin tigong peiyin fuwu. Xuanze nin ganxingqu de yinse, rang women yiqi kaishi shengyin chuangzuo de qihuan zhi lu ba.",
    "Japanese": "Kono tabi wa, onsei seisei sabisu wo go riyo itadaki arigatou gozaimasu. O konomi no koe wo o erabi itadaki, onsei sousaku no tabi wo tanoshimimashou.",
    "Korean": "Annyeonghaseyo, eumseong seobiseureul jegonghae deuril su isseo gibbeubnida. Maeume deusineun moksori-reul seontaekhasimyeon hamkke meotjin eumseong jejageul sijakhaeborodo hakgesseupnida.",
    "French": "Bonjour, je suis ravi de vous accompagner dans nos services vocaux. Choisissez la voix qui vous inspire et creons ensemble votre projet sonore",
    "German": "Guten Tag, ich freue mich, Sie bei unseren Sprachdiensten unterstutzen zu durfen. Wahlen Sie Ihre bevorzugte Stimme aus und lassen Sie uns gemeinsam Ihre Audio-Welt gestalten",
    "Spanish": "Hola, es un placer ayudarte con nuestros servicios de voz. Elige el tono de voz que mas te guste y comencemos juntos esta aventura creativa",
    "Portuguese": "Ola, e um prazer ajuda-lo com nossos servicos de voz. Escolha a voz que mais combina com voce e vamos juntos criar algo especial",
    "Russian": "Zdravstvuyte, rad pomoch vam s nashimi golosovymi uslugami. Vyberite ponravivshiysya golos, i davayte vmeste sozdadim chto-to osobennoye.",
    "Italian": "Buongiorno, sono lieto di assistervi con i nostri servizi vocali. Scegliete la voce che preferite e iniziamo insieme questo percorso creativo",
    "Thai": "Sawadee kha/khrap yindee yang ying tee dai chuay khun kap borikan siang khong rao lueak siang tee cheuamyong laew ma roem ton kan dern thang sangsan dan siang pai duay kan",
    "Indonesian": "Selamat datang, senang bisa membantu Anda dengan layanan suara kami. Silakan pilih karakter suara yang Anda sukai dan mari mulai perjalanan kreatif bersama",
    "Arabic": "Marhaban, yusiduni an uqadim lakum khadamatina alsawtiya. Ikhtar alnabra allati tuthir ihtimamak, wadana nantalliq maan fi rihlatin sahiratin lishinaeat alsawt"
};

// ==========================================
// DOCUMENT READY
// ==========================================
$(document).ready(function() {
    $('#selectedLangText').text('Tu xac dinh');
    $('#previewText').attr('placeholder', `Mau cau: ${defaultPreviewTexts['Auto']}`);

    loadClonedVoices();
    updateCharCount();

    // Close dropdown when clicking outside
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.custom-dropdown').length) {
            $('.dropdown-options').removeClass('show');
            $('.dropdown-selected').removeClass('active');
        }
    });

    // Close modal when clicking outside
    $(document).on('click', '#deleteModal', function(e) {
        if (e.target.id === 'deleteModal') {
            closeDeleteModal();
        }
    });

    // Close modal on ESC
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape' && $('#deleteModal').is(':visible')) {
            closeDeleteModal();
        }
    });

    $('#removeNoiseToggle').prop('checked', true);
});

// ==========================================
// DROPDOWN & UI LOGIC
// ==========================================
function toggleDropdown(id, el) {
    $('.dropdown-options').not('#' + id).removeClass('show');
    $('.dropdown-selected').not(el).removeClass('active');
    $('#' + id).toggleClass('show');
    $(el).toggleClass('active');
}

function selectItem(type, value, htmlText, el) {
    if (type === 'lang') {
        selectedLanguage = value;
        $('#selectedLangText').html(htmlText);
        $('#langOptions input').val('');
        $('.dropdown-item').show();

        if ($('#previewText').val().trim() === '') {
            let sample = defaultPreviewTexts[value] || defaultPreviewTexts["English"];
            $('#previewText').attr('placeholder', `Mau cau: ${sample.substring(0, 40)}...`);
        }
    } else if (type === 'gender') {
        selectedGender = value;
        $('#selectedGenderText').html(htmlText);
    }

    $(el).closest('.dropdown-options').find('.dropdown-item').removeClass('selected');
    $(el).addClass('selected');
    $('.dropdown-options').removeClass('show');
    $('.dropdown-selected').removeClass('active');
}

function filterLang(input) {
    let filter = input.value.toUpperCase();
    let items = document.getElementById("langOptions").getElementsByClassName("dropdown-item");

    for (let i = 0; i < items.length; i++) {
        let txtValue = items[i].textContent || items[i].innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            items[i].style.display = "flex";
        } else {
            items[i].style.display = "none";
        }
    }
}

function updateCharCount() {
    const count = $('#previewText').val().length;
    $('#charCount').text(`${count} / 500`);
}

// ==========================================
// FILE HANDLING
// ==========================================
function handleFileSelect(input) {
    if (input.files && input.files.length > 0) {
        validateAndSetFile(input.files[0]);
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    $('#uploadBox').removeClass('drag-over');
    if (e.dataTransfer.files.length > 0) {
        $('#fileInput')[0].files = e.dataTransfer.files;
        validateAndSetFile(e.dataTransfer.files[0]);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    $('#uploadBox').addClass('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    $('#uploadBox').removeClass('drag-over');
}

function validateAndSetFile(file) {
    if (!file.name.toLowerCase().endsWith('.mp3')) {
        showToast('error', 'Sai dinh dang! Chi chap nhan file .MP3');
        $('#fileInput').val('');
        return;
    }

    if (file.size > 20 * 1024 * 1024) {
        showToast('error', 'File qua lon! Toi da 20MB.');
        $('#fileInput').val('');
        return;
    }

    const objectUrl = URL.createObjectURL(file);
    const testAudio = new Audio(objectUrl);

    testAudio.onloadedmetadata = function() {
        const duration = testAudio.duration;
        URL.revokeObjectURL(objectUrl);

        if (duration < 10) {
            showToast('error', `File qua ngan (${Math.floor(duration)}s). Toi thieu 10 giay!`);
            removeFile();
            return;
        }

        selectedFile = file;
        $('#uploadBox').hide();
        $('#fileInfo').css('display', 'block');
        $('#fileName').text(file.name);
        $('#fileSize').text((file.size / (1024 * 1024)).toFixed(2) + ' MB');

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(file);

        const audioPlayer = document.getElementById('audioPreviewPlayer');
        audioPlayer.src = previewUrl;

        showToast('success', `File hop le! (${Math.floor(duration)}s)`);
    };

    testAudio.onerror = function() {
        showToast('error', 'File loi khong the doc!');
        removeFile();
    };
}

function removeFile() {
    selectedFile = null;
    $('#fileInput').val('');
    $('#fileInfo').hide();
    $('#uploadBox').show();

    const audioPlayer = document.getElementById('audioPreviewPlayer');
    audioPlayer.pause();
    audioPlayer.src = "";
    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
    }
}

// ==========================================
// CREATE CLONE (MAIN FUNCTION)
// ==========================================
async function createClone() {
    const name = $('#cloneName').val().trim();
    const userEnteredText = $('#previewText').val().trim();
    const isRemoveNoise = $('#removeNoiseToggle').is(':checked');

    let finalPreviewText = userEnteredText;
    if (finalPreviewText === "") {
        finalPreviewText = defaultPreviewTexts[selectedLanguage] || defaultPreviewTexts["English"];
    }

    // Validation
    if (!name) {
        showToast('error', 'Vui long nhap ten giong noi!');
        $('#cloneName').focus();
        return;
    }
    if (name.length > 50) {
        showToast('error', 'Ten giong qua dai (Max 50 ky tu)');
        return;
    }
    if (!selectedFile) {
        showToast('error', 'Vui long chon file am thanh!');
        document.getElementById('uploadBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    if (finalPreviewText.length > 500) {
        showToast('error', 'Van ban mau qua dai (Max 500 ky tu)');
        return;
    }

    // Show loading
    $('#loadingOverlay').css('display', 'flex');
    $('#btnCreate').prop('disabled', true);

    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        $('#loadingBar').css('width', progress + '%');
    }, 500);

    try {
        // Read file as base64
        const fileBase64 = await fileToBase64(selectedFile);

        // Call Electron API
        const result = await window.electronAPI.cloneVoice({
            voice_name: name,
            gender: selectedGender,
            language: selectedLanguage,
            preview_text: finalPreviewText,
            need_noise_reduction: isRemoveNoise,
            file_data: fileBase64,
            file_name: selectedFile.name
        });

        clearInterval(progressInterval);
        $('#loadingBar').css('width', '100%');

        setTimeout(() => {
            $('#loadingOverlay').hide();
            $('#btnCreate').prop('disabled', false);
            $('#loadingBar').css('width', '0%');

            if (result.status === 'success') {
                showToast('success', 'Clone giong thanh cong!');

                // Reset form
                $('#cloneName').val('');
                $('#previewText').val('');
                $('#removeNoiseToggle').prop('checked', true);
                removeFile();
                updateCharCount();

                setTimeout(() => {
                    loadClonedVoices();
                }, 1000);
            } else {
                showToast('error', result.message || 'Co loi xay ra.');
            }
        }, 500);

    } catch (error) {
        clearInterval(progressInterval);
        $('#loadingOverlay').hide();
        $('#btnCreate').prop('disabled', false);
        $('#loadingBar').css('width', '0%');

        console.error('Error:', error);
        showToast('error', 'Loi ket noi hoac file khong hop le.');
    }
}

// Helper: Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ==========================================
// LOAD & RENDER VOICES
// ==========================================
async function loadClonedVoices() {
    try {
        const result = await window.electronAPI.getClonedVoices();

        if (result.status === 'success') {
            renderGrid(result.voices);
            $('#voiceCount').text(result.voices.length);
        } else {
            $('#clonedVoiceGrid').html(`
                <div class="empty-state">
                    <i class="bi bi-exclamation-triangle"></i>
                    <div class="title">Loi tai danh sach</div>
                    <div class="hint">${result.message}</div>
                </div>
            `);
        }
    } catch (error) {
        $('#clonedVoiceGrid').html(`
            <div class="empty-state">
                <i class="bi bi-wifi-off"></i>
                <div class="title">Loi ket noi</div>
            </div>
        `);
    }
}

function renderGrid(list) {
    if (!list || list.length === 0) {
        $('#clonedVoiceGrid').html(`
            <div class="empty-state">
                <i class="bi bi-mic-mute"></i>
                <div class="title">Chua co giong nao</div>
                <div class="hint">Bat dau tao giong nhan ban ngay!</div>
            </div>
        `);
        return;
    }

    let html = '';
    list.forEach(v => {
        let img = v.cover_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.voice_name)}&background=random&color=fff&bold=true`;

        let tagsHtml = '';

        if (v.language && v.language !== '0') {
            tagsHtml += `<span class="vc-tag">${v.language}</span>`;
        }

        if (v.gender && v.gender !== '0' && v.gender !== 0) {
            tagsHtml += `<span class="vc-tag" style="text-transform: capitalize;">${v.gender}</span>`;
        }

        let extraTags = v.tags || v.tag_list;
        if (extraTags && Array.isArray(extraTags)) {
            tagsHtml += extraTags
                .filter(t => t !== 'AI84' && t !== 'AI33')
                .map(t => `<span class="vc-tag">${t}</span>`)
                .join('');
        }

        let canPlay = !!v.sample_audio;

        html += `
        <div class="voice-card" id="voice-${v.voice_id}">
            <div class="vc-title" title="${v.voice_name}">${v.voice_name}</div>

            <div class="vc-tags">
                ${tagsHtml}
            </div>

            <div class="vc-footer-row">
                <img src="${img}" class="vc-avatar" onerror="this.src='https://ui-avatars.com/api/?name=V&background=333&color=fff'">

                <div class="vc-actions">
                    <button class="btn-icon-action delete" onclick="deleteVoice('${v.voice_id}')" title="Xoa">
                        <i class="bi bi-trash"></i>
                    </button>

                    <button class="btn-icon-action play" onclick="playPreview('${v.sample_audio || ''}')"
                            ${!canPlay ? 'disabled' : ''} title="Nghe thu">
                        <i class="bi bi-play-circle"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
    });
    $('#clonedVoiceGrid').html(html);
}

// ==========================================
// DELETE VOICE
// ==========================================
let voiceToDelete = { id: null, name: '' };

function deleteVoice(id) {
    const card = $(`#voice-${id}`);
    const voiceName = card.find('.vc-title').text();

    voiceToDelete = { id: id, name: voiceName };

    $('#voiceNameToDelete').text(voiceName);
    $('#deleteModal').fadeIn(200);
}

function closeDeleteModal() {
    $('#deleteModal').fadeOut(200);
    voiceToDelete = { id: null, name: '' };
}

async function confirmDelete() {
    if (!voiceToDelete.id) {
        showToast('error', 'Khong co giong nao duoc chon!');
        return;
    }

    $('#deleteModal').fadeOut(200);

    const id = voiceToDelete.id;
    const card = $(`#voice-${id}`);

    card.css('opacity', '0.5');

    try {
        const result = await window.electronAPI.deleteClonedVoice(id);

        if (result.status === 'success') {
            showToast('success', 'Da xoa giong thanh cong!');

            card.fadeOut(300, function() {
                $(this).remove();

                const count = parseInt($('#voiceCount').text());
                $('#voiceCount').text(Math.max(0, count - 1));

                if ($('.voice-card').length === 0) {
                    loadClonedVoices();
                }
            });
        } else {
            card.css('opacity', '1');
            showToast('error', result.message || 'Xoa that bai');
        }
    } catch (error) {
        console.error('Delete Error:', error);
        card.css('opacity', '1');
        showToast('error', 'Loi ket noi!');
    }

    voiceToDelete = { id: null, name: '' };
}

// ==========================================
// AUDIO PREVIEW
// ==========================================
let audioObj = document.getElementById('previewAudio');

function playPreview(url) {
    if (!url) {
        showToast('info', 'Khong co file nghe thu');
        return;
    }
    audioObj.src = url;
    audioObj.play();
    showToast('info', 'Dang phat mau giong...');
}

// ==========================================
// TOAST NOTIFICATION
// ==========================================
function showToast(type, message) {
    const toast = $('#toast');
    const icon = toast.find('.toast-icon');
    const text = toast.find('.toast-text');

    icon.removeClass('success error info warning bi-check-circle bi-x-circle bi-info-circle bi-exclamation-triangle');

    switch(type) {
        case 'success': icon.addClass('success bi-check-circle'); break;
        case 'error': icon.addClass('error bi-x-circle'); break;
        case 'info': icon.addClass('info bi-info-circle'); break;
        case 'warning': icon.addClass('warning bi-exclamation-triangle'); break;
    }

    text.text(message);
    toast.addClass('show');
    setTimeout(() => { toast.removeClass('show'); }, 3500);
}
