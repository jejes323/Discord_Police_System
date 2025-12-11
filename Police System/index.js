require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    Collection,
    REST,
    Routes,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./utils/database');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 명령어 컬렉션
client.commands = new Collection();

// 명령어 파일 로드
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        console.log(`[명령어 로드] ${command.data.name}`);
    } else {
        console.log(`[경고] ${filePath} 명령어에 필수 "data" 또는 "execute" 속성이 없습니다.`);
    }
}

// 봇 준비 이벤트
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} 봇이 준비되었습니다!`);

    // 슬래시 명령어 등록
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('슬래시 명령어 등록 중...');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log('✅ 슬래시 명령어가 등록되었습니다!');
    } catch (error) {
        console.error('명령어 등록 오류:', error);
    }
});

// 인터랙션 이벤트
client.on('interactionCreate', async interaction => {
    // 슬래시 명령어 처리
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`${interaction.commandName} 명령어를 찾을 수 없습니다.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('명령어 실행 오류:', error);
            const errorMessage = { content: '명령어 실행 중 오류가 발생했습니다!', ephemeral: true };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }

    // 버튼 인터랙션 처리
    if (interaction.isButton()) {
        const customId = interaction.customId;

        // 신고조회 페이지네이션 버튼 (report_보다 먼저 확인해야 함!)
        if (customId.startsWith('report_check_prev_') || customId.startsWith('report_check_next_')) {
            await handleReportCheckPagination(interaction, customId);
        }

        // 신고 접수 버튼
        else if (customId.startsWith('report_')) {
            const reportType = customId.replace('report_', '');

            // 기타사항인 경우 Modal 표시
            if (reportType === '기타사항') {
                await showCustomReportModal(interaction);
            } else {
                // 일반 신고 유형은 기존대로 처리
                await handleReportSubmission(interaction, reportType);
            }
        }

        // 출동 버튼
        else if (customId.startsWith('dispatch_')) {
            const reportId = customId.replace('dispatch_', '');
            await handleDispatch(interaction, reportId);
        }

        // 도착 버튼
        else if (customId.startsWith('arrive_')) {
            const reportId = customId.replace('arrive_', '');
            await handleArrive(interaction, reportId);
        }

        // 처리중 버튼
        else if (customId.startsWith('processing_')) {
            const reportId = customId.replace('processing_', '');
            await handleProcessing(interaction, reportId);
        }

        // 종결 버튼
        else if (customId.startsWith('close_')) {
            const reportId = customId.replace('close_', '');
            await handleClose(interaction, reportId);
        }

        // 사건 담당자 배정 버튼
        else if (customId.startsWith('assign_case_')) {
            const caseId = customId.replace('assign_case_', '');
            await handleCaseAssignment(interaction, caseId);
        }
    }

    // 드롭다운 메뉴 (StringSelectMenu) 처리
    if (interaction.isStringSelectMenu()) {
        const customId = interaction.customId;

        // 신고 삭제 드롭다운
        if (customId.startsWith('delete_report_')) {
            const selectedReportId = interaction.values[0];
            const success = db.deleteReport(selectedReportId);

            if (success) {
                await interaction.update({
                    content: `✅ 신고가 삭제되었습니다. (ID: ${selectedReportId.slice(-8)})`,
                    components: []
                });
            } else {
                await interaction.update({
                    content: '❌ 신고 삭제에 실패했습니다.',
                    components: []
                });
            }
        }

        // 사건 수정 드롭다운
        else if (customId === 'edit_case_select') {
            await showCaseEditModal(interaction);
        }

        // 관리자 사건 수정 드롭다운
        else if (customId === 'admin_edit_case_select') {
            await showAdminCaseEditModal(interaction);
        }

        // 사건 종결 드롭다운
        else if (customId === 'close_case_select') {
            await handleCaseClose(interaction);
        }

        // 사건 삭제 드롭다운
        else if (customId === 'delete_case_select') {
            await handleCaseDelete(interaction);
        }
    }

    // Modal 제출 처리
    if (interaction.isModalSubmit()) {
        const customId = interaction.customId;

        // 기타사항 신고 Modal 제출
        if (customId === 'custom_report_modal') {
            const reportContent = interaction.fields.getTextInputValue('report_content');
            await handleCustomReportSubmission(interaction, reportContent);
        }

        // 사건 등록 Modal 제출
        else if (customId === 'case_register_modal') {
            await handleCaseRegistration(interaction);
        }

        // 사건 수정 Modal 제출
        else if (customId.startsWith('case_edit_modal_')) {
            await handleCaseEdit(interaction);
        }

        // 관리자 사건 수정 Modal 제출
        else if (customId.startsWith('admin_case_edit_modal_')) {
            await handleAdminCaseEdit(interaction);
        }
    }
});

