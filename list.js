const tasks = [
    {
        icon: 'fa-code',
        title: 'Implement Login Feature',
        status: 'inprogress',
        statusLabel: 'In Progress',
        progress: 60
    },
    {
        icon: 'fa-paint-brush',
        title: 'Design Landing Page',
        status: 'notstarted',
        statusLabel: 'Not Started',
        progress: 0
    },
    {
        icon: 'fa-check-double',
        title: 'Write Unit Tests',
        status: 'completed',
        statusLabel: 'Completed',
        progress: 100
    }
];

// --- User Auth & Storage ---
const loginContainer = document.getElementById('loginContainer');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const appMain = document.getElementById('appMain');
const logoutBtn = document.getElementById('logoutBtn');
let currentUser = null;

function getUserKey(username) {
    return `todoapp_user_${username}`;
}
function getTasksKey(username) {
    return `todoapp_tasks_${username}`;
}
function saveUser(username, password) {
    localStorage.setItem(getUserKey(username), JSON.stringify({ username, password }));
    localStorage.setItem('todoapp_loggedin', username);
}
function getUser(username) {
    const data = localStorage.getItem(getUserKey(username));
    return data ? JSON.parse(data) : null;
}
function isLoggedIn() {
    return !!localStorage.getItem('todoapp_loggedin');
}
function getLoggedInUser() {
    return localStorage.getItem('todoapp_loggedin');
}
function logout() {
    localStorage.removeItem('todoapp_loggedin');
    currentUser = null;
    showLogin();
}
function showLogin() {
    loginContainer.style.display = '';
    appMain.style.display = 'none';
    document.body.style.background = 'var(--bg)';
}
function showBoard() {
    loginContainer.style.display = 'none';
    appMain.style.display = 'flex';
    document.body.style.background = 'var(--bg)';
}

// --- Tasks Storage ---
function getTasks() {
    if (!currentUser) return [];
    const data = localStorage.getItem(getTasksKey(currentUser));
    return data ? JSON.parse(data) : [];
}
function saveTasks(tasks) {
    if (!currentUser) return;
    localStorage.setItem(getTasksKey(currentUser), JSON.stringify(tasks));
}

// --- Render Tasks Grouped ---
const taskGroups = document.getElementById('taskGroups');
function renderTasks() {
    const tasks = getTasks();
    // Group by status
    const groups = {
        'notstarted': [],
        'inprogress': [],
        'completed': []
    };
    tasks.forEach((t, idx) => {
        groups[t.status]?.push({ ...t, idx });
    });

    // Sort each group by preference (high > normal > low), then by deadline (soonest first)
    function prefOrder(pref) {
        if (pref === 'high') return 0;
        if (pref === 'normal') return 1;
        if (pref === 'low') return 2;
        return 1;
    }
    function sortTasks(arr) {
        return arr.sort((a, b) => {
            if (prefOrder(a.pref) !== prefOrder(b.pref)) return prefOrder(a.pref) - prefOrder(b.pref);
            if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
            if (a.deadline) return -1;
            if (b.deadline) return 1;
            return 0;
        });
    }

    const groupTitles = {
        notstarted: "Not Started",
        inprogress: "In Progress",
        completed: "Completed"
    };

    taskGroups.innerHTML = '';
    Object.keys(groups).forEach(status => {
        const group = sortTasks(groups[status]);
        const groupDiv = document.createElement('div');
        groupDiv.className = 'task-group';
        groupDiv.innerHTML = `<div class="task-group-title">${groupTitles[status]}</div>`;
        const listDiv = document.createElement('div');
        listDiv.className = 'task-list';
        if (group.length === 0) {
            listDiv.innerHTML = `<div style="color:var(--muted);padding:0.7em 0;">No tasks</div>`;
        } else {
            group.forEach(task => {
                listDiv.appendChild(renderTaskRow(task, task.idx));
            });
        }
        groupDiv.appendChild(listDiv);
        taskGroups.appendChild(groupDiv);
    });
}

function renderTaskRow(task, idx) {
    const row = document.createElement('div');
    row.className = 'task-row';
    row.innerHTML = `
        <span class="task-icon"><i class="fa-solid ${task.icon}"></i></span>
        <div class="task-content">
            <div class="task-title">${task.title}</div>
            <div class="task-meta">
                <span class="status-badge status-${task.status}">${statusLabel(task.status)}</span>
                <span class="pref-badge pref-${task.pref||'normal'}">${prefLabel(task.pref)}</span>
                ${task.deadline ? `<span class="deadline-badge"><i class="fa-regular fa-calendar"></i> ${task.deadline}</span>` : ''}
                <span style="font-size:0.85em;color:var(--muted);">${task.progress}%</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill progress-${task.status}" style="width:${task.progress}%"></div>
            </div>
        </div>
        <div class="task-actions">
            <button title="Edit" class="edit-btn" data-idx="${idx}"><i class="fa-solid fa-pen"></i></button>
            <button title="Delete" class="delete-btn" data-idx="${idx}"><i class="fa-solid fa-trash"></i></button>
        </div>
    `;
    row.querySelector('.edit-btn').onclick = () => openTaskModal('edit', idx);
    row.querySelector('.delete-btn').onclick = () => deleteTask(idx);
    return row;
}
function statusLabel(status) {
    if (status === 'notstarted') return 'Not Started';
    if (status === 'inprogress') return 'In Progress';
    if (status === 'completed') return 'Completed';
    return '';
}
function prefLabel(pref) {
    if (pref === 'high') return 'High';
    if (pref === 'low') return 'Low';
    return 'Normal';
}

