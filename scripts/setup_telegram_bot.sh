#!/bin/bash
# Script to help set up Telegram bot for lead collection

set -e

echo "=== Telegram Bot Setup for Lead Collection ==="
echo ""
echo "Steps to configure your Telegram bot:")
echo ""
echo "1. Create a new bot:"
echo "   - Message @BotFather: /newbot"
echo "   - Choose a name and username for your bot (e.g., 'ArmyLeadsBot')"
echo "   - BotFather will give you a token (like: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)"
echo ""
echo "2. Add the bot to your target group/channel:"
echo "   - Open @BotFather"
echo "   - Send: /start"
echo "   - Copy the bot's @username (without @)"
echo "   - Send it to the group where you want leads"

echo ""
echo "3. Get the chat_id for your group:"
echo "   - Start a chat with your bot (@YourBotUsername)"
echo "   - Use @userinfobot to get the chat_id"
echo "   - Or get it from @ChatIDBot (/getid)"
echo ""
echo "4. Set environment variables in server/.env:"
echo "   TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN"
echo "   TELEGRAM_CHAT_ID=YOUR_CHAT_ID"
echo ""
echo "5. Deploy:"
echo "   ./scripts/serve.sh"
echo ""
echo "Note: The server will send formatted leads with all details (name, phone, page, source, etc.)"
echo "      to your Telegram group whenever someone submits a form on the site."