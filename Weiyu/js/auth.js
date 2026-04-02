/**
 * Weiyu - 网课视频共享平台
 * Auth Module - 登录认证相关
 */

// 教师登录
function loginTeacher(username, password) {
    const teacher = getTeacherByUsername(username);
    if (!teacher) {
        return { success: false, message: '用户名不存在' };
    }
    if (teacher.password !== password) {
        return { success: false, message: '密码错误' };
    }
    
    // 保存登录状态
    setCurrentTeacher({
        id: teacher.id,
        username: teacher.username,
        name: teacher.name
    });
    
    return { success: true, teacher };
}

// 教师登出
function logoutTeacher() {
    clearCurrentTeacher();
    window.location.href = '../teacher/';
}

// 管理员登录
function loginAdmin(password) {
    if (!verifyAdminPassword(password)) {
        return { success: false, message: '密码错误' };
    }
    
    setCurrentAdmin({ loggedIn: true, loginTime: new Date().toISOString() });
    return { success: true };
}

// 管理员登出
function logoutAdmin() {
    clearCurrentAdmin();
    window.location.href = '../manage/';
}

// 检查教师登录状态
function checkTeacherAuth() {
    if (!isTeacherLoggedIn()) {
        return false;
    }
    return getCurrentTeacher();
}

// 检查管理员登录状态
function checkAdminAuth() {
    return isAdminLoggedIn();
}

// 学生验证（通过下载码和姓名）
function verifyStudent(downloadCode, studentName) {
    const lesson = getLessonByCode(downloadCode);
    if (!lesson) {
        return { success: false, message: '下载码无效' };
    }
    
    const course = getCourseById(lesson.courseId);
    if (!course) {
        return { success: false, message: '课程信息不存在' };
    }
    
    // 检查学生是否在课程名单中
    const students = course.students || [];
    if (!students.includes(studentName.trim())) {
        return { success: false, message: '您的姓名不在该课程的学生名单中' };
    }
    
    return { 
        success: true, 
        lesson, 
        course,
        videos: getVideosByLesson(lesson.id)
    };
}

// 保护路由 - 教师页面
function protectTeacherRoute() {
    const teacher = checkTeacherAuth();
    if (!teacher) {
        return null;
    }
    return teacher;
}

// 保护路由 - 管理员页面
function protectAdminRoute() {
    if (!checkAdminAuth()) {
        return false;
    }
    return true;
}
