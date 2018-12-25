const Router = require('koa-router')
const query = require('./mysql.js')
const router = new Router()
const sd = require('silly-datetime')

const FLOOR = 3344 // 楼层数
const MIN = 0.01 // 最小金额
let MONEY = 78.73 // 红包总金额


router.post('/saveUserInfo',async ctx => { // 保存用户信息
    const {nickname,figureurl_qq_1,number}  = ctx.request.body
    let message = '保存成功'
    let data = {}

    let hasQQ = await query(`select * from user where qq='${number}'`)
    if(hasQQ.length){// 有qq
        data.money = hasQQ[0].money
    }else{// 没有qq
        var data1 = await query(`insert into user (qq,name,img,money) values 
                            ('${number}','${nickname}','${figureurl_qq_1}',0.00)`) 
        if(data1){
            data.money = 0.00
        }else{
            message = '保存失败'
        }
    }
    ctx.body = {
        message,
        data
    }
})

router.post('/getfloor', async ctx => {// 抢楼
    let message = '抢楼成功'
    let data = {
        money:0
    }
    const {nickname, figureurl_qq_1, number}  = ctx.request.body
    const time = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    const queryTime = sd.format(new Date(), 'YYYY-MM-DD')

    const today = await query(`select id from floor where create_time like '${queryTime}%' AND qq='${number}'`)
    const todayShare = await query(`select id from qq_share where create_time like '${queryTime}%' AND qq='${number}'`)
    const userMoney = await query(`select money from user where qq='${number}'`)
    const countNumber = todayShare.length ? 30 : 20
    data.money = userMoney[0].money
    if(today.length >= countNumber){
        return ctx.body = {
            data,
            message:'今天的抢楼已达到最大数，如果没有今天分享，请分享，分享能再获得10次抢楼机会！'
        }
    }
    const numbers = await query('select * from floor')
    const floor = await query(`insert into floor(number,qq,name,image,create_time) values 
                        ('${numbers.length+1}','${number}','${nickname}','${figureurl_qq_1}','${time}')`)
    if(!floor){
        message = '抢楼失败'
    }else if(MONEY && numbers.length <= FLOOR){// 红包
        if(Math.ceil(Math.random()*10) < 3){
            const MAX = MONEY / (FLOOR - numbers.length) * 2
            let pMoney = Math.random()*(MAX - MIN)
            pMoney = pMoney.toFixed(2)
            MONEY -= pMoney
            console.log('中奖啦!!! 中奖金额：'+ pMoney + ',剩余金额：' + MONEY);
            await query(`update bonus set qq='${number}',name='${nickname}',money=${pMoney}`)
            await query(`update user set money = money+${pMoney} where qq='${number}'`)
            data.money  = Number(pMoney) + Number(userMoney[0].money)
        }
    }

    ctx.body = {
        data,
        message
    }
})

router.post('/share', async ctx => {
    let message = '今天已经分享过了，请明天分享'
    const {number}  = ctx.request.body
    const time = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    const numbers = await query(`select * from qq_share where qq='${number}'`)
    if(!numbers.length){
        await query(`insert into qq_share (qq,create_time) values ('${number}','${time}')`)
        message = '分享成功'
    }
    ctx.body = {
        message
    }
})

router.get('/queryFloor', async ctx => {// 查询列表
    let data = []
    let message = '查询成功'
    
    const arr = await query('select * from floor')

    if(!arr){
        message = '查询失败'
    }

    ctx.body = {
        data:data,
        message:message
    }
})
module.exports = router