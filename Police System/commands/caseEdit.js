const {
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    ActionRowBuilder
} = require('discord.js');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('사건수정')
        .setDescription('자신이 등록한 사건을 수정합니다.'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const userCases = db.getCasesByUserId(userId);

        // 종결되지 않은 사건만 필터링
        const activeCases = userCases.filter(c => c.status !== '종결');

        if (activeCases.length === 0) {
            return await interaction.reply({
                content: '❌ 수정 가능한 사건이 없습니다.',
                ephemeral: true
            });
        }

        // 드롭다운 메뉴 생성
        const options = activeCases.slice(0, 25).map(caseData => ({
            label: `${caseData.caseNumber} - ${caseData.title}`,
            description: `상태: ${caseData.status} | ${new Date(caseData.timestamp).toLocaleDateString()}`,
            value: caseData.id
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('edit_case_select')
            .setPlaceholder('수정할 사건을 선택하세요')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            content: '📝 수정할 사건을 선택해주세요:',
            components: [row],
            ephemeral: true
        });
    }
};
