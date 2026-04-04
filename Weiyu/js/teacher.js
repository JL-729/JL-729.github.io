/**
 * Weiyu - 网课视频共享平台
 * Teacher Module - 教师上传页逻辑
 */

// 当前状态
let currentTeacher = null;
let courses = [];
let editingCourseId = null;

// 是否使用 B2 存储（可以通过配置切换）
const USE_B2_STORAGE = true;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initLogin();
    initTabs();
    initCourseForm();
    initUploadArea();
});

// 初始化登录
function initLogin() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // 检查登录状态
    currentTeacher = protectTeacherRoute();
    if (currentTeacher) {
        showMainSection();
    }
}

// 处理登录
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    const result = loginTeacher(username, password);
    
    if (result.success) {
        currentTeacher = result.teacher;
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
    document.getElementById('teacherName').textContent = currentTeacher.name;
    
    loadCourses();
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
            
            // 如果是上传标签页，刷新课程选择
            if (targetTab === 'upload') {
                refreshUploadCourseSelect();
            }
        });
    });
}

// 加载课程列表
function loadCourses() {
    courses = getCoursesByTeacher(currentTeacher.id);
    renderCourseList();
}

// 渲染课程列表
function renderCourseList() {
    const container = document.getElementById('courseList');
    const emptyState = document.getElementById('courseEmpty');
    
    if (courses.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    container.style.display = 'grid';
    emptyState.style.display = 'none';
    
    container.innerHTML = courses.map(course => {
        const lessons = getLessonsByCourse(course.id);
        const videoCount = lessons.reduce((sum, lesson) => {
            return sum + getVideosByLesson(lesson.id).length;
        }, 0);
        
        return `
            <div class="course-card">
                <div class="course-header">
                    <h3 class="course-name">${escapeHtml(course.name)}</h3>
                    <div class="course-actions">
                        <button class="btn btn-secondary btn-sm" onclick="editCourse('${course.id}')" title="编辑">
                            ✏️
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="handleDeleteCourse('${course.id}')" title="删除">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="course-stats">
                    <span class="course-stat">👥 ${course.students?.length || 0} 名学生</span>
                    <span class="course-stat">📚 ${lessons.length} 个课次</span>
                    <span class="course-stat">🎬 ${videoCount} 个视频</span>
                </div>
                <div class="course-lessons">
                    <h4>课次列表</h4>
                    <div class="lesson-list">
                        ${lessons.length > 0 ? lessons.map(lesson => `
                            <div class="lesson-item" onclick="showLessonDetail('${lesson.id}')" style="cursor: pointer;">
                                <div class="lesson-info-text">
                                    <span class="lesson-name-text">${escapeHtml(lesson.name)}</span>
                                    <span class="lesson-code">${lesson.downloadCode}</span>
                                </div>
                                <span class="lesson-count">${getVideosByLesson(lesson.id).length} 视频</span>
                            </div>
                        `).join('') : '<div class="lesson-empty">暂无课次</div>'}
                    </div>
                    <button class="add-lesson-btn" onclick="quickAddLesson('${course.id}')">
                        + 添加课次
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== 课程管理 ====================

function initCourseForm() {
    const form = document.getElementById('courseForm');
    const studentListInput = document.getElementById('studentList');
    
    // 实时统计学生数量
    if (studentListInput) {
        studentListInput.addEventListener('input', function() {
            const students = parseStudentList(this.value);
            document.getElementById('studentCount').textContent = students.length;
        });
    }
    
    if (form) {
        form.addEventListener('submit', handleCourseSubmit);
    }
}

function openCourseModal(courseId = null) {
    editingCourseId = courseId;
    const modal = document.getElementById('courseModal');
    const title = document.getElementById('courseModalTitle');
    
    if (courseId) {
        const course = getCourseById(courseId);
        title.textContent = '编辑课程';
        document.getElementById('courseId').value = course.id;
        document.getElementById('courseName').value = course.name;
        document.getElementById('studentList').value = course.students?.join('\n') || '';
        document.getElementById('studentCount').textContent = course.students?.length || 0;
    } else {
        title.textContent = '创建新课程';
        document.getElementById('courseForm').reset();
        document.getElementById('courseId').value = '';
        document.getElementById('studentCount').textContent = '0';
    }
    
    modal.classList.add('active');
}

function closeCourseModal() {
    document.getElementById('courseModal').classList.remove('active');
    editingCourseId = null;
}

function handleCourseSubmit(e) {
    e.preventDefault();
    
    const courseId = document.getElementById('courseId').value;
    const name = document.getElementById('courseName').value.trim();
    const students = parseStudentList(document.getElementById('studentList').value);
    
    if (!name) {
        showToast('请输入课程名称', 'warning');
        return;
    }
    
    if (students.length === 0) {
        showToast('请至少添加一名学生', 'warning');
        return;
    }
    
    const course = {
        id: courseId || undefined,
        name,
        students,
        teacherId: currentTeacher.id
    };
    
    if (saveCourse(course)) {
        showToast(courseId ? '课程已更新' : '课程创建成功', 'success');
        closeCourseModal();
        loadCourses();
    } else {
        showToast('保存失败，请重试', 'error');
    }
}

function editCourse(courseId) {
    openCourseModal(courseId);
}

async function handleDeleteCourse(courseId) {
    showConfirm('确定要删除这个课程吗？相关的课次和视频也会被删除。', async () => {
        // 先删除相关课次的 B2 视频文件
        const lessons = getLessonsByCourse(courseId);
        for (const lesson of lessons) {
            const videos = getVideosByLesson(lesson.id);
            for (const video of videos) {
                if (video.storageType === 'b2' && video.b2FileId && video.storagePath) {
                    await B2Storage.deleteVideo(video.b2FileId, video.storagePath);
                }
            }
        }
        
        if (deleteCourse(courseId)) {
            showToast('课程已删除', 'success');
            loadCourses();
        }
    });
}

// ==================== 课次管理 ====================

function quickAddLesson(courseId) {
    const name = prompt('请输入课次名称（如：第1课、第一章等）：');
    if (!name || !name.trim()) return;
    
    const lesson = {
        courseId,
        name: name.trim()
    };
    
    if (saveLesson(lesson)) {
        showToast('课次创建成功', 'success');
        loadCourses();
    }
}

function createNewLesson() {
    const courseId = document.getElementById('uploadCourseSelect').value;
    const name = document.getElementById('newLessonName').value.trim();
    
    if (!courseId) {
        showToast('请先选择课程', 'warning');
        return;
    }
    
    if (!name) {
        showToast('请输入课次名称', 'warning');
        return;
    }
    
    const lesson = {
        courseId,
        name
    };
    
    if (saveLesson(lesson)) {
        showToast('课次创建成功', 'success');
        document.getElementById('newLessonName').value = '';
        refreshUploadLessonSelect(courseId);
    }
}

function showLessonDetail(lessonId) {
    const lesson = getLessonById(lessonId);
    const course = getCourseById(lesson.courseId);
    const videos = getVideosByLesson(lessonId);
    
    const modal = document.getElementById('lessonModal');
    const content = document.getElementById('lessonModalContent');
    const title = document.getElementById('lessonModalTitle');
    
    title.textContent = course.name;
    
    content.innerHTML = `
        <div class="lesson-detail-header">
            <span class="lesson-detail-title">${escapeHtml(lesson.name)}</span>
            <button class="btn btn-danger btn-sm" onclick="handleDeleteLesson('${lesson.id}')">删除课次</button>
        </div>
        
        <div class="download-code-box">
            <span class="label">学生下载码</span>
            <span class="code">${lesson.downloadCode}</span>
            <p class="hint">学生凭此码和姓名即可下载视频</p>
        </div>
        
        <div class="video-list-section">
            <h4>视频列表 (${videos.length})</h4>
            ${videos.length > 0 ? `
                <div class="video-list">
                    ${videos.map(video => `
                        <div class="video-list-item">
                            <div>
                                <div class="video-name">${escapeHtml(video.name)}</div>
                                <div class="video-meta">${formatFileSize(video.size || 0)} · ${formatDate(video.createdAt)}</div>
                            </div>
                            <button class="btn btn-danger btn-sm" onclick="deleteLessonVideo('${video.id}')">删除</button>
                        </div>
                    `).join('')}
                </div>
            ` : '<p style="color: var(--text-muted); text-align: center; padding: var(--spacing);">暂无视频</p>'}
        </div>
    `;
    
    modal.classList.add('active');
}

function closeLessonModal() {
    document.getElementById('lessonModal').classList.remove('active');
}

async function handleDeleteLesson(lessonId) {
    showConfirm('确定要删除这个课次吗？所有视频也会被删除。', async () => {
        // 先删除课次相关的 B2 视频文件
        const videos = getVideosByLesson(lessonId);
        for (const video of videos) {
            if (video.storageType === 'b2' && video.b2FileId && video.storagePath) {
                await B2Storage.deleteVideo(video.b2FileId, video.storagePath);
            }
        }
        
        if (deleteLesson(lessonId)) {
            showToast('课次已删除', 'success');
            closeLessonModal();
            loadCourses();
        }
    });
}

async function deleteLessonVideo(videoId) {
    const video = getVideoById(videoId);
    if (!video) {
        showToast('视频不存在', 'error');
        return;
    }
    
    showConfirm('确定要删除这个视频吗？', async () => {
        // 如果视频存储在 B2，先删除 B2 文件
        if (video.storageType === 'b2' && video.b2FileId && video.storagePath) {
            showToast('正在删除云端文件...', 'info');
            const deleted = await B2Storage.deleteVideo(video.b2FileId, video.storagePath);
            if (!deleted) {
                showToast('删除云端文件失败，但会继续删除本地记录', 'warning');
            }
        }
        
        if (deleteVideo(videoId)) {
            showToast('视频已删除', 'success');
            // 刷新模态框内容
            const lessonId = video.lessonId;
            if (lessonId) {
                showLessonDetail(lessonId);
            }
            loadCourses();
        }
    });
}

// ==================== 上传功能 ====================

function refreshUploadCourseSelect() {
    const select = document.getElementById('uploadCourseSelect');
    select.innerHTML = '<option value="">请选择课程</option>' + 
        courses.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    
    select.addEventListener('change', function() {
        const lessonSelect = document.getElementById('uploadLessonSelect');
        const uploadArea = document.getElementById('uploadArea');
        
        if (this.value) {
            refreshUploadLessonSelect(this.value);
            lessonSelect.disabled = false;
            uploadArea.style.display = 'block';
        } else {
            lessonSelect.innerHTML = '<option value="">请先选择课程</option>';
            lessonSelect.disabled = true;
            uploadArea.style.display = 'none';
        }
    });
}

function refreshUploadLessonSelect(courseId) {
    const select = document.getElementById('uploadLessonSelect');
    const lessons = getLessonsByCourse(courseId);
    
    select.innerHTML = lessons.length > 0 
        ? '<option value="">请选择课次</option>' + lessons.map(l => 
            `<option value="${l.id}">${escapeHtml(l.name)} (${l.downloadCode})</option>`
          ).join('')
        : '<option value="">暂无课次，请先创建</option>';
}

function initUploadArea() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('videoFiles');
    
    if (!dropzone || !fileInput) return;
    
    // 点击选择文件
    dropzone.addEventListener('click', function(e) {
        if (e.target !== fileInput) {
            fileInput.click();
        }
    });
    
    // 文件选择
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });
    
    // 拖拽上传
    dropzone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', function() {
        this.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
}

function handleFiles(files) {
    const lessonId = document.getElementById('uploadLessonSelect').value;
    
    if (!lessonId) {
        showToast('请先选择课次', 'warning');
        return;
    }
    
    Array.from(files).forEach(file => {
        if (!file.type.startsWith('video/')) {
            showToast(`${file.name} 不是视频文件`, 'warning');
            return;
        }
        
        uploadVideo(file, lessonId);
    });
}

function uploadVideo(file, lessonId) {
    if (USE_B2_STORAGE) {
        uploadVideoToB2Storage(file, lessonId);
    } else {
        uploadVideoToLocalStorage(file, lessonId);
    }
}

// 上传到 LocalStorage（原有逻辑）
function uploadVideoToLocalStorage(file, lessonId) {
    const uploadList = document.getElementById('uploadList');
    const uploadId = 'upload-' + Date.now() + Math.random();
    
    // 创建上传项
    const uploadItem = document.createElement('div');
    uploadItem.className = 'upload-item';
    uploadItem.id = uploadId;
    uploadItem.innerHTML = `
        <span class="upload-file-icon">🎬</span>
        <div class="upload-file-info">
            <div class="upload-file-name">${escapeHtml(file.name)}</div>
            <div class="upload-file-size">${formatFileSize(file.size)}</div>
        </div>
        <div class="upload-progress">
            <div class="upload-progress-bar">
                <div class="upload-progress-fill" style="width: 0%"></div>
            </div>
        </div>
        <span class="upload-status">读取中...</span>
    `;
    
    uploadList.appendChild(uploadItem);
    
    // 读取文件
    const reader = new FileReader();
    
    reader.onprogress = function(e) {
        if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100;
            uploadItem.querySelector('.upload-progress-fill').style.width = percent + '%';
        }
    };
    
    reader.onload = function(e) {
        uploadItem.querySelector('.upload-status').textContent = '保存中...';
        
        // 保存视频
        const video = {
            lessonId,
            name: file.name,
            data: e.target.result,
            size: file.size,
            type: file.type,
            storageType: 'local'
        };
        
        try {
            if (saveVideo(video)) {
                uploadItem.classList.add('success');
                uploadItem.querySelector('.upload-progress-fill').style.width = '100%';
                uploadItem.querySelector('.upload-status').textContent = '完成';
                showToast(`上传成功: ${file.name}`, 'success');
                loadCourses();
            } else {
                throw new Error('Save failed');
            }
        } catch (err) {
            uploadItem.classList.add('error');
            uploadItem.querySelector('.upload-status').textContent = '失败';
            showToast(`上传失败: ${file.name}`, 'error');
        }
    };
    
    reader.onerror = function() {
        uploadItem.classList.add('error');
        uploadItem.querySelector('.upload-status').textContent = '失败';
        showToast(`读取失败: ${file.name}`, 'error');
    };
    
    reader.readAsDataURL(file);
}

// 上传到 Backblaze B2
async function uploadVideoToB2Storage(file, lessonId) {
    const uploadList = document.getElementById('uploadList');
    const uploadId = 'upload-' + Date.now() + Math.random();
    
    // 创建上传项
    const uploadItem = document.createElement('div');
    uploadItem.className = 'upload-item';
    uploadItem.id = uploadId;
    uploadItem.innerHTML = `
        <span class="upload-file-icon">🎬</span>
        <div class="upload-file-info">
            <div class="upload-file-name">${escapeHtml(file.name)}</div>
            <div class="upload-file-size">${formatFileSize(file.size)}</div>
        </div>
        <div class="upload-progress">
            <div class="upload-progress-bar">
                <div class="upload-progress-fill" style="width: 0%"></div>
            </div>
        </div>
        <span class="upload-status">准备上传...</span>
    `;
    
    uploadList.appendChild(uploadItem);
    
    try {
        // 使用 B2Storage 模块上传
        const result = await B2Storage.uploadVideo(file, lessonId, (percent) => {
            uploadItem.querySelector('.upload-progress-fill').style.width = percent + '%';
            uploadItem.querySelector('.upload-status').textContent = `上传中 ${Math.round(percent)}%`;
        });
        
        if (result.success) {
            // 保存视频元数据到 LocalStorage
            const video = {
                lessonId,
                name: file.name,
                size: file.size,
                type: file.type,
                storageType: 'b2',
                b2FileId: result.fileId,
                storagePath: result.storagePath,
                formattedSize: result.formattedSize,
                uploadedAt: result.uploadTimestamp
            };
            
            if (saveVideo(video)) {
                uploadItem.classList.add('success');
                uploadItem.querySelector('.upload-progress-fill').style.width = '100%';
                uploadItem.querySelector('.upload-status').textContent = '完成';
                showToast(`上传成功: ${file.name}`, 'success');
                loadCourses();
            } else {
                throw new Error('保存元数据失败');
            }
        } else {
            throw new Error(result.error || '上传失败');
        }
    } catch (error) {
        console.error('上传错误:', error);
        uploadItem.classList.add('error');
        uploadItem.querySelector('.upload-status').textContent = '失败';
        showToast(`上传失败: ${file.name} - ${error.message}`, 'error');
    }
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 点击模态框外部关闭
['courseModal', 'lessonModal'].forEach(id => {
    const modal = document.getElementById(id);
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                if (id === 'courseModal') closeCourseModal();
                if (id === 'lessonModal') closeLessonModal();
            }
        });
    }
});
