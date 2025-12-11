const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { deleteAllReports } = require('../utils/database');

// 대기 중인 리셋 요청을 추적하는 Map
const pendingResets = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('신고리셋')
        .setDescription('모든 신고 기록을 삭제합니다 (관리자 전용)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const key = `${guildId}_${userId}`;

        // 이미 대기 중인 리셋이 있는지 확인
        if (pendingResets.has(key)) {
            // 두 번째 실행 - 실제 삭제 수행
            clearTimeout(pendingResets.get(key));
            pendingResets.delete(key);

            const deletedCount = deleteAllReports();

            await interaction.reply({
                content: `✅ 총 ${deletedCount}개의 신고 기록이 삭제되었습니다.`,
                ephemeral: true
            });
        } else {
            // 첫 번째 실행 - 확인 메시지
            await interaction.reply({
                content: '⚠️ 정말로 모든 신고 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다!\n15초 안에 다시 한번 이 명령어를 입력하시면 삭제됩니다.',
                ephemeral: true
            });

            // 15초 후 자동으로 대기 상태 해제
            const timeout = setTimeout(() => {
                pendingResets.delete(key);
            }, 15000);

            pendingResets.set(key, timeout);
        }
    }
};