// 신고 접수 처리
async function handleReportSubmission(interaction, reportType) {
    const guildSettings = db.getGuildSettings(interaction.guildId);

    if (!guildSettings || !guildSettings.reportChannelId) {
        return await interaction.reply({
            content: '❌ 신고 채널이 설정되지 않았습니다. 관리자에게 문의하세요.',
            ephemeral: true
        });
    }

    const reportChannel = await client.channels.fetch(guildSettings.reportChannelId);

    if (!reportChannel) {
        return await interaction.reply({
            content: '❌ 신고 채널을 찾을 수 없습니다. 관리자에게 문의하세요.',
            ephemeral: true
        });
    }

    // 신고 데이터 생성
    const reportId = db.generateReportId();
    const now = new Date();
    const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}시 ${now.getMinutes()}분`;

    const report = {
        id: reportId,
        userId: interaction.user.id,
        username: interaction.user.tag,
        type: reportType,
        timestamp: now.toISOString(),
        status: '접수',
        guildId: interaction.guildId
    };

    // 신고 저장
    db.createReport(report);

    // 신고 접수 메시지 생성
    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🚨 신고 접수')
        .setDescription(`**${reportType}** 신고가 접수되었습니다`)
        .addFields(
            { name: '신고자', value: `<@${interaction.user.id}>`, inline: true },
            { name: '신고시각', value: dateStr, inline: true },
            { name: '신고유형', value: reportType, inline: true },
            { name: '상태', value: '📝 접수', inline: true },
            { name: '신고번호', value: reportId.slice(-8), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: '경찰청 신고 시스템' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`dispatch_${reportId}`)
                .setLabel('출동')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🚔')
        );

    // 신고 채널에 메시지 전송
    const reportMessage = await reportChannel.send({ embeds: [embed], components: [row] });

    // 신고 메시지 ID 저장
    db.updateReportMessageId(reportId, reportMessage.id);

    // 사용자에게 확인 메시지 (기존 메시지를 업데이트하여 선택 메뉴 닫기)
    await interaction.update({
        content: `✅ **${reportType}** 신고가 접수되었습니다.\n신고번호: ${reportId.slice(-8)}`,
        embeds: [],
        components: []
    });
}

// 출동 처리
async function handleDispatch(interaction, reportId) {
    const report = db.getReportById(reportId);

    if (!report) {
        return await interaction.reply({ content: '❌ 신고를 찾을 수 없습니다.', ephemeral: true });
    }

    db.updateReportStatus(reportId, '출동');
    db.updateDispatchOfficer(reportId, interaction.user.tag);

    const now = new Date();
    const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}시 ${now.getMinutes()}분`;

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .spliceFields(3, 1, { name: '상태', value: '🚨 출동', inline: true })
        .addFields({ name: '출동 경찰', value: interaction.user.tag, inline: true })
        .addFields({ name: '출동 시각', value: dateStr, inline: true });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`arrive_${reportId}`)
                .setLabel('도착')
                .setStyle(ButtonStyle.Success)
                .setEmoji('📍')
        );

    await interaction.update({ embeds: [embed], components: [row] });
}

