import './bootstrap';

const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content ?? '';
const storeKey = 'candy-ai.conversations';
const themeKey = 'candy-ai.theme';
const candyAssets = {
    ready: '/candy/3d888a04-5d83-459c-bc6a-33a2b3ed8845.png',
    wave: '/candy/1e2a3216-0dfb-4f6e-8533-4505b5704205.png',
    thinking: '/candy/45ee234c-aeb4-4059-9854-c13ed4ed37ae.png',
    excited: '/candy/50d06e16-8ff7-4337-ab12-c9d6122af64e.png',
    shy: '/candy/435f56e7-8469-4fdf-a33e-ae234fc410ac.png',
};
const maxAttachments = 6;
const maxImageSide = 1600;
const maxImageBytes = 2_200_000;
const maxTextFileBytes = 1_000_000;
const maxTextChars = 80_000;
const readableExtensions = new Set([
    'txt', 'md', 'csv', 'json', 'log', 'html', 'css', 'js', 'jsx', 'ts', 'tsx',
    'php', 'blade.php', 'py', 'java', 'cs', 'cpp', 'c', 'sql', 'xml', 'yml',
    'yaml', 'ini', 'env',
]);

function randomId() {
    const webCrypto = globalThis.crypto;

    if (typeof webCrypto?.randomUUID === 'function') {
        return webCrypto.randomUUID();
    }

    const bytes = new Uint8Array(16);
    if (typeof webCrypto?.getRandomValues === 'function') {
        webCrypto.getRandomValues(bytes);
    } else {
        for (let index = 0; index < bytes.length; index += 1) {
            bytes[index] = Math.floor(Math.random() * 256);
        }
    }

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const state = {
    conversations: [],
    activeId: null,
    settings: null,
    mode: 'chat',
    abortController: null,
    busy: false,
    pendingAttachments: [],
    attachmentNotice: '',
};

const el = {
    app: document.querySelector('[data-app]'),
    sidebar: document.querySelector('[data-sidebar]'),
    sidebarToggle: document.querySelector('[data-sidebar-toggle]'),
    controlsToggle: document.querySelector('[data-controls-toggle]'),
    historyList: document.querySelector('[data-history-list]'),
    newChat: document.querySelector('[data-new-chat]'),
    clearHistory: document.querySelector('[data-clear-history]'),
    messages: document.querySelector('[data-messages]'),
    composer: document.querySelector('[data-composer]'),
    prompt: document.querySelector('[data-prompt]'),
    attachButton: document.querySelector('[data-attach-button]'),
    fileInput: document.querySelector('[data-file-input]'),
    attachmentTray: document.querySelector('[data-attachment-tray]'),
    sendButton: document.querySelector('[data-send-button]'),
    stopButton: document.querySelector('[data-stop-button]'),
    themeToggle: document.querySelector('[data-theme-toggle]'),
    activeTitle: document.querySelector('[data-active-title]'),
    baseUrl: document.querySelector('[data-base-url]'),
    candyCompanion: document.querySelector('[data-candy-companion]'),
    candyMini: document.querySelector('[data-candy-mini]'),
    candyMood: document.querySelector('[data-candy-mood]'),
    candyLine: document.querySelector('[data-candy-line]'),
    candyTopline: document.querySelector('[data-candy-topline]'),
    keyStatus: document.querySelector('[data-key-status]'),
    chatModel: document.querySelector('[data-chat-model]'),
    imageModel: document.querySelector('[data-image-model]'),
    reasoning: document.querySelector('[data-reasoning]'),
    maxTokens: document.querySelector('[data-max-tokens]'),
    imageSize: document.querySelector('[data-image-size]'),
    systemPrompt: document.querySelector('[data-system-prompt]'),
    emptyTemplate: document.querySelector('[data-empty-template]'),
    aboutModal: document.querySelector('[data-about-modal]'),
    aboutOpeners: [...document.querySelectorAll('[data-about-open]')],
    aboutClosers: [...document.querySelectorAll('[data-about-close]')],
    modeButtons: [...document.querySelectorAll('[data-mode]')],
    chatFields: [...document.querySelectorAll('.chat-field')],
    imageFields: [...document.querySelectorAll('.image-field')],
};

boot();

async function boot() {
    applyTheme(localStorage.getItem(themeKey) || 'dark');
    loadConversations();
    bindEvents();
    renderHistory();
    renderMessages();
    autosizePrompt();
    await loadSettings();
    await loadModels();
}

function bindEvents() {
    el.themeToggle.addEventListener('click', () => {
        applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
    });

    el.sidebarToggle.addEventListener('click', () => {
        el.sidebar.classList.toggle('open');
    });

    el.controlsToggle.addEventListener('click', () => {
        el.app.classList.toggle('controls-open');
    });

    el.newChat.addEventListener('click', () => {
        createConversation();
        el.sidebar.classList.remove('open');
        updateCandyMood('ready');
    });

    el.clearHistory.addEventListener('click', clearConversations);

    el.aboutOpeners.forEach((button) => {
        button.addEventListener('click', openAbout);
    });

    el.aboutClosers.forEach((button) => {
        button.addEventListener('click', closeAbout);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !el.aboutModal.classList.contains('hidden')) {
            closeAbout();
        }
    });

    el.modeButtons.forEach((button) => {
        button.addEventListener('click', () => setMode(button.dataset.mode));
    });

    el.composer.addEventListener('submit', (event) => {
        event.preventDefault();
        if (state.mode === 'image') {
            generateImage();
            return;
        }

        sendChat();
    });

    el.prompt.addEventListener('input', () => {
        autosizePrompt();
        updateCandyMood();
    });
    el.prompt.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            el.composer.requestSubmit();
        }
    });

    el.attachButton.addEventListener('click', () => {
        if (!state.busy && state.mode === 'chat') {
            el.fileInput.click();
        }
    });

    el.fileInput.addEventListener('change', async (event) => {
        await addAttachments([...event.target.files]);
        el.fileInput.value = '';
    });

    el.attachmentTray.addEventListener('click', (event) => {
        const removeButton = event.target.closest('[data-remove-attachment]');
        if (removeButton) {
            removeAttachment(removeButton.dataset.removeAttachment);
        }
    });

    el.composer.addEventListener('dragover', (event) => {
        if (state.mode === 'chat' && event.dataTransfer?.types?.includes('Files')) {
            event.preventDefault();
            el.composer.classList.add('dragging');
        }
    });

    el.composer.addEventListener('dragleave', () => {
        el.composer.classList.remove('dragging');
    });

    el.composer.addEventListener('drop', async (event) => {
        el.composer.classList.remove('dragging');

        if (state.mode !== 'chat' || !event.dataTransfer?.files?.length) {
            return;
        }

        event.preventDefault();
        await addAttachments([...event.dataTransfer.files]);
    });

    el.prompt.addEventListener('paste', async (event) => {
        const files = [...(event.clipboardData?.files || [])];
        if (state.mode === 'chat' && files.length) {
            await addAttachments(files);
        }
    });

    el.stopButton.addEventListener('click', () => {
        state.abortController?.abort();
    });

    el.messages.addEventListener('click', (event) => {
        const promptButton = event.target.closest('.prompt-grid button');
        if (promptButton) {
            el.prompt.value = promptButton.textContent.trim();
            autosizePrompt();
            el.prompt.focus();
            return;
        }

        const copyButton = event.target.closest('[data-copy]');
        if (copyButton) {
            navigator.clipboard.writeText(copyButton.dataset.copy || '');
            copyButton.textContent = 'Copied';
            setTimeout(() => {
                copyButton.textContent = 'Copy';
            }, 900);
        }
    });
}