// --- Modal Logic ---
const modalBg = document.getElementById('modalBg');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const cancelTaskBtn = document.getElementById('cancelTaskBtn');
const taskForm = document.getElementById('taskForm');
const taskIcon = document.getElementById('taskIcon');
const taskTitle = document.getElementById('taskTitle');
const taskStatus = document.getElementById('taskStatus');
const taskProgress = document.getElementById('taskProgress');
const taskPref = document.getElementById('taskPref');
const taskDeadline = document.getElementById('taskDeadline');
const modalError = document.getElementById('modalError');
let modalMode = 'add'; // or 'edit'
let editIdx = null;

function openTaskModal(mode, idx) {
    modalMode = mode;
    editIdx = idx !== undefined ? Number(idx) : null;
    modalError.textContent = '';
    if (mode === 'add') {
        modalTitle.textContent = 'Add Task';
        taskIcon.value = 'fa-code';
        taskTitle.value = '';
        taskStatus.value = 'notstarted';
        taskProgress.value = 0;
        taskPref.value = 'normal';
        taskDeadline.value = '';
    } else if (mode === 'edit') {
        modalTitle.textContent = 'Edit Task';
        const tasks = getTasks();
        const t = tasks[editIdx];
        taskIcon.value = t.icon;
        taskTitle.value = t.title;
        taskStatus.value = t.status;
        taskProgress.value = t.progress;
        taskPref.value = t.pref || 'normal';
        taskDeadline.value = t.deadline || '';
    }
    modalBg.style.display = 'flex';
    setTimeout(() => { taskTitle.focus(); }, 100);
}
function closeTaskModal() {
    modalBg.style.display = 'none';
}
modalCloseBtn.onclick = closeTaskModal;
cancelTaskBtn.onclick = closeTaskModal;
modalBg.onclick = function(e) {
    if (e.target === modalBg) closeTaskModal();
};

// --- Add/Edit Task Form ---
taskForm.onsubmit = function(e) {
    e.preventDefault();
    const icon = taskIcon.value;
    const title = taskTitle.value.trim();
    const status = taskStatus.value;
    let progress = Number(taskProgress.value);
    const pref = taskPref.value;
    const deadline = taskDeadline.value;
    if (!title) {
        modalError.textContent = 'Title is required.';
        return;
    }
    if (progress < 0 || progress > 100 || isNaN(progress)) {
        modalError.textContent = 'Progress must be between 0 and 100.';
        return;
    }
    if (status === 'completed') progress = 100;
    if (status === 'notstarted') progress = 0;
    const tasks = getTasks();
    if (modalMode === 'add') {
        tasks.push({ icon, title, status, progress, pref, deadline });
    } else if (modalMode === 'edit' && editIdx !== null) {
        tasks[editIdx] = { icon, title, status, progress, pref, deadline };
    }
    saveTasks(tasks);
    closeTaskModal();
    renderTasks();
};

// --- Add/Edit/Delete Buttons ---
document.getElementById('addTaskBtn').onclick = () => openTaskModal('add');
function deleteTask(idx) {
    if (!confirm('Delete this task?')) return;
    const tasks = getTasks();
    tasks.splice(idx, 1);
    saveTasks(tasks);
    renderTasks();
}

// --- Login Logic ---
loginForm.onsubmit = function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    if (!username || !password) {
        loginError.textContent = 'Please enter username and password.';
        return;
    }
    let user = getUser(username);
    if (!user) {
        // New user, save credentials
        saveUser(username, password);
        currentUser = username;
        loginError.textContent = '';
        showBoard();
        renderTasks();
    } else if (user.password === password) {
        // Existing user, correct password
        saveUser(username, password); // update login state
        currentUser = username;
        loginError.textContent = '';
        showBoard();
        renderTasks();
    } else {
        loginError.textContent = 'Incorrect password.';
    }
};

// --- Logout ---
logoutBtn.onclick = function() {
    logout();
};

// --- Auto-login if already logged in ---
window.onload = function() {
    if (isLoggedIn()) {
        currentUser = getLoggedInUser();
        showBoard();
        renderTasks();
    } else {
        showLogin();
    }
};

document.getElementById('forgotPasswordLink').onclick = function(e) {
    e.preventDefault();
    const username = prompt("Enter your username to reset password:");
    if (!username) return;
    let user = getUser(username);
    if (!user) {
        alert("User not found.");
        return;
    }
    const newPassword = prompt("Enter your new password:");
    if (!newPassword) return;
    saveUser(username, newPassword);
    alert("Password changed successfully! You can now log in with your new password.");
};