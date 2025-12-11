const {
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    ActionRowBuilder,
    PermissionFlagsBits
} = require('discord.js');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('사건강제수정')
        .setDescription('[관리자] 특정 사용자의 사건을 수정합니다.')
        .addUserOption(option =>
            option
                .setName('사용자')
                .setDescription('사건을 수정할 사용자를 선택하세요')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('사용자');
        const userCases = db.getCasesByUserId(targetUser.id);

        if (userCases.length === 0) {
            return await interaction.reply({
                content: `❌ ${targetUser.tag}님의 사건이 없습니다.`,
                ephemeral: true
            });
        }

        // 드롭다운 메뉴 생성
        const options = userCases.slice(0, 25).map(caseData => ({
            label: `${caseData.caseNumber} - ${caseData.title}`,
            description: `상태: ${caseData.status} | ${new Date(caseData.timestamp).toLocaleDateString()}`,
            value: caseData.id
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('admin_edit_case_select')
            .setPlaceholder('수정할 사건을 선택하세요')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            content: `📝 ${targetUser.tag}님의 사건 중 수정할 사건을 선택해주세요:`,
            components: [row],
            ephemeral: true
        });
    }
};
