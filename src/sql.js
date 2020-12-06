let bot = module.parent.exports;
let sql = require('./sql_config.js');

/* Initialization */
function checkTables(){
	return new Promise(function(ok, fail){
		let query = `SELECT * FROM \`${bot.config.sql.tables.users}\`, \`${bot.config.sql.tables.user_status_ref}\`, \`${bot.config.sql.tables.notifications}\` LIMIT 1`;
	    sql.connection.query(query, function(err, result, fields) {
	        if (err) {
	        	if(err.toString().indexOf("Table '" + bot.config.sql.database + "." + bot.config.sql.tables.users + "' doesn't exist") != -1){
	            	createTable(bot.config.sql.tables.users).then(_ok => {
	            		checkTables().then(_ok => { ok(); }, error => { fail(error); });
	            	}, error => { fail(error); });
	            	return;
	            }

	            if(err.toString().indexOf("Table '" + bot.config.sql.database + "." + bot.config.sql.tables.user_status_ref + "' doesn't exist") != -1){
	            	createTable(bot.config.sql.tables.user_status_ref).then(_ok => {
	            		checkTables().then(_ok => { ok(); }, error => { fail(error); });
	            	}, error => { fail(error); });
	            	return;
	            }

	            if(err.toString().indexOf("Table '" + bot.config.sql.database + "." + bot.config.sql.tables.notifications + "' doesn't exist") != -1){
	            	createTable(bot.config.sql.tables.notifications).then(_ok => {
	            		checkTables().then(_ok => { ok(); }, error => { fail(error); });
	            	}, error => { fail(error); });
	            	return;
	            }

	            fail(err);
	        } else {
	        	ok();
	        }
	    });
	});
}
module.exports.checkTables = checkTables;

function createTable(tableName){
	return new Promise(function(ok, fail){
		let query = `CREATE TABLE \`${tableName}\` `;

		if(tableName == bot.config.sql.tables.users){
			query += "(`id` int(11) unsigned NOT NULL AUTO_INCREMENT, `telegram_id` varchar(64) NOT NULL DEFAULT '', `status` int(11) NOT NULL, PRIMARY KEY (`id`))";
		}
		if(tableName == bot.config.sql.tables.user_status_ref){
			query += "(`id` int(11) unsigned NOT NULL AUTO_INCREMENT,`value` varchar(64) NOT NULL DEFAULT '',PRIMARY KEY (`id`))";
		}
		if(tableName == bot.config.sql.tables.notifications){
			query += "(`id` int(11) unsigned NOT NULL AUTO_INCREMENT,`user_id` int(11) NOT NULL,`from_token` varchar(42) NOT NULL DEFAULT '',`to_token` varchar(42) NOT NULL DEFAULT '',`amount` varchar(32) NOT NULL DEFAULT '',`min_result` varchar(32) NOT NULL DEFAULT '',`last_notification_dt` datetime DEFAULT NULL,PRIMARY KEY (`id`))";
		}

		query += " DEFAULT CHARSET=utf8;";
		sql.connection.query(query, function(err, result, fields) {
			if(err){
				fail(err);
			} else {
				ok();
			}
		});
	});
}

/* Func */
function queryCommand(query, params, special){
	return new Promise(function(ok, fail){
		sql.connection.query(query, params, function(err, result, fields) {
			if(err){
				fail(err);
			} else {
				if(special == 'isUserNew'){
					if(result == undefined || result[0] == undefined){
						ok(true);
					} else {
						ok(false);
					}
					return;
				}
				if(special == 'notificationId'){
					if(result == undefined || result[0] == undefined){
						ok(-1);
					} else {
						ok(result[0]['id']);
					}
					return;
				}
				ok(result);
			}
		});
	});
}

function isUserNew(telegram_id){
	return new Promise(function(ok, fail){
		var query = `SELECT * FROM \`${bot.config.sql.tables.users}\` WHERE telegram_id = ?`;
		
		if(sql.connection.state == 'disconnected'){
			sql.connection = sql.connect();
			setTimeout(function(){ 
				queryCommand(query, telegram_id, 'isUserNew').then(_ok => { ok(_ok); }, _fail => { fail(_fail); }).catch(err => { fail(err); });
			}, 1000);
			return;
		}
		queryCommand(query, telegram_id, 'isUserNew').then(_ok => { ok(_ok); }, _fail => { fail(_fail); }).catch(err => { fail(err); });
	});
}
module.exports.isUserNew = isUserNew;

function createUser(telegram_id){
	return new Promise(function(ok, fail){
		var query = `INSERT INTO \`${bot.config.sql.tables.users}\` (\`telegram_id\`, \`status\`) VALUES (?,?)`;
		
		if(sql.connection.state == 'disconnected'){
			sql.connection = sql.connect();
			setTimeout(function(){ 
				queryCommand(query, [telegram_id, 0]).then(_ok => { ok(_ok); }, _fail => { fail(_fail); }).catch(err => { fail(err); });
			}, 1000);
			return;
		}

		queryCommand(query, [telegram_id, 0]).then(_ok => { ok(_ok); }, _fail => { fail(_fail); }).catch(err => { fail(err); });
	});
}
module.exports.createUser = createUser;

