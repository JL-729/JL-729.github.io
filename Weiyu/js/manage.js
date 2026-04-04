/**
 * Weiyu - 网课视频共享平台
 * Manage Module - 管理后台逻辑
 */

// 当前状态
let editingTeacherId = null;
let allVideos = [];

// 是否使用 B2 存储
const USE_B2_STORAGE = true;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initLogin();
    initTabs();
    initForms();
    initSearch();
});

// 初始化登录
function initLogin() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // 检查登录状态
    if (protectAdminRoute()) {
        showMainSection();
    }
}

// 处理登录
function handleLogin(e) {
    e.preventDefault();
    
    const password = document.getElementById('adminPassword').value;
    const result = loginAdmin(password);
    
    if (result.success) {
        showMainSection();
        showToast('登录成功', 'success');
    } else {
        showToast(result.message, 'error');
    }
}

// 显示主界面
function showMainSection() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('mainSection').style.display = 'block';
    
    refreshAllData();
}

// 初始化标签页
function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const targetTab = this.dataset.tab;
            
            // 更新标签状态
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // 切换内容
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`tab-${targetTab}`).classList.add('active');
            
            // 刷新对应数据
            if (targetTab === 'dashboard') refreshDashboard();
            if (targetTab === 'teachers') refreshTeachers();
            if (targetTab === 'videos') refreshVideos();
            if (targetTab === 'downloads') refreshDownloads();
        });
    });
}

// 初始化表单
function initForms() {
    // 管理员密码修改
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }
    
    // 教师表单
    const teacherForm = document.getElementById('teacherForm');
    if (teacherForm) {
        teacherForm.addEventListener('submit', handleTeacherSubmit);
    }
    
    // 修改教师密码表单
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleTeacherPasswordChange);
    }
}