// 도착 처리
async function handleArrive(interaction, reportId) {
    const report = db.getReportById(reportId);

    if (!report) {
        return await interaction.reply({ content: '❌ 신고를 찾을 수 없습니다.', ephemeral: true });
    }

    db.updateReportStatus(reportId, '도착');

    const now = new Date();
    const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}시 ${now.getMinutes()}분`;

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .spliceFields(3, 1, { name: '상태', value: '📍 도착', inline: true })
        .addFields({ name: '도착 시각', value: dateStr, inline: true });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`processing_${reportId}`)
                .setLabel('처리중')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⚙️')
        );

    await interaction.update({ embeds: [embed], components: [row] });
}

// 처리중 처리
async function handleProcessing(interaction, reportId) {
    const report = db.getReportById(reportId);

    if (!report) {
        return await interaction.reply({ content: '❌ 신고를 찾을 수 없습니다.', ephemeral: true });
    }

    db.updateReportStatus(reportId, '처리중');

    const now = new Date();
    const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}시 ${now.getMinutes()}분`;

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .spliceFields(3, 1, { name: '상태', value: '⚙️ 처리중', inline: true })
        .addFields({ name: '처리 시작', value: dateStr, inline: true });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`close_${reportId}`)
                .setLabel('종결')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('✅')
        );

    await interaction.update({ embeds: [embed], components: [row] });
}

// 종결 처리
async function handleClose(interaction, reportId) {
    const report = db.getReportById(reportId);

    if (!report) {
        return await interaction.reply({ content: '❌ 신고를 찾을 수 없습니다.', ephemeral: true });
    }

    db.updateReportStatus(reportId, '종결');

    const now = new Date();
    const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}시 ${now.getMinutes()}분`;

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor('#00FF00')
        .spliceFields(3, 1, { name: '상태', value: '✅ 종결', inline: true })
        .addFields({ name: '종결 시각', value: dateStr, inline: true });

    await interaction.update({ embeds: [embed], components: [] });
}

// 신고조회 페이지네이션 처리
async function handleReportCheckPagination(interaction, customId) {
    const reportCheckModule = require('./commands/reportCheck');
    const { createReportEmbed, createPaginationButtons, REPORTS_PER_PAGE } = reportCheckModule;

    // customId 파싱: report_check_prev_${userId}_${currentPage} 또는 report_check_next_${userId}_${currentPage}
    const parts = customId.split('_');
    const action = parts[2]; // 'prev' 또는 'next'
    const userId = parts[3];
    const currentPage = parseInt(parts[4]);

    // 권한 확인: 본인의 신고 내역만 볼 수 있음
    if (interaction.user.id !== userId) {
        return await interaction.reply({
            content: '❌ 본인의 신고 내역만 조회할 수 있습니다.',
            ephemeral: true
        });
    }

    // 새 페이지 계산
    let newPage = currentPage;
    if (action === 'prev') {
        newPage = Math.max(0, currentPage - 1);
    } else if (action === 'next') {
        newPage = currentPage + 1;
    }

    // 사용자 신고 내역 가져오기
    const userReports = db.getReportsByUserId(userId);

    // 최신 신고가 먼저 나오도록 정렬
    userReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const totalPages = Math.ceil(userReports.length / REPORTS_PER_PAGE);

    // 페이지 범위 확인
    if (newPage < 0 || newPage >= totalPages) {
        return await interaction.reply({
            content: '❌ 잘못된 페이지입니다.',
            ephemeral: true
        });
    }

    // 새 임베드 및 버튼 생성
    const embed = createReportEmbed(userReports, newPage, userId);
    const buttons = createPaginationButtons(newPage, totalPages, userId);

    // 메시지 업데이트
    await interaction.update({ embeds: [embed], components: [buttons] });
}

// 기타사항 신고 Modal 표시
async function showCustomReportModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('custom_report_modal')
        .setTitle('📝 기타사항 신고');

    const reportContentInput = new TextInputBuilder()
        .setCustomId('report_content')
        .setLabel('신고 내용을 입력해주세요')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('신고하실 내용을 자세히 작성해주세요...')
        .setRequired(true)
        .setMaxLength(1000);

    const row = new ActionRowBuilder().addComponents(reportContentInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

// 기타사항 신고 접수 처리
async function handleCustomReportSubmission(interaction, reportContent) {
    const guildSettings = db.getGuildSettings(interaction.guildId);

    if (!guildSettings || !guildSettings.reportChannelId) {
        return await interaction.reply({
            content: '❌ 신고 채널이 설정되지 않았습니다. 관리자에게 문의하세요.',
            ephemeral: true
        });
    }

    const reportChannel = await client.channels.fetch(guildSettings.reportChannelId);

    if (!reportChannel) {
        return await interaction.reply({
            content: '❌ 신고 채널을 찾을 수 없습니다. 관리자에게 문의하세요.',
            ephemeral: true
        });
    }

    // 신고 데이터 생성
    const reportId = db.generateReportId();
    const now = new Date();
    const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}시 ${now.getMinutes()}분`;

    const report = {
        id: reportId,
        userId: interaction.user.id,
        username: interaction.user.tag,
        type: '기타사항',
        content: reportContent,  // 신고 내용 추가
        timestamp: now.toISOString(),
        status: '접수',
        guildId: interaction.guildId
    };

    // 신고 저장
    db.createReport(report);

    // 신고 접수 메시지 생성
    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🚨 신고 접수')
        .setDescription(`**기타사항** 신고가 접수되었습니다`)
        .addFields(
            { name: '신고자', value: `<@${interaction.user.id}>`, inline: true },
            { name: '신고시각', value: dateStr, inline: true },
            { name: '신고유형', value: '기타사항', inline: true },
            { name: '상태', value: '📝 접수', inline: true },
            { name: '신고번호', value: reportId.slice(-8), inline: true },
            { name: '신고 내용', value: reportContent, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: '경찰청 신고 시스템' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`dispatch_${reportId}`)
                .setLabel('출동')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🚔')
        );

    // 신고 채널에 메시지 전송
    const reportMessage = await reportChannel.send({ embeds: [embed], components: [row] });

    // 신고 메시지 ID 저장
    db.updateReportMessageId(reportId, reportMessage.id);

    // 사용자에게 확인 메시지
    await interaction.reply({
        content: `✅ **기타사항** 신고가 접수되었습니다.\n신고번호: ${reportId.slice(-8)}`,
        ephemeral: true
    });
}