function openAbout() {
    el.aboutModal.classList.remove('hidden');
    el.aboutModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
}

function closeAbout() {
    el.aboutModal.classList.add('hidden');
    el.aboutModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
}

function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(themeKey, theme);
}

async function loadSettings() {
    try {
        const data = await fetchJson('/api/candy/settings');
        state.settings = data;
        el.baseUrl.textContent = data.baseUrl;
        el.keyStatus.textContent = data.hasApiKey ? 'Ready' : 'API key missing';
        applyTokenSettings(data);
    } catch (error) {
        el.keyStatus.textContent = 'Offline';
    }
}

function applyTokenSettings(settings) {
    const maxTokens = Number(settings?.maxTokens || 32000);
    const defaultMaxTokens = Number(settings?.defaultMaxTokens || 12000);

    el.maxTokens.max = String(maxTokens);
    el.maxTokens.value = String(Math.min(Math.max(defaultMaxTokens, 128), maxTokens));
}

async function loadModels() {
    fillSelect(el.chatModel, [state.settings?.defaultChatModel || 'claude-sonnet-4.5']);
    fillSelect(el.imageModel, [state.settings?.defaultImageModel || 'canva-image']);

    if (!state.settings?.hasApiKey) {
        return;
    }

    try {
        const data = await fetchJson('/api/candy/models');
        const models = normalizeModels(data);
        const chatModels = models.filter((model) => !/image|canva|draw|sdxl|flux/i.test(model));
        const imageModels = models.filter((model) => /image|canva|draw|sdxl|flux/i.test(model));

        fillSelect(el.chatModel, chatModels.length ? chatModels : models, state.settings.defaultChatModel);
        fillSelect(el.imageModel, imageModels.length ? imageModels : [state.settings.defaultImageModel], state.settings.defaultImageModel);
    } catch (error) {
        el.keyStatus.textContent = 'Models unavailable';
    }
}

