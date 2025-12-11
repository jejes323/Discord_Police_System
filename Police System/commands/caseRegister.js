const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('사건등록')
        .setDescription('새로운 사건을 등록합니다.'),

    async execute(interaction) {
        // Modal 생성
        const modal = new ModalBuilder()
            .setCustomId('case_register_modal')
            .setTitle('📋 사건 등록');

        // 사건 제목 입력
        const titleInput = new TextInputBuilder()
            .setCustomId('case_title')
            .setLabel('사건 제목')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('사건의 제목을 입력하세요')
            .setRequired(true)
            .setMaxLength(100);

        // 사건 내용 입력
        const descriptionInput = new TextInputBuilder()
            .setCustomId('case_description')
            .setLabel('사건 내용')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('사건의 상세 내용을 입력하세요')
            .setRequired(true)
            .setMaxLength(2000);

        const titleRow = new ActionRowBuilder().addComponents(titleInput);
        const descriptionRow = new ActionRowBuilder().addComponents(descriptionInput);

        modal.addComponents(titleRow, descriptionRow);

        await interaction.showModal(modal);
    }
};
