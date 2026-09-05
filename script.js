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
       1. 导航：滚动阴影 + 移动端菜单 + 滚动高亮
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
            'background:#0071e3;color:#fff;padding:2px 8px;border-radius:6px 0 0 6px;font-weight:700;',
            'background:#000;color:#2997ff;padding:2px 8px;border-radius:0 6px 6px 0;'
        );
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
