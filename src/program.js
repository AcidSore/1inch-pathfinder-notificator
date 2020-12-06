let bot = module.parent.exports;
let TelegramBot = require('node-telegram-bot-api');
let Web3		= require('web3');
let emoji 		= require('node-emoji');
let sql 		= require('./sql.js');
module.exports.sql = sql;

let telegram;

function start(){
	let TOKEN = bot.config.token;
	telegram = initTelegram(TOKEN);

	telegram.getMe().then(data => {
	    bot.log.info(`Connect to @${data.username} telegram bot`);
	    funcTelegram();
	    require("./notificator.js").start(telegram);
	}).catch(error => {
	    bot.dieWithError(`ERROR Telegram getMe error: ${error.toString()}`)
	});

}
module.exports.start = start;

function initTelegram(token){
    let telegramSettins = {
        polling: true,
    };
    return new TelegramBot(token, telegramSettins);
}

function funcTelegram(){

	telegram.on('message', function(msg){
    	if(msg.text != undefined){
    		sql.isUserNew(msg.chat.id).then(isNew => {
    			if(isNew){
    				sql.createUser(msg.chat.id).then(() => {
    					workWithUserMessage(msg);
    				}, error => { bot.log.error(`sql.createUser ${msg.chat.id}: ${error.toString()}`) });
    				return;
    			}
    			workWithUserMessage(msg);
    		}, error => { bot.log.error(`sql.isUserNew ${msg.chat.id}: ${error.toString()}`) });
    	}
    });

    telegram.on('callback_query', function (msg) {
    	let data = msg.data.split('|');
    	let command = data[0];
    	let param = data[1];
		if(command == 'delete'){
			sql.delNotifications(param).then(() => {
				sql.getNotifications(msg.message.chat.id).then(notifications => {
					let message = `<b>Your notification list:</b>\n`;
					let buttons = [];

					if(notifications == undefined || notifications.length == 0){
						message += "Empty, you can add notifications with /add command.";
					} else {
						for(let i = 0; i < notifications.length; i++){
							let buttonText1 = notifications[i]['amount'] + " " +bot.config.eth.tokens[notifications[i]['from_token']].symbol + " " + emoji.get('arrow_right') + " " + notifications[i]['min_result'] + " " + bot.config.eth.tokens[notifications[i]['to_token']].symbol;
							buttons.push([{'text':buttonText1, 'callback_data': '1'}, {'text': emoji.get('red_circle') + " delete", 'callback_data': 'delete|' + notifications[i]['id']}]);
						}
					}

					telegram.editMessageText(message, {
					    'chat_id': msg.message.chat.id,
					    'message_id': msg.message.message_id,
					    'parse_mode': 'html',
						'reply_markup': JSON.stringify({
					        'inline_keyboard': buttons, 
					    }),
					}).then(() => {
						telegram.answerCallbackQuery(msg.id, `Notifications deleted.`, true);
					}, error => { bot.log.error(`editMessageText ${msg.message.chat.id} ${msg.message.message_id}: ${error.toString()}`) });
				}, error => { bot.log.error(`sql.getNotifications ${msg.message.chat.id}: ${error.toString()}`) });
			}, error => { bot.log.error(`sql.delNotifications ${param}: ${error.toString()}`) });
		}
	});
}

function workWithUserMessage(msg){
	sql.setUserActive(0, msg.chat.id).then(() => {
		
		// ADD
		if(msg.text.toLowerCase().indexOf('/add') == 0){
			let params = msg.text.toLowerCase().split(' ');
			if(params[1] != undefined && bot.config.eth.symbols[params[1]] != undefined){
				params[1] = bot.config.eth.symbols[params[1]].address;
			}
			if(params[2] != undefined && bot.config.eth.symbols[params[2]] != undefined){
				params[2] = bot.config.eth.symbols[params[2]].address;
			}
			checkAddParams(params).then(() => {
				sql.isNotificationExist(msg.chat.id, params[1], params[2], params[3], params[4]).then(notification_id => {
					let message = emoji.get('white_check_mark') + " " + "Task is already exist!";
					if(notification_id == -1){
						sql.addNotification(msg.chat.id, params[1], params[2], params[3], params[4]).then(() => {}, error => { bot.log.error(`sql.addNotification ${msg.chat.id} ${params[1]} ${params[2]} ${params[3]} ${params[4]}: ${error.toString()}`) });
						message = emoji.get('white_check_mark') + " " + "Task created!";	
					}					
					telegram.sendMessage(msg.chat.id, message, { 
						'parse_mode': 'html',
						'disable_web_page_preview': true,
					}).catch(error => { bot.log.error(`ERROR sendMessage ${error.toString()}`); });						
				}, error => { bot.log.error(`sql.isNotificationExist ${msg.chat.id} ${params[1]} ${params[2]} ${params[3]} ${params[4]}: ${error.toString()}`) });
			}, invalidParamMsg => {
				telegram.sendMessage(msg.chat.id, emoji.get('x') + " " + invalidParamMsg.toString(), { 
					'parse_mode': 'html',
					'disable_web_page_preview': true,
				}).catch(error => { bot.log.error(`ERROR sendMessage ${error.toString()}`); });
				return;
			});	
		}

		// LIST
		if(msg.text.toLowerCase().indexOf('/list') == 0){
			sql.getNotifications(msg.chat.id).then(notifications => {
				let message = `<b>Your notification list:</b>\n`;
				let buttons = [];

				if(notifications == undefined || notifications.length == 0){
					message += "Empty, you can add notifications with /add command.";
				} else {
					for(let i = 0; i < notifications.length; i++){
						let buttonText1 = notifications[i]['amount'] + " " +bot.config.eth.tokens[notifications[i]['from_token']].symbol + " " + emoji.get('arrow_right') + " " + notifications[i]['min_result'] + " " + bot.config.eth.tokens[notifications[i]['to_token']].symbol;
						buttons.push([{'text':buttonText1, 'callback_data': '1'}, {'text': emoji.get('red_circle') + " delete", 'callback_data': 'delete|' + notifications[i]['id']}]);
					}
				}

				let opt = { 
					'parse_mode': 'html',
					'reply_markup': JSON.stringify({
				        'inline_keyboard': buttons, 
				    }),
				};

				telegram.sendMessage(msg.chat.id, message, opt).then(() => {}).catch(err => {
					bot.log.error(`sendMessage ${msg.chat.id} ${err}`);
				});
			}, error => { bot.log.error(`sql.getNotifications ${msg.chat.id}: ${error.toString()}`) });
		}
	}, error => { bot.log.error(`sql.setUserActive 0 ${msg.chat.id}: ${error.toString()}`) })
}

function checkAddParams(params){
	return new Promise(function(ok, fail){
		if(params.length < 5){
			fail(`Not enough command params, expected 4. Use /help command to see command syntax.`);
			return;
		}
		if(!Web3.utils.isAddress(params[1])){
			fail(`Incorrect from_token address or ticker. Use /help command to see command syntax.`);
			return;
		}
		if(!Web3.utils.isAddress(params[2])){
			fail(`Incorrect to_token address or ticker. Use /help command to see command syntax.`);
			return;
		}
		if(params[1] == params[2]){
			fail(`FromToken is equal to ToToken. Use /help command to see command syntax.`);
			return;
		}
		if(isNaN(params[3])){
			fail(`Incorrect param with amount, it should be a number. Use /help command to see command syntax.`);
			return;
		}
		if(isNaN(params[4])){
			fail(`Incorrect param with min_result, it should be a number. Use /help command to see command syntax.`);
			return;
		}
		ok();		
	});
}


