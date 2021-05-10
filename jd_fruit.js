/*
东东水果:脚本更新地址 https://gitee.com/lxk0301/jd_scripts/raw/master/jd_fruit.js
更新时间：2021-1-9
活动入口：京东APP我的-更多工具-东东农场
东东农场活动链接：https://h5.m.jd.com/babelDiy/Zeus/3KSjXqQabiTuD1cJ28QskrpWoBKT/index.html
脚本内置了一个给作者任务助力的网络请求，默认开启，如介意请自行关闭。
参数 helpAuthor = false
脚本作者：lxk0301
*/
const $ = new Env('东东农场');
let cookiesArr = [], cookie = '', jdFruitShareArr = [], isBox = false, notify, newShareCodes, allMessage = '';
//助力好友分享码(最多4个,否则后面的助力失败),原因:京东农场每人每天只有四次助力机会
//此此内容是IOS用户下载脚本到本地使用，填写互助码的地方，同一京东账号的好友互助码请使用@符号隔开。
//下面给出两个账号的填写示例（iOS只支持2个京东账号）
let shareCodes = [ // 这个列表填入你要助力的好友的shareCode
   //账号一的好友shareCode,不同好友的shareCode中间用@符号隔开
  '',
  //账号二的好友shareCode,不同好友的shareCode中间用@符号隔开
  '',
]
let message = '', subTitle = '', option = {}, isFruitFinished = false;
const retainWater = 100;//保留水滴大于多少g,默认100g;
let jdNotify = false;//是否关闭通知，false打开通知推送，true关闭通知推送
let jdFruitBeanCard = false;//农场使用水滴换豆卡(如果出现限时活动时100g水换20豆,此时比浇水划算,推荐换豆),true表示换豆(不浇水),false表示不换豆(继续浇水),脚本默认是浇水
let randomCount = $.isNode() ? 20 : 5;
let helpAuthor = true;
const JD_API_HOST = 'https://api.m.jd.com/client.action';
const urlSchema = `openjd://virtual?params=%7B%20%22category%22:%20%22jump%22,%20%22des%22:%20%22m%22,%20%22url%22:%20%22https://h5.m.jd.com/babelDiy/Zeus/3KSjXqQabiTuD1cJ28QskrpWoBKT/index.html%22%20%7D`;
!(async () => {
  await requireConfig();
  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});
    return;
  }
  for (let i = 0; i < cookiesArr.length; i++) {
    if (cookiesArr[i]) {
      cookie = cookiesArr[i];
      $.UserName = decodeURIComponent(cookie.match(/pt_pin=(.+?);/) && cookie.match(/pt_pin=(.+?);/)[1])
      $.index = i + 1;
      $.isLogin = true;
      $.nickName = '';
      await TotalBean();
      if (!$.isLogin) {
        $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});
        if ($.isNode()) {
          await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
        }
        continue
      }
      message = '';
      subTitle = '';
      option = {};
      await shareCodesFormat();
      await jdFruit();

    }
  }
  if ($.isNode() && allMessage && $.ctrTemp) {
    await notify.sendNotify(`${$.name}`, `${allMessage}`)
  }
})()
    .catch((e) => {
      $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
      $.done();
    })
