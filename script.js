/* =============================================================
   Stalir Website — 前端交互脚本
   模块：粒子背景 / 导航 / 滚动显现 / IP 复制 / 服务器状态 /
         卡片光效 / FAQ 折叠 / 返回顶部 / 整合包版本
   ============================================================= */
(function () {
    'use strict';

    /* ---------------------------------------------------------
       0. 全局配置
       --------------------------------------------------------- */
    const CONFIG = {
        serverIP: 'mc.stalir.cn',
        serverPort: 25565,
        // 整合包版本接口（GitHub Releases API）。留空则显示「见 QQ 群」。
        // 示例：'https://api.github.com/repos/<owner>/<repo>/releases/latest'
        modpackVersionApi: '',
        statusRefreshInterval: 60 * 1000 // 服务器状态自动刷新间隔
    };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* 工具：DOM 快捷选择 */
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

    /* ---------------------------------------------------------
       1. 粒子背景
       --------------------------------------------------------- */
    function initParticles() {
        const canvas = $('#particles');
        if (!canvas) return;
        if (prefersReducedMotion) {
            canvas.remove();
            return;
        }

        const ctx = canvas.getContext('2d');
        let w = 0;
        let h = 0;
        let rafId = null;
        let running = false;

        const COUNT = Math.min(70, Math.floor(window.innerWidth / 16));
        const particles = [];
        const MAX_DIST = 140;
        const MAX_DIST_SQ = MAX_DIST * MAX_DIST;
        let lastTime = 0;

        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        class Particle {
            constructor() { this.reset(); }
            reset() {
                this.x = Math.random() * w;
                this.y = Math.random() * h;
                this.size = Math.random() * 1.8 + 0.4;
                this.speedX = (Math.random() - 0.5) * 0.4;
                this.speedY = (Math.random() - 0.5) * 0.4;
                this.opacity = Math.random() * 0.45 + 0.08;
            }
            update(dt) {
                this.x += this.speedX * dt;
                this.y += this.speedY * dt;
                // 边界反弹：归位 + 反向，防止粒子卡在角落
                if (this.x < 0) { this.x = 0; this.speedX = Math.abs(this.speedX); }
                else if (this.x > w) { this.x = w; this.speedX = -Math.abs(this.speedX); }
                if (this.y < 0) { this.y = 0; this.speedY = Math.abs(this.speedY); }
                else if (this.y > h) { this.y = h; this.speedY = -Math.abs(this.speedY); }
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(180, 160, 255, ' + this.opacity + ')';
                ctx.fill();
            }
        }

        function drawLines() {
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            for (let i = 0; i < particles.length; i++) {
                const pi = particles[i];
                for (let j = i + 1; j < particles.length; j++) {
                    const pj = particles[j];
                    const dx = pi.x - pj.x;
                    const dy = pi.y - pj.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < MAX_DIST_SQ) {
                        const alpha = 0.08 * (1 - Math.sqrt(distSq) / MAX_DIST);
                        ctx.moveTo(pi.x, pi.y);
                        ctx.lineTo(pj.x, pj.y);
                        ctx.strokeStyle = 'rgba(180, 160, 255, ' + alpha + ')';
                    }
                }
            }
            ctx.stroke();
        }

        function frame(timestamp) {
            const dt = lastTime ? Math.min((timestamp - lastTime) / 16.667, 3) : 1;
            lastTime = timestamp;
            ctx.clearRect(0, 0, w, h);
            for (const p of particles) p.update(dt), p.draw();
            drawLines();
            rafId = requestAnimationFrame(frame);
        }

        function start() {
            if (running || document.hidden) return;
            running = true;
            lastTime = 0;
            rafId = requestAnimationFrame(frame);
        }
        function stop() {
            running = false;
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;
        }

        resize();
        for (let i = 0; i < COUNT; i++) particles.push(new Particle());
        start();

        window.addEventListener('resize', () => {
            resize();
            for (const p of particles) { p.x = Math.random() * w; p.y = Math.random() * h; }
        });
        document.addEventListener('visibilitychange', () => {
            document.hidden ? stop() : start();
        });
    }

    /* ---------------------------------------------------------
       2. 导航：滚动阴影 + 移动端菜单 + 滚动高亮
       --------------------------------------------------------- */
    function initNavigation() {
        const nav = $('#nav');
        const navToggle = $('#navToggle');
        const navLinks = $('#navLinks');
        const overlay = $('#mobileOverlay');
        const navAnchors = $$('[data-nav]');

        function setMenu(open) {
            navLinks.classList.toggle('open', open);
            navToggle.classList.toggle('active', open);
            navToggle.setAttribute('aria-expanded', String(open));
            overlay.classList.toggle('show', open);
            document.body.style.overflow = open ? 'hidden' : '';
        }

        // 滚动阴影
        let ticking = false;
        function onScrollNav() {
            nav.classList.toggle('scrolled', window.scrollY > 20);
            ticking = false;
        }
        window.addEventListener('scroll', () => {
            if (!ticking) { requestAnimationFrame(onScrollNav); ticking = true; }
        }, { passive: true });

        navToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
        overlay.addEventListener('click', () => setMenu(false));

        navAnchors.forEach(a => a.addEventListener('click', () => setMenu(false)));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') setMenu(false);
        });

        // 滚动高亮（Scrollspy）
        const sectionIds = navAnchors.map(a => a.getAttribute('href').slice(1));
        const sections = sectionIds
            .map(id => document.getElementById(id))
            .filter(Boolean);

        if ('IntersectionObserver' in window && sections.length) {
            const spy = new IntersectionObserver((entries) => {
                const visible = entries
                    .filter(e => e.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
                if (!visible.length) return;
                const id = visible[0].target.id;
                navAnchors.forEach(a => {
                    a.classList.toggle('active', a.getAttribute('href') === '#' + id);
                });
            }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

            sections.forEach(s => spy.observe(s));
        }
    }

    /* ---------------------------------------------------------
       3. 滚动显现动画
       --------------------------------------------------------- */
    function initReveal() {
        const els = $$('.reveal');
        if (prefersReducedMotion || !('IntersectionObserver' in window)) {
            els.forEach(el => el.classList.add('visible'));
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
        els.forEach(el => observer.observe(el));
    }

    /* ---------------------------------------------------------
       4. IP 复制
       --------------------------------------------------------- */
    function initCopyIp() {
        const heroIpBox = $('#heroIpBox');
        const heroIpCopied = $('#heroIpCopied');
        const joinCopyBtn = $('#joinCopyBtn');
        let toastTimer = null;

        function fallbackCopy(text) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            ta.setAttribute('readonly', '');
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (_) { /* ignore */ }
            document.body.removeChild(ta);
        }

        function copyIp() {
            const ip = CONFIG.serverIP;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(ip).catch(() => fallbackCopy(ip));
            } else {
                fallbackCopy(ip);
            }

            if (heroIpCopied) {
                heroIpCopied.classList.add('show');
                clearTimeout(toastTimer);
                toastTimer = setTimeout(() => heroIpCopied.classList.remove('show'), 2000);
            }
        }

        const trigger = (el) => {
            if (!el) return;
            el.addEventListener('click', copyIp);
            if (el === heroIpBox) {
                el.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copyIp(); }
                });
            }
        };
        trigger(heroIpBox);
        trigger(joinCopyBtn);
    }

    /* ---------------------------------------------------------
       5. 服务器状态检测（双 API + 玩家数 + 自动刷新）
       --------------------------------------------------------- */
    function initServerStatus() {
        const badge = $('#serverStatus');
        const statusDot = $('#statusDot');
        const statusText = $('#statusText');
        const badgeSep = $('#badgeSep');
        const badgeMeta = $('#badgeMeta');
        const statPlayers = $('#statPlayers');
        if (!badge) return;

        function setUI(state, meta) {
            const map = {
                checking: { cls: '', dot: 'spin', text: '检测中...' },
                online: { cls: 'online', dot: 'icon-check', text: '服务器在线' },
                offline: { cls: 'offline', dot: 'icon-x', text: '服务器离线' },
                error: { cls: 'api-error', dot: 'icon-x', text: '状态获取失败' }
            };
            const s = map[state] || map.error;

            badge.classList.remove('online', 'offline', 'api-error');
            if (s.cls) badge.classList.add(s.cls);
            statusText.textContent = s.text;
            statusDot.className = 'hero-badge-dot ' + s.dot;

            const hasMeta = state === 'online' && meta && meta.label;
            if (badgeSep) badgeSep.hidden = !hasMeta;
            if (badgeMeta) {
                badgeMeta.hidden = !hasMeta;
                if (hasMeta) badgeMeta.textContent = meta.label;
            }
            if (statPlayers) statPlayers.textContent = hasMeta ? meta.label : (state === 'online' ? '在线' : '—');
        }

        function readPlayers(raw) {
            const p = raw && raw.players;
            if (!p) return null;
            if (typeof p === 'number') return { online: p, max: null };
            const online = typeof p.online === 'number' ? p.online : (typeof p.now === 'number' ? p.now : null);
            const max = typeof p.max === 'number' ? p.max : null;
            if (online === null && max === null) return null;
            return { online, max };
        }

        function formatPlayers(players) {
            if (!players) return null;
            const { online, max } = players;
            if (online === null) return max !== null ? '/' + max : null;
            return max !== null ? online + '/' + max : String(online);
        }

        async function fetchMcapi() {
            const url = 'https://mcapi.us/server/status?ip=' + CONFIG.serverIP + '&port=' + CONFIG.serverPort;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('mcapi.us ' + resp.status);
            const data = await resp.json();
            return {
                online: !!data.online,
                players: readPlayers(data),
                timestamp: parseInt(data.last_updated, 10) || Math.floor(Date.now() / 1000),
                version: (data.server && data.server.name) || null
            };
        }

        async function fetchMcsrvstat() {
            const url = 'https://api.mcsrvstat.us/3/' + CONFIG.serverIP;
            const resp = await fetch(url, { headers: { 'User-Agent': 'StalirStatus/2.0' } });
            if (!resp.ok) throw new Error('mcsrvstat ' + resp.status);
            const data = await resp.json();
            return {
                online: !!data.online,
                players: readPlayers(data),
                timestamp: (data.debug && parseInt(data.debug.cachetime, 10)) || Math.floor(Date.now() / 1000),
                version: data.version || null
            };
        }

        async function fetchStatus() {
            setUI('checking');
            const [a, b] = await Promise.allSettled([fetchMcapi(), fetchMcsrvstat()]);
            const results = [a, b]
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value);

            if (!results.length) { setUI('error'); return; }

            // 优先采用时间戳更新的结果
            results.sort((x, y) => y.timestamp - x.timestamp);
            const best = results[0];

            if (!best.online) { setUI('offline'); return; }

            const label = formatPlayers(best.players);
            setUI('online', { label });
        }

        setUI('checking');
        fetchStatus();
        setInterval(() => {
            if (!document.hidden) fetchStatus();
        }, CONFIG.statusRefreshInterval);

        badge.addEventListener('click', fetchStatus);
    }

    /* ---------------------------------------------------------
       6. 插件卡片鼠标跟随光效
       --------------------------------------------------------- */
    function initCardGlow() {
        if (prefersReducedMotion) return;
        $$('.plugin-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--mouse-x', ((e.clientX - rect.left) / rect.width * 100) + '%');
                card.style.setProperty('--mouse-y', ((e.clientY - rect.top) / rect.height * 100) + '%');
            });
        });
    }

    /* ---------------------------------------------------------
       7. FAQ 折叠
       --------------------------------------------------------- */
    function initFaq() {
        $$('.faq-item').forEach(item => {
            const btn = $('.faq-question', item);
            const answer = $('.faq-answer', item);
            if (!btn || !answer) return;
            btn.addEventListener('click', () => {
                const isOpen = item.classList.toggle('open');
                btn.setAttribute('aria-expanded', String(isOpen));
                answer.style.maxHeight = isOpen ? answer.scrollHeight + 'px' : '0px';
            });
            // 窗口尺寸变化时校正展开项高度
            window.addEventListener('resize', () => {
                if (item.classList.contains('open')) answer.style.maxHeight = answer.scrollHeight + 'px';
            });
        });
    }

    /* ---------------------------------------------------------
       8. 返回顶部
       --------------------------------------------------------- */
    function initBackToTop() {
        const btn = $('#backToTop');
        if (!btn) return;
        let ticking = false;
        function update() {
            btn.classList.toggle('show', window.scrollY > 480);
            ticking = false;
        }
        window.addEventListener('scroll', () => {
            if (!ticking) { requestAnimationFrame(update); ticking = true; }
        }, { passive: true });
        btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' }));
    }

    /* ---------------------------------------------------------
       9. 整合包版本
       --------------------------------------------------------- */
    function initModpackVersion() {
        const value = $('#modpackVersionValue');
        if (!value) return;
        if (!CONFIG.modpackVersionApi) return; // 保持「见 QQ 群」占位

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);

        fetch(CONFIG.modpackVersionApi, { signal: ctrl.signal, headers: { Accept: 'application/vnd.github+json' } })
            .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(data => {
                const tag = data && data.tag_name;
                if (tag) value.textContent = 'v' + String(tag).replace(/^v/i, '');
            })
            .catch(() => { /* 失败时保持「见 QQ 群」 */ })
            .finally(() => clearTimeout(timer));
    }

    /* ---------------------------------------------------------
       启动
       --------------------------------------------------------- */
    function boot() {
        initParticles();
        initNavigation();
        initReveal();
        initCopyIp();
        initServerStatus();
        initCardGlow();
        initFaq();
        initBackToTop();
        initModpackVersion();

        // 轻量控制台签名（无刷屏日志）
        console.info(
            '%c Stalir %c 公益群组生存服 · mc.stalir.cn ',
            'background:#6c3ce1;color:#fff;padding:2px 8px;border-radius:4px 0 0 4px;font-weight:700;',
            'background:#0e0e18;color:#b8a0ff;padding:2px 8px;border-radius:0 4px 4px 0;'
        );
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