function normalizeModels(data) {
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

    return [...new Set(list
        .map((item) => typeof item === 'string' ? item : item.id || item.name || item.model)
        .filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
}

function fillSelect(select, models, preferred = null) {
    const current = select.value || preferred;
    select.replaceChildren(...models.map((model) => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        return option;
    }));

    if (models.includes(current)) {
        select.value = current;
    } else if (preferred && models.includes(preferred)) {
        select.value = preferred;
    }
}

function setMode(mode) {
    state.mode = mode;
    el.modeButtons.forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
    el.chatFields.forEach((node) => node.classList.toggle('hidden', mode !== 'chat'));
    el.imageFields.forEach((node) => node.classList.toggle('hidden', mode !== 'image'));
    el.prompt.placeholder = mode === 'image' ? 'Describe an image' : 'Message Candy AI';

    if (mode !== 'chat') {
        state.pendingAttachments = [];
        state.attachmentNotice = '';
        renderAttachmentTray();
    }

    if (window.matchMedia('(max-width: 640px)').matches) {
        el.app.classList.remove('controls-open');
    }

    updateCandyMood(mode === 'image' ? 'image' : undefined);
}

function loadConversations() {
    try {
        state.conversations = JSON.parse(localStorage.getItem(storeKey) || '[]');
    } catch {
        state.conversations = [];
    }

    if (!state.conversations.length) {
        createConversation(false);
    }

    state.activeId = state.conversations[0]?.id ?? null;
}

function saveConversations() {
    try {
        localStorage.setItem(storeKey, JSON.stringify(serializableConversations(40)));
    } catch {
        try {
            localStorage.setItem(storeKey, JSON.stringify(serializableConversations(12)));
        } catch {
            // Keep the current chat in memory if browser storage is full.
        }
    }
}

function serializableConversations(limit) {
    return state.conversations.slice(0, limit).map((conversation) => ({
        ...conversation,
        messages: conversation.messages.map((message) => ({
            ...message,
            attachments: message.attachments?.map((attachment) => ({
                id: attachment.id,
                kind: attachment.kind,
                name: attachment.name,
                size: attachment.size,
                mimeType: attachment.mimeType,
                truncated: attachment.truncated || false,
            })),
        })),
    }));
}

function createConversation(render = true) {
    const conversation = {
        id: randomId(),
        title: 'New chat',
        createdAt: Date.now(),
        messages: [],
    };

    state.conversations.unshift(conversation);
    state.activeId = conversation.id;
    saveConversations();

    if (render) {
        renderHistory();
        renderMessages();
    }
}

function activeConversation() {
    return state.conversations.find((item) => item.id === state.activeId);
}

function titleFromPrompt(prompt) {
    const clean = prompt.replace(/\s+/g, ' ').trim();
    return clean.length > 48 ? `${clean.slice(0, 48)}...` : clean || 'New chat';
}

function renderHistory() {
    const hasConversationContent = state.conversations.some((conversation) => {
        return conversation.messages.length || conversation.title !== 'New chat';
    });
    el.clearHistory.disabled = state.conversations.length <= 1 && !hasConversationContent;

    el.historyList.replaceChildren(...state.conversations.map((conversation) => {
        const item = document.createElement('div');
        item.className = `history-item${conversation.id === state.activeId ? ' active' : ''}`;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'history-button';
        button.textContent = conversation.title;
        button.title = conversation.title;
        button.addEventListener('click', () => {
            state.activeId = conversation.id;
            el.sidebar.classList.remove('open');
            renderHistory();
            renderMessages();
            updateCandyMood();
        });

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'delete-history-button';
        remove.dataset.deleteConversation = conversation.id;
        remove.setAttribute('aria-label', `Hapus ${conversation.title}`);
        remove.title = 'Hapus chat';
        remove.textContent = 'x';
        remove.addEventListener('click', (event) => {
            event.stopPropagation();
            deleteConversation(conversation.id);
        });

        item.append(button, remove);

        return item;
    }));
}

function deleteConversation(id) {
    const conversation = state.conversations.find((item) => item.id === id);
    if (!conversation) {
        return;
    }

    if (conversation.messages.length && !window.confirm('Hapus percakapan ini?')) {
        return;
    }

    state.conversations = state.conversations.filter((item) => item.id !== id);

    if (state.activeId === id) {
        state.abortController?.abort();
        setBusy(false);
        state.activeId = state.conversations[0]?.id ?? null;
    }

    if (!state.conversations.length) {
        createConversation(false);
    } else {
        saveConversations();
    }

    renderHistory();
    renderMessages();
    updateCandyMood('ready');
}

function clearConversations() {
    const hasConversationContent = state.conversations.some((conversation) => {
        return conversation.messages.length || conversation.title !== 'New chat';
    });

    if (state.conversations.length <= 1 && !hasConversationContent) {
        return;
    }

    if (!window.confirm('Hapus semua riwayat chat di browser ini?')) {
        return;
    }

    state.abortController?.abort();
    setBusy(false);
    state.pendingAttachments = [];
    state.attachmentNotice = '';
    state.conversations = [];
    createConversation(false);
    renderAttachmentTray();
    renderHistory();
    renderMessages();
    updateCandyMood('ready');
}

function renderMessages() {
    const conversation = activeConversation();
    el.activeTitle.textContent = conversation?.title || 'Candy AI';
    el.messages.replaceChildren();

    if (!conversation?.messages.length) {
        el.messages.append(el.emptyTemplate.content.cloneNode(true));
        updateCandyMood('ready');
        return;
    }

    conversation.messages.forEach((message) => {
        el.messages.append(createMessageNode(message));
    });

    scrollToBottom();
    updateCandyMood();
}

function createMessageNode(message) {
    const row = document.createElement('article');
    row.className = `message-row ${message.role}`;

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    if (message.role === 'assistant') {
        const face = document.createElement('img');
        face.src = message.loading ? candyAssets.thinking : candyAssets.wave;
        face.alt = 'Candy';
        avatar.append(face);
    } else {
        avatar.textContent = 'You';
    }

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    const header = document.createElement('div');
    header.className = 'bubble-header';

    const label = document.createElement('span');
    label.textContent = message.role === 'user' ? 'You' : 'Candy AI';
    header.append(label);

    if (message.role === 'assistant' && message.content) {
        const copy = document.createElement('button');
        copy.className = 'copy-button';
        copy.type = 'button';
        copy.textContent = 'Copy';
        copy.dataset.copy = message.content;
        header.append(copy);
    }

    bubble.append(header);
    appendMessageAttachments(bubble, message.attachments);

    if (message.loading) {
        const typing = document.createElement('div');
        typing.className = 'typing';
        typing.innerHTML = '<span></span><span></span><span></span>';
        bubble.append(typing);
    } else if (message.images?.length) {
        const grid = document.createElement('div');
        grid.className = 'image-grid';
        message.images.forEach((src) => {
            const img = document.createElement('img');
            img.src = src;
            img.alt = message.prompt || 'Generated image';
            grid.append(img);
        });
        bubble.append(grid);
    } else if (message.content) {
        const content = document.createElement('div');
        content.className = 'content';
        content.innerHTML = renderMarkdown(message.content || '');
        bubble.append(content);
    }

    if (message.notice) {
        bubble.append(createNoticeNode(message.notice));
    }

    row.append(avatar, bubble);
    return row;
}

function createNoticeNode(text) {
    const notice = document.createElement('div');
    notice.className = 'response-note';
    notice.textContent = text;

    return notice;
}

function appendMessageAttachments(container, attachments = []) {
    const visible = attachments.filter((attachment) => attachment.kind === 'image' || attachment.kind === 'text');
    if (!visible.length) {
        return;
    }

    const list = document.createElement('div');
    list.className = 'message-attachments';

    visible.forEach((attachment) => {
        list.append(createAttachmentPreview(attachment, 'message'));
    });

    container.append(list);
}

function createAttachmentPreview(attachment, variant = 'pending') {
    const item = document.createElement('div');
    item.className = variant === 'message' ? 'message-attachment' : 'pending-attachment';

    if (attachment.kind === 'image' && attachment.dataUrl) {
        const img = document.createElement('img');
        img.src = attachment.dataUrl;
        img.alt = attachment.name;
        item.append(img);
    } else {
        const thumb = document.createElement('div');
        thumb.className = 'file-thumb';
        thumb.textContent = attachment.kind === 'image' ? 'IMG' : extensionLabel(attachment.name);
        item.append(thumb);
    }

    const details = document.createElement('div');
    details.className = 'attachment-details';

    const name = document.createElement('span');
    name.className = 'attachment-name';
    name.textContent = attachment.name;

    const meta = document.createElement('span');
    meta.className = 'attachment-meta';
    meta.textContent = attachmentMeta(attachment);

    details.append(name, meta);
    item.append(details);

    if (variant === 'pending') {
        const remove = document.createElement('button');
        remove.className = 'remove-attachment';
        remove.type = 'button';
        remove.dataset.removeAttachment = attachment.id;
        remove.setAttribute('aria-label', `Remove ${attachment.name}`);
        remove.textContent = 'x';
        item.append(remove);
    }

    return item;
}

async function addAttachments(files) {
    if (!files.length || state.busy) {
        return;
    }

    state.attachmentNotice = '';

    const openSlots = maxAttachments - state.pendingAttachments.length;
    if (openSlots <= 0) {
        state.attachmentNotice = `Maksimal ${maxAttachments} attachment per pesan.`;
        renderAttachmentTray();

        return;
    }

    const selected = files.slice(0, openSlots);
    const skipped = files.length - selected.length;
    const errors = [];

    for (const file of selected) {
        try {
            state.pendingAttachments.push(await prepareAttachment(file));
        } catch (error) {
            errors.push(error.message);
        }
    }

    if (skipped > 0) {
        errors.push(`${skipped} file dilewati karena batas ${maxAttachments} attachment.`);
    }

    state.attachmentNotice = errors[0] || '';
    renderAttachmentTray();
}

async function prepareAttachment(file) {
    if (file.type.startsWith('image/')) {
        return prepareImageAttachment(file);
    }

    if (isReadableTextFile(file)) {
        return prepareTextAttachment(file);
    }

    throw new Error(`${file.name} belum bisa dibaca. Gunakan gambar atau file teks/kode.`);
}

async function prepareImageAttachment(file) {
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
        throw new Error(`${file.name} belum didukung sebagai gambar chat.`);
    }

    const dataUrl = await imageDataUrl(file);

    return {
        id: randomId(),
        kind: 'image',
        name: file.name,
        mimeType: mimeTypeFromDataUrl(dataUrl) || file.type,
        size: Math.round((dataUrl.length * 3) / 4),
        dataUrl,
    };
}

