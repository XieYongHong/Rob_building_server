const mysql = require('mysql')
const config = require('../config/index.js')
const pool = mysql.createPool({
    host: config.mysql.ip,
    user: config.mysql.user,
    password: config.mysql.pwd,
    database: config.mysql.database
})

let query = function (sql, values) {
    return new Promise((resolve, reject) => {
        pool.getConnection(function (err, connection) {
            if (err) {
                reject(err)
            } else {
                connection.query(sql, values, (err, rows) => {
                    console.log(`执行SQL语句：${sql}`);
                    if (err) {
                        reject(err)
                    } else {
                        console.log(`返回结果：${rows}`);
                        resolve(rows)
                    }
                    connection.release()
                })
            }
        })
    })
}

module.exports = query
