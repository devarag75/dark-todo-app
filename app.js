/* ============================================
   TaskForge — Main Application Logic
   ============================================ */

(function () {
    'use strict';

    // ---- Constants ----
    const STORAGE_KEY = 'taskforge_tasks';
    const SETTINGS_KEY = 'taskforge_settings';
    const HISTORY_KEY = 'taskforge_history';

    const QUOTES = [
        { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
        { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
        { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
        { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
        { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
        { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
        { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
        { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
        { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
        { text: "Small daily improvements are the key to staggering long-term results.", author: "Unknown" },
        { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
    ];

    const CATEGORY_EMOJIS = {
        college: '🎓', coding: '💻', personal: '🏠', health: '💪', projects: '🚀'
    };

    // ---- State ----
    let tasks = [];
    let currentFilter = 'all';
    let currentSort = 'date';
    let searchQuery = '';
    let editingTaskId = null;
    let confirmCallback = null;

    // ---- DOM References ----
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const dom = {
        app: $('#app'),
        splash: $('#splash-screen'),
        screens: $$('.screen'),
        navItems: $$('.nav-item'),
        // Home
        greeting: $('#greeting'),
        todayDate: $('#today-date'),
        progressText: $('#progress-text'),
        progressFill: $('#progress-fill'),
        filterTabs: $$('.filter-tab'),
        sortSelect: $('#sort-select'),
        taskList: $('#task-list'),
        emptyState: $('#empty-state'),
        searchToggle: $('#btn-search-toggle'),
        searchBar: $('#search-bar'),
        searchInput: $('#search-input'),
        searchClear: $('#btn-search-clear'),
        // Modal
        modalOverlay: $('#task-modal'),
        modalTitle: $('#modal-title'),
        taskForm: $('#task-form'),
        taskId: $('#task-id'),
        taskTitle: $('#task-title'),
        taskDesc: $('#task-desc'),
        taskDate: $('#task-date'),
        taskTime: $('#task-time'),
        taskReminder: $('#task-reminder'),
        priorityBtns: $$('.priority-btn'),
        catChips: $$('.cat-chip'),
        btnSave: $('#btn-save-task'),
        btnModalClose: $('#btn-modal-close'),
        // FAB
        fab: $('#fab'),
        // Confirm
        confirmOverlay: $('#confirm-dialog'),
        confirmTitle: $('#confirm-title'),
        confirmMessage: $('#confirm-message'),
        btnConfirmCancel: $('#btn-confirm-cancel'),
        btnConfirmOk: $('#btn-confirm-ok'),
        // Analytics
        statTotal: $('#stat-total'),
        statStreak: $('#stat-streak'),
        statToday: $('#stat-today'),
        statPending: $('#stat-pending'),
        weeklyChart: $('#weekly-chart'),
        dailyChart: $('#daily-chart'),
        quoteText: $('#quote-text'),
        quoteAuthor: $('#quote-author'),
        // Settings
        toggleDark: $('#toggle-dark'),
        toggleNotif: $('#toggle-notif'),
        accentPicker: $('#accent-picker'),
        accentDots: $$('.accent-dot'),
        btnBackup: $('#btn-backup'),
        btnRestore: $('#btn-restore'),
        restoreInput: $('#restore-input'),
        btnClearCompleted: $('#btn-clear-completed'),
        // Toast
        toast: $('#toast'),
    };

    // ---- Init ----
    function init() {
        loadTasks();
        loadSettings();
        updateGreeting();
        updateDate();
        renderTasks();
        bindEvents();
        // Show app after splash
        setTimeout(() => {
            dom.app.classList.remove('hidden');
        }, 2000);
        // Update quote
        setRandomQuote();
    }

    // ---- Storage ----
    function loadTasks() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            tasks = raw ? JSON.parse(raw) : [];
        } catch { tasks = []; }
    }

    function saveTasks() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }

    function loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) {
                const s = JSON.parse(raw);
                if (s.accent) setAccentColor(s.accent);
                if (s.notifications) dom.toggleNotif.checked = true;
            }
        } catch { }
    }

    function saveSettings() {
        const s = {
            accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
            notifications: dom.toggleNotif.checked,
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    }

    function getHistory() {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    }

    function saveHistory(history) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }

    function recordCompletion() {
        const today = todayStr();
        const history = getHistory();
        history[today] = (history[today] || 0) + 1;
        saveHistory(history);
    }

    // ---- Helpers ----
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    function todayStr() {
        return new Date().toISOString().split('T')[0];
    }

    function isToday(dateStr) {
        return dateStr === todayStr();
    }

    function isFuture(dateStr) {
        if (!dateStr) return false;
        return dateStr > todayStr();
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (dateStr === todayStr()) return 'Today';
        if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function formatTime(timeStr) {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${m} ${ampm}`;
    }

    // ---- Greeting ----
    function updateGreeting() {
        const hour = new Date().getHours();
        let greet = 'Good Evening';
        if (hour < 12) greet = 'Good Morning';
        else if (hour < 17) greet = 'Good Afternoon';
        dom.greeting.textContent = `${greet}, Devarag 👋`;
    }

    function updateDate() {
        const now = new Date();
        dom.todayDate.textContent = now.toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        });
    }

    // ---- Progress ----
    function updateProgress() {
        const today = todayStr();
        const todayTasks = tasks.filter(t => t.date === today);
        const completed = todayTasks.filter(t => t.completed);
        const pct = todayTasks.length > 0 ? Math.round((completed.length / todayTasks.length) * 100) : 0;
        dom.progressText.textContent = `${pct}%`;
        dom.progressFill.style.width = `${pct}%`;
    }

    // ---- Filter & Sort ----
    function getFilteredTasks() {
        let filtered = [...tasks];
        // Filter
        switch (currentFilter) {
            case 'today':
                filtered = filtered.filter(t => t.date === todayStr());
                break;
            case 'upcoming':
                filtered = filtered.filter(t => !t.completed && isFuture(t.date));
                break;
            case 'completed':
                filtered = filtered.filter(t => t.completed);
                break;
        }
        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.title.toLowerCase().includes(q) ||
                (t.description && t.description.toLowerCase().includes(q))
            );
        }
        // Sort
        filtered.sort((a, b) => {
            switch (currentSort) {
                case 'date':
                    if (!a.date && !b.date) return 0;
                    if (!a.date) return 1;
                    if (!b.date) return -1;
                    return a.date.localeCompare(b.date);
                case 'priority': {
                    const order = { high: 0, medium: 1, low: 2 };
                    return (order[a.priority] || 2) - (order[b.priority] || 2);
                }
                case 'category':
                    return (a.category || '').localeCompare(b.category || '');
                case 'title':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });
        // Put completed at bottom (for 'all' filter)
        if (currentFilter !== 'completed') {
            const active = filtered.filter(t => !t.completed);
            const done = filtered.filter(t => t.completed);
            filtered = [...active, ...done];
        }
        return filtered;
    }

    // ---- Render Tasks ----
    function renderTasks() {
        const filtered = getFilteredTasks();
        dom.taskList.innerHTML = '';
        if (filtered.length === 0) {
            dom.emptyState.classList.remove('hidden');
            dom.taskList.style.display = 'none';
        } else {
            dom.emptyState.classList.add('hidden');
            dom.taskList.style.display = '';
            filtered.forEach(task => {
                dom.taskList.appendChild(createTaskCard(task));
            });
        }
        updateProgress();
    }

    function createTaskCard(task) {
        const card = document.createElement('div');
        card.className = `task-card${task.completed ? ' completed' : ''}`;
        card.dataset.id = task.id;

        const dateBadge = task.date ? `<span class="task-badge badge-date">${formatDate(task.date)}${task.time ? ' · ' + formatTime(task.time) : ''}</span>` : '';
        const priorityBadge = `<span class="task-badge badge-priority-${task.priority}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>`;
        const categoryBadge = task.category ? `<span class="task-badge badge-category">${CATEGORY_EMOJIS[task.category] || ''} ${task.category.charAt(0).toUpperCase() + task.category.slice(1)}</span>` : '';
        const descHtml = task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : '';

        card.innerHTML = `
      <div class="swipe-bg"><span>Delete</span></div>
      <div class="card-content">
        <div class="task-checkbox${task.completed ? ' checked' : ''}" data-id="${task.id}"></div>
        <div class="task-info">
          <div class="task-title">${escapeHtml(task.title)}</div>
          ${descHtml}
          <div class="task-meta">
            ${dateBadge}${priorityBadge}${categoryBadge}
          </div>
        </div>
      </div>
    `;

        // Swipe to delete
        setupSwipe(card, task.id);

        // Long press to edit
        let pressTimer;
        const content = card.querySelector('.card-content');
        content.addEventListener('pointerdown', (e) => {
            if (e.target.classList.contains('task-checkbox')) return;
            pressTimer = setTimeout(() => {
                openEditTask(task.id);
            }, 600);
        });
        content.addEventListener('pointerup', () => clearTimeout(pressTimer));
        content.addEventListener('pointerleave', () => clearTimeout(pressTimer));

        // Checkbox click
        card.querySelector('.task-checkbox').addEventListener('click', () => {
            toggleTask(task.id);
        });

        return card;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ---- Swipe to Delete ----
    function setupSwipe(card, taskId) {
        let startX = 0, currentX = 0, swiping = false;
        const content = card.querySelector('.card-content');
        const swipeBg = card.querySelector('.swipe-bg');
        const THRESHOLD = 100;

        card.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            swiping = false;
        }, { passive: true });

        card.addEventListener('touchmove', (e) => {
            currentX = e.touches[0].clientX;
            const dx = startX - currentX;
            if (dx > 10) {
                swiping = true;
                card.classList.add('swiping');
                const move = Math.min(dx, 200);
                content.style.transform = `translateX(${-move}px)`;
                swipeBg.classList.toggle('visible', dx > 40);
            }
        }, { passive: true });

        card.addEventListener('touchend', () => {
            const dx = startX - currentX;
            if (swiping && dx > THRESHOLD) {
                showConfirm('Delete Task', 'Are you sure you want to delete this task?', () => {
                    deleteTask(taskId);
                });
            }
            // Reset
            card.classList.remove('swiping');
            content.style.transform = '';
            swipeBg.classList.remove('visible');
            swiping = false;
        });
    }

    // ---- CRUD Operations ----
    function addTask(data) {
        const task = {
            id: generateId(),
            title: data.title,
            description: data.description || '',
            date: data.date || '',
            time: data.time || '',
            priority: data.priority || 'low',
            category: data.category || 'college',
            reminder: data.reminder || false,
            completed: false,
            createdAt: new Date().toISOString(),
        };
        tasks.unshift(task);
        saveTasks();
        renderTasks();
        showToast('Task added ✨');
        // Schedule notification
        if (task.reminder && task.date && task.time) {
            scheduleNotification(task);
        }
    }

    function updateTask(id, data) {
        const idx = tasks.findIndex(t => t.id === id);
        if (idx === -1) return;
        tasks[idx] = { ...tasks[idx], ...data };
        saveTasks();
        renderTasks();
        showToast('Task updated ✅');
    }

    function deleteTask(id) {
        const card = dom.taskList.querySelector(`[data-id="${id}"]`);
        if (card) {
            card.classList.add('removing');
            setTimeout(() => {
                tasks = tasks.filter(t => t.id !== id);
                saveTasks();
                renderTasks();
                showToast('Task deleted 🗑️');
            }, 400);
        } else {
            tasks = tasks.filter(t => t.id !== id);
            saveTasks();
            renderTasks();
        }
    }

    function toggleTask(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        task.completed = !task.completed;
        if (task.completed) {
            recordCompletion();
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(30);
        }
        saveTasks();
        renderTasks();
    }

    // ---- Modal ----
    function openAddTask() {
        editingTaskId = null;
        dom.modalTitle.textContent = 'Add Task';
        dom.taskForm.reset();
        dom.taskId.value = '';
        // Reset priority
        dom.priorityBtns.forEach(b => b.classList.toggle('active', b.dataset.priority === 'low'));
        // Reset category
        dom.catChips.forEach(c => c.classList.toggle('active', c.dataset.category === 'college'));
        // Set default date to today
        dom.taskDate.value = todayStr();
        dom.modalOverlay.classList.remove('hidden');
        dom.fab.style.display = 'none';
        setTimeout(() => dom.taskTitle.focus(), 300);
    }

    function openEditTask(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        editingTaskId = id;
        dom.modalTitle.textContent = 'Edit Task';
        dom.taskId.value = id;
        dom.taskTitle.value = task.title;
        dom.taskDesc.value = task.description;
        dom.taskDate.value = task.date;
        dom.taskTime.value = task.time;
        dom.taskReminder.checked = task.reminder;
        // Priority
        dom.priorityBtns.forEach(b => b.classList.toggle('active', b.dataset.priority === task.priority));
        // Category
        dom.catChips.forEach(c => c.classList.toggle('active', c.dataset.category === task.category));
        dom.modalOverlay.classList.remove('hidden');
        dom.fab.style.display = 'none';
    }

    function closeModal() {
        dom.modalOverlay.classList.add('hidden');
        dom.fab.style.display = '';
        editingTaskId = null;
    }

    function getFormData() {
        const activePriority = document.querySelector('.priority-btn.active');
        const activeCategory = document.querySelector('.cat-chip.active');
        return {
            title: dom.taskTitle.value.trim(),
            description: dom.taskDesc.value.trim(),
            date: dom.taskDate.value,
            time: dom.taskTime.value,
            priority: activePriority ? activePriority.dataset.priority : 'low',
            category: activeCategory ? activeCategory.dataset.category : 'college',
            reminder: dom.taskReminder.checked,
        };
    }

    // ---- Confirm Dialog ----
    function showConfirm(title, message, callback) {
        dom.confirmTitle.textContent = title;
        dom.confirmMessage.textContent = message;
        confirmCallback = callback;
        dom.confirmOverlay.classList.remove('hidden');
    }

    function closeConfirm() {
        dom.confirmOverlay.classList.add('hidden');
        confirmCallback = null;
    }

    // ---- Toast ----
    let toastTimer;
    function showToast(msg) {
        dom.toast.textContent = msg;
        dom.toast.classList.remove('hidden');
        // Force reflow
        void dom.toast.offsetWidth;
        dom.toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            dom.toast.classList.remove('show');
            setTimeout(() => dom.toast.classList.add('hidden'), 300);
        }, 2000);
    }

    // ---- Notifications ----
    function scheduleNotification(task) {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
        if (Notification.permission !== 'granted') return;
        const dt = new Date(`${task.date}T${task.time}`);
        const now = Date.now();
        const delay = dt.getTime() - now;
        if (delay > 0) {
            setTimeout(() => {
                new Notification('TaskForge Reminder', {
                    body: task.title,
                    icon: 'icons/icon-192.png',
                    badge: 'icons/icon-192.png',
                });
            }, delay);
        }
    }

    // ---- Navigation ----
    function switchScreen(screenName) {
        dom.screens.forEach(s => s.classList.remove('active'));
        dom.navItems.forEach(n => n.classList.remove('active'));
        const target = $(`#screen-${screenName}`);
        const nav = $(`.nav-item[data-screen="${screenName}"]`);
        if (target) target.classList.add('active');
        if (nav) nav.classList.add('active');
        // Show/hide FAB
        dom.fab.style.display = screenName === 'home' ? '' : 'none';
        // Update analytics if switching to that screen
        if (screenName === 'analytics') updateAnalytics();
    }

    // ---- Analytics ----
    function updateAnalytics() {
        const all = tasks;
        const completed = all.filter(t => t.completed);
        const today = todayStr();
        const todayCompleted = all.filter(t => t.completed && t.date === today);
        const pending = all.filter(t => !t.completed);

        dom.statTotal.textContent = completed.length;
        dom.statToday.textContent = todayCompleted.length;
        dom.statPending.textContent = pending.length;

        // Calculate streak
        const streak = calculateStreak();
        dom.statStreak.textContent = streak;

        // Draw charts
        drawWeeklyChart();
        drawDailyChart();
    }

    function calculateStreak() {
        const history = getHistory();
        let streak = 0;
        const d = new Date();
        // Check if today has completions
        if (history[todayStr()]) streak = 1;
        else return 0;
        // Check backwards
        for (let i = 1; i < 365; i++) {
            d.setDate(d.getDate() - 1);
            const key = d.toISOString().split('T')[0];
            if (history[key]) streak++;
            else break;
        }
        return streak;
    }

    function drawWeeklyChart() {
        const canvas = dom.weeklyChart;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.parentElement.clientWidth - 36;
        const h = 180;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.scale(dpr, dpr);

        const history = getHistory();
        const days = [];
        const labels = [];
        const d = new Date();
        for (let i = 6; i >= 0; i--) {
            const dd = new Date(d);
            dd.setDate(dd.getDate() - i);
            const key = dd.toISOString().split('T')[0];
            days.push(history[key] || 0);
            labels.push(dd.toLocaleDateString('en-US', { weekday: 'short' }));
        }

        const maxVal = Math.max(...days, 1);
        const barWidth = (w - 60) / 7;
        const chartH = h - 40;
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

        ctx.clearRect(0, 0, w, h);

        days.forEach((val, i) => {
            const barH = (val / maxVal) * (chartH - 20);
            const x = 30 + i * barWidth + barWidth * 0.2;
            const bw = barWidth * 0.6;
            const y = chartH - barH;

            // Bar
            const grad = ctx.createLinearGradient(x, y, x, chartH);
            grad.addColorStop(0, accent);
            grad.addColorStop(1, 'rgba(59,130,246,0.2)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(x, y, bw, barH, 6);
            ctx.fill();

            // Value
            ctx.fillStyle = '#EAEAEA';
            ctx.font = '600 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            if (val > 0) ctx.fillText(val, x + bw / 2, y - 6);

            // Label
            ctx.fillStyle = '#6B7280';
            ctx.font = '500 10px Inter, sans-serif';
            ctx.fillText(labels[i], x + bw / 2, h - 8);
        });
    }

    function drawDailyChart() {
        const canvas = dom.dailyChart;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.parentElement.clientWidth - 36;
        const h = 160;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.scale(dpr, dpr);

        // Category breakdown for today
        const today = todayStr();
        const todayTasks = tasks.filter(t => t.date === today);
        const cats = {};
        todayTasks.forEach(t => {
            const c = t.category || 'other';
            if (!cats[c]) cats[c] = { total: 0, done: 0 };
            cats[c].total++;
            if (t.completed) cats[c].done++;
        });

        const entries = Object.entries(cats);
        if (entries.length === 0) {
            ctx.fillStyle = '#6B7280';
            ctx.font = '500 13px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No tasks for today', w / 2, h / 2);
            return;
        }

        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        const barHeight = 24;
        const gap = 12;
        const startY = 10;
        const maxW = w - 120;

        entries.forEach(([cat, data], i) => {
            const y = startY + i * (barHeight + gap);
            const emoji = CATEGORY_EMOJIS[cat] || '📌';
            const label = `${emoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`;
            const pct = data.total > 0 ? data.done / data.total : 0;

            // Label
            ctx.fillStyle = '#9CA3AF';
            ctx.font = '500 12px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(label, 0, y + 16);

            // Track
            ctx.fillStyle = '#2A2A2A';
            ctx.beginPath();
            ctx.roundRect(100, y, maxW, barHeight, 6);
            ctx.fill();

            // Fill
            if (pct > 0) {
                const grad = ctx.createLinearGradient(100, y, 100 + maxW * pct, y);
                grad.addColorStop(0, accent);
                grad.addColorStop(1, '#8B5CF6');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.roundRect(100, y, maxW * pct, barHeight, 6);
                ctx.fill();
            }

            // Percentage
            ctx.fillStyle = '#EAEAEA';
            ctx.font = '600 11px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`${Math.round(pct * 100)}%`, w, y + 16);
        });
    }

    // ---- Quote ----
    function setRandomQuote() {
        const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        dom.quoteText.textContent = `"${q.text}"`;
        dom.quoteAuthor.textContent = `— ${q.author}`;
    }

    // ---- Accent Color ----
    function setAccentColor(color) {
        document.documentElement.style.setProperty('--accent', color);
        document.documentElement.style.setProperty('--accent-glow', color + '4D');
        document.documentElement.style.setProperty('--accent-soft', color + '26');
        // Update meta theme color
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', '#121212');
    }

    // ---- Settings: Backup & Restore ----
    function backupData() {
        const data = {
            tasks: tasks,
            history: getHistory(),
            settings: localStorage.getItem(SETTINGS_KEY),
            exportDate: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taskforge-backup-${todayStr()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Backup downloaded 📦');
    }

    function restoreData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.tasks) {
                    tasks = data.tasks;
                    saveTasks();
                }
                if (data.history) {
                    saveHistory(data.history);
                }
                if (data.settings) {
                    localStorage.setItem(SETTINGS_KEY, data.settings);
                    loadSettings();
                }
                renderTasks();
                showToast('Data restored ✅');
            } catch {
                showToast('Invalid backup file ❌');
            }
        };
        reader.readAsText(file);
    }

    // ---- Bind Events ----
    function bindEvents() {
        // Navigation
        dom.navItems.forEach(item => {
            item.addEventListener('click', () => switchScreen(item.dataset.screen));
        });

        // FAB
        dom.fab.addEventListener('click', openAddTask);

        // Modal close
        dom.btnModalClose.addEventListener('click', closeModal);
        dom.modalOverlay.addEventListener('click', (e) => {
            if (e.target === dom.modalOverlay) closeModal();
        });

        // Filter tabs
        dom.filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                dom.filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.dataset.filter;
                renderTasks();
            });
        });

        // Sort
        dom.sortSelect.addEventListener('change', () => {
            currentSort = dom.sortSelect.value;
            renderTasks();
        });

        // Search
        dom.searchToggle.addEventListener('click', () => {
            dom.searchBar.classList.toggle('hidden');
            if (!dom.searchBar.classList.contains('hidden')) {
                dom.searchInput.focus();
            } else {
                searchQuery = '';
                dom.searchInput.value = '';
                renderTasks();
            }
        });

        dom.searchInput.addEventListener('input', () => {
            searchQuery = dom.searchInput.value.trim();
            renderTasks();
        });

        dom.searchClear.addEventListener('click', () => {
            searchQuery = '';
            dom.searchInput.value = '';
            renderTasks();
            dom.searchInput.focus();
        });

        // Priority buttons
        dom.priorityBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                dom.priorityBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Category chips
        dom.catChips.forEach(chip => {
            chip.addEventListener('click', () => {
                dom.catChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            });
        });

        // Task form submit
        dom.taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = getFormData();
            if (!data.title) {
                showToast('Please enter a task title');
                return;
            }
            dom.btnSave.classList.add('saving');
            setTimeout(() => dom.btnSave.classList.remove('saving'), 600);

            if (editingTaskId) {
                updateTask(editingTaskId, data);
            } else {
                addTask(data);
            }
            closeModal();
        });

        // Confirm dialog
        dom.btnConfirmCancel.addEventListener('click', closeConfirm);
        dom.btnConfirmOk.addEventListener('click', () => {
            if (confirmCallback) confirmCallback();
            closeConfirm();
        });
        dom.confirmOverlay.addEventListener('click', (e) => {
            if (e.target === dom.confirmOverlay) closeConfirm();
        });

        // Settings: accent color
        dom.accentDots.forEach(dot => {
            dot.addEventListener('click', () => {
                dom.accentDots.forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                setAccentColor(dot.dataset.color);
                saveSettings();
                renderTasks();
            });
        });

        // Settings: notifications
        dom.toggleNotif.addEventListener('change', () => {
            if (dom.toggleNotif.checked && 'Notification' in window) {
                Notification.requestPermission().then(perm => {
                    if (perm !== 'granted') {
                        dom.toggleNotif.checked = false;
                        showToast('Notification permission denied');
                    }
                });
            }
            saveSettings();
        });

        // Settings: backup
        dom.btnBackup.addEventListener('click', backupData);

        // Settings: restore
        dom.btnRestore.addEventListener('click', () => dom.restoreInput.click());
        dom.restoreInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                restoreData(e.target.files[0]);
                e.target.value = '';
            }
        });

        // Settings: clear completed
        dom.btnClearCompleted.addEventListener('click', () => {
            const count = tasks.filter(t => t.completed).length;
            if (count === 0) {
                showToast('No completed tasks to clear');
                return;
            }
            showConfirm(
                'Clear Completed',
                `Delete ${count} completed task${count > 1 ? 's' : ''}? This cannot be undone.`,
                () => {
                    tasks = tasks.filter(t => !t.completed);
                    saveTasks();
                    renderTasks();
                    showToast(`${count} task${count > 1 ? 's' : ''} cleared 🧹`);
                }
            );
        });
    }

    // ---- Canvas roundRect polyfill ----
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
            if (typeof r === 'number') r = [r, r, r, r];
            this.moveTo(x + r[0], y);
            this.lineTo(x + w - r[1], y);
            this.quadraticCurveTo(x + w, y, x + w, y + r[1]);
            this.lineTo(x + w, y + h - r[2]);
            this.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
            this.lineTo(x + r[3], y + h);
            this.quadraticCurveTo(x, y + h, x, y + h - r[3]);
            this.lineTo(x, y + r[0]);
            this.quadraticCurveTo(x, y, x + r[0], y);
            this.closePath();
        };
    }

    // ---- Start App ----
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ---- PWA: Service Worker Registration ----
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then((reg) => {
                    console.log('✅ [SW] Registered successfully. Scope:', reg.scope);
                    // Listen for updates
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        console.log('🔄 [SW] New version found, installing...');
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'activated') {
                                console.log('✅ [SW] New version activated. Refresh for latest.');
                                showToast('App updated! Refresh for latest version 🔄');
                            }
                        });
                    });
                })
                .catch((err) => {
                    console.error('❌ [SW] Registration failed:', err);
                });
        });
    }

    // ---- PWA: Install Prompt ----
    let deferredPrompt = null;
    const installBanner = document.getElementById('install-banner');
    const btnInstall = document.getElementById('btn-install');
    const btnInstallDismiss = document.getElementById('btn-install-dismiss');

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome's default mini-infobar
        e.preventDefault();
        deferredPrompt = e;
        console.log('📱 [PWA] Install prompt captured');
        // Show our custom install banner
        if (installBanner) {
            installBanner.classList.remove('hidden');
        }
    });

    if (btnInstall) {
        btnInstall.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            // Show the browser install prompt
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('📱 [PWA] Install outcome:', outcome);
            if (outcome === 'accepted') {
                showToast('App installed! 🎉');
            }
            deferredPrompt = null;
            if (installBanner) {
                installBanner.classList.add('hidden');
            }
        });
    }

    if (btnInstallDismiss) {
        btnInstallDismiss.addEventListener('click', () => {
            if (installBanner) {
                installBanner.classList.add('hidden');
            }
        });
    }

    // Hide install banner if app is already installed (standalone mode)
    window.addEventListener('appinstalled', () => {
        console.log('📱 [PWA] App installed successfully');
        deferredPrompt = null;
        if (installBanner) {
            installBanner.classList.add('hidden');
        }
    });

    // ---- PWA: Offline / Online Detection ----
    const connectionToast = document.getElementById('connection-toast');
    const headerOfflineIcon = document.getElementById('header-offline-icon');
    let connectionTimer;

    function showConnectionToast(msg, type) {
        if (!connectionToast) return;

        // Clear previous state
        connectionToast.className = 'connection-toast';
        connectionToast.classList.add(type === 'online' ? 'toast-online' : 'toast-offline');
        connectionToast.textContent = msg;

        // Show
        requestAnimationFrame(() => {
            connectionToast.classList.add('show');
        });

        // Clear previous timer
        if (connectionTimer) clearTimeout(connectionTimer);

        // Auto hide
        const duration = type === 'online' ? 2000 : 3000;
        connectionTimer = setTimeout(() => {
            connectionToast.classList.remove('show');
        }, duration);
    }

    function updateConnectionStatus() {
        if (navigator.onLine) {
            if (headerOfflineIcon) headerOfflineIcon.classList.add('hidden');
        } else {
            if (headerOfflineIcon) headerOfflineIcon.classList.remove('hidden');
        }
    }

    window.addEventListener('online', () => {
        updateConnectionStatus();
        showConnectionToast('Back online ✓', 'online');
    });

    window.addEventListener('offline', () => {
        updateConnectionStatus();
        showConnectionToast('You are offline. Changes will sync when connection is restored.', 'offline');
    });

    // Check on load
    updateConnectionStatus();

})();