async function prepareTextAttachment(file) {
    if (file.size > maxTextFileBytes) {
        throw new Error(`${file.name} terlalu besar. Batas file teks ${formatBytes(maxTextFileBytes)}.`);
    }

    const raw = await file.text();
    const truncated = raw.length > maxTextChars;
    const text = truncated
        ? `${raw.slice(0, maxTextChars)}\n\n[File dipotong karena melebihi ${maxTextChars.toLocaleString('id-ID')} karakter.]`
        : raw;

    return {
        id: randomId(),
        kind: 'text',
        name: file.name,
        mimeType: file.type || 'text/plain',
        size: file.size,
        text,
        truncated,
    };
}

async function imageDataUrl(file) {
    const original = await readAsDataUrl(file);

    if (file.type === 'image/gif' && file.size <= maxImageBytes) {
        return original;
    }

    const image = await loadImage(original);
    const scale = Math.min(1, maxImageSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    if (scale === 1 && file.size <= maxImageBytes) {
        return original;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.86);
    if (!blob) {
        return original;
    }

    return readAsDataUrl(blob);
}

function readAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Gagal membaca file.'));
        reader.readAsDataURL(blob);
    });
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Gagal membaca gambar.'));
        image.src = src;
    });
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => {
        canvas.toBlob(resolve, type, quality);
    });
}

