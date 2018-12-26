const Router = require('koa-router')
const query = require('./mysql.js')
const router = new Router()
const sd = require('silly-datetime')

const ENDTIME = new Date('2019-01-01 20:00:00')
const FLOOR = 3344 // 楼层数
const MIN = 0.01 // 最小金额
let MONEY = 78.73 // 红包总金额

router.post('/saveUserInfo',async ctx => { // 保存用户信息
    let success = true
    const {nickname,figureurl_qq_1,number}  = ctx.request.body
    const nt = new Date()
    if(nt.valueOf() >= ENDTIME.valueOf()){
        ctx.body = {
            message:'活动已截止',
            success:false
        }
    }
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
            success = false
        }
    }
    ctx.body = {
        message,
        data,
        success
    }
})

router.post('/getfloor', async ctx => {// 抢楼
    let success = true
    let message = '抢楼成功'
    let data = {
        money: 0,
        floor: 0
    }
    const nt = new Date()
    if(nt.valueOf() >= ENDTIME.valueOf()){
        ctx.body = {
            message:'活动已截止',
            success:false
        }
    }
    const {nickname, figureurl_qq_1, number}  = ctx.request.body
    const time = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    const queryTime = sd.format(new Date(), 'YYYY-MM-DD')

    const today = await query(`select id from floor where create_time like '${queryTime}%' AND qq='${number}'`)
    const todayShare = await query(`select id from qq_share where create_time like '${queryTime}%' AND qq='${number}'`)
    const userMoney = await query(`select money from user where qq='${number}'`)
    const userFloor = await query(`seletc * from floor where qq='${number}'`)
    const countNumber = todayShare.length ? 100 : 100
    if(userMoney.length > 0){
        data.money = userMoney[0].money
    }
    data.floor = userFloor.length
    
    if(today.length >= countNumber){
        return ctx.body = {
            data,
            message:'今日抢楼数已达最大，分享可额外获得 10楼 机会。'
        }
    }
    const numbers = await query('select * from floor')
    const floor = await query(`insert into floor (number,qq,name,image,create_time) values 
                        ('${numbers.length+1}','${number}','${nickname}','${figureurl_qq_1}','${time}')`)
    if(!floor){
        message = '抢楼失败'
        success = false
    }else if(MONEY && numbers.length <= FLOOR){// 红包
        const lv = numbers.length >= 500 ? 3 : 4
        if(Math.ceil(Math.random()*10) < lv){
            let _money = await red_envelopes(lv)

            await query(`insert into bonus (qq,name,money,create_time) values ('${number}','${nickname}',${_money},'${time}')`)
            await query(`update user set money = money+${_money} where qq='${number}'`)
            data.money  = Number(_money) + Number(userMoney[0].money)
        }
    }

    ctx.body = {
        data,
        message,
        success
    }
    console.log('ceshi');
})

router.post('/share', async ctx => {
    let success = true
    const nt = new Date()
    if(nt.valueOf() >= ENDTIME.valueOf()){
        ctx.body = {
            message:'活动已截止',
            success:false
        }
    }
    let message = '今天已经分享过了，请明天分享'
    const {number}  = ctx.request.body
    const time = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    const nTime = sd.format(new Date(), 'YYYY-MM-DD')
    const numbers = await query(`select * from qq_share where qq='${number}' and create_time like '${nTime}%'`)
    if(!numbers.length){
        await query(`insert into qq_share (qq,create_time) values ('${number}','${time}')`)
        message = '分享成功'
    }
    ctx.body = {
        message,
        success
    }
})

router.post('/queryFloor', async ctx => {// 查询列表
    let success = true
    let message = '查询成功'
    let data = {}

    const {number}  = ctx.request.body
    
    const arr = await query('select * from floor  order by create_time desc limit 20')
    const _floor = await query(`select * from floor where qq='${number}'`)
    const _money = await query(`select money from user where qq='${number}'`)

    if(!arr){
        message = '查询失败'
        success = false
    }else{
        for(let i=0;i<arr.length;i++){
            arr[i].create_time =  sd.format(arr[i].create_time, 'YYYY-MM-DD HH:mm:ss')
        }
        data.list = arr
    }

    data.floor = _floor.length
    
    if(_money.length > 0){
        data.money = _money[0].money
    }
    ctx.body = {
        data,
        message,
        success
    }
})

router.get('/getRank', async ctx => {// 排行榜
    let success = true
    let message = '查询成功'
    const arr = await query('select name,floor,img from user order by floor desc limit 10')
    if(!arr){
        success = false
        message = '查询失败'
        ctx.body = {
            data: [],
            success: success,
            message: message
        }
    }
    ctx.body = {
        data: arr,
        success: success,
        message: message
    }
})

router.get('/getMoneyList', async ctx => {// 排行榜
    let success = true
    let message = '查询成功'
    const arr = await query('select name,money from bonus order by floor desc limit 20')
    if(!arr){
        success = false
        message = '查询失败'
        ctx.body = {
            data: [],
            success: success,
            message: message
        }
    }
    ctx.body = {
        data: arr,
        success: success,
        message: message
    }
})

function red_envelopes(a){
    const _number = 3300
    const _min1 = 1800
    const _min2 = 1600
    const _min3 = 1500
    return new Promise((relove,reject) => {
        if(a <= 1000){
            var numbers = _min1 + Math.round(Math.random() * (_number - _min1))
        }else if(a <= 2000 && a > 1000){
            var numbers = _min2 + Math.round(Math.random() * (_number - _min2))
        }else if(a > 2000){
            var numbers = _min3 + Math.round(Math.random() * (_number - _min3))
        }
    
        let MAX = MONEY / (FLOOR - numbers) * 2
    
        if(MONEY <= 20){
            MAX = MONEY / (FLOOR - i) * 2
        }
        let pMoney =  MIN + Math.random()*(MAX - MIN)
        let lMoney = pMoney.toFixed(2)
        var sMoney = lMoney >= MIN ? lMoney : MIN
        if(sMoney >= MONEY){
            sMoney = MONEY
        }
        MONEY -= sMoney
        relove(sMoney)
    })
}

module.exports = router