// 初始化搜索
function initSearch() {
    const videoSearch = document.getElementById('videoSearch');
    if (videoSearch) {
        videoSearch.addEventListener('input', debounce(function() {
            refreshVideos(this.value);
        }, 300));
    }
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// 刷新所有数据
function refreshAllData() {
    refreshDashboard();
    refreshTeachers();
    refreshVideos();
    refreshDownloads();
}

// ==================== 总览数据 ====================

function refreshDashboard() {
    const teachers = getTeachers();
    const courses = getCourses();
    const lessons = getLessons();
    const videos = getVideos();
    const stats = getDownloadStats();
    
    document.getElementById('statTeachers').textContent = teachers.length;
    document.getElementById('statCourses').textContent = courses.length;
    document.getElementById('statLessons').textContent = lessons.length;
    document.getElementById('statVideos').textContent = videos.length;
    document.getElementById('statDownloads').textContent = stats.total;
    document.getElementById('statToday').textContent = stats.today;
    
    // 最近下载记录
    const recentTable = document.getElementById('recentDownloadsTable');
    if (stats.recent.length > 0) {
        recentTable.innerHTML = stats.recent.map(d => `
            <tr>
                <td>${escapeHtml(d.studentName)}</td>
                <td>${escapeHtml(d.courseName)}</td>
                <td>${escapeHtml(d.lessonName)}</td>
                <td>${formatDate(d.downloadTime)}</td>
            </tr>
        `).join('');
    } else {
        recentTable.innerHTML = '<tr><td colspan="4" class="table-empty">暂无下载记录</td></tr>';
    }
}

// ==================== 教师管理 ====================

function refreshTeachers() {
    const teachers = getTeachers();
    const tbody = document.getElementById('teachersTable');
    
    if (teachers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">暂无教师</td></tr>';
        return;
    }
    
    tbody.innerHTML = teachers.map(teacher => {
        const courseCount = getCourses().filter(c => c.teacherId === teacher.id).length;
        return `
            <tr>
                <td>${escapeHtml(teacher.username)}</td>
                <td>${escapeHtml(teacher.name)}</td>
                <td>${courseCount}</td>
                <td>${formatDate(teacher.createdAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-sm" onclick="editTeacher('${teacher.id}')">编辑</button>
                        <button class="btn btn-secondary btn-sm" onclick="openChangePassword('${teacher.id}')">改密</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteTeacher('${teacher.id}')">删除</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openTeacherModal(teacherId = null) {
    editingTeacherId = teacherId;
    const modal = document.getElementById('teacherModal');
    const title = document.getElementById('teacherModalTitle');
    const passwordLabel = document.getElementById('passwordLabel');
    const passwordInput = document.getElementById('teacherPassword');
    
    if (teacherId) {
        const teacher = getTeacherById(teacherId);
        title.textContent = '编辑教师';
        document.getElementById('teacherId').value = teacher.id;
        document.getElementById('teacherUsername').value = teacher.username;
        document.getElementById('teacherName').value = teacher.name;
        passwordLabel.textContent = '密码 (留空则不修改)';
        passwordInput.required = false;
        passwordInput.value = '';
    } else {
        title.textContent = '添加教师';
        document.getElementById('teacherForm').reset();
        document.getElementById('teacherId').value = '';
        passwordLabel.textContent = '密码 *';
        passwordInput.required = true;
    }
    
    modal.classList.add('active');
}

function closeTeacherModal() {
    document.getElementById('teacherModal').classList.remove('active');
    editingTeacherId = null;
}

function handleTeacherSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('teacherId').value;
    const username = document.getElementById('teacherUsername').value.trim();
    const name = document.getElementById('teacherName').value.trim();
    const password = document.getElementById('teacherPassword').value;
    
    if (!username || !name) {
        showToast('请填写完整信息', 'warning');
        return;
    }
    
    // 检查用户名是否已存在
    const existing = getTeacherByUsername(username);
    if (existing && existing.id !== id) {
        showToast('用户名已存在', 'error');
        return;
    }
    
    const teacher = {
        id: id || undefined,
        username,
        name,
        password: password || (id ? getTeacherById(id).password : undefined)
    };
    
    if (saveTeacher(teacher)) {
        showToast(id ? '教师信息已更新' : '教师添加成功', 'success');
        closeTeacherModal();
        refreshTeachers();
    } else {
        showToast('保存失败', 'error');
    }
}

function editTeacher(teacherId) {
    openTeacherModal(teacherId);
}

function deleteTeacher(teacherId) {
    showConfirm('确定要删除这位教师吗？其创建的课程和数据也会被删除。', () => {
        if (deleteTeacher(teacherId)) {
            showToast('教师已删除', 'success');
            refreshTeachers();
            refreshDashboard();
        }
    });
}

function openChangePassword(teacherId) {
    document.getElementById('passwordTeacherId').value = teacherId;
    document.getElementById('changePasswordForm').reset();
    document.getElementById('passwordModal').classList.add('active');
}

function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
}

function handleTeacherPasswordChange(e) {
    e.preventDefault();
    
    const teacherId = document.getElementById('passwordTeacherId').value;
    const newPassword = document.getElementById('newTeacherPassword').value;
    
    if (!newPassword) {
        showToast('请输入新密码', 'warning');
        return;
    }
    
    if (updateTeacherPassword(teacherId, newPassword)) {
        showToast('密码修改成功', 'success');
        closePasswordModal();
    } else {
        showToast('修改失败', 'error');
    }
}

// ==================== 视频管理 ====================

function refreshVideos(searchTerm = '') {
    allVideos = getVideos();
    const tbody = document.getElementById('videosTable');
    
    let videos = allVideos;
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        videos = videos.filter(v => v.name.toLowerCase().includes(term));
    }
    
    // 按时间倒序
    videos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (videos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">暂无视频</td></tr>';
        return;
    }
    
    tbody.innerHTML = videos.map(video => {
        const lesson = getLessonById(video.lessonId);
        const course = lesson ? getCourseById(lesson.courseId) : null;
        
        return `
            <tr>
                <td>${escapeHtml(video.name)}</td>
                <td>${lesson ? escapeHtml(lesson.name) : '<span style="color: #ef4444;">课次已删除</span>'}</td>
                <td>${course ? escapeHtml(course.name) : '<span style="color: #ef4444;">课程已删除</span>'}</td>
                <td>${formatFileSize(video.size || 0)}</td>
                <td>${formatDate(video.createdAt)}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteVideoById('${video.id}')">删除</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function deleteVideoById(videoId) {
    const video = getVideoById(videoId);
    if (!video) {
        showToast('视频不存在', 'error');
        return;
    }
    
    showConfirm('确定要删除这个视频吗？', async () => {
        // 如果视频存储在 B2，先删除 B2 文件
        if (USE_B2_STORAGE && video.storageType === 'b2' && video.b2FileId && video.storagePath) {
            showToast('正在删除云端文件...', 'info');
            const deleted = await B2Storage.deleteVideo(video.b2FileId, video.storagePath);
            if (!deleted) {
                showToast('删除云端文件失败，但会继续删除本地记录', 'warning');
            }
        }
        
        if (deleteVideo(videoId)) {
            showToast('视频已删除', 'success');
            refreshVideos();
            refreshDashboard();
        }
    });
}

// ==================== 下载记录 ====================

function refreshDownloads() {
    const downloads = getDownloads();
    const tbody = document.getElementById('downloadsTable');
    
    // 按时间倒序
    const sorted = [...downloads].sort((a, b) => new Date(b.downloadTime) - new Date(a.downloadTime));
    
    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="table-empty">暂无下载记录</td></tr>';
        return;
    }
    
    tbody.innerHTML = sorted.map(d => `
        <tr>
            <td>${escapeHtml(d.studentName)}</td>
            <td>${escapeHtml(d.courseName)}</td>
            <td>${escapeHtml(d.lessonName)}</td>
            <td>${formatDate(d.downloadTime)}</td>
        </tr>
    `).join('');
}

function exportDownloads() {
    const downloads = getDownloads();
    const csv = [
        ['学生姓名', '课程', '课次', '下载时间'].join(','),
        ...downloads.map(d => [
            d.studentName,
            d.courseName,
            d.lessonName,
            d.downloadTime
        ].map(f => `"${f}"`).join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `下载记录_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('导出成功', 'success');
}

// ==================== 系统设置 ====================

function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!verifyAdminPassword(currentPassword)) {
        showToast('当前密码错误', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('两次输入的新密码不一致', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('新密码至少需要6位', 'warning');
        return;
    }
    
    if (updateAdminPassword(newPassword)) {
        showToast('密码修改成功', 'success');
        document.getElementById('passwordForm').reset();
    } else {
        showToast('修改失败', 'error');
    }
}

function exportAllDataToFile() {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `weiyu_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('数据导出成功', 'success');
}

function importDataFromFile(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        showConfirm('导入数据将覆盖现有所有数据，确定继续吗？', () => {
            if (importAllData(e.target.result)) {
                showToast('数据导入成功', 'success');
                refreshAllData();
            } else {
                showToast('数据导入失败，请检查文件格式', 'error');
            }
        });
    };
    reader.readAsText(file);
    input.value = '';
}

function clearAllDataConfirm() {
    showConfirm('⚠️ 确定要清空所有数据吗？此操作不可恢复！', () => {
        const confirmText = prompt('请输入 "DELETE" 以确认删除所有数据：');
        if (confirmText === 'DELETE') {
            clearAllData();
            showToast('所有数据已清空', 'success');
            refreshAllData();
        } else {
            showToast('操作已取消', 'info');
        }
    });
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 点击模态框外部关闭
['teacherModal', 'passwordModal'].forEach(id => {
    const modal = document.getElementById(id);
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                if (id === 'teacherModal') closeTeacherModal();
                if (id === 'passwordModal') closePasswordModal();
            }
        });
    }
});
