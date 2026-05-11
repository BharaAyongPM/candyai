<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="color-scheme" content="light dark">

        <title>Candy AI</title>

        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>
    <body class="candy-theme">
        <div class="app-shell" data-app>
            <aside class="sidebar" data-sidebar>
                <div class="brand-row">
                    <img class="brand-mark" src="/candy/1e2a3216-0dfb-4f6e-8533-4505b5704205.png" alt="Candy AI">
                    <div>
                        <div class="brand-name">Candy AI</div>
                        <div class="brand-status" data-key-status>Connecting</div>
                    </div>
                </div>

                <section class="companion-card">
                    <div class="companion-art-wrap">
                        <img class="companion-art" src="/candy/3d888a04-5d83-459c-bc6a-33a2b3ed8845.png" alt="Candy" data-candy-companion>
                    </div>
                    <div class="companion-copy">
                        <span class="presence-dot"></span>
                        <strong data-candy-mood>Ready to chat</strong>
                        <p data-candy-line>Pink desk is open. Tell Candy anything.</p>
                    </div>
                </section>

                <button class="new-chat-button" type="button" data-new-chat>
                    <span class="button-icon" aria-hidden="true">+</span>
                    <span>New chat</span>
                </button>

                <div class="history-list" data-history-list></div>

                <footer class="sidebar-footer">
                    <button class="clear-history-button" type="button" data-clear-history>Clear chats</button>
                    <button class="about-link-button" type="button" data-about-open>Tentang Candy AI</button>
                    <p>&copy; 2026 Candy AI by <a href="https://masbhara.my.id" target="_blank" rel="noopener">Mas Bhara</a></p>
                </footer>
            </aside>

            <main class="workspace">
                <header class="topbar">
                    <button class="icon-button mobile-only" type="button" data-sidebar-toggle aria-label="Toggle sidebar">
                        <span></span><span></span><span></span>
                    </button>

                    <div class="topbar-title">
                        <img class="topbar-candy" src="/candy/45ee234c-aeb4-4059-9854-c13ed4ed37ae.png" alt="" data-candy-mini>
                        <strong data-active-title>Candy AI</strong>
                        <span><span data-base-url>Proxy</span> · <span data-candy-topline>midnight companion</span></span>
                    </div>

                    <div class="topbar-actions">
                        <div class="segmented" role="tablist" aria-label="Mode">
                            <button class="segment active" type="button" data-mode="chat">Chat</button>
                            <button class="segment" type="button" data-mode="image">Image</button>
                        </div>

                        <button class="about-button" type="button" data-about-open>Tentang</button>

                        <button class="icon-button" type="button" data-theme-toggle aria-label="Toggle theme">
                            <span class="theme-glyph" aria-hidden="true"></span>
                        </button>

                        <button class="icon-button controls-toggle" type="button" data-controls-toggle aria-label="Toggle chat options" title="Chat options">
                            <span class="control-glyph" aria-hidden="true"></span>
                        </button>

                        <form method="POST" action="{{ route('logout') }}">
                            @csrf
                            <button class="logout-button" type="submit">Logout</button>
                        </form>
                    </div>
                </header>

                <section class="control-strip">
                    <label class="field chat-field">
                        <span>Model</span>
                        <select data-chat-model></select>
                    </label>

                    <label class="field image-field hidden">
                        <span>Image model</span>
                        <select data-image-model></select>
                    </label>

                    <label class="field compact-field chat-field">
                        <span>Reasoning</span>
                        <select data-reasoning>
                            <option value="">Default</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="max">Max</option>
                        </select>
                    </label>

                    <label class="field compact-field token-field chat-field">
                        <span>Max jawaban</span>
                        <input type="number" min="128" max="32000" step="128" value="12000" data-max-tokens>
                    </label>

                    <details class="token-guide chat-field">
                        <summary>Apa itu token?</summary>
                        <p>Token adalah potongan teks yang dihitung model AI. Kira-kira 1 token setara 3-4 karakter, jadi angka lebih besar memberi ruang jawaban lebih panjang, tetapi respons bisa lebih lama dan memakai kuota lebih banyak. Kalau jawaban berhenti di tengah seperti "Laravel adalah framework PHP yang", naikkan Max jawaban ke 12000-32000 lalu kirim ulang.</p>
                    </details>

                    <label class="field compact-field image-field hidden">
                        <span>Size</span>
                        <select data-image-size>
                            <option value="1024x1024">1024</option>
                            <option value="1024x1792">Portrait</option>
                            <option value="1792x1024">Landscape</option>
                        </select>
                    </label>
                </section>

                <section class="system-panel chat-field">
                    <textarea data-system-prompt rows="2" spellcheck="true">You are Candy AI, a helpful, direct, and friendly assistant.</textarea>
                </section>

                <section class="messages" data-messages></section>

                <form class="composer" data-composer>
                    <input class="file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif,.txt,.md,.csv,.json,.log,.html,.css,.js,.jsx,.ts,.tsx,.php,.blade.php,.py,.java,.cs,.cpp,.c,.sql,.xml,.yml,.yaml,.ini,.env" multiple data-file-input>
                    <div class="attachment-tray hidden chat-field" data-attachment-tray></div>
                    <button class="attach-button chat-field" type="button" data-attach-button aria-label="Attach files" title="Attach files">
                        <span class="attach-glyph" aria-hidden="true"></span>
                    </button>
                    <textarea data-prompt rows="1" placeholder="Message Candy AI"></textarea>
                    <button class="send-button" type="submit" data-send-button aria-label="Send">
                        <span class="send-arrow" aria-hidden="true"></span>
                    </button>
                    <button class="stop-button hidden" type="button" data-stop-button>Stop</button>
                </form>
            </main>
        </div>

        <div class="about-modal hidden" data-about-modal aria-hidden="true">
            <button class="about-backdrop" type="button" data-about-close aria-label="Tutup tentang Candy AI"></button>
            <section class="about-panel" role="dialog" aria-modal="true" aria-labelledby="about-title">
                <button class="about-close" type="button" data-about-close aria-label="Tutup">x</button>

                <div class="about-hero">
                    <img src="/candy/c9a979d9-0714-411f-8b90-9082b5639bff.png" alt="Candy AI">
                    <div>
                        <span>tentang</span>
                        <h2 id="about-title">Candy AI</h2>
                        <p>Ruang chat pribadi yang menghubungkan antarmuka Candy ke proxy AI enowxai untuk percakapan, pembacaan gambar, file teks, dan pembuatan gambar.</p>
                    </div>
                </div>

                <div class="about-body">
                    <div class="about-copy">
                        <h3>Apa itu Candy AI?</h3>
                        <p>Candy AI dibuat sebagai companion kerja yang ringan, responsif, dan langsung siap dipakai dari browser. Ia menyimpan riwayat percakapan di perangkat, menampilkan model yang tersedia dari server AI, dan menjaga pengalaman chat tetap rapi untuk ide, coding, gambar, dan eksplorasi harian.</p>
                        <p class="about-credit">Developed by <a href="https://masbhara.my.id" target="_blank" rel="noopener">Mas Bhara</a>.</p>
                    </div>

                    <div class="about-gallery" aria-label="Candy gallery">
                        <img src="/candy/3d888a04-5d83-459c-bc6a-33a2b3ed8845.png" alt="Candy siap membantu">
                        <img src="/candy/45ee234c-aeb4-4059-9854-c13ed4ed37ae.png" alt="Candy berpikir">
                        <img src="/candy/50d06e16-8ff7-4337-ab12-c9d6122af64e.png" alt="Candy antusias">
                    </div>
                </div>
            </section>
        </div>

        <template data-empty-template>
            <div class="empty-state">
                <div class="empty-hero">
                    <img class="empty-scene" src="/candy/c9a979d9-0714-411f-8b90-9082b5639bff.png" alt="Candy AI">
                    <div class="empty-copy">
                        <span class="empty-kicker">Candy is online</span>
                        <h1>Candy AI</h1>
                        <p>Chat, upload images, ask for code help, or just keep Candy company while you work.</p>
                    </div>
                </div>
                <div class="prompt-grid">
                    <button type="button">Candy, bantu debug Laravel aku pelan-pelan</button>
                    <button type="button">Lihat gambar ini dan jelaskan detailnya</button>
                    <button type="button">Temani aku bikin rencana kerja hari ini</button>
                    <button type="button">Bikin jawaban panjang yang rapi dan manis</button>
                </div>
            </div>
        </template>
    </body>
</html>
