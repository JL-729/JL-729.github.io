/**
 * Weiyu - 网课视频共享平台
 * Student Module - 学生下载页逻辑
 */

// 当前状态
let currentLesson = null;
let currentCourse = null;
let currentStudentName = '';
let currentVideos = [];

// 是否使用 B2 存储
const USE_B2_STORAGE = true;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // 检查是否有缓存的登录状态
    checkCachedLogin();
});

// 检查缓存的登录状态
function checkCachedLogin() {
    const cachedCode = sessionStorage.getItem('weiyu_code');
    const cachedName = sessionStorage.getItem('weiyu_name');
    
    if (cachedCode && cachedName) {
        const result = verifyStudent(cachedCode, cachedName);
        if (result.success) {
            showVideoSection(result);
        } else {
            // 缓存失效，清除
            sessionStorage.removeItem('weiyu_code');
            sessionStorage.removeItem('weiyu_name');
        }
    }
}

// 处理登录表单提交
function handleLogin(e) {
    e.preventDefault();
    
    const downloadCode = document.getElementById('downloadCode').value.trim().toUpperCase();
    const studentName = document.getElementById('studentName').value.trim();
    
    if (!downloadCode || !studentName) {
        showToast('请输入下载码和姓名', 'warning');
        return;
    }
    
    const result = verifyStudent(downloadCode, studentName);
    
    if (result.success) {
        // 缓存登录状态
        sessionStorage.setItem('weiyu_code', downloadCode);
        sessionStorage.setItem('weiyu_name', studentName);
        
        showVideoSection(result);
        showToast('验证成功', 'success');
    } else {
        showToast(result.message, 'error');
    }
}

// 显示视频列表区域
function showVideoSection(result) {
    currentLesson = result.lesson;
    currentCourse = result.course;
    currentStudentName = document.getElementById('studentName').value.trim() || sessionStorage.getItem('weiyu_name');
    currentVideos = result.videos || [];
    
    // 记录下载页面访问
    recordDownload(currentLesson.id, currentStudentName);
    
    // 切换视图
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('videoSection').style.display = 'block';
    
    // 更新页面信息
    document.getElementById('courseName').textContent = currentCourse.name;
    document.getElementById('lessonName').textContent = currentLesson.name;
    document.getElementById('welcomeName').textContent = currentStudentName;
    document.getElementById('displayCode').textContent = currentLesson.downloadCode;
    
    // 渲染视频列表
    renderVideoList();
}

// 渲染视频列表
function renderVideoList() {
    const videoList = document.getElementById('videoList');
    const emptyState = document.getElementById('emptyState');
    
    if (currentVideos.length === 0) {
        videoList.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    videoList.style.display = 'grid';
    emptyState.style.display = 'none';
    
    videoList.innerHTML = currentVideos.map(video => `
        <div class="video-card" onclick="openVideoModal('${video.id}')">
            <div class="video-thumbnail">
                <span class="video-duration">视频</span>
            </div>
            <div class="video-info">
                <h4 class="video-title">${escapeHtml(video.name)}</h4>
                <div class="video-meta">
                    <span class="video-size">📦 ${formatFileSize(video.size || 0)}</span>
                    <span class="video-date">${formatDate(video.createdAt, false)}</span>
                </div>
                <div class="video-actions-row">
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); downloadVideo('${video.id}')">
                        ⬇ 下载
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openVideoModal('${video.id}')">
                        ▶ 预览
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// 打开视频预览模态框
async function openVideoModal(videoId) {
    const video = currentVideos.find(v => v.id === videoId);
    if (!video) {
        showToast('视频不存在', 'error');
        return;
    }
    
    const modal = document.getElementById('videoModal');
    const player = document.getElementById('videoPlayer');
    const title = document.getElementById('videoTitle');
    const downloadBtn = document.getElementById('downloadBtn');
    
    title.textContent = video.name;
    
    // 根据存储类型获取视频 URL
    let videoUrl = null;
    
    if (USE_B2_STORAGE && video.storageType === 'b2' && video.storagePath) {
        showToast('正在加载视频...', 'info');
        videoUrl = await B2Storage.getDownloadUrl(video.storagePath);
        if (!videoUrl) {
            showToast('获取视频链接失败', 'error');
            return;
        }
    } else if (video.data) {
        // LocalStorage 模式
        videoUrl = video.data;
    } else {
        showToast('视频数据不存在', 'error');
        return;
    }
    
    player.src = videoUrl;
    
    // 设置下载按钮
    downloadBtn.onclick = () => downloadVideo(videoId);
    
    modal.classList.add('active');
    
    // 自动播放
    player.play().catch(() => {
        // 自动播放被阻止，不处理
    });
}

// 关闭视频模态框
function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    const player = document.getElementById('videoPlayer');
    
    player.pause();
    player.src = '';
    modal.classList.remove('active');
}

// 下载视频
async function downloadVideo(videoId) {
    const video = currentVideos.find(v => v.id === videoId);
    if (!video) {
        showToast('视频不存在', 'error');
        return;
    }
    
    try {
        let videoUrl = null;
        
        if (USE_B2_STORAGE && video.storageType === 'b2' && video.storagePath) {
            showToast('正在获取下载链接...', 'info');
            videoUrl = await B2Storage.getDownloadUrl(video.storagePath);
            if (!videoUrl) {
                showToast('获取下载链接失败', 'error');
                return;
            }
        } else if (video.data) {
            // LocalStorage 模式
            videoUrl = video.data;
        } else {
            showToast('视频数据不存在', 'error');
            return;
        }
        
        // 创建下载链接
        const link = document.createElement('a');
        link.href = videoUrl;
        link.download = video.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('开始下载: ' + video.name, 'success');
    } catch (e) {
        console.error('Download error:', e);
        showToast('下载失败，请重试', 'error');
    }
}

// 学生退出登录
function logoutStudent() {
    // 清除缓存
    sessionStorage.removeItem('weiyu_code');
    sessionStorage.removeItem('weiyu_name');
    
    // 重置状态
    currentLesson = null;
    currentCourse = null;
    currentStudentName = '';
    currentVideos = [];
    
    // 切换视图
    document.getElementById('videoSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'flex';
    
    // 清空表单
    document.getElementById('downloadCode').value = '';
    document.getElementById('studentName').value = '';
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 点击模态框外部关闭
document.getElementById('videoModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeVideoModal();
    }
});

// ESC 键关闭模态框
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeVideoModal();
    }
});
