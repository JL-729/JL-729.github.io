/**
 * Weiyu - 网课视频共享平台
 * Storage Module - LocalStorage 数据管理
 */

// LocalStorage Keys
const STORAGE_KEYS = {
    COURSES: 'weiyu_courses',
    LESSONS: 'weiyu_lessons',
    VIDEOS: 'weiyu_videos',
    TEACHERS: 'weiyu_teachers',
    DOWNLOADS: 'weiyu_downloads',
    ADMIN: 'weiyu_admin',
    CURRENT_TEACHER: 'weiyu_current_teacher',
    CURRENT_ADMIN: 'weiyu_current_admin'
};

// 生成唯一 ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 生成 6 位下载码
function generateDownloadCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除易混淆字符
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// 检查下载码是否已存在
function isDownloadCodeExists(code) {
    const lessons = getLessons();
    return lessons.some(lesson => lesson.downloadCode === code);
}

// 生成唯一的下载码
function generateUniqueDownloadCode() {
    let code;
    let attempts = 0;
    do {
        code = generateDownloadCode();
        attempts++;
    } while (isDownloadCodeExists(code) && attempts < 100);
    return code;
}

// 解析学生名单（支持逗号、换行、空格分隔）
function parseStudentList(text) {
    if (!text) return [];
    return text
        .split(/[,，\n\r\s]+/)
        .map(name => name.trim())
        .filter(name => name.length > 0);
}

