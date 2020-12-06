let bot = module.parent.exports;
let TelegramBot = require('node-telegram-bot-api');
let Web3		= require('web3');
let emoji 		= require('node-emoji');
let sql 		= require('./sql.js');
module.exports.web3 = Web3;
module.exports.sql = sql;

let telegram;

function start(){
	let TOKEN = bot.config.token;
	telegram = initTelegram(TOKEN);

	telegram.getMe().then(data => {
	    bot.log.info(`Connect to @${data.username} telegram bot`);
	    funcTelegram();
	    module.exports.telegram = telegram;
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
							let amountBN = stringToBN(notifications[i]['from_token'], notifications[i]['amount']);
							let minResultBN = stringToBN(notifications[i]['to_token'], notifications[i]['min_result']);
							let amountStr = BnToString(amountBN, bot.config.eth.tokens[notifications[i]['from_token']].decimals);
							let minResultStr = BnToString(minResultBN, bot.config.eth.tokens[notifications[i]['to_token']].decimals);
							
							let buttonText1 = amountStr + " " +bot.config.eth.tokens[notifications[i]['from_token']].symbol + " " + emoji.get('arrow_right') + " " + minResultStr + " " + bot.config.eth.tokens[notifications[i]['to_token']].symbol;
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
	// STOP
	if(msg.text.toLowerCase().indexOf('/stop') == 0){
		let message = "Bot stopped.\n" +
					"Just send command /start if you want to get notifications."
		telegram.sendMessage(msg.chat.id, message, { 
			'parse_mode': 'html',
			'disable_web_page_preview': true,
		}).catch(error => { bot.log.error(`ERROR sendMessage ${error.toString()}`); });
		sql.setUserActive(1, msg.chat.id).then(() => {}, error => { bot.log.error(`ERROR setUserActive 1 ${msg.chat.id}: ${error.toString()}`); });
		return;
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
					let amountBN = stringToBN(notifications[i]['from_token'], notifications[i]['amount']);
					let minResultBN = stringToBN(notifications[i]['to_token'], notifications[i]['min_result']);
					let amountStr = BnToString(amountBN, bot.config.eth.tokens[notifications[i]['from_token']].decimals);
					let minResultStr = BnToString(minResultBN, bot.config.eth.tokens[notifications[i]['to_token']].decimals);

					let buttonText1 = amountStr + " " +bot.config.eth.tokens[notifications[i]['from_token']].symbol + " " + emoji.get('arrow_right') + " " + minResultStr + " " + bot.config.eth.tokens[notifications[i]['to_token']].symbol;
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
		return;
	}

	sql.setUserActive(0, msg.chat.id).then(() => {
		
		// START
		if(msg.text.toLowerCase().indexOf('/start') == 0){
			let message = "Hello! This bot allows you to get notifications about token prices from 1inch.exchange pathfinder service.\n" +
						"If you wait for the pair rate then you can get notification about it from the bot instead of check it yourself.\n" +
						"Use /help to get bot commands.";
			telegram.sendMessage(msg.chat.id, message, { 
				'parse_mode': 'html',
				'disable_web_page_preview': true,
			}).catch(error => { bot.log.error(`ERROR sendMessage ${error.toString()}`); });
			return;
		}
		// HELP
		if(msg.text.toLowerCase().indexOf('/help') == 0){
			let message = "<b>The following bot commands are available:</b>\n\n" +
						"<b>/start</b> - start bot and getting the greeting\n" +
						"=============================\n" +
						"<b>/stop</b> - stop bot\n" +
						"=============================\n" +
						"<b>/list</b> - list all tasks for notifications which are added in the chat, also user can delete a task\n\n<b>Syntax:</b> <code>/list</code>\n" +
						"=============================\n" +
						"<b>/add</b> - add task for notification\n\n<b>Syntax:</b> <code>/add from_token to_token amount min_result</code>\n" +
						emoji.get('white_small_square') + "<i>from_token</i> - token address or symbol which you want to exchange\n" +
						emoji.get('white_small_square') + "<i>to_token</i> - token address or symbol which you want to recieve\n" + 
						emoji.get('white_small_square') + "<i>amount</i> - amount of from_token which you want to exchange\n" +
						emoji.get('white_small_square') + "<i>min_result</i> - minimum amount of to_token which you want to recieve\n" +
						"=============================\n" +
						"<b>/help</b> - print commands and descriptions\n";
			telegram.sendMessage(msg.chat.id, message, { 
				'parse_mode': 'html',
				'disable_web_page_preview': true,
			}).catch(error => { bot.log.error(`ERROR sendMessage ${error.toString()}`); });
			return;
		}
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
					if(notification_id == -1){
						params[3] = stringToBN(params[1], params[3]);
						params[4] = stringToBN(params[2], params[4]);
						bot.request(bot.QUOTE_REQUEST(params[1],params[2],params[3])).then(result => {
							result = JSON.parse(result);
							let toTokenAmountBN = new Web3.utils.BN(result['toTokenAmount']);
							let route = 0;
							if(toTokenAmountBN.lt(new Web3.utils.BN(params[4]))){
								route = 1;
							}
							sql.addNotification(msg.chat.id, params[1], params[2], params[3], params[4], route).then(() => {}, error => { bot.log.error(`sql.addNotification ${msg.chat.id} ${params[1]} ${params[2]} ${params[3]} ${params[4]}: ${error.toString()}`) });
							let message = emoji.get('white_check_mark') + " " + "Task created!";	
							telegram.sendMessage(msg.chat.id, message, { 
								'parse_mode': 'html',
								'disable_web_page_preview': true,
							}).catch(error => { bot.log.error(`ERROR sendMessage ${error.toString()}`); });						
						}).catch(error => {
							bot.log.error(`ERROR request QUOTE_REQUEST ${error.toString()}`);
						});
					} else {
						let message = emoji.get('white_check_mark') + " " + "Task is already exist!";
						telegram.sendMessage(msg.chat.id, message, { 
							'parse_mode': 'html',
							'disable_web_page_preview': true,
						}).catch(error => { bot.log.error(`ERROR sendMessage ${error.toString()}`); });						
					}
				}, error => { bot.log.error(`sql.isNotificationExist ${msg.chat.id} ${params[1]} ${params[2]} ${params[3]} ${params[4]}: ${error.toString()}`) });
			}, invalidParamMsg => {
				telegram.sendMessage(msg.chat.id, emoji.get('x') + " " + invalidParamMsg.toString(), { 
					'parse_mode': 'html',
					'disable_web_page_preview': true,
				}).catch(error => { bot.log.error(`ERROR sendMessage ${error.toString()}`); });
				return;
			});	
		}
	}, error => { bot.log.error(`sql.setUserActive 0 ${msg.chat.id}: ${error.toString()}`) })
}

function stringToBN(address, amount) {
	let decimals = bot.config.eth.tokens[address].decimals;
	let floatPart = amount.split('.')[1];
	if(floatPart == undefined){
		floatPart = "";
	}

	if(decimals < floatPart.length){
		floatPart = floatPart.substring(0,decimals);
	}
	if(decimals > floatPart.length){
		for(i = floatPart.length; i < decimals; i++){
			floatPart += "0";
		}
	}

	return (new Web3.utils.BN(amount.split('.')[0] + floatPart)).toString();
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

function BnToString(bn, decimals){
	let amountString = bn.toString();
	let result = "";
	if(amountString.length > decimals){
		result = amountString.substring(0, amountString.length-decimals) + "." + amountString.substring(amountString.length-decimals);
	} else {
		result = "0.";
		for(i = amountString.length; i < decimals; i++){
			result += "0";
		}
		result += amountString;
	}
	if(result.indexOf('.') != -1){
		result = result.replace(/0*$/, '');
		if(result[result.length-1] == '.'){
			result = result.substring(0, result.length-1);
		}
	}
	return result;
}
module.exports.BnToString = BnToString;


