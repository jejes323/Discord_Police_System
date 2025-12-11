const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 데이터 디렉토리 생성
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 데이터베이스 연결
const dbPath = path.join(dataDir, 'police.db');
const db = new Database(dbPath);

// 테이블 생성
db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        message_id TEXT,
        dispatch_officer TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        case_number TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        message_id TEXT,
        assigned_officer TEXT,
        closed_at TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
        guild_id TEXT PRIMARY KEY,
        report_channel_id TEXT,
        case_log_channel_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
    CREATE INDEX IF NOT EXISTS idx_reports_guild_id ON reports(guild_id);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
    CREATE INDEX IF NOT EXISTS idx_cases_guild_id ON cases(guild_id);
    CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
    CREATE INDEX IF NOT EXISTS idx_cases_case_number ON cases(case_number);
`);

// 신고 관련 함수들
const reportQueries = {
    // 신고 생성
    create: db.prepare(`
        INSERT INTO reports (id, user_id, username, guild_id, type, status, timestamp, message_id)
        VALUES (@id, @userId, @username, @guildId, @type, @status, @timestamp, @messageId)
    `),

    // 모든 신고 조회
    getAll: db.prepare('SELECT * FROM reports ORDER BY created_at DESC'),

    // 특정 유저의 신고 조회
    getByUserId: db.prepare(`
        SELECT * FROM reports 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    `),

    // 특정 ID로 신고 조회
    getById: db.prepare('SELECT * FROM reports WHERE id = ?'),

    // 신고 상태 업데이트
    updateStatus: db.prepare(`
        UPDATE reports 
        SET status = @status 
        WHERE id = @id
    `),

    // 출동 경찰 업데이트
    updateDispatchOfficer: db.prepare(`
        UPDATE reports 
        SET dispatch_officer = @officer 
        WHERE id = @id
    `),

    // 메시지 ID 업데이트
    updateMessageId: db.prepare(`
        UPDATE reports 
        SET message_id = @messageId 
        WHERE id = @id
    `),

    // 특정 신고 삭제
    deleteById: db.prepare('DELETE FROM reports WHERE id = ?'),

    // 특정 유저의 모든 신고 삭제
    deleteByUserId: db.prepare('DELETE FROM reports WHERE user_id = ?'),

    // 모든 신고 삭제
    deleteAll: db.prepare('DELETE FROM reports'),

    // 신고 개수 조회
    countByUserId: db.prepare('SELECT COUNT(*) as count FROM reports WHERE user_id = ?')
};

// 사건 관련 함수들
const caseQueries = {
    // 사건 생성
    create: db.prepare(`
        INSERT INTO cases (id, case_number, user_id, username, guild_id, title, description, status, timestamp, message_id)
        VALUES (@id, @caseNumber, @userId, @username, @guildId, @title, @description, @status, @timestamp, @messageId)
    `),

    // 모든 사건 조회
    getAll: db.prepare('SELECT * FROM cases ORDER BY created_at DESC'),

    // 특정 사건번호로 조회
    getByCaseNumber: db.prepare('SELECT * FROM cases WHERE case_number = ?'),

    // 특정 ID로 사건 조회
    getById: db.prepare('SELECT * FROM cases WHERE id = ?'),

    // 특정 유저의 사건 조회
    getByUserId: db.prepare(`
        SELECT * FROM cases 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    `),

    // 사건 정보 업데이트
    update: db.prepare(`
        UPDATE cases 
        SET title = @title, description = @description
        WHERE id = @id
    `),

    // 사건 상태 업데이트
    updateStatus: db.prepare(`
        UPDATE cases 
        SET status = @status 
        WHERE id = @id
    `),

    // 담당자 배정
    updateAssignedOfficer: db.prepare(`
        UPDATE cases 
        SET assigned_officer = @officer 
        WHERE id = @id
    `),

    // 사건 종결
    closeCase: db.prepare(`
        UPDATE cases 
        SET status = '종결', closed_at = @closedAt 
        WHERE id = @id
    `),

    // 메시지 ID 업데이트
    updateMessageId: db.prepare(`
        UPDATE cases 
        SET message_id = @messageId 
        WHERE id = @id
    `),

    // 특정 사건 삭제
    deleteById: db.prepare('DELETE FROM cases WHERE id = ?'),

    // 사건번호 존재 여부 확인
    checkCaseNumberExists: db.prepare('SELECT COUNT(*) as count FROM cases WHERE case_number = ?')
};

// 설정 관련 함수들
const settingQueries = {
    // 설정 조회
    get: db.prepare('SELECT * FROM settings WHERE guild_id = ?'),

    // 설정 저장/업데이트
    upsert: db.prepare(`
        INSERT INTO settings (guild_id, report_channel_id, case_log_channel_id) 
        VALUES (@guildId, @reportChannelId, @caseLogChannelId)
        ON CONFLICT(guild_id) 
        DO UPDATE SET 
            report_channel_id = COALESCE(@reportChannelId, report_channel_id),
            case_log_channel_id = COALESCE(@caseLogChannelId, case_log_channel_id)
    `)
};

// 신고 관련 함수
function createReport(report) {
    try {
        reportQueries.create.run({
            id: report.id,
            userId: report.userId,
            username: report.username,
            guildId: report.guildId,
            type: report.type,
            status: report.status,
            timestamp: report.timestamp,
            messageId: report.messageId || null
        });
        return true;
    } catch (error) {
        console.error('신고 생성 오류:', error);
        return false;
    }
}

function getAllReports() {
    try {
        const rows = reportQueries.getAll.all();
        return rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            username: row.username,
            guildId: row.guild_id,
            type: row.type,
            status: row.status,
            timestamp: row.timestamp,
            messageId: row.message_id,
            dispatchOfficer: row.dispatch_officer
        }));
    } catch (error) {
        console.error('신고 조회 오류:', error);
        return [];
    }
}

function getReportsByUserId(userId) {
    try {
        const rows = reportQueries.getByUserId.all(userId);
        return rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            username: row.username,
            guildId: row.guild_id,
            type: row.type,
            status: row.status,
            timestamp: row.timestamp,
            messageId: row.message_id,
            dispatchOfficer: row.dispatch_officer
        }));
    } catch (error) {
        console.error('유저별 신고 조회 오류:', error);
        return [];
    }
}

function getReportById(reportId) {
    try {
        const row = reportQueries.getById.get(reportId);
        if (!row) return null;

        return {
            id: row.id,
            userId: row.user_id,
            username: row.username,
            guildId: row.guild_id,
            type: row.type,
            status: row.status,
            timestamp: row.timestamp,
            messageId: row.message_id,
            dispatchOfficer: row.dispatch_officer
        };
    } catch (error) {
        console.error('신고 ID 조회 오류:', error);
        return null;
    }
}

function updateReportStatus(reportId, status) {
    try {
        reportQueries.updateStatus.run({ id: reportId, status });
        return true;
    } catch (error) {
        console.error('신고 상태 업데이트 오류:', error);
        return false;
    }
}

function updateDispatchOfficer(reportId, officer) {
    try {
        reportQueries.updateDispatchOfficer.run({ id: reportId, officer });
        return true;
    } catch (error) {
        console.error('출동 경찰 업데이트 오류:', error);
        return false;
    }
}

function updateReportMessageId(reportId, messageId) {
    try {
        reportQueries.updateMessageId.run({ id: reportId, messageId });
        return true;
    } catch (error) {
        console.error('메시지 ID 업데이트 오류:', error);
        return false;
    }
}

function deleteReport(reportId) {
    try {
        reportQueries.deleteById.run(reportId);
        return true;
    } catch (error) {
        console.error('신고 삭제 오류:', error);
        return false;
    }
}

function deleteUserReports(userId) {
    try {
        const result = reportQueries.deleteByUserId.run(userId);
        return result.changes;
    } catch (error) {
        console.error('유저 신고 삭제 오류:', error);
        return 0;
    }
}

function deleteAllReports() {
    try {
        const result = reportQueries.deleteAll.run();
        return result.changes;
    } catch (error) {
        console.error('전체 신고 삭제 오류:', error);
        return 0;
    }
}

// 설정 관련 함수
function getGuildSettings(guildId) {
    try {
        const row = settingQueries.get.get(guildId);
        if (!row) return null;

        return {
            guildId: row.guild_id,
            reportChannelId: row.report_channel_id,
            caseLogChannelId: row.case_log_channel_id
        };
    } catch (error) {
        console.error('설정 조회 오류:', error);
        return null;
    }
}

function setReportChannel(guildId, channelId) {
    try {
        settingQueries.upsert.run({
            guildId,
            reportChannelId: channelId,
            caseLogChannelId: null
        });
        return true;
    } catch (error) {
        console.error('설정 저장 오류:', error);
        return false;
    }
}

function setCaseLogChannel(guildId, channelId) {
    try {
        settingQueries.upsert.run({
            guildId,
            reportChannelId: null,
            caseLogChannelId: channelId
        });
        return true;
    } catch (error) {
        console.error('사건 로그 채널 저장 오류:', error);
        return false;
    }
}

// 신고 ID 생성
function generateReportId() {
    return `REPORT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 사건 ID 생성