// ========== 사건 관리 핸들러 함수들 ==========

// 사건 등록 처리
async function handleCaseRegistration(interaction) {
    const title = interaction.fields.getTextInputValue('case_title');
    const description = interaction.fields.getTextInputValue('case_description');

    const guildSettings = db.getGuildSettings(interaction.guildId);

    if (!guildSettings || !guildSettings.caseLogChannelId) {
        return await interaction.reply({
            content: '❌ 사건 로그 채널이 설정되지 않았습니다. 관리자에게 문의하세요.',
            ephemeral: true
        });
    }

    const caseLogChannel = await client.channels.fetch(guildSettings.caseLogChannelId);

    if (!caseLogChannel) {
        return await interaction.reply({
            content: '❌ 사건 로그 채널을 찾을 수 없습니다. 관리자에게 문의하세요.',
            ephemeral: true
        });
    }

    // 사건 데이터 생성
    const caseId = db.generateCaseId();
    const caseNumber = db.generateCaseNumber();
    const now = new Date();
    const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}시 ${now.getMinutes()}분`;

    const caseData = {
        id: caseId,
        caseNumber: caseNumber,
        userId: interaction.user.id,
        username: interaction.user.tag,
        guildId: interaction.guildId,
        title: title,
        description: description,
        status: '접수',
        timestamp: now.toISOString()
    };

    // 사건 저장
    const success = db.createCase(caseData);

    if (!success) {
        return await interaction.reply({
            content: '❌ 사건 등록에 실패했습니다.',
            ephemeral: true
        });
    }

    // 로그 채널에 사건 등록 메시지 전송
    const embed = new EmbedBuilder()
        .setColor('#FF9900')
        .setTitle('📋 새 사건 등록')
        .addFields(
            { name: '사건번호', value: caseNumber, inline: true },
            { name: '신고자', value: `<@${interaction.user.id}>`, inline: true },
            { name: '상태', value: '📝 접수', inline: true },
            { name: '제목', value: title, inline: false },
            { name: '내용', value: description, inline: false },
            { name: '등록시각', value: dateStr, inline: true },
            { name: '담당자', value: '미배정', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: '경찰청 사건 관리 시스템' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`assign_case_${caseId}`)
                .setLabel('담당 지정')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👮')
        );

    // 로그 채널에 메시지 전송
    const caseMessage = await caseLogChannel.send({ embeds: [embed], components: [row] });

    // 사건 메시지 ID 저장
    db.updateCaseMessageId(caseId, caseMessage.id);

    // 사용자에게 확인 메시지
    await interaction.reply({
        content: `✅ 사건이 등록되었습니다.\n사건번호: **${caseNumber}**`,
        ephemeral: true
    });
}

// 사건 수정 Modal 표시
async function showCaseEditModal(interaction) {
    const selectedCaseId = interaction.values[0];
    const caseData = db.getCaseById(selectedCaseId);

    if (!caseData) {
        return await interaction.update({
            content: '❌ 사건을 찾을 수 없습니다.',
            components: []
        });
    }

    // 권한 확인 - 본인이 등록한 사건만 수정 가능
    if (caseData.userId !== interaction.user.id) {
        return await interaction.update({
            content: '❌ 자신이 등록한 사건만 수정할 수 있습니다.',
            components: []
        });
    }

    const modal = new ModalBuilder()
        .setCustomId(`case_edit_modal_${selectedCaseId}`)
        .setTitle(`📝 사건 수정 - ${caseData.caseNumber}`);

    const titleInput = new TextInputBuilder()
        .setCustomId('case_title')
        .setLabel('사건 제목')
        .setStyle(TextInputStyle.Short)
        .setValue(caseData.title)
        .setRequired(true)
        .setMaxLength(100);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('case_description')
        .setLabel('사건 내용')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(caseData.description)
        .setRequired(true)
        .setMaxLength(2000);

    const titleRow = new ActionRowBuilder().addComponents(titleInput);
    const descriptionRow = new ActionRowBuilder().addComponents(descriptionInput);

    modal.addComponents(titleRow, descriptionRow);

    await interaction.showModal(modal);
}

// 관리자 사건 수정 Modal 표시
async function showAdminCaseEditModal(interaction) {
    const selectedCaseId = interaction.values[0];
    const caseData = db.getCaseById(selectedCaseId);

    if (!caseData) {
        return await interaction.update({
            content: '❌ 사건을 찾을 수 없습니다.',
            components: []
        });
    }

    const modal = new ModalBuilder()
        .setCustomId(`admin_case_edit_modal_${selectedCaseId}`)
        .setTitle(`📝 사건 수정 - ${caseData.caseNumber}`);

    const titleInput = new TextInputBuilder()
        .setCustomId('case_title')
        .setLabel('사건 제목')
        .setStyle(TextInputStyle.Short)
        .setValue(caseData.title)
        .setRequired(true)
        .setMaxLength(100);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('case_description')
        .setLabel('사건 내용')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(caseData.description)
        .setRequired(true)
        .setMaxLength(2000);

    const titleRow = new ActionRowBuilder().addComponents(titleInput);
    const descriptionRow = new ActionRowBuilder().addComponents(descriptionInput);

    modal.addComponents(titleRow, descriptionRow);

    await interaction.showModal(modal);
}

// 사건 수정 처리
async function handleCaseEdit(interaction) {
    const caseId = interaction.customId.replace('case_edit_modal_', '');
    const title = interaction.fields.getTextInputValue('case_title');
    const description = interaction.fields.getTextInputValue('case_description');

    const caseData = db.getCaseById(caseId);

    if (!caseData) {
        return await interaction.reply({
            content: '❌ 사건을 찾을 수 없습니다.',
            ephemeral: true
        });
    }

    const success = db.updateCase(caseId, title, description);

    if (success) {
        // 로그 채널의 메시지 업데이트
        await updateCaseLogMessage(caseData, title, description);

        await interaction.reply({
            content: `✅ 사건 **${caseData.caseNumber}**이(가) 수정되었습니다.`,
            ephemeral: true
        });
    } else {
        await interaction.reply({
            content: '❌ 사건 수정에 실패했습니다.',
            ephemeral: true
        });
    }
}

// 관리자 사건 수정 처리
async function handleAdminCaseEdit(interaction) {
    const caseId = interaction.customId.replace('admin_case_edit_modal_', '');
    const title = interaction.fields.getTextInputValue('case_title');
    const description = interaction.fields.getTextInputValue('case_description');

    const caseData = db.getCaseById(caseId);

    if (!caseData) {
        return await interaction.reply({
            content: '❌ 사건을 찾을 수 없습니다.',
            ephemeral: true
        });
    }

    const success = db.updateCase(caseId, title, description);

    if (success) {
        // 로그 채널의 메시지 업데이트
        await updateCaseLogMessage(caseData, title, description);

        await interaction.reply({
            content: `✅ 사건 **${caseData.caseNumber}**이(가) 수정되었습니다.`,
            ephemeral: true
        });
    } else {
        await interaction.reply({
            content: '❌ 사건 수정에 실패했습니다.',
            ephemeral: true
        });
    }
}

// 사건 로그 메시지 업데이트
async function updateCaseLogMessage(caseData, newTitle, newDescription) {
    try {
        const guildSettings = db.getGuildSettings(caseData.guildId);
        if (!guildSettings || !guildSettings.caseLogChannelId) return;

        const caseLogChannel = await client.channels.fetch(guildSettings.caseLogChannelId);
        if (!caseLogChannel || !caseData.messageId) return;

        const message = await caseLogChannel.messages.fetch(caseData.messageId);
        if (!message) return;

        // 기존 임베드를 복사하고 제목과 내용만 업데이트
        const embed = EmbedBuilder.from(message.embeds[0]);

        // 필드 업데이트
        const fields = embed.data.fields;
        for (let i = 0; i < fields.length; i++) {
            if (fields[i].name === '제목') {
                fields[i].value = newTitle;
            } else if (fields[i].name === '내용') {
                fields[i].value = newDescription;
            }
        }

        await message.edit({ embeds: [embed] });
    } catch (error) {
        console.error('사건 로그 메시지 업데이트 오류:', error);
    }
}

// 담당자 배정 처리
async function handleCaseAssignment(interaction, caseId) {
    const caseData = db.getCaseById(caseId);

    if (!caseData) {
        return await interaction.reply({
            content: '❌ 사건을 찾을 수 없습니다.',
            ephemeral: true
        });
    }

    const success = db.assignCaseOfficer(caseId, interaction.user.tag);

    if (!success) {
        return await interaction.reply({
            content: '❌ 담당자 배정에 실패했습니다.',
            ephemeral: true
        });
    }

    // 로그 메시지 업데이트
    const embed = EmbedBuilder.from(interaction.message.embeds[0]);

    const fields = embed.data.fields;
    for (let i = 0; i < fields.length; i++) {
        if (fields[i].name === '담당자') {
            fields[i].value = interaction.user.tag;
            break;
        }
    }

    await interaction.update({ embeds: [embed], components: [] });

    await interaction.followUp({
        content: `✅ 사건 **${caseData.caseNumber}**의 담당자로 지정되었습니다.`,
        ephemeral: true
    });
}

// 사건 종결 처리
async function handleCaseClose(interaction) {
    const selectedCaseId = interaction.values[0];
    const caseData = db.getCaseById(selectedCaseId);

    if (!caseData) {
        return await interaction.update({
            content: '❌ 사건을 찾을 수 없습니다.',
            components: []
        });
    }

    // 권한 확인
    if (caseData.userId !== interaction.user.id) {
        return await interaction.update({
            content: '❌ 자신이 등록한 사건만 종결할 수 있습니다.',
            components: []
        });
    }

    const success = db.closeCase(selectedCaseId);

    if (!success) {
        return await interaction.update({
            content: '❌ 사건 종결에 실패했습니다.',
            components: []
        });
    }

    // 로그 채널에 종결 로그 남기기
    await logCaseClosure(caseData);

    await interaction.update({
        content: `✅ 사건 **${caseData.caseNumber}**이(가) 종결되었습니다.`,
        components: []
    });
}

// 사건 종결 로그
async function logCaseClosure(caseData) {
    try {
        const guildSettings = db.getGuildSettings(caseData.guildId);
        if (!guildSettings || !guildSettings.caseLogChannelId) return;

        const caseLogChannel = await client.channels.fetch(guildSettings.caseLogChannelId);
        if (!caseLogChannel) return;

        const now = new Date();
        const closedStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}시 ${now.getMinutes()}분`;

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ 사건 종결')
            .addFields(
                { name: '사건번호', value: caseData.caseNumber, inline: true },
                { name: '제목', value: caseData.title, inline: false },
                { name: '종결시각', value: closedStr, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: '경찰청 사건 관리 시스템' });

        await caseLogChannel.send({ embeds: [embed] });

        // 기존 메시지도 업데이트
        if (caseData.messageId) {
            const message = await caseLogChannel.messages.fetch(caseData.messageId);
            if (message) {
                const updatedEmbed = EmbedBuilder.from(message.embeds[0])
                    .setColor('#00FF00');

                const fields = updatedEmbed.data.fields;
                for (let i = 0; i < fields.length; i++) {
                    if (fields[i].name === '상태') {
                        fields[i].value = '✅ 종결';
                        break;
                    }
                }

                updatedEmbed.addFields({ name: '종결시각', value: closedStr, inline: true });

                await message.edit({ embeds: [updatedEmbed], components: [] });
            }
        }
    } catch (error) {
        console.error('사건 종결 로그 오류:', error);
    }
}

