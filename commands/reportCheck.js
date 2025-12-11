const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getReportsByUserId } = require('../utils/database');

const REPORTS_PER_PAGE = 1;  // 테스트용: 페이지당 1개씩 표시

function createReportEmbed(userReports, page, userId) {
    const startIndex = page * REPORTS_PER_PAGE;
    const endIndex = Math.min(startIndex + REPORTS_PER_PAGE, userReports.length);
    const totalPages = Math.ceil(userReports.length / REPORTS_PER_PAGE);

    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('📋 나의 신고 내역')
        .setDescription(`총 ${userReports.length}건의 신고 (페이지 ${page + 1}/${totalPages})`)
        .setTimestamp()
        .setFooter({ text: `${startIndex + 1}-${endIndex}번째 신고 표시` });

    const reportsOnPage = userReports.slice(startIndex, endIndex);

    reportsOnPage.forEach((report, index) => {
        const date = new Date(report.timestamp);
        const dateStr = `${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}시 ${date.getMinutes()}분`;

        const statusEmoji = {
            '접수': '📝',
            '출동': '🚨',
            '도착': '📍',
            '처리중': '⚙️',
            '종결': '✅'
        };

        embed.addFields({
            name: `${startIndex + index + 1}. ${report.type} 신고`,
            value: `📅 신고시각: ${dateStr}\n${statusEmoji[report.status] || '📝'} 상태: ${report.status}\n🆔 신고번호: ${report.id.slice(-8)}`,
            inline: false
        });
    });

    return embed;
}

function createPaginationButtons(page, totalPages, userId) {
    const row = new ActionRowBuilder();

    // 이전 버튼
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`report_check_prev_${userId}_${page}`)
            .setLabel('◀ 이전')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0)
    );

    // 페이지 정보 버튼 (비활성화)
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`report_check_page_${userId}_${page}`)
            .setLabel(`${page + 1} / ${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
    );

    // 다음 버튼
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`report_check_next_${userId}_${page}`)
            .setLabel('다음 ▶')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page >= totalPages - 1)
    );

    return row;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('신고조회')
        .setDescription('자신의 신고 내역을 조회합니다'),

    async execute(interaction) {
        const userReports = getReportsByUserId(interaction.user.id);

        if (userReports.length === 0) {
            return await interaction.reply({
                content: '📋 신고 내역이 없습니다.',
                ephemeral: true
            });
        }

        // 최신 신고가 먼저 나오도록 정렬 (이미 DB에서 정렬됨)
        const totalPages = Math.ceil(userReports.length / REPORTS_PER_PAGE);
        const page = 0; // 첫 페이지 시작

        const embed = createReportEmbed(userReports, page, interaction.user.id);

        // 신고가 1개면 버튼 없이 표시
        if (totalPages === 1) {
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // 페이지네이션 버튼 추가
        const buttons = createPaginationButtons(page, totalPages, interaction.user.id);

        await interaction.reply({ embeds: [embed], components: [buttons], ephemeral: true });
    },

    // 페이지네이션 업데이트 함수 (index.js에서 사용)
    createReportEmbed,
    createPaginationButtons,
    REPORTS_PER_PAGE
};