function isReadableTextFile(file) {
    if (file.type.startsWith('text/')) {
        return true;
    }

    return readableExtensions.has(fileExtension(file.name));
}

function removeAttachment(id) {
    state.pendingAttachments = state.pendingAttachments.filter((attachment) => attachment.id !== id);
    state.attachmentNotice = '';
    renderAttachmentTray();
}

function renderAttachmentTray() {
    el.attachmentTray.replaceChildren();

    if (!state.pendingAttachments.length && !state.attachmentNotice) {
        el.attachmentTray.classList.add('hidden');
        updateCandyMood();
        return;
    }

    state.pendingAttachments.forEach((attachment) => {
        el.attachmentTray.append(createAttachmentPreview(attachment));
    });

    if (state.attachmentNotice) {
        const notice = document.createElement('div');
        notice.className = 'attachment-notice';
        notice.textContent = state.attachmentNotice;
        el.attachmentTray.append(notice);
    }

    el.attachmentTray.classList.remove('hidden');
    updateCandyMood('attachment');
}

function attachmentMeta(attachment) {
    const type = attachment.kind === 'image' ? 'Gambar' : 'File teks';
    const suffix = attachment.truncated ? ' dipotong' : '';

    return `${type} - ${formatBytes(attachment.size)}${suffix}`;
}

