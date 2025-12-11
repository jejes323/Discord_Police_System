const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const reportsFile = path.join(dataDir, 'reports.json');
const settingsFile = path.join(dataDir, 'settings.json');

// 데이터 디렉토리 생성
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 신고 데이터 로드
function loadReports() {
    try {
        if (fs.existsSync(reportsFile)) {
            const data = fs.readFileSync(reportsFile, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('신고 데이터 로드 오류:', error);
    }
    return [];
}

// 신고 데이터 저장
function saveReports(reports) {
    try {
        fs.writeFileSync(reportsFile, JSON.stringify(reports, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error('신고 데이터 저장 오류:', error);
        return false;
    }
}

// 설정 데이터 로드
function loadSettings() {
    try {
        if (fs.existsSync(settingsFile)) {
            const data = fs.readFileSync(settingsFile, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('설정 데이터 로드 오류:', error);
    }
    return {};
}

// 설정 데이터 저장
function saveSettings(settings) {
    try {
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error('설정 데이터 저장 오류:', error);
        return false;
    }
}

// 신고 ID 생성
function generateReportId() {
    return `REPORT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
    loadReports,
    saveReports,
    loadSettings,
    saveSettings,
    generateReportId
};