function setUserActive(active, telegram_id){
	return new Promise(function(ok, fail){
		var query = `UPDATE \`${bot.config.sql.tables.users}\` SET \`status\` = ? WHERE telegram_id = ?`;
		
		if(sql.connection.state == 'disconnected'){
			sql.connection = sql.connect();
			setTimeout(function(){ 
				queryCommand(query, [active, telegram_id]).then(_ok => { ok(_ok); }, _fail => { fail(_fail); }).catch(err => { fail(err); });
			}, 1000);
			return;
		}

		queryCommand(query, [active, telegram_id]).then(_ok => { ok(_ok); }, _fail => { fail(_fail); }).catch(err => { fail(err); });
	});
}
module.exports.setUserActive = setUserActive;

function addNotification(telegram_id, from_token, to_token, amount, min_result) {
	return new Promise(function(ok, fail){
		var query = `INSERT INTO \`${bot.config.sql.tables.notifications}\` (\`user_id\`, \`from_token\`, \`to_token\`, \`amount\`, \`min_result\`) VALUES ((SELECT \`id\` FROM \`${bot.config.sql.tables.users}\` WHERE \`telegram_id\` = ?),?,?,?,?)`;
		
		if(sql.connection.state == 'disconnected'){
			sql.connection = sql.connect();
			setTimeout(function(){ 
				queryCommand(query, [telegram_id, from_token, to_token, amount, min_result]).then(_ok => { ok(_ok); }, _fail => { fail(_fail); }).catch(err => { fail(err); });
			}, 1000);
			return;
		}

		queryCommand(query, [telegram_id, from_token, to_token, amount, min_result]).then(_ok => { ok(_ok); }, _fail => { fail(_fail); }).catch(err => { fail(err); });
	});
}
module.exports.addNotification = addNotification;

function isNotificationExist(telegram_id, from_token, to_token, amount, min_result) {
	return new Promise(function(ok, fail){
		var query = `SELECT \`id\` FROM \`${bot.config.sql.tables.notifications}\` WHERE \`user_id\` = (SELECT \`id\` FROM \`${bot.config.sql.tables.users}\` WHERE \`telegram_id\`=?) AND \`from_token\`=? AND \`to_token\`=? AND \`amount\`=? AND \`min_result\`=?`;
		
		if(sql.connection.state == 'disconnected'){
			sql.connection = sql.connect();
			setTimeout(function(){ 
				queryCommand(query, [telegram_id, from_token, to_token, amount, min_result], 'notificationId').then(_ok => { ok(_ok); }, _fail => { fail(_fail); }).catch(err => { fail(err); });
			}, 1000);
			return;
		}

		queryCommand(query, [telegram_id, from_token, to_token, amount, min_result], 'notificationId').then(_ok => { ok(_ok); }, _fail => { fail(_fail); }).catch(err => { fail(err); });
	});
}
module.exports.isNotificationExist = isNotificationExist;

function getNotifications(telegram_id) {
	return new Promise(function(ok, fail){
		var query = `SELECT * FROM \`${bot.config.sql.tables.notifications}\` WHERE \`user_id\` = (SELECT \`id\` FROM \`${bot.config.sql.tables.users}\` WHERE \`telegram_id\`=?)`;
		
		if(sql.connection.state == 'disconnected'){
			sql.connection = sql.connect();
			setTimeout(function(){ 
				queryCommand(query, [telegram_id]).then(_ok => { ok(_ok); }, _fail => { fail(_fail); }).catch(err => { fail(err); });
			}, 1000);
			return;
		}

		queryCommand(query, [telegram_id]).then(_ok => { ok(_ok); }, _fail => { fail(_fail); }).catch(err => { fail(err); });
	});
}
module.exports.getNotifications = getNotifications;

function delNotifications(id) {
	return new Promise(function(ok, fail){
		var query = `DELETE FROM \`${bot.config.sql.tables.notifications}\` WHERE \`id\` = ?`;
		
		if(sql.connection.state == 'disconnected'){
			sql.connection = sql.connect();
			setTimeout(function(){ 
				queryCommand(query, [id]).then(_ok => { ok(_ok); }, _fail => { fail(_fail); }).catch(err => { fail(err); });
			}, 1000);
			return;
		}

		queryCommand(query, [id]).then(_ok => { ok(_ok); }, _fail => { fail(_fail); }).catch(err => { fail(err); });
	});
}
module.exports.delNotifications = delNotifications;

function getAllNotifications(limit, offset = 0) {
	return new Promise(function(ok, fail){
		var query = `SELECT * FROM \`${bot.config.sql.tables.notifications}\` LIMIT ? OFFSET ?`;
		
		if(sql.connection.state == 'disconnected'){
			sql.connection = sql.connect();
			setTimeout(function(){ 
				queryCommand(query, [limit, offset]).then(_ok => { ok(_ok); }, _fail => { fail(_fail); }).catch(err => { fail(err); });
			}, 1000);
			return;
		}

		queryCommand(query, [limit, offset]).then(_ok => { ok(_ok); }, _fail => { fail(_fail); }).catch(err => { fail(err); });
	});
}
module.exports.getAllNotifications = getAllNotifications;

