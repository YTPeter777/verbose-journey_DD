const express = require('express');
const line = require('@line/bot-sdk');

// 錯誤監聽（保持不變）
process.on('uncaughtException', (err) => { console.error('致命錯誤:', err); });
process.on('unhandledRejection', (err) => { console.error('非同步錯誤:', err); });

const config = {
    channelSecret: process.env.CHANNEL_SECRET || 'dummy_secret',
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || 'dummy_token'
};

const app = express(); // 補上這一行！
const client = new line.Client(config);

app.post('/callback', line.middleware(config), (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error(err);
            res.status(500).end();
        });
});

async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') return;
    return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '收到你的訊息囉！我的程式碼已經就位了！'
    });
}

const port = process.env.PORT || 10000;
app.listen(port, () => {
    console.log(`後端已在 Port ${port} 啟動！`);
});
