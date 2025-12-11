const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('신고')
        .setDescription('112 긴급 신고를 접수합니다'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🚨 긴급 신고 시스템')
            .setDescription('신고 유형을 선택해주세요')
            .setTimestamp();

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('report_폭력')
                    .setLabel('폭력')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('👊'),
                new ButtonBuilder()
                    .setCustomId('report_절도')
                    .setLabel('절도')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🦹'),
                new ButtonBuilder()
                    .setCustomId('report_교통사고')
                    .setLabel('교통사고')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🚗')
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('report_실종')
                    .setLabel('실종')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('report_사기')
                    .setLabel('사기')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId('report_기타사항')
                    .setLabel('기타사항')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📝')
            );

        await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
    }
};
