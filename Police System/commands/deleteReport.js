const { SlashCommandBuilder, PermissionFlagsBits, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { getReportsByUserId, deleteReport } = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('신고삭제')
        .setDescription('특정 사용자의 신고를 삭제합니다 (관리자 전용)')
        .addUserOption(option =>
            option.setName('사용자')
                .setDescription('신고를 삭제할 사용자')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('사용자');

        // 해당 사용자의 신고 조회
        const userReports = getReportsByUserId(targetUser.id);

        if (userReports.length === 0) {
            return await interaction.reply({
                content: `📋 ${targetUser.tag}님의 신고 내역이 없습니다.`,
                ephemeral: true
            });
        }

        // 드롭다운 메뉴 생성 (최대 25개까지만 표시 가능)
        const options = userReports.slice(0, 25).map(report => {
            const date = new Date(report.timestamp);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

            const statusEmoji = {
                '접수': '📝',
                '출동': '🚨',
                '도착': '📍',
                '처리중': '⚙️',
                '종결': '✅'
            };

            return {
                label: `${report.type} - ${dateStr}`,
                description: `상태: ${report.status} | ID: ${report.id.slice(-8)}`,
                value: report.id,
                emoji: statusEmoji[report.status] || '📝'
            };
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`delete_report_${targetUser.id}`)
            .setPlaceholder('삭제할 신고를 선택하세요')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            content: `📋 **${targetUser.tag}**님의 신고 내역 (총 ${userReports.length}건)\n삭제할 신고를 선택하세요:`,
            components: [row],
            ephemeral: true
        });
    }
};
