const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setReportChannel } = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('112설정')
        .setDescription('112 신고 접수 채널을 설정합니다 (관리자 전용)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (setReportChannel(interaction.guildId, interaction.channelId)) {
            await interaction.reply({
                content: `✅ 이 채널(<#${interaction.channelId}>)이 112 신고 접수 채널로 설정되었습니다.`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: '❌ 설정 저장에 실패했습니다. 다시 시도해주세요.',
                ephemeral: true
            });
        }
    }
};