function generateCaseId() {
    return `CASE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 사건번호 생성 (C-YYYYMMDD-XXX 형식)
function generateCaseNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // 오늘 날짜의 마지막 사건번호 확인
    let sequenceNum = 1;
    let caseNumber;

    do {
        const seqStr = String(sequenceNum).padStart(3, '0');
        caseNumber = `C-${dateStr}-${seqStr}`;
        const result = caseQueries.checkCaseNumberExists.get(caseNumber);
        if (result.count === 0) break;
        sequenceNum++;
    } while (sequenceNum < 1000);

    return caseNumber;
}

// 사건 생성
function createCase(caseData) {
    try {
        caseQueries.create.run({
            id: caseData.id,
            caseNumber: caseData.caseNumber,
            userId: caseData.userId,
            username: caseData.username,
            guildId: caseData.guildId,
            title: caseData.title,
            description: caseData.description,
            status: caseData.status,
            timestamp: caseData.timestamp,
            messageId: caseData.messageId || null
        });
        return true;
    } catch (error) {
        console.error('사건 생성 오류:', error);
        return false;
    }
}

// 사건번호로 사건 조회
function getCaseByCaseNumber(caseNumber) {
    try {
        const row = caseQueries.getByCaseNumber.get(caseNumber);
        if (!row) return null;

        return {
            id: row.id,
            caseNumber: row.case_number,
            userId: row.user_id,
            username: row.username,
            guildId: row.guild_id,
            title: row.title,
            description: row.description,
            status: row.status,
            timestamp: row.timestamp,
            messageId: row.message_id,
            assignedOfficer: row.assigned_officer,
            closedAt: row.closed_at
        };
    } catch (error) {
        console.error('사건번호 조회 오류:', error);
        return null;
    }
}

// ID로 사건 조회
function getCaseById(caseId) {
    try {
        const row = caseQueries.getById.get(caseId);
        if (!row) return null;

        return {
            id: row.id,
            caseNumber: row.case_number,
            userId: row.user_id,
            username: row.username,
            guildId: row.guild_id,
            title: row.title,
            description: row.description,
            status: row.status,
            timestamp: row.timestamp,
            messageId: row.message_id,
            assignedOfficer: row.assigned_officer,
            closedAt: row.closed_at
        };
    } catch (error) {
        console.error('사건 ID 조회 오류:', error);
        return null;
    }
}

// 유저별 사건 조회
function getCasesByUserId(userId) {
    try {
        const rows = caseQueries.getByUserId.all(userId);
        return rows.map(row => ({
            id: row.id,
            caseNumber: row.case_number,
            userId: row.user_id,
            username: row.username,
            guildId: row.guild_id,
            title: row.title,
            description: row.description,
            status: row.status,
            timestamp: row.timestamp,
            messageId: row.message_id,
            assignedOfficer: row.assigned_officer,
            closedAt: row.closed_at
        }));
    } catch (error) {
        console.error('유저별 사건 조회 오류:', error);
        return [];
    }
}

// 사건 정보 업데이트
function updateCase(caseId, title, description) {
    try {
        caseQueries.update.run({ id: caseId, title, description });
        return true;
    } catch (error) {
        console.error('사건 정보 업데이트 오류:', error);
        return false;
    }
}

// 사건 메시지 ID 업데이트
function updateCaseMessageId(caseId, messageId) {
    try {
        caseQueries.updateMessageId.run({ id: caseId, messageId });
        return true;
    } catch (error) {
        console.error('사건 메시지 ID 업데이트 오류:', error);
        return false;
    }
}

// 담당자 배정
function assignCaseOfficer(caseId, officer) {
    try {
        caseQueries.updateAssignedOfficer.run({ id: caseId, officer });
        return true;
    } catch (error) {
        console.error('담당자 배정 오류:', error);
        return false;
    }
}

// 사건 종결
function closeCase(caseId) {
    try {
        const now = new Date().toISOString();
        caseQueries.closeCase.run({ id: caseId, closedAt: now });
        return true;
    } catch (error) {
        console.error('사건 종결 오류:', error);
        return false;
    }
}

// 사건 삭제
function deleteCase(caseId) {
    try {
        caseQueries.deleteById.run(caseId);
        return true;
    } catch (error) {
        console.error('사건 삭제 오류:', error);
        return false;
    }
}

// 데이터베이스 종료
function closeDatabase() {
    db.close();
}

module.exports = {
    db,
    // Report functions
    createReport,
    getAllReports,
    getReportsByUserId,
    getReportById,
    updateReportStatus,
    updateDispatchOfficer,
    updateReportMessageId,
    deleteReport,
    deleteUserReports,
    deleteAllReports,
    generateReportId,

    // Case functions
    createCase,
    getCaseByCaseNumber,
    getCaseById,
    getCasesByUserId,
    updateCase,
    updateCaseMessageId,
    assignCaseOfficer,
    closeCase,
    deleteCase,
    generateCaseId,
    generateCaseNumber,

    // Settings functions
    getGuildSettings,
    setReportChannel,
    setCaseLogChannel,

    closeDatabase
};
