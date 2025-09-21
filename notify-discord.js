const https = require('https');

// Discord webhook URL - replace with your actual webhook URL
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'YOUR_DISCORD_WEBHOOK_URL_HERE';

function sendDiscordNotification() {
  if (DISCORD_WEBHOOK_URL === 'YOUR_DISCORD_WEBHOOK_URL_HERE') {
    console.log('⚠️  Discord webhook URL not configured. Please set DISCORD_WEBHOOK_URL environment variable.');
    console.log('📋 All keyboard shortcuts and UI improvements have been implemented successfully!');
    return;
  }

  const message = {
    content: '🎉 **YouTube Karaoke Extension Update Complete!**',
    embeds: [{
      title: 'Keyboard Shortcuts & UI Improvements',
      description: 'All requested features have been successfully implemented!',
      color: 0x00ff00, // Green color
      fields: [
        {
          name: '🎹 New Keyboard Shortcuts',
          value: '• `Ctrl+1` - Go to search panel\n• `Ctrl+2` - Go to playlist panel',
          inline: false
        },
        {
          name: '🔍 Search Panel Navigation',
          value: '• Arrow keys to navigate search results\n• `Spacebar` to add selected item\n• `Up` from first item goes to search box',
          inline: false
        },
        {
          name: '📋 Playlist Panel Navigation',
          value: '• Arrow keys to navigate playlist items\n• `Spacebar` to play selected item\n• `DEL` to remove selected item\n• `Ctrl+Up/Down` to reorder items',
          inline: false
        },
        {
          name: '🎨 UI Improvements',
          value: '• Removed preview buttons from search results\n• Made Add buttons larger and more prominent\n• Added visual selection indicators',
          inline: false
        }
      ],
      footer: {
        text: 'YouTube Karaoke Chrome Extension',
        icon_url: 'https://cdn.discordapp.com/emojis/1234567890.png'
      },
      timestamp: new Date().toISOString()
    }]
  };

  const postData = JSON.stringify(message);

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(DISCORD_WEBHOOK_URL, options, (res) => {
    console.log(`📤 Discord notification sent! Status: ${res.statusCode}`);
    if (res.statusCode === 204) {
      console.log('✅ Notification delivered successfully!');
    } else {
      console.log('❌ Failed to send notification');
    }
  });

  req.on('error', (err) => {
    console.error('❌ Error sending Discord notification:', err.message);
  });

  req.write(postData);
  req.end();
}

// Send notification
sendDiscordNotification();

