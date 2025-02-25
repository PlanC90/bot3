import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';

// Replace with your actual Telegram Bot API token
const token = '7700368269:AAGCXJJ-Alq7bQGcyg2mk1JXeBi2MwHMEnI';

// URL of the JSON data
const dataUrl = 'https://test3-of9y.onrender.com/data/links.json';

// Image URL for task posts and /start command
const imageUrl = 'https://memex.planc.space/images/gorsel.jpg';

// Path to the processed URLs file
const processedUrlsFile = 'processed_urls.json';

// Load processed URLs from file, or initialize if the file doesn't exist
let processedUrls = loadProcessedUrls();

function loadProcessedUrls() {
  try {
    const data = fs.readFileSync(processedUrlsFile, 'utf8');
    return new Set(JSON.parse(data));
  } catch (error) {
    console.log('Creating new processed URLs file.');
    return new Set();
  }
}

function saveProcessedUrls(urls) {
  fs.writeFileSync(processedUrlsFile, JSON.stringify(Array.from(urls)), 'utf8');
}

// Create a bot instance
const bot = new TelegramBot(token, { polling: true });

// Store group IDs
let groupIds = new Set();

// Function to fetch and process links
async function fetchAndProcessLinks() {
  try {
    const response = await fetch(dataUrl);
    const data = await response.json();

    if (!data || !Array.isArray(data.links)) {
      console.log('Invalid data format received.');
      return;
    }

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Filter links from today
    const todaysLinks = data.links.filter(link => link.timestamp.split('T')[0] === today);

    // Iterate through today's links
    for (const link of todaysLinks) {
      if (!processedUrls.has(link.url)) {
        // Format the message
        let message = `✨ <b>New MemeX Community Link!</b> ✨\\n\\n`;
        message += `👤 <b>Username:</b> ${link.username}\\n`;
        message += `🌐 <b>Platform:</b> ${link.platform}\\n\\n`;
        message += `Support this post and claim your rewards!`;

        // Send the message to all known group chats
        groupIds.forEach(groupId => {
          console.log(`Sending message to group: ${groupId}`);
          bot.sendPhoto(groupId, imageUrl, {
            caption: message,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '✅ Link', url: link.url }]
              ]
            }
          })
          .then(() => console.log(`Message sent successfully to group: ${groupId}`))
          .catch(error => {
            console.error(`Error sending message to group ${groupId}:`, error);
          });
        });

        // Add the URL to the processed set
        processedUrls.add(link.url);
        saveProcessedUrls(processedUrls); // Save after processing each link
      }
    }
  } catch (error) {
    console.error('Error fetching or processing data:', error);
  }
}

// Fetch and process links every 20 seconds
setInterval(fetchAndProcessLinks, 20000);

// Listen for the bot being added to a group
bot.on('new_chat_members', (msg) => {
  const chatId = msg.chat.id;
  if (!groupIds.has(String(chatId))) {
    groupIds.add(String(chatId));
    console.log(`Bot added to group: ${chatId}`);
  }
});

// Listen for /start command to collect group ID and send welcome message
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  console.log(`Received /start command in chat: ${chatId}`);
  if (!groupIds.has(String(chatId))) {
    groupIds.add(String(chatId));
    console.log(`Group ID saved: ${chatId}`);
  }

  try {
    const response = await fetch(dataUrl);
    const data = await response.json();
    console.log(`/start data:`, data);

    if (!data || !Array.isArray(data.links) || data.links.length === 0) {
      console.log('No tasks available to send.');
      bot.sendMessage(chatId, 'No tasks have been processed yet. Please wait for the first task to be added.')
        .then(() => console.log(`/start message sent successfully to group: ${chatId}`))
        .catch(error => {
          console.error(`Error sending /start message to group ${chatId}:`, error);
        });
      return;
    }

    // Get the very last link
    const lastLink = data.links[data.links.length - 1];
     console.log(`/start lastLink:`, lastLink);

    // Send the welcome message with the specified image and button
    let welcomeMessage = `Welcome to MEMEX ARMY, @${msg.from.username}!\\n\\n`;
    welcomeMessage += `⭐️ The latest task added by ${lastLink.username} on ${lastLink.platform}<br>`;
    welcomeMessage += `✅ Now support as a MemeX ARMY`;
    console.log(`Sending /start message: ${welcomeMessage} to chat: ${chatId}`);

    bot.sendPhoto(chatId, imageUrl, {
      caption: welcomeMessage,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Link', url: lastLink.url }]
        ]
      }
    })
    .then(() => console.log(`/start message sent successfully to group: ${chatId}`))
    .catch(error => {
      console.error(`Error sending /start message to group ${chatId}:`, error);
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    bot.sendMessage(chatId, 'An error occurred while fetching the latest task.')
      .then(() => console.log(`/start message sent successfully to group: ${chatId}`))
      .catch(error => {
        console.error(`Error sending /start message to group ${chatId}:`, error);
      });
  }
});

console.log('Telegram bot is running...');
