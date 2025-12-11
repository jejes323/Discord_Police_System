const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('사건설정')
        .setDescription('사건 로그 채널을 설정합니다.')
        .addChannelOption(option =>
            option
                .setName('채널')
                .setDescription('사건 로그를 기록할 채널을 선택하세요')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const channel = interaction.options.getChannel('채널');

        // 채널 설정 저장
        const success = db.setCaseLogChannel(interaction.guildId, channel.id);

        if (success) {
            await interaction.reply({
                content: `✅ 사건 로그 채널이 ${channel}로 설정되었습니다.`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: '❌ 채널 설정에 실패했습니다.',
                ephemeral: true
            });
        }
    }
};