function extensionLabel(name) {
    const extension = fileExtension(name);

    return (extension || 'FILE').slice(0, 4).toUpperCase();
}

function fileExtension(name) {
    const lower = name.toLowerCase();
    if (lower.endsWith('.blade.php')) {
        return 'blade.php';
    }

    return lower.includes('.') ? lower.split('.').pop() : '';
}

function mimeTypeFromDataUrl(dataUrl) {
    return dataUrl.match(/^data:([^;]+);base64,/)?.[1] || '';
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB'];
    let value = bytes;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }

    return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

async function sendChat() {
    const prompt = el.prompt.value.trim();
    const attachments = [...state.pendingAttachments];

    if ((!prompt && !attachments.length) || state.busy) {
        return;
    }

    if (!state.settings?.hasApiKey) {
        pushAssistantError('ENOWXAI_API_KEY belum diisi di .env.');
        return;
    }

    const conversation = activeConversation();
    if (!conversation) {
        createConversation(false);
    }

    const active = activeConversation();
    if (active.title === 'New chat') {
        active.title = titleFromPrompt(prompt || attachments.map((attachment) => attachment.name).join(', '));
    }

    active.messages.push({ role: 'user', content: prompt, attachments });
    const assistant = { role: 'assistant', content: '', loading: true };
    active.messages.push(assistant);

    el.prompt.value = '';
    state.pendingAttachments = [];
    state.attachmentNotice = '';
    renderAttachmentTray();
    autosizePrompt();
    setBusy(true);
    saveConversations();
    renderHistory();
    renderMessages();

    const payload = {
        model: el.chatModel.value,
        system: el.systemPrompt.value,
        messages: active.messages
            .filter((message) => ['user', 'assistant'].includes(message.role) && !message.loading && !message.images)
            .map((message) => ({ role: message.role, content: apiMessageContent(message) }))
            .filter((message) => hasMessageContent(message.content)),
        reasoning_effort: el.reasoning.value || undefined,
        max_tokens: selectedMaxTokens(),
    };

    state.abortController = new AbortController();
    let streamError = '';

    try {
        const response = await fetch('/api/candy/chat', {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify(payload),
            signal: state.abortController.signal,
        });

        if (!response.ok) {
            throw new Error(await readError(response));
        }

        assistant.loading = false;
        await readSse(response, {
            onDelta: (text) => {
                assistant.content += text;
                updateLastAssistant(active, assistant);
            },
            onMeta: ({ finishReason }) => {
                if (finishReason === 'length') {
                    assistant.notice = 'Jawaban berhenti karena batas token output. Naikkan Max jawaban ke 12000-32000 lalu kirim ulang untuk respons lebih lengkap.';
                    updateLastAssistant(active, assistant);
                }
            },
            onError: (message) => {
                streamError = message;
                assistant.notice = message;
                updateLastAssistant(active, assistant);
            },
        });
    } catch (error) {
        assistant.loading = false;
        if (error.name !== 'AbortError') {
            assistant.content = `Request failed: ${error.message}`;
        }
    } finally {
        if (streamError && !assistant.content) {
            assistant.content = `Request failed: ${streamError}`;
        }

        setBusy(false);
        saveConversations();
        renderMessages();
    }
}

function selectedMaxTokens() {
    const fallback = Number(state.settings?.defaultMaxTokens || 12000);
    const max = Number(state.settings?.maxTokens || el.maxTokens.max || 32000);
    const raw = Number(el.maxTokens.value || fallback);
    const value = Number.isFinite(raw) ? raw : fallback;

    return Math.min(Math.max(Math.round(value), 128), max);
}

function apiMessageContent(message) {
    const attachments = message.attachments || [];
    const imageParts = attachments
        .filter((attachment) => attachment.kind === 'image' && attachment.dataUrl)
        .map((attachment) => ({
            type: 'image_url',
            image_url: {
                url: attachment.dataUrl,
            },
        }));

    const fileText = attachments
        .filter((attachment) => attachment.kind === 'text' && attachment.text)
        .map((attachment) => [
            `Nama file: ${attachment.name}`,
            `Tipe: ${attachment.mimeType || 'text/plain'}`,
            'Isi file:',
            '```',
            attachment.text,
            '```',
        ].join('\n'))
        .join('\n\n');

    const text = [message.content || '', fileText ? `Attachment file:\n\n${fileText}` : '']
        .filter(Boolean)
        .join('\n\n');

    if (imageParts.length) {
        return [
            {
                type: 'text',
                text: text || 'Tolong analisis gambar yang saya upload.',
            },
            ...imageParts,
        ];
    }

    return text;
}