async function jdFruit() {
  subTitle = `【京东账号${$.index}】${$.nickName}`;
  try {
    if(helpAuthor){
      await shuye72()
    }
    await initForFarm();
    if ($.farmInfo.farmUserPro) {
      // option['media-url'] = $.farmInfo.farmUserPro.goodsImage;
      message = `【水果名称】${$.farmInfo.farmUserPro.name}\n`;
      console.log(`\n【京东账号${$.index}（${$.nickName || $.UserName}）的${$.name}好友互助码】${$.farmInfo.farmUserPro.shareCode}\n`);
      console.log(`\n【已成功兑换水果】${$.farmInfo.farmUserPro.winTimes}次\n`);
      message += `【已兑换水果】${$.farmInfo.farmUserPro.winTimes}次\n`;
      await masterHelpShare();//助力好友
      if ($.farmInfo.treeState === 2 || $.farmInfo.treeState === 3) {
        option['open-url'] = urlSchema;
        $.msg($.name, ``, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.farmInfo.farmUserPro.name}已可领取\n请去京东APP或微信小程序查看\n点击弹窗即达`, option);
        if ($.isNode()) {
          await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}水果已可领取`, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.farmInfo.farmUserPro.name}已可领取\n请去京东APP或微信小程序查看`);
        }
        return
      } else if ($.farmInfo.treeState === 1) {
        console.log(`\n${$.farmInfo.farmUserPro.name}种植中...\n`)
      } else if ($.farmInfo.treeState === 0) {
        //已下单购买, 但未开始种植新的水果
        option['open-url'] = urlSchema;
        $.msg($.name, ``, `【京东账号${$.index}】 ${$.nickName || $.UserName}\n【提醒⏰】您忘了种植新的水果\n请去京东APP或微信小程序选购并种植新的水果\n点击弹窗即达`, option);
        if ($.isNode()) {
          await notify.sendNotify(`${$.name} - 您忘了种植新的水果`, `京东账号${$.index} ${$.nickName}\n【提醒⏰】您忘了种植新的水果\n请去京东APP或微信小程序选购并种植新的水果`);
        }
        return
      }
      await doDailyTask();
      await doTenWater();//浇水十次
      await getFirstWaterAward();//领取首次浇水奖励
      await getTenWaterAward();//领取10浇水奖励
      await getWaterFriendGotAward();//领取为2好友浇水奖励
      await duck();
      await doTenWaterAgain();//再次浇水
      await predictionFruit();//预测水果成熟时间
    } else {
      console.log(`初始化农场数据异常, 请登录京东 app查看农场0元水果功能是否正常,农场初始化数据: ${JSON.stringify($.farmInfo)}`);
      message = `【数据异常】请手动登录京东app查看此账号${$.name}是否正常`;
    }
  } catch (e) {
    console.log(`任务执行异常，请检查执行日志 ‼️‼️`);
    $.logErr(e);
    message = `任务执行异常，请检查执行日志 ‼️‼️`;
  }
  await showMsg();
}
async function doDailyTask() {
  await taskInitForFarm();
  console.log(`开始签到`);
  if (!$.farmTask.signInit.todaySigned) {
    await signForFarm(); //签到
    if ($.signResult.code === "0") {
      console.log(`【签到成功】获得${$.signResult.amount}g💧\\n`)
      //message += `【签到成功】获得${$.signResult.amount}g💧\n`//连续签到${signResult.signDay}天
    } else {
      // message += `签到失败,详询日志\n`;
      console.log(`签到结果:  ${JSON.stringify($.signResult)}`);
    }
  } else {
    console.log(`今天已签到,连续签到${$.farmTask.signInit.totalSigned},下次签到可得${$.farmTask.signInit.signEnergyEachAmount}g\n`);
  }
  // 被水滴砸中
  console.log(`被水滴砸中： ${$.farmInfo.todayGotWaterGoalTask.canPop ? '是' : '否'}`);
  if ($.farmInfo.todayGotWaterGoalTask.canPop) {
    await gotWaterGoalTaskForFarm();
    if ($.goalResult.code === '0') {
      console.log(`【被水滴砸中】获得${$.goalResult.addEnergy}g💧\\n`);
      // message += `【被水滴砸中】获得${$.goalResult.addEnergy}g💧\n`
    }
  }
  console.log(`签到结束,开始广告浏览任务`);
  if (!$.farmTask.gotBrowseTaskAdInit.f) {
    let adverts = $.farmTask.gotBrowseTaskAdInit.userBrowseTaskAds
    let browseReward = 0
    let browseSuccess = 0
    let browseFail = 0
    for (let advert of adverts) { //开始浏览广告
      if (advert.limit <= advert.hadFinishedTimes) {
        // browseReward+=advert.reward
        console.log(`${advert.mainTitle}+ ' 已完成`);//,获得${advert.reward}g
        continue;
      }
      console.log('正在进行广告浏览任务: ' + advert.mainTitle);
      await browseAdTaskForFarm(advert.advertId, 0);
      if ($.browseResult.code === '0') {
        console.log(`${advert.mainTitle}浏览任务完成`);
        //领取奖励
        await browseAdTaskForFarm(advert.advertId, 1);
        if ($.browseRwardResult.code === '0') {
          console.log(`领取浏览${advert.mainTitle}广告奖励成功,获得${$.browseRwardResult.amount}g`)
          browseReward += $.browseRwardResult.amount
          browseSuccess++
        } else {
          browseFail++
          console.log(`领取浏览广告奖励结果:  ${JSON.stringify($.browseRwardResult)}`)
        }
      } else {
        browseFail++
        console.log(`广告浏览任务结果:   ${JSON.stringify($.browseResult)}`);
      }
    }
    if (browseFail > 0) {
      console.log(`【广告浏览】完成${browseSuccess}个,失败${browseFail},获得${browseReward}g💧\\n`);
      // message += `【广告浏览】完成${browseSuccess}个,失败${browseFail},获得${browseReward}g💧\n`;
    } else {
      console.log(`【广告浏览】完成${browseSuccess}个,获得${browseReward}g💧\n`);
      // message += `【广告浏览】完成${browseSuccess}个,获得${browseReward}g💧\n`;
    }
  } else {
    console.log(`今天已经做过浏览广告任务\n`);
  }
  //定时领水
  if (!$.farmTask.gotThreeMealInit.f) {
    //
    await gotThreeMealForFarm();
    if ($.threeMeal.code === "0") {
      console.log(`【定时领水】获得${$.threeMeal.amount}g💧\n`);
      // message += `【定时领水】获得${$.threeMeal.amount}g💧\n`;
    } else {
      // message += `【定时领水】失败,详询日志\n`;
      console.log(`定时领水成功结果:  ${JSON.stringify($.threeMeal)}`);
    }
  } else {
    console.log('当前不在定时领水时间断或者已经领过\n')
  }
  //给好友浇水
  if (!$.farmTask.waterFriendTaskInit.f) {
    if ($.farmTask.waterFriendTaskInit.waterFriendCountKey < $.farmTask.waterFriendTaskInit.waterFriendMax) {
      await doFriendsWater();
    }
  } else {
    console.log(`给${$.farmTask.waterFriendTaskInit.waterFriendMax}个好友浇水任务已完成\n`)
  }
  // await Promise.all([
  //   clockInIn(),//打卡领水
  //   executeWaterRains(),//水滴雨
  //   masterHelpShare(),//助力好友
  //   getExtraAward(),//领取额外水滴奖励
  //   turntableFarm()//天天抽奖得好礼
  // ])
  await getAwardInviteFriend();
  await clockInIn();//打卡领水
  await executeWaterRains();//水滴雨
  await getExtraAward();//领取额外水滴奖励
  await turntableFarm()//天天抽奖得好礼
}
async function predictionFruit() {
  console.log('开始预测水果成熟时间\n');
  await initForFarm();
  await taskInitForFarm();
  let waterEveryDayT = $.farmTask.totalWaterTaskInit.totalWaterTaskTimes;//今天到到目前为止，浇了多少次水
  message += `【今日共浇水】${waterEveryDayT}次\n`;
  message += `【剩余 水滴】${$.farmInfo.farmUserPro.totalEnergy}g💧\n`;
  message += `【水果🍉进度】${(($.farmInfo.farmUserPro.treeEnergy / $.farmInfo.farmUserPro.treeTotalEnergy) * 100).toFixed(2)}%，已浇水${$.farmInfo.farmUserPro.treeEnergy / 10}次,还需${($.farmInfo.farmUserPro.treeTotalEnergy - $.farmInfo.farmUserPro.treeEnergy) / 10}次\n`
  if ($.farmInfo.toFlowTimes > ($.farmInfo.farmUserPro.treeEnergy / 10)) {
    message += `【开花进度】再浇水${$.farmInfo.toFlowTimes - $.farmInfo.farmUserPro.treeEnergy / 10}次开花\n`
  } else if ($.farmInfo.toFruitTimes > ($.farmInfo.farmUserPro.treeEnergy / 10)) {
    message += `【结果进度】再浇水${$.farmInfo.toFruitTimes - $.farmInfo.farmUserPro.treeEnergy / 10}次结果\n`
  }
  // 预测n天后水果课可兑换功能
  let waterTotalT = ($.farmInfo.farmUserPro.treeTotalEnergy - $.farmInfo.farmUserPro.treeEnergy - $.farmInfo.farmUserPro.totalEnergy) / 10;//一共还需浇多少次水

  let waterD = Math.ceil(waterTotalT / waterEveryDayT);

  message += `【预测】${waterD === 1 ? '明天' : waterD === 2 ? '后天' : waterD + '天之后'}(${timeFormat(24 * 60 * 60 * 1000 * waterD + Date.now())}日)可兑换水果🍉`
}
//浇水十次
async function doTenWater() {
  jdFruitBeanCard = $.getdata('jdFruitBeanCard') ? $.getdata('jdFruitBeanCard') : jdFruitBeanCard;
  if ($.isNode() && process.env.FRUIT_BEAN_CARD) {
    jdFruitBeanCard = process.env.FRUIT_BEAN_CARD;
  }
  await myCardInfoForFarm();
  const { fastCard, doubleCard, beanCard, signCard  } = $.myCardInfoRes;
  if (`${jdFruitBeanCard}` === 'true' && JSON.stringify($.myCardInfoRes).match(`限时翻倍`) && beanCard > 0) {
    console.log(`您设置的是使用水滴换豆卡，且背包有水滴换豆卡${beanCard}张, 跳过10次浇水任务`)
    return
  }
  if ($.farmTask.totalWaterTaskInit.totalWaterTaskTimes < $.farmTask.totalWaterTaskInit.totalWaterTaskLimit) {
    console.log(`\n准备浇水十次`);
    let waterCount = 0;
    isFruitFinished = false;
    for (; waterCount < $.farmTask.totalWaterTaskInit.totalWaterTaskLimit - $.farmTask.totalWaterTaskInit.totalWaterTaskTimes; waterCount++) {
      console.log(`第${waterCount + 1}次浇水`);
      await waterGoodForFarm();
      console.log(`本次浇水结果:   ${JSON.stringify($.waterResult)}`);
      if ($.waterResult.code === '0') {
        console.log(`剩余水滴${$.waterResult.totalEnergy}g`);
        if ($.waterResult.finished) {
          // 已证实，waterResult.finished为true，表示水果可以去领取兑换了
          isFruitFinished = true;
          break
        } else {
          if ($.waterResult.totalEnergy < 10) {
            console.log(`水滴不够，结束浇水`)
            break
          }
          await gotStageAward();//领取阶段性水滴奖励
        }
      } else {
        console.log('浇水出现失败异常,跳出不在继续浇水')
        break;
      }
    }
    if (isFruitFinished) {
      option['open-url'] = urlSchema;
      $.msg($.name, ``, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.farmInfo.farmUserPro.name}已可领取\n请去京东APP或微信小程序查看\n点击弹窗即达`, option);
      $.done();
      if ($.isNode()) {
        await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName || $.UserName}水果已可领取`, `京东账号${$.index} ${$.nickName}\n${$.farmInfo.farmUserPro.name}已可领取`);
      }
    }
  } else {
    console.log('\n今日已完成10次浇水任务\n');
  }
}
//领取首次浇水奖励
async function getFirstWaterAward() {
  await taskInitForFarm();
  //领取首次浇水奖励
  if (!$.farmTask.firstWaterInit.f && $.farmTask.firstWaterInit.totalWaterTimes > 0) {
    await firstWaterTaskForFarm();
    if ($.firstWaterReward.code === '0') {
      console.log(`【首次浇水奖励】获得${$.firstWaterReward.amount}g💧\n`);
      // message += `【首次浇水奖励】获得${$.firstWaterReward.amount}g💧\n`;
    } else {
      // message += '【首次浇水奖励】领取奖励失败,详询日志\n';
      console.log(`领取首次浇水奖励结果:  ${JSON.stringify($.firstWaterReward)}`);
    }
  } else {
    console.log('首次浇水奖励已领取\n')
  }
}
//领取十次浇水奖励
async function getTenWaterAward() {
  //领取10次浇水奖励
  if (!$.farmTask.totalWaterTaskInit.f && $.farmTask.totalWaterTaskInit.totalWaterTaskTimes >= $.farmTask.totalWaterTaskInit.totalWaterTaskLimit) {
    await totalWaterTaskForFarm();
    if ($.totalWaterReward.code === '0') {
      console.log(`【十次浇水奖励】获得${$.totalWaterReward.totalWaterTaskEnergy}g💧\n`);
      // message += `【十次浇水奖励】获得${$.totalWaterReward.totalWaterTaskEnergy}g💧\n`;
    } else {
      // message += '【十次浇水奖励】领取奖励失败,详询日志\n';
      console.log(`领取10次浇水奖励结果:  ${JSON.stringify($.totalWaterReward)}`);
    }
  } else if ($.farmTask.totalWaterTaskInit.totalWaterTaskTimes < $.farmTask.totalWaterTaskInit.totalWaterTaskLimit) {
    // message += `【十次浇水奖励】任务未完成，今日浇水${$.farmTask.totalWaterTaskInit.totalWaterTaskTimes}次\n`;
    console.log(`【十次浇水奖励】任务未完成，今日浇水${$.farmTask.totalWaterTaskInit.totalWaterTaskTimes}次\n`);
  }
  console.log('finished 水果任务完成!');
}
//再次浇水
async function doTenWaterAgain() {
  console.log('开始检查剩余水滴能否再次浇水再次浇水\n');
  await initForFarm();
  let totalEnergy  = $.farmInfo.farmUserPro.totalEnergy;
  console.log(`剩余水滴${totalEnergy}g\n`);
  await myCardInfoForFarm();
  const { fastCard, doubleCard, beanCard, signCard  } = $.myCardInfoRes;
  console.log(`背包已有道具:\n快速浇水卡:${fastCard === -1 ? '未解锁': fastCard + '张'}\n水滴翻倍卡:${doubleCard === -1 ? '未解锁': doubleCard + '张'}\n水滴换京豆卡:${beanCard === -1 ? '未解锁' : beanCard + '张'}\n加签卡:${signCard === -1 ? '未解锁' : signCard + '张'}\n`)
  if (totalEnergy >= 100 && doubleCard > 0) {
    //使用翻倍水滴卡
    for (let i = 0; i < new Array(doubleCard).fill('').length; i++) {
      await userMyCardForFarm('doubleCard');
      console.log(`使用翻倍水滴卡结果:${JSON.stringify($.userMyCardRes)}`);
    }
    await initForFarm();
    totalEnergy = $.farmInfo.farmUserPro.totalEnergy;
  }
  if (signCard > 0) {
    //使用加签卡
    for (let i = 0; i < new Array(signCard).fill('').length; i++) {
      await userMyCardForFarm('signCard');
      console.log(`使用加签卡结果:${JSON.stringify($.userMyCardRes)}`);
    }
    await initForFarm();
    totalEnergy = $.farmInfo.farmUserPro.totalEnergy;
  }
  jdFruitBeanCard = $.getdata('jdFruitBeanCard') ? $.getdata('jdFruitBeanCard') : jdFruitBeanCard;
  if ($.isNode() && process.env.FRUIT_BEAN_CARD) {
    jdFruitBeanCard = process.env.FRUIT_BEAN_CARD;
  }
  if (`${jdFruitBeanCard}` === 'true' && JSON.stringify($.myCardInfoRes).match('限时翻倍')) {
    console.log(`\n您设置的是水滴换豆功能,现在为您换豆`);
    if (totalEnergy >= 100 && $.myCardInfoRes.beanCard > 0) {
      //使用水滴换豆卡
      await userMyCardForFarm('beanCard');
      console.log(`使用水滴换豆卡结果:${JSON.stringify($.userMyCardRes)}`);
      if ($.userMyCardRes.code === '0') {
        message += `【水滴换豆卡】获得${$.userMyCardRes.beanCount}个京豆\n`;
        return
      }
    } else {
      console.log(`您目前水滴:${totalEnergy}g,水滴换豆卡${$.myCardInfoRes.beanCard}张,暂不满足水滴换豆的条件,为您继续浇水`)
    }
  }
  // if (totalEnergy > 100 && $.myCardInfoRes.fastCard > 0) {
  //   //使用快速浇水卡
  //   await userMyCardForFarm('fastCard');
  //   console.log(`使用快速浇水卡结果:${JSON.stringify($.userMyCardRes)}`);
  //   if ($.userMyCardRes.code === '0') {
  //     console.log(`已使用快速浇水卡浇水${$.userMyCardRes.waterEnergy}g`);
  //   }
  //   await initForFarm();
  //   totalEnergy  = $.farmInfo.farmUserPro.totalEnergy;
  // }
  // 所有的浇水(10次浇水)任务，获取水滴任务完成后，如果剩余水滴大于等于60g,则继续浇水(保留部分水滴是用于完成第二天的浇水10次的任务)
  let overageEnergy = totalEnergy - retainWater;
  if (totalEnergy >= ($.farmInfo.farmUserPro.treeTotalEnergy - $.farmInfo.farmUserPro.treeEnergy)) {
    //如果现有的水滴，大于水果可兑换所需的对滴(也就是把水滴浇完，水果就能兑换了)
    isFruitFinished = false;
    for (let i = 0; i < ($.farmInfo.farmUserPro.treeTotalEnergy - $.farmInfo.farmUserPro.treeEnergy) / 10; i++) {
      await waterGoodForFarm();
      console.log(`本次浇水结果(水果马上就可兑换了):   ${JSON.stringify($.waterResult)}`);
      if ($.waterResult.code === '0') {
        console.log('\n浇水10g成功\n');
        if ($.waterResult.finished) {
          // 已证实，waterResult.finished为true，表示水果可以去领取兑换了
          isFruitFinished = true;
          break
        } else {
          console.log(`目前水滴【${$.waterResult.totalEnergy}】g,继续浇水，水果马上就可以兑换了`)
        }
      } else {
        console.log('浇水出现失败异常,跳出不在继续浇水')
        break;
      }
    }
    if (isFruitFinished) {
      option['open-url'] = urlSchema;
      $.msg($.name, ``, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.farmInfo.farmUserPro.name}已可领取\n请去京东APP或微信小程序查看\n点击弹窗即达`, option);
      $.done();
      if ($.isNode()) {
        await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}水果已可领取`, `京东账号${$.index} ${$.nickName}\n${$.farmInfo.farmUserPro.name}已可领取`);
      }
    }
  } else if (overageEnergy >= 10) {
    console.log("目前剩余水滴：【" + totalEnergy + "】g，可继续浇水");
    isFruitFinished = false;
    for (let i = 0; i < parseInt(overageEnergy / 10); i++) {
      await waterGoodForFarm();
      console.log(`本次浇水结果:   ${JSON.stringify($.waterResult)}`);
      if ($.waterResult.code === '0') {
        console.log(`\n浇水10g成功,剩余${$.waterResult.totalEnergy}\n`)
        if ($.waterResult.finished) {
          // 已证实，waterResult.finished为true，表示水果可以去领取兑换了
          isFruitFinished = true;
          break
        } else {
          await gotStageAward()
        }
      } else {
        console.log('浇水出现失败异常,跳出不在继续浇水')
        break;
      }
    }
    if (isFruitFinished) {
      option['open-url'] = urlSchema;
      $.msg($.name, ``, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.farmInfo.farmUserPro.name}已可领取\n请去京东APP或微信小程序查看\n点击弹窗即达`, option);
      $.done();
      if ($.isNode()) {
        await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}水果已可领取`, `京东账号${$.index} ${$.nickName}\n${$.farmInfo.farmUserPro.name}已可领取`);
      }
    }
  } else {
    console.log("目前剩余水滴：【" + totalEnergy + "】g,不再继续浇水,保留部分水滴用于完成第二天【十次浇水得水滴】任务")
  }
}
//领取阶段性水滴奖励
function gotStageAward() {
  return new Promise(async resolve => {
    if ($.waterResult.waterStatus === 0 && $.waterResult.treeEnergy === 10) {
      console.log('果树发芽了,奖励30g水滴');
      await gotStageAwardForFarm('1');
      console.log(`浇水阶段奖励1领取结果 ${JSON.stringify($.gotStageAwardForFarmRes)}`);
      if ($.gotStageAwardForFarmRes.code === '0') {
        // message += `【果树发芽了】奖励${$.gotStageAwardForFarmRes.addEnergy}\n`;
        console.log(`【果树发芽了】奖励${$.gotStageAwardForFarmRes.addEnergy}\n`);
      }
    } else if ($.waterResult.waterStatus === 1) {
      console.log('果树开花了,奖励40g水滴');
      await gotStageAwardForFarm('2');
      console.log(`浇水阶段奖励2领取结果 ${JSON.stringify($.gotStageAwardForFarmRes)}`);
      if ($.gotStageAwardForFarmRes.code === '0') {
        // message += `【果树开花了】奖励${$.gotStageAwardForFarmRes.addEnergy}g💧\n`;
        console.log(`【果树开花了】奖励${$.gotStageAwardForFarmRes.addEnergy}g💧\n`);
      }
    } else if ($.waterResult.waterStatus === 2) {
      console.log('果树长出小果子啦, 奖励50g水滴');
      await gotStageAwardForFarm('3');
      console.log(`浇水阶段奖励3领取结果 ${JSON.stringify($.gotStageAwardForFarmRes)}`)
      if ($.gotStageAwardForFarmRes.code === '0') {
        // message += `【果树结果了】奖励${$.gotStageAwardForFarmRes.addEnergy}g💧\n`;
        console.log(`【果树结果了】奖励${$.gotStageAwardForFarmRes.addEnergy}g💧\n`);
      }
    }
    resolve()
  })
}
//天天抽奖活动
async function turntableFarm() {
  await initForTurntableFarm();
  if ($.initForTurntableFarmRes.code === '0') {
    //领取定时奖励 //4小时一次
    let {timingIntervalHours, timingLastSysTime, sysTime, timingGotStatus, remainLotteryTimes, turntableInfos} = $.initForTurntableFarmRes;

    if (!timingGotStatus) {
      console.log(`是否到了领取免费赠送的抽奖机会----${sysTime > (timingLastSysTime + 60*60*timingIntervalHours*1000)}`)
      if (sysTime > (timingLastSysTime + 60*60*timingIntervalHours*1000)) {
        await timingAwardForTurntableFarm();
        console.log(`领取定时奖励结果${JSON.stringify($.timingAwardRes)}`);
        await initForTurntableFarm();
        remainLotteryTimes = $.initForTurntableFarmRes.remainLotteryTimes;
      } else {
        console.log(`免费赠送的抽奖机会未到时间`)
      }
    } else {
      console.log('4小时候免费赠送的抽奖机会已领取')
    }
    if ($.initForTurntableFarmRes.turntableBrowserAds && $.initForTurntableFarmRes.turntableBrowserAds.length > 0) {
      for (let index = 0; index < $.initForTurntableFarmRes.turntableBrowserAds.length; index++) {
        if (!$.initForTurntableFarmRes.turntableBrowserAds[index].status) {
          console.log(`开始浏览天天抽奖的第${index + 1}个逛会场任务`)
          await browserForTurntableFarm(1, $.initForTurntableFarmRes.turntableBrowserAds[index].adId);
          if ($.browserForTurntableFarmRes.code === '0' && $.browserForTurntableFarmRes.status) {
            console.log(`第${index + 1}个逛会场任务完成，开始领取水滴奖励\n`)
            await browserForTurntableFarm(2, $.initForTurntableFarmRes.turntableBrowserAds[index].adId);
            if ($.browserForTurntableFarmRes.code === '0') {
              console.log(`第${index + 1}个逛会场任务领取水滴奖励完成\n`)
              await initForTurntableFarm();
              remainLotteryTimes = $.initForTurntableFarmRes.remainLotteryTimes;
            }
          }
        } else {
          console.log(`浏览天天抽奖的第${index + 1}个逛会场任务已完成`)
        }
      }
    }
    //天天抽奖助力
    console.log('开始天天抽奖--好友助力--每人每天只有三次助力机会.')
    for (let code of newShareCodes) {
      if (code === $.farmInfo.farmUserPro.shareCode) {
        console.log('天天抽奖-不能自己给自己助力\n')
        continue
      }
      await lotteryMasterHelp(code);
      // console.log('天天抽奖助力结果',lotteryMasterHelpRes.helpResult)
      if ($.lotteryMasterHelpRes.helpResult.code === '0') {
        console.log(`天天抽奖-助力${$.lotteryMasterHelpRes.helpResult.masterUserInfo.nickName}成功\n`)
      } else if ($.lotteryMasterHelpRes.helpResult.code === '11') {
        console.log(`天天抽奖-不要重复助力${$.lotteryMasterHelpRes.helpResult.masterUserInfo.nickName}\n`)
      } else if ($.lotteryMasterHelpRes.helpResult.code === '13') {
        console.log(`天天抽奖-助力${$.lotteryMasterHelpRes.helpResult.masterUserInfo.nickName}失败,助力次数耗尽\n`);
        break;
      }
    }
    console.log(`---天天抽奖次数remainLotteryTimes----${remainLotteryTimes}次`)
    //抽奖
    if (remainLotteryTimes > 0) {
      console.log('开始抽奖')
      let lotteryResult = '';
      for (let i = 0; i < new Array(remainLotteryTimes).fill('').length; i++) {
        await lotteryForTurntableFarm()
        console.log(`第${i + 1}次抽奖结果${JSON.stringify($.lotteryRes)}`);
        if ($.lotteryRes.code === '0') {
          turntableInfos.map((item) => {
            if (item.type === $.lotteryRes.type) {
              console.log(`lotteryRes.type${$.lotteryRes.type}`);
              if ($.lotteryRes.type.match(/bean/g) && $.lotteryRes.type.match(/bean/g)[0] === 'bean') {
                lotteryResult += `${item.name}个，`;
              } else if ($.lotteryRes.type.match(/water/g) && $.lotteryRes.type.match(/water/g)[0] === 'water') {
                lotteryResult += `${item.name}，`;
              } else {
                lotteryResult += `${item.name}，`;
              }
            }
          })
          //没有次数了
          if ($.lotteryRes.remainLotteryTimes === 0) {
            break
          }
        }
      }
      if (lotteryResult) {
        console.log(`【天天抽奖】${lotteryResult.substr(0, lotteryResult.length - 1)}\n`)
        // message += `【天天抽奖】${lotteryResult.substr(0, lotteryResult.length - 1)}\n`;
      }
    }  else {
      console.log('天天抽奖--抽奖机会为0次')
    }
  } else {
    console.log('初始化天天抽奖得好礼失败')
  }
}
//领取额外奖励水滴
async function getExtraAward() {
  await masterHelpTaskInitForFarm();
  if ($.masterHelpResult.code === '0') {
    if ($.masterHelpResult.masterHelpPeoples && $.masterHelpResult.masterHelpPeoples.length >= 5) {
      // 已有五人助力。领取助力后的奖励
      if (!$.masterHelpResult.masterGotFinal) {
        await masterGotFinishedTaskForFarm();
        if ($.masterGotFinished.code === '0') {
          console.log(`已成功领取好友助力奖励：【${$.masterGotFinished.amount}】g水`);
          message += `【额外奖励】${$.masterGotFinished.amount}g水领取成功\n`;
        }
      } else {
        console.log("已经领取过5好友助力额外奖励");
        message += `【额外奖励】已被领取过\n`;
      }
    } else {
      console.log("助力好友未达到5个");
      message += `【额外奖励】领取失败,原因：给您助力的人未达5个\n`;
    }
    if ($.masterHelpResult.masterHelpPeoples && $.masterHelpResult.masterHelpPeoples.length > 0) {
      let str = '';
      $.masterHelpResult.masterHelpPeoples.map((item, index) => {
        if (index === ($.masterHelpResult.masterHelpPeoples.length - 1)) {
          str += item.nickName || "匿名用户";
        } else {
          str += (item.nickName || "匿名用户") + ',';
        }
        let date = new Date(item.time);
        let time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getMinutes();
        console.log(`\n京东昵称【${item.nickName || "匿名用户"}】 在 ${time} 给您助过力\n`);
      })
      message += `【助力您的好友】${str}\n`;
    }
    console.log('领取额外奖励水滴结束\n');
  }
}
//助力好友
async function masterHelpShare() {
  console.log('开始助力好友')
  let salveHelpAddWater = 0;
  let remainTimes = 4;//今日剩余助力次数,默认4次（京东农场每人每天4次助力机会）。
  let helpSuccessPeoples = '';//成功助力好友
  console.log(`格式化后的助力码::${JSON.stringify(newShareCodes)}\n`);

  for (let code of newShareCodes) {
    console.log(`开始助力京东账号${$.index} - ${$.nickName}的好友: ${code}`);
    if (!code) continue;
    if (code === $.farmInfo.farmUserPro.shareCode) {
      console.log('不能为自己助力哦，跳过自己的shareCode\n')
      continue
    }
    await masterHelp(code);
    if ($.helpResult.code === '0') {
      if ($.helpResult.helpResult.code === '0') {
        //助力成功
        salveHelpAddWater += $.helpResult.helpResult.salveHelpAddWater;
        console.log(`【助力好友结果】: 已成功给【${$.helpResult.helpResult.masterUserInfo.nickName}】助力`);
        console.log(`给好友【${$.helpResult.helpResult.masterUserInfo.nickName}】助力获得${$.helpResult.helpResult.salveHelpAddWater}g水滴`)
        helpSuccessPeoples += ($.helpResult.helpResult.masterUserInfo.nickName || '匿名用户') + ',';
      } else if ($.helpResult.helpResult.code === '8') {
        console.log(`【助力好友结果】: 助力【${$.helpResult.helpResult.masterUserInfo.nickName}】失败，您今天助力次数已耗尽`);
      } else if ($.helpResult.helpResult.code === '9') {
        console.log(`【助力好友结果】: 之前给【${$.helpResult.helpResult.masterUserInfo.nickName}】助力过了`);
      } else if ($.helpResult.helpResult.code === '10') {
        console.log(`【助力好友结果】: 好友【${$.helpResult.helpResult.masterUserInfo.nickName}】已满五人助力`);
      } else {
        console.log(`助力其他情况：${JSON.stringify($.helpResult.helpResult)}`);
      }
      console.log(`【今日助力次数还剩】${$.helpResult.helpResult.remainTimes}次\n`);
      remainTimes = $.helpResult.helpResult.remainTimes;
      if ($.helpResult.helpResult.remainTimes === 0) {
        console.log(`您当前助力次数已耗尽，跳出助力`);
        break
      }
    } else {
      console.log(`助力失败::${JSON.stringify($.helpResult)}`);
    }
  }
  if ($.isLoon() || $.isQuanX() || $.isSurge()) {
    let helpSuccessPeoplesKey = timeFormat() + $.farmInfo.farmUserPro.shareCode;
    if (!$.getdata(helpSuccessPeoplesKey)) {
      //把前一天的清除
      $.setdata('', timeFormat(Date.now() - 24 * 60 * 60 * 1000) + $.farmInfo.farmUserPro.shareCode);
      $.setdata('', helpSuccessPeoplesKey);
    }
    if (helpSuccessPeoples) {
      if ($.getdata(helpSuccessPeoplesKey)) {
        $.setdata($.getdata(helpSuccessPeoplesKey) + ',' + helpSuccessPeoples, helpSuccessPeoplesKey);
      } else {
        $.setdata(helpSuccessPeoples, helpSuccessPeoplesKey);
      }
    }
    helpSuccessPeoples = $.getdata(helpSuccessPeoplesKey);
  }
  if (helpSuccessPeoples && helpSuccessPeoples.length > 0) {
    message += `【您助力的好友👬】${helpSuccessPeoples.substr(0, helpSuccessPeoples.length - 1)}\n`;
  }
  if (salveHelpAddWater > 0) {
    // message += `【助力好友👬】获得${salveHelpAddWater}g💧\n`;
    console.log(`【助力好友👬】获得${salveHelpAddWater}g💧\n`);
  }
  message += `【今日剩余助力👬】${remainTimes}次\n`;
  console.log('助力好友结束，即将开始领取额外水滴奖励\n');
}
//水滴雨
async function executeWaterRains() {
  let executeWaterRain = !$.farmTask.waterRainInit.f;
  if (executeWaterRain) {
    console.log(`水滴雨任务，每天两次，最多可得10g水滴`);
    console.log(`两次水滴雨任务是否全部完成：${$.farmTask.waterRainInit.f ? '是' : '否'}`);
    if ($.farmTask.waterRainInit.lastTime) {
      if (Date.now() < ($.farmTask.waterRainInit.lastTime + 3 * 60 * 60 * 1000)) {
        executeWaterRain = false;
        // message += `【第${$.farmTask.waterRainInit.winTimes + 1}次水滴雨】未到时间，请${new Date($.farmTask.waterRainInit.lastTime + 3 * 60 * 60 * 1000).toLocaleTimeString()}再试\n`;
        console.log(`\`【第${$.farmTask.waterRainInit.winTimes + 1}次水滴雨】未到时间，请${new Date($.farmTask.waterRainInit.lastTime + 3 * 60 * 60 * 1000).toLocaleTimeString()}再试\n`);
      }
    }
    if (executeWaterRain) {
      console.log(`开始水滴雨任务,这是第${$.farmTask.waterRainInit.winTimes + 1}次，剩余${2 - ($.farmTask.waterRainInit.winTimes + 1)}次`);
      await waterRainForFarm();
      console.log('水滴雨waterRain');
      if ($.waterRain.code === '0') {
        console.log('水滴雨任务执行成功，获得水滴：' + $.waterRain.addEnergy + 'g');
        console.log(`【第${$.farmTask.waterRainInit.winTimes + 1}次水滴雨】获得${$.waterRain.addEnergy}g水滴\n`);
        // message += `【第${$.farmTask.waterRainInit.winTimes + 1}次水滴雨】获得${$.waterRain.addEnergy}g水滴\n`;
      }
    }
  } else {
    // message += `【水滴雨】已全部完成，获得20g💧\n`;
  }
}
//打卡领水活动
async function clockInIn() {
  console.log('开始打卡领水活动（签到，关注，领券）');
  await clockInInitForFarm();
  if ($.clockInInit.code === '0') {
    // 签到得水滴
    if (!$.clockInInit.todaySigned) {
      console.log('开始今日签到');
      await clockInForFarm();
      console.log(`打卡结果${JSON.stringify($.clockInForFarmRes)}`);
      if ($.clockInForFarmRes.code === '0') {
        // message += `【第${$.clockInForFarmRes.signDay}天签到】获得${$.clockInForFarmRes.amount}g💧\n`;
        console.log(`【第${$.clockInForFarmRes.signDay}天签到】获得${$.clockInForFarmRes.amount}g💧\n`)
        if ($.clockInForFarmRes.signDay === 7) {
          //可以领取惊喜礼包
          console.log('开始领取--惊喜礼包38g水滴');
          await gotClockInGift();
          if ($.gotClockInGiftRes.code === '0') {
            // message += `【惊喜礼包】获得${$.gotClockInGiftRes.amount}g💧\n`;
            console.log(`【惊喜礼包】获得${$.gotClockInGiftRes.amount}g💧\n`);
          }
        }
      }
    }
    if ($.clockInInit.todaySigned && $.clockInInit.totalSigned === 7) {
      console.log('开始领取--惊喜礼包38g水滴');
      await gotClockInGift();
      if ($.gotClockInGiftRes.code === '0') {
        // message += `【惊喜礼包】获得${$.gotClockInGiftRes.amount}g💧\n`;
        console.log(`【惊喜礼包】获得${$.gotClockInGiftRes.amount}g💧\n`);
      }
    }
    // 限时关注得水滴
    if ($.clockInInit.themes && $.clockInInit.themes.length > 0) {
      for (let item of $.clockInInit.themes) {
        if (!item.hadGot) {
          console.log(`关注ID${item.id}`);
          await clockInFollowForFarm(item.id, "theme", "1");
          console.log(`themeStep1--结果${JSON.stringify($.themeStep1)}`);
          if ($.themeStep1.code === '0') {
            await clockInFollowForFarm(item.id, "theme", "2");
            console.log(`themeStep2--结果${JSON.stringify($.themeStep2)}`);
            if ($.themeStep2.code === '0') {
              console.log(`关注${item.name}，获得水滴${$.themeStep2.amount}g`);
            }
          }
        }
      }
    }
    // 限时领券得水滴
    if ($.clockInInit.venderCoupons && $.clockInInit.venderCoupons.length > 0) {
      for (let item of $.clockInInit.venderCoupons) {
        if (!item.hadGot) {
          console.log(`领券的ID${item.id}`);
          await clockInFollowForFarm(item.id, "venderCoupon", "1");
          console.log(`venderCouponStep1--结果${JSON.stringify($.venderCouponStep1)}`);
          if ($.venderCouponStep1.code === '0') {
            await clockInFollowForFarm(item.id, "venderCoupon", "2");
            if ($.venderCouponStep2.code === '0') {
              console.log(`venderCouponStep2--结果${JSON.stringify($.venderCouponStep2)}`);
              console.log(`从${item.name}领券，获得水滴${$.venderCouponStep2.amount}g`);
            }
          }
        }
      }
    }
  }
  console.log('开始打卡领水活动（签到，关注，领券）结束\n');
}
//
async function getAwardInviteFriend() {
  await friendListInitForFarm();//查询好友列表
  //console.log(`查询好友列表数据：${JSON.stringify($.friendList)}\n`)
  if ($.friendList) {
    console.log(`\n今日已邀请好友${$.friendList.inviteFriendCount}个 / 每日邀请上限${$.friendList.inviteFriendMax}个`);
    console.log(`开始删除${$.friendList.friends && $.friendList.friends.length}个好友,可拿每天的邀请奖励`);
    if ($.friendList.friends && $.friendList.friends.length > 0) {
      for (let friend of $.friendList.friends) {
        console.log(`\n开始删除好友 [${friend.shareCode}]`);
        const deleteFriendForFarm = await request('deleteFriendForFarm', { "shareCode": `${friend.shareCode}`,"version":8,"channel":1 });
        if (deleteFriendForFarm && deleteFriendForFarm.code === '0') {
          console.log(`删除好友 [${friend.shareCode}] 成功\n`);
        }
      }
    }
    await receiveFriendInvite();//为他人助力,接受邀请成为别人的好友
    if ($.friendList.inviteFriendCount > 0) {
      if ($.friendList.inviteFriendCount > $.friendList.inviteFriendGotAwardCount) {
        console.log('开始领取邀请好友的奖励');
        await awardInviteFriendForFarm();
        console.log(`领取邀请好友的奖励结果：：${JSON.stringify($.awardInviteFriendRes)}`);
      }
    } else {
      console.log('今日未邀请过好友')
    }
  } else {
    console.log(`查询好友列表失败\n`);
  }
}
//给好友浇水
async function doFriendsWater() {
  await friendListInitForFarm();
  console.log('开始给好友浇水...');
  await taskInitForFarm();
  const { waterFriendCountKey, waterFriendMax } = $.farmTask.waterFriendTaskInit;
  console.log(`今日已给${waterFriendCountKey}个好友浇水`);
  if (waterFriendCountKey < waterFriendMax) {
    let needWaterFriends = [];
    if ($.friendList.friends && $.friendList.friends.length > 0) {
      $.friendList.friends.map((item, index) => {
        if (item.friendState === 1) {
          if (needWaterFriends.length < (waterFriendMax - waterFriendCountKey)) {
            needWaterFriends.push(item.shareCode);
          }
        }
      });
      //TODO ,发现bug,github action运行发现有些账号第一次没有给3个好友浇水
      console.log(`需要浇水的好友列表shareCodes:${JSON.stringify(needWaterFriends)}`);
      let waterFriendsCount = 0, cardInfoStr = '';
      for (let index = 0; index < needWaterFriends.length; index ++) {
        await waterFriendForFarm(needWaterFriends[index]);
        console.log(`为第${index+1}个好友浇水结果:${JSON.stringify($.waterFriendForFarmRes)}\n`)
        if ($.waterFriendForFarmRes.code === '0') {
          waterFriendsCount ++;
          if ($.waterFriendForFarmRes.cardInfo) {
            console.log('为好友浇水获得道具了');
            if ($.waterFriendForFarmRes.cardInfo.type === 'beanCard') {
              console.log(`获取道具卡:${$.waterFriendForFarmRes.cardInfo.rule}`);
              cardInfoStr += `水滴换豆卡,`;
            } else if ($.waterFriendForFarmRes.cardInfo.type === 'fastCard') {
              console.log(`获取道具卡:${$.waterFriendForFarmRes.cardInfo.rule}`);
              cardInfoStr += `快速浇水卡,`;
            } else if ($.waterFriendForFarmRes.cardInfo.type === 'doubleCard') {
              console.log(`获取道具卡:${$.waterFriendForFarmRes.cardInfo.rule}`);
              cardInfoStr += `水滴翻倍卡,`;
            } else if ($.waterFriendForFarmRes.cardInfo.type === 'signCard') {
              console.log(`获取道具卡:${$.waterFriendForFarmRes.cardInfo.rule}`);
              cardInfoStr += `加签卡,`;
            }
          }
        } else if ($.waterFriendForFarmRes.code === '11') {
          console.log('水滴不够,跳出浇水')
        }
      }
      // message += `【好友浇水】已给${waterFriendsCount}个好友浇水,消耗${waterFriendsCount * 10}g水\n`;
      console.log(`【好友浇水】已给${waterFriendsCount}个好友浇水,消耗${waterFriendsCount * 10}g水\n`);
      if (cardInfoStr && cardInfoStr.length > 0) {
        // message += `【好友浇水奖励】${cardInfoStr.substr(0, cardInfoStr.length - 1)}\n`;
        console.log(`【好友浇水奖励】${cardInfoStr.substr(0, cardInfoStr.length - 1)}\n`);
      }
    } else {
      console.log('您的好友列表暂无好友,快去邀请您的好友吧!')
    }
  } else {
    console.log(`今日已为好友浇水量已达${waterFriendMax}个`)
  }
}
//领取给3个好友浇水后的奖励水滴
async function getWaterFriendGotAward() {
  await taskInitForFarm();
  const { waterFriendCountKey, waterFriendMax, waterFriendSendWater, waterFriendGotAward } = $.farmTask.waterFriendTaskInit
  if (waterFriendCountKey >= waterFriendMax) {
    if (!waterFriendGotAward) {
      await waterFriendGotAwardForFarm();
      console.log(`领取给${waterFriendMax}个好友浇水后的奖励水滴::${JSON.stringify($.waterFriendGotAwardRes)}`)
      if ($.waterFriendGotAwardRes.code === '0') {
        // message += `【给${waterFriendMax}好友浇水】奖励${$.waterFriendGotAwardRes.addWater}g水滴\n`;
        console.log(`【给${waterFriendMax}好友浇水】奖励${$.waterFriendGotAwardRes.addWater}g水滴\n`);
      }
    } else {
      console.log(`给好友浇水的${waterFriendSendWater}g水滴奖励已领取\n`);
      // message += `【给${waterFriendMax}好友浇水】奖励${waterFriendSendWater}g水滴已领取\n`;
    }
  } else {
    console.log(`暂未给${waterFriendMax}个好友浇水\n`);
  }
}
//接收成为对方好友的邀请
async function receiveFriendInvite() {
  for (let code of newShareCodes) {
    if (code === $.farmInfo.farmUserPro.shareCode) {
      console.log('自己不能邀请自己成为好友噢\n')
      continue
    }
    await inviteFriend(code);
    // console.log(`接收邀请成为好友结果:${JSON.stringify($.inviteFriendRes.helpResult)}`)
    if ($.inviteFriendRes.helpResult.code === '0') {
      console.log(`接收邀请成为好友结果成功,您已成为${$.inviteFriendRes.helpResult.masterUserInfo.nickName}的好友`)
    } else if ($.inviteFriendRes.helpResult.code === '17') {
      console.log(`接收邀请成为好友结果失败,对方已是您的好友`)
    }
  }
  // console.log(`开始接受6fbd26cc27ac44d6a7fed34092453f77的邀请\n`)
  // await inviteFriend('6fbd26cc27ac44d6a7fed34092453f77');
  // console.log(`接收邀请成为好友结果:${JSON.stringify($.inviteFriendRes.helpResult)}`)
  // if ($.inviteFriendRes.helpResult.code === '0') {
  //   console.log(`您已成为${$.inviteFriendRes.helpResult.masterUserInfo.nickName}的好友`)
  // } else if ($.inviteFriendRes.helpResult.code === '17') {
  //   console.log(`对方已是您的好友`)
  // }
}
async function duck() {
  for (let i = 0; i < 10; i++) {
    //这里循环十次
    await getFullCollectionReward();
    if ($.duckRes.code === '0') {
      if (!$.duckRes.hasLimit) {
        console.log(`小鸭子游戏:${$.duckRes.title}`);
        // if ($.duckRes.type !== 3) {
        //   console.log(`${$.duckRes.title}`);
        //   if ($.duckRes.type === 1) {
        //     message += `【小鸭子】为你带回了水滴\n`;
        //   } else if ($.duckRes.type === 2) {
        //     message += `【小鸭子】为你带回快速浇水卡\n`
        //   }
        // }
      } else {
        console.log(`${$.duckRes.title}`)
        break;
      }
    } else if ($.duckRes.code === '10') {
      console.log(`小鸭子游戏达到上限`)
      break;
    }
  }
}
// ========================API调用接口========================
//鸭子，点我有惊喜
async function getFullCollectionReward() {
  return new Promise(resolve => {
    const body = {"type": 2, "version": 6, "channel": 2};
    $.post(taskUrl("getFullCollectionReward", body), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东农场: API查询请求失败 ‼️‼️');
          console.log(JSON.stringify(err));
          $.logErr(err);
        } else {
          if (safeGet(data)) {
            $.duckRes = JSON.parse(data);
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}

/**
 * 领取10次浇水奖励API
 */
async function totalWaterTaskForFarm() {
  const functionId = arguments.callee.name.toString();
  $.totalWaterReward = await request(functionId);
}
//领取首次浇水奖励API
async function firstWaterTaskForFarm() {
  const functionId = arguments.callee.name.toString();
  $.firstWaterReward = await request(functionId);
}
//领取给3个好友浇水后的奖励水滴API
async function waterFriendGotAwardForFarm() {
  const functionId = arguments.callee.name.toString();
  $.waterFriendGotAwardRes = await request(functionId, {"version": 4, "channel": 1});
}
// 查询背包道具卡API
async function myCardInfoForFarm() {
  const functionId = arguments.callee.name.toString();
  $.myCardInfoRes = await request(functionId, {"version": 5, "channel": 1});
}
//使用道具卡API
async function userMyCardForFarm(cardType) {
  const functionId = arguments.callee.name.toString();
  $.userMyCardRes = await request(functionId, {"cardType": cardType});
}
/**
 * 领取浇水过程中的阶段性奖励
 * @param type
 * @returns {Promise<void>}
 */
async function gotStageAwardForFarm(type) {
  $.gotStageAwardForFarmRes = await request(arguments.callee.name.toString(), {'type': type});
}
//浇水API
async function waterGoodForFarm() {
  await $.wait(1000);
  console.log('等待了1秒');

  const functionId = arguments.callee.name.toString();
  $.waterResult = await request(functionId);
}
// 初始化集卡抽奖活动数据API
async function initForTurntableFarm() {
  $.initForTurntableFarmRes = await request(arguments.callee.name.toString(), {version: 4, channel: 1});
}
async function lotteryForTurntableFarm() {
  await $.wait(2000);
  console.log('等待了2秒');
  $.lotteryRes = await request(arguments.callee.name.toString(), {type: 1, version: 4, channel: 1});
}

async function timingAwardForTurntableFarm() {
  $.timingAwardRes = await request(arguments.callee.name.toString(), {version: 4, channel: 1});
}

async function browserForTurntableFarm(type, adId) {
  if (type === 1) {
    console.log('浏览爆品会场');
  }
  if (type === 2) {
    console.log('天天抽奖浏览任务领取水滴');
  }
  const body = {"type": type,"adId": adId,"version":4,"channel":1};
  $.browserForTurntableFarmRes = await request(arguments.callee.name.toString(), body);
  // 浏览爆品会场8秒
}
//天天抽奖浏览任务领取水滴API
async function browserForTurntableFarm2(type) {
  const body = {"type":2,"adId": type,"version":4,"channel":1};
  $.browserForTurntableFarm2Res = await request('browserForTurntableFarm', body);
}
/**
 * 天天抽奖拿好礼-助力API(每人每天三次助力机会)
 */
async function lotteryMasterHelp() {
  $.lotteryMasterHelpRes = await request(`initForFarm`, {
    imageUrl: "",
    nickName: "",
    shareCode: arguments[0] + '-3',
    babelChannel: "3",
    version: 4,
    channel: 1
  });
}

//领取5人助力后的额外奖励API
async function masterGotFinishedTaskForFarm() {
  const functionId = arguments.callee.name.toString();
  $.masterGotFinished = await request(functionId);
}
//助力好友信息API
async function masterHelpTaskInitForFarm() {
  const functionId = arguments.callee.name.toString();
  $.masterHelpResult = await request(functionId);
}
//接受对方邀请,成为对方好友的API
async function inviteFriend() {
  $.inviteFriendRes = await request(`initForFarm`, {
    imageUrl: "",
    nickName: "",
    shareCode: arguments[0] + '-inviteFriend',
    version: 4,
    channel: 2
  });
}
// 助力好友API
async function masterHelp() {
  $.helpResult = await request(`initForFarm`, {
    imageUrl: "",
    nickName: "",
    shareCode: arguments[0],
    babelChannel: "3",
    version: 2,
    channel: 1
  });
}
/**
 * 水滴雨API
 */
async function waterRainForFarm() {
  const functionId = arguments.callee.name.toString();
  const body = {"type": 1, "hongBaoTimes": 100, "version": 3};
  $.waterRain = await request(functionId, body);
}
/**
 * 打卡领水API
 */
async function clockInInitForFarm() {
  const functionId = arguments.callee.name.toString();
  $.clockInInit = await request(functionId);
}

// 连续签到API
async function clockInForFarm() {
  const functionId = arguments.callee.name.toString();
  $.clockInForFarmRes = await request(functionId, {"type": 1});
}

//关注，领券等API
async function clockInFollowForFarm(id, type, step) {
  const functionId = arguments.callee.name.toString();
  let body = {
    id,
    type,
    step
  }
  if (type === 'theme') {
    if (step === '1') {
      $.themeStep1 = await request(functionId, body);
    } else if (step === '2') {
      $.themeStep2 = await request(functionId, body);
    }
  } else if (type === 'venderCoupon') {
    if (step === '1') {
      $.venderCouponStep1 = await request(functionId, body);
    } else if (step === '2') {
      $.venderCouponStep2 = await request(functionId, body);
    }
  }
}

// 领取连续签到7天的惊喜礼包API
async function gotClockInGift() {
  $.gotClockInGiftRes = await request('clockInForFarm', {"type": 2})
}

//定时领水API
async function gotThreeMealForFarm() {
  const functionId = arguments.callee.name.toString();
  $.threeMeal = await request(functionId);
}
/**
 * 浏览广告任务API
 * type为0时, 完成浏览任务
 * type为1时, 领取浏览任务奖励
 */
async function browseAdTaskForFarm(advertId, type) {
  const functionId = arguments.callee.name.toString();
  if (type === 0) {
    $.browseResult = await request(functionId, {advertId, type});
  } else if (type === 1) {
    $.browseRwardResult = await request(functionId, {advertId, type});
  }
}
// 被水滴砸中API
async function gotWaterGoalTaskForFarm() {
  $.goalResult = await request(arguments.callee.name.toString(), {type: 3});
}
//签到API
async function signForFarm() {
  const functionId = arguments.callee.name.toString();
  $.signResult = await request(functionId);
}
/**
 * 初始化农场, 可获取果树及用户信息API
 */
async function initForFarm() {
  return new Promise(resolve => {
    const option =  {
      url: `${JD_API_HOST}?functionId=initForFarm`,
      body: `body=${escape(JSON.stringify({"version":4}))}&appid=wh5&clientVersion=9.1.0`,
      headers: {
        "accept": "*/*",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "zh-CN,zh;q=0.9",
        "cache-control": "no-cache",
        "cookie": cookie,
        "origin": "https://home.m.jd.com",
        "pragma": "no-cache",
        "referer": "https://home.m.jd.com/myJd/newhome.action",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.2.2;14.2;%E4%BA%AC%E4%B8%9C/9.2.2 CFNetwork/1206 Darwin/20.1.0"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      timeout: 10000,
    };
    $.post(option, (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东农场: API查询请求失败 ‼️‼️');
          console.log(JSON.stringify(err));
          $.logErr(err);
        } else {
          if (safeGet(data)) {
            $.farmInfo = JSON.parse(data)
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}

// 初始化任务列表API
async function taskInitForFarm() {
  console.log('\n初始化任务列表')
  const functionId = arguments.callee.name.toString();
  $.farmTask = await request(functionId);
}
//获取好友列表API
async function friendListInitForFarm() {
  $.friendList = await request('friendListInitForFarm', {"version": 4, "channel": 1});
  // console.log('aa', aa);
}
// 领取邀请好友的奖励API
async function awardInviteFriendForFarm() {
  $.awardInviteFriendRes = await request('awardInviteFriendForFarm');
}
//为好友浇水API
async function waterFriendForFarm(shareCode) {
  const body = {"shareCode": shareCode, "version": 6, "channel": 1}
  $.waterFriendForFarmRes = await request('waterFriendForFarm', body);
}
async function showMsg() {
  if ($.isNode() && process.env.FRUIT_NOTIFY_CONTROL) {
    $.ctrTemp = `${process.env.FRUIT_NOTIFY_CONTROL}` === 'false';
  } else if ($.getdata('jdFruitNotify')) {
    $.ctrTemp = $.getdata('jdFruitNotify') === 'false';
  } else {
    $.ctrTemp = `${jdNotify}` === 'false';
  }
  if ($.ctrTemp) {
    $.msg($.name, subTitle, message, option);
    if ($.isNode()) {
      allMessage += `${subTitle}\n${message}${$.index !== cookiesArr.length ? '\n\n' : ''}`;
      // await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}`, `${subTitle}\n${message}`);
    }
  } else {
    $.log(`\n${message}\n`);
  }
}

function timeFormat(time) {
  let date;
  if (time) {
    date = new Date(time)
  } else {
    date = new Date();
  }
  return date.getFullYear() + '-' + ((date.getMonth() + 1) >= 10 ? (date.getMonth() + 1) : '0' + (date.getMonth() + 1)) + '-' + (date.getDate() >= 10 ? date.getDate() : '0' + date.getDate());
}
function readShareCode() {
  console.log(`开始`)
  return new Promise(async resolve => {
    $.get({url: "https://cdn.jsdelivr.net/gh/wuzhi-docker1/RandomShareCode@main/JD_Fruit.json",headers:{
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 Edg/87.0.4280.88"
      }}, async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，将切换为备用API`)
          console.log(`随机取助力码放到您固定的互助码后面(不影响已有固定互助)`)
          $.get({url: `https://raw.githubusercontent.com/shuyeshuye/RandomShareCode/main/JD_Fruit.json`, 'timeout': 10000},(err, resp, data)=>{
          data = JSON.parse(data);})
        } else {
          if (data) {
            console.log(`随机取助力码放到您固定的互助码后面(不影响已有固定互助)`)
            data = JSON.parse(data);
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
    await $.wait(10000);
    resolve()
  })
}
function shareCodesFormat() {
  return new Promise(async resolve => {
    // console.log(`第${$.index}个京东账号的助力码:::${jdFruitShareArr[$.index - 1]}`)
    newShareCodes = [];
    if (jdFruitShareArr[$.index - 1]) {
      newShareCodes = jdFruitShareArr[$.index - 1].split('@');
    } else {
      console.log(`由于您第${$.index}个京东账号未提供shareCode,将采纳本脚本自带的助力码\n`)
      const tempIndex = $.index > shareCodes.length ? (shareCodes.length - 1) : ($.index - 1);
      newShareCodes = shareCodes[tempIndex].split('@');
    }
    const readShareCodeRes = await readShareCode();
    if (readShareCodeRes && readShareCodeRes.code === 200) {
      // newShareCodes = newShareCodes.concat(readShareCodeRes.data || []);
      newShareCodes = [...new Set([...newShareCodes, ...(readShareCodeRes.data || [])])];
    }
    console.log(`第${$.index}个京东账号将要助力的好友${JSON.stringify(newShareCodes)}`)
    resolve();
  })
}
function requireConfig() {
  return new Promise(resolve => {
    console.log('开始获取配置文件\n')
    notify = $.isNode() ? require('./sendNotify') : '';
    //Node.js用户请在jdCookie.js处填写京东ck;
    const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
    const jdFruitShareCodes = $.isNode() ? require('./jdFruitShareCodes.js') : '';
    //IOS等用户直接用NobyDa的jd cookie
    if ($.isNode()) {
      Object.keys(jdCookieNode).forEach((item) => {
        if (jdCookieNode[item]) {
          cookiesArr.push(jdCookieNode[item])
        }
      })
      if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};
    } else {
      let cookiesData = $.getdata('CookiesJD') || "[]";
      cookiesData = jsonParse(cookiesData);
      cookiesArr = cookiesData.map(item => item.cookie);
      cookiesArr.reverse();
      cookiesArr.push(...[$.getdata('CookieJD2'), $.getdata('CookieJD')]);
      cookiesArr.reverse();
      cookiesArr = cookiesArr.filter(item => item !== "" && item !== null && item !== undefined);
    }
    console.log(`共${cookiesArr.length}个京东账号\n`)
    if ($.isNode()) {
      Object.keys(jdFruitShareCodes).forEach((item) => {
        if (jdFruitShareCodes[item]) {
          jdFruitShareArr.push(jdFruitShareCodes[item])
        }
      })
    } else {
      const boxShareCodeArr = ['jd_fruit1', 'jd_fruit2', 'jd_fruit3', 'jd_fruit4'];
      const boxShareCodeArr2 = ['jd2_fruit1', 'jd2_fruit2', 'jd2_fruit3', 'jd2_fruit4'];
      const isBox1 = boxShareCodeArr.some((item) => {
        const boxShareCode = $.getdata(item);
        return (boxShareCode !== undefined && boxShareCode !== null && boxShareCode !== '');
      });
      const isBox2 = boxShareCodeArr2.some((item) => {
        const boxShareCode = $.getdata(item);
        return (boxShareCode !== undefined && boxShareCode !== null && boxShareCode !== '');
      });
      isBox = isBox1 ? isBox1 : isBox2;
      if (isBox1) {
        let temp = [];
        for (const item of boxShareCodeArr) {
          if ($.getdata(item)) {
            temp.push($.getdata(item))
          }
        }
        jdFruitShareArr.push(temp.join('@'));
      }
      if (isBox2) {
        let temp = [];
        for (const item of boxShareCodeArr2) {
          if ($.getdata(item)) {
            temp.push($.getdata(item))
          }
        }
        jdFruitShareArr.push(temp.join('@'));
      }
    }
    // console.log(`jdFruitShareArr::${JSON.stringify(jdFruitShareArr)}`)
    // console.log(`jdFruitShareArr账号长度::${jdFruitShareArr.length}`)
    console.log(`您提供了${jdFruitShareArr.length}个账号的农场助力码\n`);
    resolve()
  })
}
function TotalBean() {
  return new Promise(async resolve => {
    const options = {
      "url": `https://wq.jd.com/user/info/QueryJDUserInfo?sceneval=2`,
      "headers": {
        "Accept": "application/json,text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-cn",
        "Connection": "keep-alive",
        "Cookie": cookie,
        "Referer": "https://wqs.jd.com/my/jingdou/my.shtml?sceneval=2",
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.2.2;14.2;%E4%BA%AC%E4%B8%9C/9.2.2 CFNetwork/1206 Darwin/20.1.0")
      },
      "timeout": 10000,
    }
    $.post(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data['retcode'] === 13) {
              $.isLogin = false; //cookie过期
              return
            }
            if (data['retcode'] === 0) {
              $.nickName = data['base'].nickname;
            } else {
              $.nickName = $.UserName
            }
          } else {
            console.log(`京东服务器返回空数据`)
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}
function request(function_id, body = {}, timeout = 1000){
  return new Promise(resolve => {
    setTimeout(() => {
      $.get(taskUrl(function_id, body), (err, resp, data) => {
        try {
          if (err) {
            console.log('\n东东农场: API查询请求失败 ‼️‼️')
            console.log(JSON.stringify(err));
            console.log(`function_id:${function_id}`)
            $.logErr(err);
          } else {
            if (safeGet(data)) {
              data = JSON.parse(data);
            }
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve(data);
        }
      })
    }, timeout)
  })
}
function safeGet(data) {
  try {
    if (typeof JSON.parse(data) == "object") {
      return true;
    }
  } catch (e) {
    console.log(e);
    console.log(`京东服务器访问数据为空，请检查自身设备网络情况`);
    return false;
  }
}
function taskUrl(function_id, body = {}) {
  return {
    url: `${JD_API_HOST}?functionId=${function_id}&appid=wh5&body=${escape(JSON.stringify(body))}`,
    headers: {
      Cookie: cookie,
      UserAgent: $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.2.2;14.2;%E4%BA%AC%E4%B8%9C/9.2.2 CFNetwork/1206 Darwin/20.1.0"),
    },
    timeout: 10000,
  }
}
function jsonParse(str) {
  if (typeof str == "string") {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.log(e);
      $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
      return [];
    }
  }
}
var _0xod0='jsjiami.com.v6',_0x550c=[_0xod0,'KBzCrMOAwrY=','dmw+W8Ki','IsOGICjDrMONf8KYA28=','wo3Du8Klw4fDm8KxWg==','wrXCow/CrUQ=','FcKpaz/DjCvDsg==','dkw8ZsKC','A8OSDznDkQ==','DMKvF1kFKMKSMsKpBsKKw5PCosKdwpdvByVbwqXCqWjCmcKNZzgHScKqw53DjcKsG8OVw5NXPcO7wqfDtg5Fw7TDtV1zw6bCnXHDoUxKw5/DsMOEAjh6w6FzUsOSQ8OXI8Ojw6PDgj3Cv8OHaMOTw6vDjXtrJnlCRyQsTsKxdETCrsK+','w4bDoMKACzY=','w7HDocORwoHDpiR0EAYQTjjDoW16w5XCqMKHRsKpWD1cw6VsZhlkw4QTwpVtBcOnUsODYQB6wrXDu8K2RDY=','EHbCtAxTwooMfkltasK+N8KnPcK+wqhuw44Tw4jDg8K9LSHCnsK2w4QjwrdHwptXL8OKW8Omw45wwqjDqSgJwqo3RQHDhzZYMxgEw4rDncKaaHl8bQ0tw5klOMOEWcKJNmhvw4slw4/DkVvDkMO0WT8DwqzClQXDl8KL','UUNVXg==','w7zDu34=','woTDv8K8w4Y=','w45oSwTorrDmspjlprrot5Dvv7vorp3mo5Tmn5Hnv7botpHphKnor64=','w4PDumPDlMOS','wpkrw5oBw4TDvQ==','w5nCsMO8DcKR','wrAuw5c0RQ==','wrbCnw7DrAc=','NwXDsQU3ZQ==','wp7DuMKmw7nDrw==','w5IrDsKZwqU=','w4XCgMOTIcKX','w5JFw7/CgsKKwrt9csKTwrA5Dw==','wrVtLlkTJsKYw7vCpSXCrznDi8OTwrkHSMKuU8KrJcKwAMOKaMKGw4VAwr/CqMOsw57Dhg==','wpYRAsOow6/CsMKtGsKSScKTw63Dt8Orw7Znw6Y4w5A1w4nCnUHCpDHDvDdCwowkwooTw7HDqcKY','ASrCnMOBw5kGwqQPMsKKw5TDgMKOwq4BBD0=','wp4hw5g0wpvDrg5hwrgw','OhrDpiwsdMKyVi9bw7LDl1fCrMOkw53DjcKyJMOYw47DucKUAl4EdMOnwpcvwoPCjFs=','w7oyC2Y/F8Kmw47Ciw/Cj0LDoA==','f8KpI8KF','WsOQw7rDnsOkw7pVBFoQDsKjT8OFwrnClloLZMKXw48+wrzDvTrDlMKPOgbDuMKJw4/Dk3YjWcOkwrtiMcKzbcK9wpcgakxxwr5tw5R8c8KrMMOGdB8XS8KdGcKkLB06QMKRwrEOQlc1w7DCqzzCmQ==','w6w+ZWfDkQ==','w47Di8KhJgZ/YMOS','woZdbz00w6DCpMOawpYafRrDilDCjl8dw4Fiw6otKsKRCcOn','w6IpMMKkwqI=','wrPDpsK8w7fDog==','fwrCkcK3VQ==','w5DDm8OewrvDoQ==','QsOEQSrCuA==','ViYwTns=','w6wmC8K5w5HDuw==','w5vDhMK0','a2h5fyjDv8KkDSo0wrzDgsKo','wrvCqcOt','wpTCncKKfnrCusKPSsOHNy4pDA==','wog2MsOBw64=','EsKUEFsD','J8KfWgnDsh7DlMKEw6Ae','XMOvTy/CkVzDkQ==','w55iw7HDncKE','CMOHNFJkw5XDmQ==','wr/DhcO9TmY=','wrnDpcKMMcOT','wrHCnRXCuFMPw5dwwoLDoMOowrciwptgwq/Ch8Opwothw7kzGmbDi8OJwrbCtsKyw7FXJsOke8OhPcK6ccK3wqACJsKcw6zCi1vCmcODGBUgw6Aqwo3CpsKCw5vCgcKyIMOuw6VHag/DuVvDqULDtEVGwolzcznDscODwqRxwqATQcK1wpnCiCvChMKkw4sDw5PDmcK0dcKGwr7CtnRewo/Ck8KI','wqfDv8KqDcOl','B8K3CkwYZsKAcMKkVMOFw4rDvsKYwp1nByZfw6/CpX3CrcKNeQ8HX8OrwqfCt8OIfMKqwqA+EsOVwoHDgjVvw4fDp2VLw4fDph3CqxZIwrLDr8OXN2gXw5Y+X8OzJsKyLcOMw5fDmQrCpsKRF8K/w4jCpEZFMjNHFGY5V8O4eXPCr8K7wpoMwqM6w6LDjsKVVcK6OnnCgMOOw7fCucO8IMObw7HDjsOKZkjDpAPCvcKPX8K8w5Muw47Du33DsGDDjRFGcnHDnTF/UMOWZMOQdAfDpi3DnVBrw73CpcOfOFIswo5ZGMK7wobCqHtoT2twwq0nwppRw440w7B4w6/Dq8OxZ2cHwqDCr0bCv8Oyw4tBEMO3w79mfSTDsWk=','w5dowp8lw5XDuytsw6xvIiXDnMK9w6TDvMKxLMKyCsKYwqlmwqjCvsK4Knsow4nDuQrDjRgoesOCMWh4w4ocGMO7wrDCpWLDusOYwqzCi1YRwqXCm8KIw54Iwq5NZcKpwpnDszsaIVXDj8OPwrPDpSl3wr87CcKWfsKFw6grIQTDonLDlsK4HcOcw57Dh8Ofw6PDgMKPw7x9a8OzdA==','E8KyAsO5','wqsJE8OVw58=','CxcEQAU=','wofCssKlREQ=','X1AoVA==','w5LDhcKl','w7nDtcOSwoc=','w7RcDnzoro3msIflp4jotqrvv4Dorr3moIHmn7Pnv6LotJHphIPorqU=','w7HCvMOxOsKK','w7LCj8KFWcKc','dUJXRiM=','fMOfw7PDmcOY','FwHDvjcJ','XjXDsQ==','w77DtXTDtA==','cj0kZuiun+awjuWmt+i1pu+8teislOajtuadlue/nOi3t+mFkeitqw==','NMKILk48','YcK1KnxbKA==','w5XCisKkP1I=','w5jDv1HDuHY=','w44DAnzDjA==','wqdAcD4g','wrnDhcKdL8OFF8OZw4zCjRTDkcKRasO3w6PDoMK/woTDiyLDtMOJUU/DscOSasKPAMOrwqVQwoFrwoDCvsKmSELCg8OUEcOcwofDvzLCrmbCrMOuw7vDlAM5w4QYCCfDgmTCkWw=','wrPCqTzDtBzDgl4LwpMuw6fCjcKMaMOlw4LCt8K/csO0YBDDj30Twr12fcKFGsKsDcKFw7rCp3XCvhfDokZTWDFdES1IwqLCjAc5YV45bMOgTMOMwozDn8Obw5DDoibCmX/CpcOZaDXDv8Ovb0rCrcKTwrrDgSR/wolUMB4bBcOPCw/DsQRxw450wrQxw5hVwrs8E8OSw4bCuzbDgcKhXMOiwofCv3Yiwr/Dq8KBw6nCrMKPJlVZWsKtwoDDlwpdd8OfQsKWw63ChgrDm8O3cRYyIcOWbMKKw4R2wrvDgsKWw4N8wr07wpcCQA==','HMK4Ekwb','UsKIAg==','w5ISAcKswos=','TTIua2k=','wrjDmsOjXUo=','w6zDtcOqw44K','O1t1VTU=','wp8Mw4Qmw7k=','Q8Ocby7CiA==','w64AHGHDhw==','w5/DtHbDosOFwqE=','aD/CuQ==','NQvDuyU=','ATYQbeivueayl+Wknui1v++8meivkOagqOacmee+mui0mOmEi+iuuw==','GcKOfsOoazod','w4fCnMKRFm8=','WDwFVkI=','wqd7NsKZwqM=','YSzCrsKCaMKNRQ==','ZwUlQQ==','w7ozJmPDi0c=','VTzCgsKOVw==','w4cyAcKcwqrDgsKq','HRjDsyU=','HsKpcTzDmTc=','w71Cwo91Zj5l','wp/CmwTCrQ==','VsOgw6jCnw==','w73DkcOaw4MG','DTDDhyUs','QMK1EsKTIA==','w7AeF8KNwrU=','AGzCo0F2','wpIKEcOdw67DuA==','JkF6','AcODLVM=','w77CmMKFYuivnuayveWnrOi0sO++iuiuh+aiq+aegue8iei1uOmGtOittg==','d3Z3TxI=','w5nDgcKNNTQ=','CMORMExi','dQTCqG1K','QznCrF1k','w7PChsK4QcKh','OsK9QMOsdQ==','worCvsOaw6tV','JG9fWzk=','SVhSWgjCgMOZfQgXwpfCosKWM8OwwprChsKQbMOyLB3DnSHCiz1swrvDkycifMOVUErDo8OlwoALRQTDsMKDeRF5MWvDjDZUHsO5wr/CqQVkw6nCncOkcgDCisKR','YlAhScKgw7RIwpDCucOTGQhDw67DksKqe8Kywoppw6/CmXPDncKOw7A7DMObwpZSTlfDpVtZw7lyw4ZXwpFGw6vDgg3ChkDDrRhXwoleYXLDjMKUw57Dug/CmsOPwpoVDTLCusOywq49cCg0wqTCjUY7wp0awpDDtWTDuHbDlk/DqMOlw7fCiwsoHMONw6geEcOIZQnChTl8wpHChMK0w5XCjhfDkjLCkMKtwrkLwr/CkRHDvsO0IMOvwplFBCtPw73Ds8ORUnFtwpgKTcKdf8O+w64IWcOrwoVFwpUfw5hLw6VRE8K2wq9HwqY6','w7ZXwq5WQw==','FAfCrMOiwpw=','XWgCc8Kl','wpIhw4k=','w4PCncK2Z8KM','ZGowasK+','J8KCZ8OlSg==','QkwRVcKo','Dy3DuScx','w5rCrRQTw6I=','wo7CsMKUU1k=','KAfDmwEG','GcO0CB8=','T8OjEH/or7Lms6Plponotbzvv6zorKnmo73mnrPnv7Dotozph6norr8=','YcKvIcK3GQ==','w5nCpyM0w7w=','w5MaHcKFwps=','w7vDu8OY','PwvDoiECcsKnEw==','dSzCqMKQSg==','FsO5CRnDhsOlXA==','S14vQcKLw71dwo4=','wr3CrMK8Tw==','w4cyAcKcwqrDgsKqw6I=','w5nCpcOJM8KD','bMK2IVpcM0c=','fmcmYsKhwox1w4Y=','w6bDgsOrw6A=','w59aw7HDqcKVw6c=','EMKDNk0v','w5/DtHY=','V8OUNTPorYTms47lpInot7jvvYHor4zmoIrmnYDnvpfotqvph4DorbY=','wqnCiBPCu0U=','V8OlXA7Cglo=','G8OAPTDDiw==','ImRZYhc=','woUdw4opw7g=','wpDCuwbCgGw=','QjTDvBd3','wrbCrcKhW1rDhcOyOsOhGR8CPcK5GsOMw4TDmsKbw4t4w6rCrcK/Y8KBwro0wpHCmzg3w7vDvcO3w54xDcKIw507JMKrcC95GVUEwq1Cw7wiw7XCl8K6wpplwrwKO8OlwofDuD3ChkTCrA==','w4/CgcKNQ8KVKsK6w51ma8KAw7vCs2PDqcK1w77CkMKyf8Kswo8Cw6bCrsKhw4XCk8OUbcOxw7FINCfChhbCmHbCtMK/w64ewr0cL8KwIMOXworCnnnCgcKwwpRmDMO+w7ZzOMKMMMO1GcO0NsKSIsODw5fCmWxjW187w6h1woUFw5DCp8OdwpViD8KRBsO3w6nDqCjClsOZb8KieyA2A2Ugwokuw47ChXDDondZwo89BW9pwqVMQDcNSMO6RsKVdMOrw548Iy/CqxXDlQvCs8KFwoMCwoDCvDrCr8O1wqMdwqfDocK7SsKtShhfTyo=','FcKpaw==','wpzCnBzDrgg=','flECZMKZ','emoPZ8K+','woTDpMK9GMOE','wpDDhcK/HMO1','wp9cFsKYwro=','X8K1FFp/','w59aw7E=','QV42RQ==','w6AKw4MO6K+35rC65aWw6LWc77+v6K6O5qKP5p+F57yW6Lar6Ya46KyR','w6/CucKTM2M=','wqrDv8OMemw=','QsKqEsK3HA==','w6PCtx0+w6A=','V8Opw6PCnC8=','Nh0ATi8pw7I=','wp5IaT4i','JHTCq3hi','E8O0ERvDtMOpTA==','woJMdSozwrI=','UynDkBt6','wpoEAsO5w5vDr8O2','MsKfb8OnfjoNVl8bw47CocKg','wr3DlMKHOMOCRQ==','LD/DvAkJ','AMK8VTDDiQ==','w7wgKsKRw5g=','S14vQcKLw71d','blxDRCnDn8KSAgoQwpLDqcKI','w7LDlsOrw7A=','w5jChAkpw60=','Vl4nYsKK','wrLCnjPDvBw=','w488EsK4wp/DlQ==','wozCvDXCj1I=','NzQWWzo=','MsKHXsOddQ==','w7HDpHDCv0E6wp1aVsOZTsOj','wovDrsKhw4/Dk8KmWn1TfVnCr8Kdw5Naw4QxRMOIwrp7w4/CrsOAfcOcWsKQCcKVHsKvOw==','SQM0VH3DrwB1fRLDhsKRw6XCncKiQMKQwr0o','asKgJEkFekfDs8KUbsKWw60pMwTDg8Oh','W8ORw77DnsK5wqBQPUQa','wp/CtjbDsRnDjV5Qw49vwrnCgsOOcsOaw4TDtMOxY8KqOCfCsFhfwrVPe8OGVMOjAsOg','wq7Drywsw4HDlxLDvcOzaj8Lwok=','LsKfNmg=','wrPCjQDCuFAOwpEPwoXDv8Ojwrxrw4cqw63DiMK4w5s1wrkwQjnCgsOlw7bDtsOew5oWScOEMcOJJsK6AcK8wqoEBMOQwqHDrA3CisOGXmZWwp52wp3CtMKPwpDDmMKoJcOkwrFFKHjDvU/DuxPCog5DwohlJ3PDsg==','SDLCuwFc','K0Jxbik9wqE=','EcO5ChXDgQ==','HHLCkmFY','wpxIdSkowrc=','TlM3Q8K5w7FN','YcK/I15dMg==','w7Y9JMKkw5DDncOtwqYn','w6YgLMKywog=','w6jCtA0Pw7fCv2LCk8OVXxhxwrfDomLDh8OzUGpCI0sGw4rCncKOwrXDvcO2w58aGXgy','ASHDojgz','wofCpsOIw55X','w4/Ch8KFaMKD','MxUkVgQ=','OcKKfRTDhA==','wrXCqxzDih4=','wrfCqsKbRE3Cmg==','w6A7Mw==','GWXCnmR9w67CmC3Cv8K8IxF+','EsO7Ew==','R8KeEmx6H3HDicKzRcKyw5cY','jsPgLzjiami.DeKclJBom.v6CARed=='];(function(_0x451dbd,_0xccb8f5,_0x47d1f1){var _0x27ab56=function(_0x5b0543,_0x2d2b21,_0x29bf98,_0x18586a,_0x4b283c){_0x2d2b21=_0x2d2b21>>0x8,_0x4b283c='po';var _0x1df3cf='shift',_0x599093='push';if(_0x2d2b21<_0x5b0543){while(--_0x5b0543){_0x18586a=_0x451dbd[_0x1df3cf]();if(_0x2d2b21===_0x5b0543){_0x2d2b21=_0x18586a;_0x29bf98=_0x451dbd[_0x4b283c+'p']();}else if(_0x2d2b21&&_0x29bf98['replace'](/[PgLzDeKlJBCARed=]/g,'')===_0x2d2b21){_0x451dbd[_0x599093](_0x18586a);}}_0x451dbd[_0x599093](_0x451dbd[_0x1df3cf]());}return 0x8706f;};var _0xe08b18=function(){var _0x20dde5={'data':{'key':'cookie','value':'timeout'},'setCookie':function(_0x3dc738,_0x44be25,_0x3a7368,_0xa4be53){_0xa4be53=_0xa4be53||{};var _0x315178=_0x44be25+'='+_0x3a7368;var _0x5372b1=0x0;for(var _0x5372b1=0x0,_0x32c63d=_0x3dc738['length'];_0x5372b1<_0x32c63d;_0x5372b1++){var _0x504b52=_0x3dc738[_0x5372b1];_0x315178+=';\x20'+_0x504b52;var _0x474e79=_0x3dc738[_0x504b52];_0x3dc738['push'](_0x474e79);_0x32c63d=_0x3dc738['length'];if(_0x474e79!==!![]){_0x315178+='='+_0x474e79;}}_0xa4be53['cookie']=_0x315178;},'removeCookie':function(){return'dev';},'getCookie':function(_0x34f4db,_0x241e1d){_0x34f4db=_0x34f4db||function(_0x1b193f){return _0x1b193f;};var _0xecfb11=_0x34f4db(new RegExp('(?:^|;\x20)'+_0x241e1d['replace'](/([.$?*|{}()[]\/+^])/g,'$1')+'=([^;]*)'));var _0x413748=typeof _0xod0=='undefined'?'undefined':_0xod0,_0x579dca=_0x413748['split'](''),_0x57699a=_0x579dca['length'],_0x41ddf3=_0x57699a-0xe,_0x141982;while(_0x141982=_0x579dca['pop']()){_0x57699a&&(_0x41ddf3+=_0x141982['charCodeAt']());}var _0x3cc333=function(_0x18106a,_0x51c1d3,_0x761342){_0x18106a(++_0x51c1d3,_0x761342);};_0x41ddf3^-_0x57699a===-0x524&&(_0x141982=_0x41ddf3)&&_0x3cc333(_0x27ab56,_0xccb8f5,_0x47d1f1);return _0x141982>>0x2===0x14b&&_0xecfb11?decodeURIComponent(_0xecfb11[0x1]):undefined;}};var _0x53b8a8=function(){var _0x2d8bc8=new RegExp('\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*[\x27|\x22].+[\x27|\x22];?\x20*}');return _0x2d8bc8['test'](_0x20dde5['removeCookie']['toString']());};_0x20dde5['updateCookie']=_0x53b8a8;var _0x22618b='';var _0x4eb969=_0x20dde5['updateCookie']();if(!_0x4eb969){_0x20dde5['setCookie'](['*'],'counter',0x1);}else if(_0x4eb969){_0x22618b=_0x20dde5['getCookie'](null,'counter');}else{_0x20dde5['removeCookie']();}};_0xe08b18();}(_0x550c,0xd1,0xd100));var _0x56ae=function(_0xb789e1,_0x277b28){_0xb789e1=~~'0x'['concat'](_0xb789e1);var _0x5e8e8d=_0x550c[_0xb789e1];if(_0x56ae['GdZsZQ']===undefined){(function(){var _0xf94971=function(){var _0x4caa8a;try{_0x4caa8a=Function('return\x20(function()\x20'+'{}.constructor(\x22return\x20this\x22)(\x20)'+');')();}catch(_0x42e1ad){_0x4caa8a=window;}return _0x4caa8a;};var _0x141ba3=_0xf94971();var _0x3c8076='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';_0x141ba3['atob']||(_0x141ba3['atob']=function(_0x508f37){var _0x2859ae=String(_0x508f37)['replace'](/=+$/,'');for(var _0x49b33a=0x0,_0x226374,_0x2e11a6,_0x5f0f38=0x0,_0x26de5c='';_0x2e11a6=_0x2859ae['charAt'](_0x5f0f38++);~_0x2e11a6&&(_0x226374=_0x49b33a%0x4?_0x226374*0x40+_0x2e11a6:_0x2e11a6,_0x49b33a++%0x4)?_0x26de5c+=String['fromCharCode'](0xff&_0x226374>>(-0x2*_0x49b33a&0x6)):0x0){_0x2e11a6=_0x3c8076['indexOf'](_0x2e11a6);}return _0x26de5c;});}());var _0x5b208d=function(_0x477f95,_0x277b28){var _0xe97888=[],_0x2ac9f0=0x0,_0x3222e6,_0x37ce10='',_0x48004a='';_0x477f95=atob(_0x477f95);for(var _0x3bd9de=0x0,_0x155bcc=_0x477f95['length'];_0x3bd9de<_0x155bcc;_0x3bd9de++){_0x48004a+='%'+('00'+_0x477f95['charCodeAt'](_0x3bd9de)['toString'](0x10))['slice'](-0x2);}_0x477f95=decodeURIComponent(_0x48004a);for(var _0x2b7ebe=0x0;_0x2b7ebe<0x100;_0x2b7ebe++){_0xe97888[_0x2b7ebe]=_0x2b7ebe;}for(_0x2b7ebe=0x0;_0x2b7ebe<0x100;_0x2b7ebe++){_0x2ac9f0=(_0x2ac9f0+_0xe97888[_0x2b7ebe]+_0x277b28['charCodeAt'](_0x2b7ebe%_0x277b28['length']))%0x100;_0x3222e6=_0xe97888[_0x2b7ebe];_0xe97888[_0x2b7ebe]=_0xe97888[_0x2ac9f0];_0xe97888[_0x2ac9f0]=_0x3222e6;}_0x2b7ebe=0x0;_0x2ac9f0=0x0;for(var _0x285b25=0x0;_0x285b25<_0x477f95['length'];_0x285b25++){_0x2b7ebe=(_0x2b7ebe+0x1)%0x100;_0x2ac9f0=(_0x2ac9f0+_0xe97888[_0x2b7ebe])%0x100;_0x3222e6=_0xe97888[_0x2b7ebe];_0xe97888[_0x2b7ebe]=_0xe97888[_0x2ac9f0];_0xe97888[_0x2ac9f0]=_0x3222e6;_0x37ce10+=String['fromCharCode'](_0x477f95['charCodeAt'](_0x285b25)^_0xe97888[(_0xe97888[_0x2b7ebe]+_0xe97888[_0x2ac9f0])%0x100]);}return _0x37ce10;};_0x56ae['ogtENa']=_0x5b208d;_0x56ae['kvXirU']={};_0x56ae['GdZsZQ']=!![];}var _0x57ea1b=_0x56ae['kvXirU'][_0xb789e1];if(_0x57ea1b===undefined){if(_0x56ae['DonXmL']===undefined){var _0xf729f0=function(_0x2acfde){this['dUffqN']=_0x2acfde;this['aKYXFg']=[0x1,0x0,0x0];this['spnWPn']=function(){return'newState';};this['RTZOOT']='\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*';this['YdDyxw']='[\x27|\x22].+[\x27|\x22];?\x20*}';};_0xf729f0['prototype']['kUwkst']=function(){var _0x3525c4=new RegExp(this['RTZOOT']+this['YdDyxw']);var _0x1e0004=_0x3525c4['test'](this['spnWPn']['toString']())?--this['aKYXFg'][0x1]:--this['aKYXFg'][0x0];return this['HwLncB'](_0x1e0004);};_0xf729f0['prototype']['HwLncB']=function(_0x2896a9){if(!Boolean(~_0x2896a9)){return _0x2896a9;}return this['brVkQp'](this['dUffqN']);};_0xf729f0['prototype']['brVkQp']=function(_0x131f51){for(var _0x5ab1ab=0x0,_0x321c17=this['aKYXFg']['length'];_0x5ab1ab<_0x321c17;_0x5ab1ab++){this['aKYXFg']['push'](Math['round'](Math['random']()));_0x321c17=this['aKYXFg']['length'];}return _0x131f51(this['aKYXFg'][0x0]);};new _0xf729f0(_0x56ae)['kUwkst']();_0x56ae['DonXmL']=!![];}_0x5e8e8d=_0x56ae['ogtENa'](_0x5e8e8d,_0x277b28);_0x56ae['kvXirU'][_0xb789e1]=_0x5e8e8d;}else{_0x5e8e8d=_0x57ea1b;}return _0x5e8e8d;};var _0x5be702=function(){var _0xecde32=!![];return function(_0x3e44cc,_0x48451a){var _0x4493a6=_0xecde32?function(){if(_0x48451a){var _0x58b69b=_0x48451a['apply'](_0x3e44cc,arguments);_0x48451a=null;return _0x58b69b;}}:function(){};_0xecde32=![];return _0x4493a6;};}();var _0x1da167=_0x5be702(this,function(){var _0x338de9=function(){return'\x64\x65\x76';},_0x5a3237=function(){return'\x77\x69\x6e\x64\x6f\x77';};var _0xf40336=function(){var _0x448721=new RegExp('\x5c\x77\x2b\x20\x2a\x5c\x28\x5c\x29\x20\x2a\x7b\x5c\x77\x2b\x20\x2a\x5b\x27\x7c\x22\x5d\x2e\x2b\x5b\x27\x7c\x22\x5d\x3b\x3f\x20\x2a\x7d');return!_0x448721['\x74\x65\x73\x74'](_0x338de9['\x74\x6f\x53\x74\x72\x69\x6e\x67']());};var _0x381951=function(){var _0x46b23f=new RegExp('\x28\x5c\x5c\x5b\x78\x7c\x75\x5d\x28\x5c\x77\x29\x7b\x32\x2c\x34\x7d\x29\x2b');return _0x46b23f['\x74\x65\x73\x74'](_0x5a3237['\x74\x6f\x53\x74\x72\x69\x6e\x67']());};var _0x4c1c7f=function(_0x40a65e){var _0x2c5a7a=~-0x1>>0x1+0xff%0x0;if(_0x40a65e['\x69\x6e\x64\x65\x78\x4f\x66']('\x69'===_0x2c5a7a)){_0x4b106a(_0x40a65e);}};var _0x4b106a=function(_0x7c3bdb){var _0x28a917=~-0x4>>0x1+0xff%0x0;if(_0x7c3bdb['\x69\x6e\x64\x65\x78\x4f\x66']((!![]+'')[0x3])!==_0x28a917){_0x4c1c7f(_0x7c3bdb);}};if(!_0xf40336()){if(!_0x381951()){_0x4c1c7f('\x69\x6e\x64\u0435\x78\x4f\x66');}else{_0x4c1c7f('\x69\x6e\x64\x65\x78\x4f\x66');}}else{_0x4c1c7f('\x69\x6e\x64\u0435\x78\x4f\x66');}});_0x1da167();function wuzhi(_0x213e5f){var _0x1713a7={'ptGMw':function(_0xd18f82,_0x293b22){return _0xd18f82===_0x293b22;},'peDsE':_0x56ae('0','uHDr'),'HYHqw':_0x56ae('1','bFBT'),'tfwZU':function(_0x36dc4f){return _0x36dc4f();},'OSSPv':function(_0x51e697,_0x3d63aa){return _0x51e697*_0x3d63aa;},'ZKtxv':_0x56ae('2','i9D5'),'YaSla':_0x56ae('3','0GFN'),'MirBz':_0x56ae('4','guqa'),'aiPyl':_0x56ae('5','4QAH'),'KFbOi':_0x56ae('6','Y$[1'),'KmZWn':_0x56ae('7','2DiN'),'NLYqC':function(_0x23ef4e,_0x556344){return _0x23ef4e(_0x556344);},'ljlXD':_0x56ae('8','d*S['),'lJned':_0x56ae('9','zf5F'),'tGjCb':_0x56ae('a','h@ci'),'xJBFU':_0x56ae('b','M5!1')};var _0x14a683=$[_0x56ae('c','m[@%')][Math[_0x56ae('d',')yL7')](_0x1713a7[_0x56ae('e','0DVC')](Math[_0x56ae('f','($hY')](),$[_0x56ae('10','D(M6')][_0x56ae('11','4QAH')]))];let _0x331216=_0x213e5f[_0x56ae('12','g0XU')];let _0xd456e6=_0x56ae('13','g0XU')+_0x14a683+';\x20'+cookie;let _0x1cb20a={'url':_0x56ae('14','d*S['),'headers':{'Host':_0x1713a7[_0x56ae('15','%hD#')],'Content-Type':_0x1713a7[_0x56ae('16','M*t1')],'origin':_0x1713a7[_0x56ae('17','VBsB')],'Accept-Encoding':_0x1713a7[_0x56ae('18','uHDr')],'Cookie':_0xd456e6,'Connection':_0x1713a7[_0x56ae('19','Giyh')],'Accept':_0x1713a7[_0x56ae('1a','2DiN')],'User-Agent':$[_0x56ae('1b','R)3a')]()?process[_0x56ae('1c','g0XU')][_0x56ae('1d','0DVC')]?process[_0x56ae('1e',')yL7')][_0x56ae('1f','4QAH')]:_0x1713a7[_0x56ae('20','eq@B')](require,_0x1713a7[_0x56ae('21','M#5n')])[_0x56ae('22',')yL7')]:$[_0x56ae('23','0GFN')](_0x1713a7[_0x56ae('24','h@ci')])?$[_0x56ae('25','Giyh')](_0x1713a7[_0x56ae('26','M#5n')]):_0x1713a7[_0x56ae('27',')yL7')],'referer':_0x56ae('28','zf5F'),'Accept-Language':_0x1713a7[_0x56ae('29','C&lc')]},'body':_0x56ae('2a','btke')+_0x331216+_0x56ae('2b','M5!1')};return new Promise(_0x5b0346=>{$[_0x56ae('2c','X1xN')](_0x1cb20a,(_0x393e21,_0x5598ea,_0x3e61a4)=>{try{if(_0x393e21){console[_0x56ae('2d','i9D5')]($[_0x56ae('2e','0GFN')]+_0x56ae('2f','($hY'));}else{_0x3e61a4=JSON[_0x56ae('30','D5Cp')](_0x3e61a4);}}catch(_0x5363f5){$[_0x56ae('31','4YnW')](_0x5363f5);}finally{if(_0x1713a7[_0x56ae('32','HL[)')](_0x1713a7[_0x56ae('33','uIJi')],_0x1713a7[_0x56ae('34','2DiN')])){$[_0x56ae('35','%hD#')](e);}else{_0x1713a7[_0x56ae('36','0GFN')](_0x5b0346);}}});});}function wuzhi01(_0x2e8369){var _0xdce963={'XxJzl':function(_0xfc4f,_0x1008a1){return _0xfc4f(_0x1008a1);},'TnqlX':function(_0x28932f,_0x6276a4){return _0x28932f===_0x6276a4;},'LkhwL':_0x56ae('37','eXjz'),'PSMgJ':function(_0x13de3d){return _0x13de3d();},'UleMC':function(_0x213a64,_0x58ebb0){return _0x213a64===_0x58ebb0;},'Ykpom':_0x56ae('38','HL[)'),'AzEYO':_0x56ae('39','iDlr'),'YxmTX':_0x56ae('3a','tjKo'),'zGKTz':_0x56ae('3b','TRCr'),'GOaYs':_0x56ae('3c','eq@B'),'yNzaH':_0x56ae('3d','4YnW'),'wQpju':_0x56ae('3e','%hD#'),'vSDYr':function(_0x517d32,_0x3ccbed){return _0x517d32(_0x3ccbed);},'vOsru':_0x56ae('3f','tjKo'),'mWgqc':_0x56ae('40','$caN'),'hTene':_0x56ae('41','Y$[1'),'vNCRS':_0x56ae('42','R*3*')};let _0x315299=+new Date();let _0x1bf053=_0x2e8369[_0x56ae('43','C&lc')];let _0x31648e={'url':_0x56ae('44','($hY')+_0x315299,'headers':{'Host':_0xdce963[_0x56ae('45','MuhM')],'Content-Type':_0xdce963[_0x56ae('46','0GFN')],'origin':_0xdce963[_0x56ae('47','Uqwf')],'Accept-Encoding':_0xdce963[_0x56ae('48','btke')],'Cookie':cookie,'Connection':_0xdce963[_0x56ae('49','nQTm')],'Accept':_0xdce963[_0x56ae('4a','guqa')],'User-Agent':$[_0x56ae('4b','g0XU')]()?process[_0x56ae('4c','C&lc')][_0x56ae('4d','X1xN')]?process[_0x56ae('4e','M*t1')][_0x56ae('4f','R)3a')]:_0xdce963[_0x56ae('50','TRCr')](require,_0xdce963[_0x56ae('51','zf5F')])[_0x56ae('52','Giyh')]:$[_0x56ae('53','nQTm')](_0xdce963[_0x56ae('54','iDlr')])?$[_0x56ae('55',']oAb')](_0xdce963[_0x56ae('56','@ahg')]):_0xdce963[_0x56ae('57','eP^5')],'referer':_0x56ae('58','h@ci'),'Accept-Language':_0xdce963[_0x56ae('59','eP^5')]},'body':_0x56ae('5a','zf5F')+_0x1bf053+_0x56ae('5b','4YnW')+_0x315299+_0x56ae('5c','$caN')+_0x315299};return new Promise(_0x5bdba6=>{if(_0xdce963[_0x56ae('5d','TRCr')](_0xdce963[_0x56ae('5e','uHDr')],_0xdce963[_0x56ae('5f','R)3a')])){$[_0x56ae('60','D(M6')](_0x31648e,(_0x488d6c,_0x55bb89,_0x2240ea)=>{try{if(_0x488d6c){console[_0x56ae('61','C&lc')]($[_0x56ae('62','btke')]+_0x56ae('63','tjKo'));}else{if(_0xdce963[_0x56ae('64','HL[)')](safeGet,_0x2240ea)){_0x2240ea=JSON[_0x56ae('65','VBsB')](_0x2240ea);}}}catch(_0x294e90){if(_0xdce963[_0x56ae('66','X1xN')](_0xdce963[_0x56ae('67','Y$[1')],_0xdce963[_0x56ae('68','%hD#')])){$[_0x56ae('35','%hD#')](_0x294e90);}else{console[_0x56ae('69','M5!1')]($[_0x56ae('6a','i9D5')]+_0x56ae('6b','uHDr'));}}finally{_0xdce963[_0x56ae('6c','zf5F')](_0x5bdba6);}});}else{$[_0x56ae('6d','4QAH')](e);}});}function shuye72(){var _0x5be8eb={'jHybO':function(_0x462ecd,_0x53ca80){return _0x462ecd!==_0x53ca80;},'iBhJH':_0x56ae('6e','cBFa'),'quhXi':_0x56ae('6f','i9D5'),'xVTex':_0x56ae('70','R*3*'),'yKErL':function(_0x2e6482){return _0x2e6482();},'PqXmx':function(_0x1f0776,_0x2ac3dc){return _0x1f0776<_0x2ac3dc;},'xfXGD':function(_0x2f64ef,_0x36287b){return _0x2f64ef(_0x36287b);},'VZQei':function(_0x106e04){return _0x106e04();},'uXdWw':function(_0x3b3e30,_0x81f495){return _0x3b3e30===_0x81f495;},'SMbpX':_0x56ae('71','($hY'),'xcqem':function(_0x52aa27){return _0x52aa27();},'BaAwH':_0x56ae('72','eP^5'),'lEnOg':_0x56ae('73','2DiN')};return new Promise(_0x1db652=>{var _0x27be90={'gkOxW':function(_0x54befc){return _0x5be8eb[_0x56ae('74','zf5F')](_0x54befc);}};$[_0x56ae('75','$caN')]({'url':_0x5be8eb[_0x56ae('76','eXjz')],'headers':{'User-Agent':_0x5be8eb[_0x56ae('77','guqa')]},'timeout':0x1388},async(_0x538bad,_0x12984a,_0x5799a6)=>{if(_0x5be8eb[_0x56ae('78','@ahg')](_0x5be8eb[_0x56ae('79','fU8^')],_0x5be8eb[_0x56ae('7a','m[@%')])){try{if(_0x538bad){if(_0x5be8eb[_0x56ae('7b','4YnW')](_0x5be8eb[_0x56ae('7c','nQTm')],_0x5be8eb[_0x56ae('7d','R*3*')])){$[_0x56ae('7e','D5Cp')](e);}else{console[_0x56ae('7f','ux0c')]($[_0x56ae('80','%hD#')]+_0x56ae('81','guqa'));}}else{$[_0x56ae('82','bFBT')]=JSON[_0x56ae('83','cBFa')](_0x5799a6);await _0x5be8eb[_0x56ae('84','guqa')](shuye73);if(_0x5be8eb[_0x56ae('85','9OE&')]($[_0x56ae('86','Uqwf')][_0x56ae('87','guqa')][_0x56ae('88','R*3*')],0x0)){for(let _0x55f145=0x0;_0x5be8eb[_0x56ae('89','Uqwf')](_0x55f145,$[_0x56ae('8a','MuhM')][_0x56ae('8b','%hD#')][_0x56ae('8c','Giyh')]);_0x55f145++){let _0x5beea6=$[_0x56ae('8d','XZo]')][_0x56ae('8e','h@ci')][_0x55f145];await $[_0x56ae('8f','H%ly')](0x1f4);await _0x5be8eb[_0x56ae('90','fU8^')](wuzhi,_0x5beea6);}await _0x5be8eb[_0x56ae('91','%hD#')](shuye74);}}}catch(_0x985159){if(_0x5be8eb[_0x56ae('92','$caN')](_0x5be8eb[_0x56ae('93','MuhM')],_0x5be8eb[_0x56ae('94','0DVC')])){$[_0x56ae('95','TRCr')](_0x985159);}else{console[_0x56ae('96','m[@%')]($[_0x56ae('97',']oAb')]+_0x56ae('98','R)3a'));}}finally{_0x5be8eb[_0x56ae('99','X1xN')](_0x1db652);}}else{_0x27be90[_0x56ae('9a','C&lc')](_0x1db652);}});});}function shuye73(){var _0x45b8ed={'Zmmlf':function(_0x25b2b9,_0x5d393c){return _0x25b2b9!==_0x5d393c;},'msJud':_0x56ae('9b',']oAb'),'TGogt':_0x56ae('9c','ux0c'),'PiAxp':_0x56ae('9d','ux0c'),'smMAC':_0x56ae('9e','VBsB'),'TBWsN':function(_0x4dbec7,_0x435688){return _0x4dbec7===_0x435688;},'YgZKx':_0x56ae('9f','bFBT'),'pIhxv':_0x56ae('a0','M*t1'),'tXUdY':function(_0xf7ddca){return _0xf7ddca();},'otUBb':function(_0x55075d,_0x1bbe56){return _0x55075d===_0x1bbe56;},'rWYSi':_0x56ae('a1','m[@%'),'AsAMu':_0x56ae('a2','X1xN'),'KUkJr':_0x56ae('a3','D(M6')};return new Promise(_0x3f6b4e=>{if(_0x45b8ed[_0x56ae('a4','XZo]')](_0x45b8ed[_0x56ae('a5','eq@B')],_0x45b8ed[_0x56ae('a6','D(M6')])){$[_0x56ae('a7','4YnW')]({'url':_0x45b8ed[_0x56ae('a8','VBsB')],'headers':{'User-Agent':_0x45b8ed[_0x56ae('a9','D(M6')]},'timeout':0x1388},async(_0x2bc6a3,_0x5174c5,_0x1ebf20)=>{if(_0x45b8ed[_0x56ae('aa','bFBT')](_0x45b8ed[_0x56ae('ab','D(M6')],_0x45b8ed[_0x56ae('ac','%hD#')])){try{if(_0x2bc6a3){if(_0x45b8ed[_0x56ae('ad','d*S[')](_0x45b8ed[_0x56ae('ae','R)3a')],_0x45b8ed[_0x56ae('af','%hD#')])){console[_0x56ae('96','m[@%')]($[_0x56ae('b0',')yL7')]+_0x56ae('b1',']oAb'));}else{_0x1ebf20=JSON[_0x56ae('65','VBsB')](_0x1ebf20);}}else{if(_0x45b8ed[_0x56ae('b2','$caN')](_0x45b8ed[_0x56ae('b3','d*S[')],_0x45b8ed[_0x56ae('b4','MuhM')])){if(_0x2bc6a3){console[_0x56ae('b5','btke')]($[_0x56ae('b0',')yL7')]+_0x56ae('63','tjKo'));}else{$[_0x56ae('b6','%hD#')]=JSON[_0x56ae('b7','Uqwf')](_0x1ebf20);$[_0x56ae('b8',')yL7')]=$[_0x56ae('b9','D(M6')][_0x56ae('ba','R)3a')];}}else{$[_0x56ae('bb','MuhM')]=JSON[_0x56ae('bc','HL[)')](_0x1ebf20);$[_0x56ae('bd','4QAH')]=$[_0x56ae('be','M#5n')][_0x56ae('bf','fU8^')];}}}catch(_0x5d36da){$[_0x56ae('c0','iDlr')](_0x5d36da);}finally{_0x45b8ed[_0x56ae('c1','zf5F')](_0x3f6b4e);}}else{if(_0x2bc6a3){console[_0x56ae('c2','D5Cp')]($[_0x56ae('97',']oAb')]+_0x56ae('c3',')yL7'));}else{_0x1ebf20=JSON[_0x56ae('c4','h@ci')](_0x1ebf20);}}});}else{$[_0x56ae('c5','nQTm')](e);}});}function shuye74(){var _0x388b9c={'UUTGr':function(_0x57c3c4){return _0x57c3c4();},'AtVCC':function(_0xf81cc,_0x22ef0f){return _0xf81cc===_0x22ef0f;},'RoYcV':_0x56ae('c6',')yL7'),'XDpVi':function(_0x4398ac,_0x340dcc){return _0x4398ac(_0x340dcc);},'xmVEi':function(_0x433f3f,_0x36c0f4){return _0x433f3f===_0x36c0f4;},'wGdsK':_0x56ae('c7','m[@%'),'cwdAd':_0x56ae('c8','4YnW'),'wUjIL':function(_0x2eeed6,_0x17500e){return _0x2eeed6!==_0x17500e;},'asFyH':function(_0x1568bd,_0xbdc88e){return _0x1568bd<_0xbdc88e;},'rpJkd':_0x56ae('c9','h@ci'),'yuoGm':_0x56ae('ca','M5!1'),'bZZsx':_0x56ae('cb','R)3a'),'QnYDU':_0x56ae('cc','VBsB')};return new Promise(_0x2b8f51=>{$[_0x56ae('cd','Giyh')]({'url':_0x388b9c[_0x56ae('ce','2DiN')],'headers':{'User-Agent':_0x388b9c[_0x56ae('cf','D(M6')]},'timeout':0x1388},async(_0x5f2ddc,_0x173f03,_0x4ac7f1)=>{var _0x382412={'vhbwr':function(_0x1612d8){return _0x388b9c[_0x56ae('d0','D(M6')](_0x1612d8);},'LXual':function(_0x167f89){return _0x388b9c[_0x56ae('d1','eP^5')](_0x167f89);}};try{if(_0x388b9c[_0x56ae('d2','eP^5')](_0x388b9c[_0x56ae('d3','9OE&')],_0x388b9c[_0x56ae('d4','4QAH')])){if(_0x5f2ddc){console[_0x56ae('d5','iDlr')]($[_0x56ae('d6','D(M6')]+_0x56ae('d7','uIJi'));}else{if(_0x388b9c[_0x56ae('d8','cBFa')](safeGet,_0x4ac7f1)){if(_0x388b9c[_0x56ae('d9','@ahg')](_0x388b9c[_0x56ae('da','$caN')],_0x388b9c[_0x56ae('db','d*S[')])){_0x382412[_0x56ae('dc','H%ly')](_0x2b8f51);}else{$[_0x56ae('dd','uHDr')]=JSON[_0x56ae('de','($hY')](_0x4ac7f1);if(_0x388b9c[_0x56ae('df','0DVC')]($[_0x56ae('e0',')yL7')][_0x56ae('e1','($hY')],0x0)){for(let _0xc25e51=0x0;_0x388b9c[_0x56ae('e2','M5!1')](_0xc25e51,$[_0x56ae('e3','TRCr')][_0x56ae('e4','bFBT')][_0x56ae('e5','eP^5')]);_0xc25e51++){if(_0x388b9c[_0x56ae('e6','%hD#')](_0x388b9c[_0x56ae('e7','Giyh')],_0x388b9c[_0x56ae('e8','g0XU')])){let _0x130947=$[_0x56ae('e9','D(M6')][_0x56ae('ea','X1xN')][_0xc25e51];await $[_0x56ae('eb','fU8^')](0x1f4);await _0x388b9c[_0x56ae('ec','d*S[')](wuzhi01,_0x130947);}else{_0x382412[_0x56ae('ed','M#5n')](_0x2b8f51);}}}}}}}else{_0x382412[_0x56ae('ee','2DiN')](_0x2b8f51);}}catch(_0x186e98){$[_0x56ae('ef','MuhM')](_0x186e98);}finally{_0x388b9c[_0x56ae('f0','h@ci')](_0x2b8f51);}});});};_0xod0='jsjiami.com.v6';
// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