// 사건 삭제 처리
async function handleCaseDelete(interaction) {
    const selectedCaseId = interaction.values[0];
    const caseData = db.getCaseById(selectedCaseId);

    if (!caseData) {
        return await interaction.update({
            content: '❌ 사건을 찾을 수 없습니다.',
            components: []
        });
    }

    const success = db.deleteCase(selectedCaseId);

    if (success) {
        // 로그 채널의 메시지도 삭제 시도
        try {
            const guildSettings = db.getGuildSettings(caseData.guildId);
            if (guildSettings && guildSettings.caseLogChannelId && caseData.messageId) {
                const caseLogChannel = await client.channels.fetch(guildSettings.caseLogChannelId);
                if (caseLogChannel) {
                    const message = await caseLogChannel.messages.fetch(caseData.messageId);
                    if (message) await message.delete();
                }
            }
        } catch (error) {
            console.error('사건 로그 메시지 삭제 오류:', error);
        }

        await interaction.update({
            content: `✅ 사건 **${caseData.caseNumber}**이(가) 삭제되었습니다.`,
            components: []
        });
    } else {
        await interaction.update({
            content: '❌ 사건 삭제에 실패했습니다.',
            components: []
        });
    }
}

// 에러 핸들링
client.on('error', error => {
    console.error('Discord 클라이언트 오류:', error);
});

process.on('unhandledRejection', error => {
    console.error('처리되지 않은 Promise 거부:', error);
});

// 봇 로그인
client.login(process.env.DISCORD_TOKEN);