function hasMessageContent(content) {
    if (typeof content === 'string') {
        return content.trim() !== '';
    }

    if (Array.isArray(content)) {
        return content.length > 0;
    }

    return false;
}

async function generateImage() {
    const prompt = el.prompt.value.trim();
    if (!prompt || state.busy) {
        return;
    }

    if (!state.settings?.hasApiKey) {
        pushAssistantError('ENOWXAI_API_KEY belum diisi di .env.');
        return;
    }

    const conversation = activeConversation();
    if (conversation.title === 'New chat') {
        conversation.title = titleFromPrompt(prompt);
    }

    conversation.messages.push({ role: 'user', content: prompt });
    const assistant = { role: 'assistant', loading: true, content: '' };
    conversation.messages.push(assistant);
    el.prompt.value = '';
    autosizePrompt();
    setBusy(true);
    saveConversations();
    renderHistory();
    renderMessages();

    try {
        const data = await fetchJson('/api/candy/images', {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({
                model: el.imageModel.value,
                prompt,
                size: el.imageSize.value,
                n: 1,
            }),
        });

        assistant.loading = false;
        assistant.prompt = prompt;
        assistant.images = extractImages(data);
        assistant.content = assistant.images.length ? '' : JSON.stringify(data, null, 2);
    } catch (error) {
        assistant.loading = false;
        assistant.content = `Image request failed: ${error.message}`;
    } finally {
        setBusy(false);
        saveConversations();
        renderMessages();
    }
}

function extractImages(data) {
    const list = Array.isArray(data?.data) ? data.data : [];

    return list
        .map((item) => item.url || (item.b64_json ? `data:image/png;base64,${item.b64_json}` : null))
        .filter(Boolean);
}

function updateLastAssistant(conversation, assistant) {
    const rows = [...el.messages.querySelectorAll('.message-row')];
    const last = rows.at(-1);
    if (!last) {
        renderMessages();
        return;
    }

    const bubble = last.querySelector('.bubble');
    const header = bubble.querySelector('.bubble-header');
    bubble.replaceChildren(header);

    const content = document.createElement('div');
    content.className = 'content';
    content.innerHTML = renderMarkdown(assistant.content || '');
    bubble.append(content);

    if (assistant.notice) {
        bubble.append(createNoticeNode(assistant.notice));
    }

    scrollToBottom();
}

async function readSse(response, handlers) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const processFrame = (frame) => {
        const event = parseSseEvent(frame);

        if (event.text) {
            handlers.onDelta?.(event.text);
        }

        if (event.error) {
            handlers.onError?.(event.error);
        }

        if (event.finishReason || event.usage) {
            handlers.onMeta?.(event);
        }
    };

    while (true) {
        const { value, done } = await reader.read();
        if (done) {
            break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || '';

        events.forEach(processFrame);
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
        processFrame(buffer);
    }
}

