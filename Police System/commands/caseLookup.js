const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('사건조회')
        .setDescription('사건번호로 사건을 조회합니다.')
        .addStringOption(option =>
            option
                .setName('사건번호')
                .setDescription('조회할 사건번호를 입력하세요 (예: C-20251212-001)')
                .setRequired(true)
        ),

    async execute(interaction) {
        const caseNumber = interaction.options.getString('사건번호');
        const caseData = db.getCaseByCaseNumber(caseNumber);

        if (!caseData) {
            return await interaction.reply({
                content: `❌ 사건번호 \`${caseNumber}\`에 해당하는 사건을 찾을 수 없습니다.`,
                ephemeral: true
            });
        }

        // 날짜 포맷팅
        const timestamp = new Date(caseData.timestamp);
        const dateStr = `${timestamp.getFullYear()}년 ${timestamp.getMonth() + 1}월 ${timestamp.getDate()}일 ${timestamp.getHours()}시 ${timestamp.getMinutes()}분`;

        // 상태에 따른 색상
        let color;
        let statusEmoji;
        switch (caseData.status) {
            case '접수':
                color = '#FFA500';
                statusEmoji = '📝';
                break;
            case '처리중':
                color = '#0099FF';
                statusEmoji = '⚙️';
                break;
            case '종결':
                color = '#00FF00';
                statusEmoji = '✅';
                break;
            default:
                color = '#808080';
                statusEmoji = '❓';
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`📋 사건 조회 - ${caseData.caseNumber}`)
            .addFields(
                { name: '제목', value: caseData.title, inline: false },
                { name: '내용', value: caseData.description, inline: false },
                { name: '신고자', value: `<@${caseData.userId}>`, inline: true },
                { name: '상태', value: `${statusEmoji} ${caseData.status}`, inline: true },
                { name: '등록시각', value: dateStr, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: '경찰청 사건 관리 시스템' });

        // 담당자 정보 추가
        if (caseData.assignedOfficer) {
            embed.addFields({ name: '담당자', value: caseData.assignedOfficer, inline: true });
        } else {
            embed.addFields({ name: '담당자', value: '미배정', inline: true });
        }

        // 종결 시각 추가
        if (caseData.status === '종결' && caseData.closedAt) {
            const closedTime = new Date(caseData.closedAt);
            const closedStr = `${closedTime.getFullYear()}년 ${closedTime.getMonth() + 1}월 ${closedTime.getDate()}일 ${closedTime.getHours()}시 ${closedTime.getMinutes()}분`;
            embed.addFields({ name: '종결시각', value: closedStr, inline: true });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