// 格式化日期
function formatDate(date, includeTime = true) {
    const d = new Date(date);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!includeTime) return dateStr;
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${dateStr} ${timeStr}`;
}

// ==================== 通用存储操作 ====================

function getStorageItem(key, defaultValue = []) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
        console.error('Storage read error:', e);
        return defaultValue;
    }
}

function setStorageItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error('Storage write error:', e);
        showToast('存储空间不足，请删除一些数据', 'error');
        return false;
    }
}

function removeStorageItem(key) {
    localStorage.removeItem(key);
}

// ==================== 课程相关 ====================

function getCourses() {
    return getStorageItem(STORAGE_KEYS.COURSES);
}

function getCourseById(courseId) {
    const courses = getCourses();
    return courses.find(c => c.id === courseId);
}

function saveCourse(course) {
    const courses = getCourses();
    const index = courses.findIndex(c => c.id === course.id);
    if (index >= 0) {
        courses[index] = { ...courses[index], ...course, updatedAt: new Date().toISOString() };
    } else {
        courses.push({
            ...course,
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }
    return setStorageItem(STORAGE_KEYS.COURSES, courses);
}

function deleteCourse(courseId) {
    const courses = getCourses().filter(c => c.id !== courseId);
    // 级联删除相关课次和视频
    const lessons = getLessons().filter(l => l.courseId !== courseId);
    const lessonIds = getLessons().filter(l => l.courseId === courseId).map(l => l.id);
    const videos = getVideos().filter(v => !lessonIds.includes(v.lessonId));
    
    setStorageItem(STORAGE_KEYS.COURSES, courses);
    setStorageItem(STORAGE_KEYS.LESSONS, lessons);
    setStorageItem(STORAGE_KEYS.VIDEOS, videos);
    return true;
}

function getCoursesByTeacher(teacherId) {
    return getCourses().filter(c => c.teacherId === teacherId);
}

// ==================== 课次相关 ====================

function getLessons() {
    return getStorageItem(STORAGE_KEYS.LESSONS);
}

function getLessonById(lessonId) {
    const lessons = getLessons();
    return lessons.find(l => l.id === lessonId);
}

function getLessonByCode(downloadCode) {
    const lessons = getLessons();
    return lessons.find(l => l.downloadCode === downloadCode.toUpperCase());
}

function saveLesson(lesson) {
    const lessons = getLessons();
    const index = lessons.findIndex(l => l.id === lesson.id);
    if (index >= 0) {
        lessons[index] = { ...lessons[index], ...lesson, updatedAt: new Date().toISOString() };
    } else {
        lessons.push({
            ...lesson,
            id: generateId(),
            downloadCode: lesson.downloadCode || generateUniqueDownloadCode(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }
    return setStorageItem(STORAGE_KEYS.LESSONS, lessons);
}

function deleteLesson(lessonId) {
    const lessons = getLessons().filter(l => l.id !== lessonId);
    const videos = getVideos().filter(v => v.lessonId !== lessonId);
    setStorageItem(STORAGE_KEYS.LESSONS, lessons);
    setStorageItem(STORAGE_KEYS.VIDEOS, videos);
    return true;
}

function getLessonsByCourse(courseId) {
    return getLessons().filter(l => l.courseId === courseId);
}

// ==================== 视频相关 ====================

function getVideos() {
    return getStorageItem(STORAGE_KEYS.VIDEOS);
}

function getVideoById(videoId) {
    const videos = getVideos();
    return videos.find(v => v.id === videoId);
}

function saveVideo(video) {
    const videos = getVideos();
    const index = videos.findIndex(v => v.id === video.id);
    if (index >= 0) {
        videos[index] = { ...videos[index], ...video, updatedAt: new Date().toISOString() };
    } else {
        videos.push({
            ...video,
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }
    return setStorageItem(STORAGE_KEYS.VIDEOS, videos);
}

function deleteVideo(videoId) {
    const videos = getVideos().filter(v => v.id !== videoId);
    return setStorageItem(STORAGE_KEYS.VIDEOS, videos);
}

function getVideosByLesson(lessonId) {
    return getVideos().filter(v => v.lessonId === lessonId);
}

// 清理孤立的视频数据（课次已删除的视频）
function cleanupOrphanVideos() {
    const lessons = getLessons();
    const lessonIds = new Set(lessons.map(l => l.id));
    const videos = getVideos().filter(v => lessonIds.has(v.lessonId));
    return setStorageItem(STORAGE_KEYS.VIDEOS, videos);
}

// ==================== 教师相关 ====================

function getTeachers() {
    return getStorageItem(STORAGE_KEYS.TEACHERS);
}

function getTeacherById(teacherId) {
    const teachers = getTeachers();
    return teachers.find(t => t.id === teacherId);
}

function getTeacherByUsername(username) {
    const teachers = getTeachers();
    return teachers.find(t => t.username === username);
}

function saveTeacher(teacher) {
    const teachers = getTeachers();
    const index = teachers.findIndex(t => t.id === teacher.id);
    if (index >= 0) {
        teachers[index] = { ...teachers[index], ...teacher, updatedAt: new Date().toISOString() };
    } else {
        teachers.push({
            ...teacher,
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }
    return setStorageItem(STORAGE_KEYS.TEACHERS, teachers);
}

function deleteTeacher(teacherId) {
    const teachers = getTeachers().filter(t => t.id !== teacherId);
    // 级联删除该教师的课程
    const courses = getCourses().filter(c => c.teacherId !== teacherId);
    setStorageItem(STORAGE_KEYS.TEACHERS, teachers);
    setStorageItem(STORAGE_KEYS.COURSES, courses);
    return true;
}

function updateTeacherPassword(teacherId, newPassword) {
    const teacher = getTeacherById(teacherId);
    if (teacher) {
        teacher.password = newPassword;
        return saveTeacher(teacher);
    }
    return false;
}

// ==================== 下载记录相关 ====================

function getDownloads() {
    return getStorageItem(STORAGE_KEYS.DOWNLOADS);
}

function recordDownload(lessonId, studentName) {
    const downloads = getDownloads();
    const lesson = getLessonById(lessonId);
    const course = lesson ? getCourseById(lesson.courseId) : null;
    
    downloads.push({
        id: generateId(),
        lessonId,
        studentName,
        courseName: course ? course.name : '未知课程',
        lessonName: lesson ? lesson.name : '未知课次',
        downloadTime: new Date().toISOString()
    });
    
    // 只保留最近 1000 条记录
    if (downloads.length > 1000) {
        downloads.shift();
    }
    
    return setStorageItem(STORAGE_KEYS.DOWNLOADS, downloads);
}

function getDownloadStats() {
    const downloads = getDownloads();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
        total: downloads.length,
        today: downloads.filter(d => new Date(d.downloadTime) >= today).length,
        recent: downloads.slice(-10).reverse()
    };
}

// ==================== 管理员相关 ====================

function getAdmin() {
    return getStorageItem(STORAGE_KEYS.ADMIN, { password: 'nahida#1027' });
}

function updateAdminPassword(newPassword) {
    return setStorageItem(STORAGE_KEYS.ADMIN, { password: newPassword });
}

function verifyAdminPassword(password) {
    const admin = getAdmin();
    return admin.password === password;
}

// ==================== 会话管理 ====================

function getCurrentTeacher() {
    return getStorageItem(STORAGE_KEYS.CURRENT_TEACHER, null);
}

function setCurrentTeacher(teacher) {
    return setStorageItem(STORAGE_KEYS.CURRENT_TEACHER, teacher);
}

function clearCurrentTeacher() {
    removeStorageItem(STORAGE_KEYS.CURRENT_TEACHER);
}

function isTeacherLoggedIn() {
    return !!getCurrentTeacher();
}

function getCurrentAdmin() {
    return getStorageItem(STORAGE_KEYS.CURRENT_ADMIN, null);
}

function setCurrentAdmin(admin) {
    return setStorageItem(STORAGE_KEYS.CURRENT_ADMIN, admin);
}

function clearCurrentAdmin() {
    removeStorageItem(STORAGE_KEYS.CURRENT_ADMIN);
}

function isAdminLoggedIn() {
    return !!getCurrentAdmin();
}

// ==================== 初始化数据 ====================

function initDefaultData() {
    // 检查是否已初始化
    if (localStorage.getItem('weiyu_initialized')) {
        return;
    }
    
    // 创建默认教师账户
    const teachers = getTeachers();
    if (teachers.length === 0) {
        saveTeacher({
            username: 'teacher1',
            password: 'teacher123',
            name: '张老师'
        });
    }
    
    // 初始化管理员
    const admin = getAdmin();
    if (!admin || !admin.password) {
        updateAdminPassword('nahida#1027');
    }
    
    localStorage.setItem('weiyu_initialized', 'true');
}

// ==================== 数据导出/导入 ====================

function exportAllData() {
    const data = {
        courses: getCourses(),
        lessons: getLessons(),
        videos: getVideos(),
        teachers: getTeachers(),
        downloads: getDownloads(),
        admin: getAdmin(),
        exportTime: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
}

function importAllData(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (data.courses) setStorageItem(STORAGE_KEYS.COURSES, data.courses);
        if (data.lessons) setStorageItem(STORAGE_KEYS.LESSONS, data.lessons);
        if (data.videos) setStorageItem(STORAGE_KEYS.VIDEOS, data.videos);
        if (data.teachers) setStorageItem(STORAGE_KEYS.TEACHERS, data.teachers);
        if (data.downloads) setStorageItem(STORAGE_KEYS.DOWNLOADS, data.downloads);
        if (data.admin) setStorageItem(STORAGE_KEYS.ADMIN, data.admin);
        return true;
    } catch (e) {
        console.error('Import error:', e);
        return false;
    }
}

// ==================== 清空数据 ====================

function clearAllData() {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    localStorage.removeItem('weiyu_initialized');
}

// ==================== 工具函数 ====================

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 显示 Toast 提示
function showToast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'warning' ? '⚠' : 'ℹ';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// 确认对话框
function showConfirm(message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3 class="modal-title">确认操作</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <p style="margin-bottom: var(--spacing-lg);">${message}</p>
            <div style="display: flex; gap: var(--spacing); justify-content: flex-end;">
                <button class="btn btn-secondary" id="btn-cancel">取消</button>
                <button class="btn btn-danger" id="btn-confirm">确认</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.querySelector('#btn-cancel').addEventListener('click', () => {
        overlay.remove();
        if (onCancel) onCancel();
    });
    
    overlay.querySelector('#btn-confirm').addEventListener('click', () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    });
}

// 页面加载时初始化数据
document.addEventListener('DOMContentLoaded', initDefaultData);