function parseSseEvent(event) {
    const lines = event.split(/\r?\n/);
    const eventName = lines
        .find((line) => line.trim().startsWith('event:'))
        ?.split(':')
        .slice(1)
        .join(':')
        .trim();
    const dataLines = event
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .filter(Boolean);

    const joinedData = dataLines.join('\n');
    const payloads = dataLines.length > 1 && /^[\[{]/.test(joinedData.trim())
        ? [joinedData, ...dataLines]
        : [joinedData];
    let text = '';
    let error = '';
    let finishReason = '';
    let usage = null;
    const seen = new Set();

    payloads.forEach((line) => {
        if (seen.has(line)) {
            return;
        }

        seen.add(line);

        if (!line || line === '[DONE]') {
            return;
        }

        try {
            const json = JSON.parse(line);
            if (eventName === 'error' || json.error) {
                error = errorFromPayload(json) || 'Request failed while streaming.';
                return;
            }

            text += extractText(json);
            finishReason = finishReason || extractFinishReason(json);
            usage = usage || json.usage || json.response?.usage || null;
        } catch {
            if (!line.startsWith('{') && !line.startsWith('[')) {
                text += line;
            }
        }
    });

    return { text, error, finishReason, usage };
}

function extractText(json) {
    const choice = json.choices?.[0];

    return [
        textFromValue(choice?.delta?.content),
        textFromValue(choice?.message?.content),
        textFromValue(json.delta),
        textFromValue(json.output_text),
        textFromValue(json.item?.content),
        textFromValue(json.content),
        textFromValue(json.message?.content),
        textFromValue(json.completion),
    ].join('');
}

function textFromValue(value) {
    if (!value) {
        return '';
    }

    if (typeof value === 'string') {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(textFromValue).join('');
    }

    if (typeof value === 'object') {
        return textFromValue(value.text || value.output_text || value.content);
    }

    return '';
}

function extractFinishReason(json) {
    if (json.response?.status === 'incomplete' && json.response?.incomplete_details?.reason === 'max_output_tokens') {
        return 'length';
    }

    return json.choices?.[0]?.finish_reason
        || json.finish_reason
        || json.stop_reason
        || (json.type === 'message_stop' ? 'stop' : '');
}

function errorFromPayload(json) {
    const error = json.error;

    if (typeof error === 'string') {
        return error;
    }

    return error?.message || json.message || json.detail || '';
}

function renderMarkdown(value) {
    const escaped = escapeHtml(value);
    const blocks = [];
    const withBlocks = escaped.replace(/```([\s\S]*?)```/g, (_, code) => {
        const token = `@@CODE_BLOCK_${blocks.length}@@`;
        blocks.push(`<pre><code>${code.trim()}</code></pre>`);
        return token;
    });

    const rendered = withBlocks
        .split(/\n{2,}/)
        .map((paragraph) => {
            if (/^@@CODE_BLOCK_\d+@@$/.test(paragraph.trim())) {
                return paragraph.trim();
            }

            return `<p>${paragraph
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>')}</p>`;
        })
        .join('');

    return blocks.reduce((html, block, index) => html.replace(`@@CODE_BLOCK_${index}@@`, block), rendered);
}

function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function pushAssistantError(content) {
    const conversation = activeConversation();
    conversation.messages.push({ role: 'assistant', content });
    saveConversations();
    renderMessages();
}

function setBusy(busy) {
    state.busy = busy;
    el.sendButton.disabled = busy;
    el.stopButton.classList.toggle('hidden', !busy || state.mode === 'image');
    updateCandyMood(busy ? 'thinking' : undefined);
}

function updateCandyMood(forced = undefined) {
    if (!el.candyCompanion || !el.candyMood || !el.candyLine) {
        return;
    }

    const hasText = el.prompt.value.trim() !== '';
    const hasAttachments = state.pendingAttachments.length > 0;
    const mode = forced
        || (state.busy ? 'thinking' : '')
        || (state.mode === 'image' ? 'image' : '')
        || (hasAttachments ? 'attachment' : '')
        || (hasText ? 'typing' : '')
        || 'ready';

    const moods = {
        ready: {
            image: candyAssets.ready,
            mood: 'Ready to chat',
            line: 'Candy desk is open. Tell Candy anything.',
            top: 'midnight companion',
        },
        typing: {
            image: candyAssets.shy,
            mood: 'Listening closely',
            line: 'Candy is reading what you type.',
            top: 'watching your message',
        },
        attachment: {
            image: candyAssets.excited,
            mood: 'File spotted',
            line: 'Candy can look at images and read text files.',
            top: 'ready to inspect files',
        },
        thinking: {
            image: candyAssets.thinking,
            mood: 'Thinking...',
            line: 'Candy is preparing a proper answer.',
            top: 'typing back',
        },
        image: {
            image: candyAssets.excited,
            mood: 'Image studio',
            line: 'Describe the visual and Candy will generate it.',
            top: 'image mode',
        },
    };

    const current = moods[mode] || moods.ready;
    el.candyCompanion.src = current.image;
    el.candyMini.src = current.image;
    el.candyMood.textContent = current.mood;
    el.candyLine.textContent = current.line;
    el.candyTopline.textContent = current.top;
}

function autosizePrompt() {
    el.prompt.style.height = 'auto';
    el.prompt.style.height = `${Math.min(el.prompt.scrollHeight, 180)}px`;
}

function scrollToBottom() {
    el.messages.scrollTop = el.messages.scrollHeight;
}

function jsonHeaders() {
    return {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken,
    };
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            ...(options.headers || {}),
        },
        ...options,
    });

    if (!response.ok) {
        throw new Error(await readError(response));
    }

    return response.json();
}

async function readError(response) {
    try {
        const data = await response.json();
        return data.message || JSON.stringify(data);
    } catch {
        return response.text();
    }
}
